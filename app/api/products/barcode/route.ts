/**
 * Product barcodes — POST one of:
 *   { action: "link", code, productId }       put a scanned code on an existing product
 *   { action: "create", code, name, price, quantity, categoryId, supplierId, sku? }
 *                                              name a new scanned code as a new product
 *   { action: "generate", productId }          give a product a fresh in-store EAN-13
 *   { action: "remove", productId }            clear a product's barcode
 * Responds { productId, barcode }.
 * GET → the store's most recent scans (for /scan's "Recent scans").
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { scheduleInvalidateProductCaches } from "@/lib/cache";
import { barcodeSchema, normalizeBarcode } from "@/lib/inventory/barcode";
import {
  barcodeTakenMessage,
  findBarcodeOwner,
  generateUniqueBarcode,
  recentScans,
} from "@/lib/inventory/barcode.server";
import { InventoryOpError } from "@/lib/inventory/stock-ops.server";
import { opErrorResponse, parseBody, requireStoreOwner } from "@/lib/inventory/route-helpers";
import { calculateProductStatus } from "@/lib/validations/product";

const code = barcodeSchema.unwrap().unwrap().min(1, "Scan or type a barcode");
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Pick a product");

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), code, productId: objectId }),
  z.object({
    action: z.literal("create"),
    code,
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    price: z.number().nonnegative("Price cannot be negative").max(1_000_000),
    quantity: z.number().int().nonnegative("Quantity cannot be negative").max(10_000_000),
    categoryId: objectId,
    supplierId: objectId,
    sku: z.string().trim().max(40).optional(),
  }),
  z.object({ action: z.literal("generate"), productId: objectId }),
  z.object({ action: z.literal("remove"), productId: objectId }),
]);

const notDeleted = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

async function ownProduct(userId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, userId, AND: [notDeleted] },
    select: { id: true },
  });
  if (!product) throw new InventoryOpError("Product not found", 404);
  return product;
}

/** SKU for a product named from a scan: initials of the name + last digits of the code. */
async function skuFor(name: string, scanned: string): Promise<string> {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 3))
    .slice(0, 2)
    .join("-") || "ITEM";
  const tail = scanned.replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase() || "0000";
  for (let i = 0; i < 20; i++) {
    const sku = i === 0 ? `${letters}-${tail}` : `${letters}-${tail}-${i + 1}`;
    if (!(await prisma.product.findUnique({ where: { sku }, select: { id: true } }))) return sku;
  }
  throw new InventoryOpError("Could not make a unique SKU; enter one yourself");
}

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json(await recentScans(session.id));
  } catch (error) {
    return opErrorResponse(error, "Loading recent scans");
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const data = await parseBody(request, bodySchema);
  if (data instanceof NextResponse) return data;

  try {
    let productId: string;
    let barcode: string | null;

    if (data.action === "link" || data.action === "create") {
      barcode = normalizeBarcode(data.code);
      const owner = await findBarcodeOwner(session.id, barcode, data.action === "link" ? data.productId : undefined);
      if (owner) throw new InventoryOpError(barcodeTakenMessage(owner), 409);
    }

    if (data.action === "link") {
      await ownProduct(session.id, data.productId);
      productId = data.productId;
      barcode = normalizeBarcode(data.code);
      await prisma.product.update({
        where: { id: productId },
        data: { barcode, updatedBy: session.id, updatedAt: new Date() },
      });
    } else if (data.action === "create") {
      const [category, supplier] = await Promise.all([
        prisma.category.findFirst({ where: { id: data.categoryId }, select: { id: true } }),
        prisma.supplier.findFirst({ where: { id: data.supplierId }, select: { id: true } }),
      ]);
      if (!category) throw new InventoryOpError("Pick a category");
      if (!supplier) throw new InventoryOpError("Pick a supplier");
      const sku = data.sku?.trim() || (await skuFor(data.name, data.code));
      if (data.sku?.trim() && (await prisma.product.findUnique({ where: { sku }, select: { id: true } }))) {
        throw new InventoryOpError("SKU must be unique");
      }
      barcode = normalizeBarcode(data.code);
      const created = await prisma.product.create({
        data: {
          name: data.name,
          sku,
          barcode,
          price: data.price,
          quantity: BigInt(data.quantity),
          status: calculateProductStatus(data.quantity),
          categoryId: data.categoryId,
          supplierId: data.supplierId,
          userId: session.id,
          createdBy: session.id,
          createdAt: new Date(),
          updatedAt: null,
        },
        select: { id: true },
      });
      productId = created.id;
    } else if (data.action === "generate") {
      await ownProduct(session.id, data.productId);
      productId = data.productId;
      barcode = await generateUniqueBarcode(session.id);
      await prisma.product.update({
        where: { id: productId },
        data: { barcode, updatedBy: session.id, updatedAt: new Date() },
      });
    } else {
      await ownProduct(session.id, data.productId);
      productId = data.productId;
      barcode = null;
      await prisma.product.update({
        where: { id: productId },
        data: { barcode: null, updatedBy: session.id, updatedAt: new Date() },
      });
    }

    await scheduleInvalidateProductCaches();
    return NextResponse.json({ productId, barcode }, { status: data.action === "create" ? 201 : 200 });
  } catch (error) {
    return opErrorResponse(error, "Saving barcode");
  }
}
