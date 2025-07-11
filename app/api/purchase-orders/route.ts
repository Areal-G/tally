/**
 * Purchase orders — GET list, POST create (draft or ordered).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { createPurchaseOrderSchema, type PurchaseOrderLine } from "@/lib/inventory/schemas";
import {
  InventoryOpError,
  listPurchaseOrders,
  nextDocumentNumber,
  toPurchaseOrderDTOs,
} from "@/lib/inventory/stock-ops.server";
import { opErrorResponse, parseBody, requireStoreOwner } from "@/lib/inventory/route-helpers";

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json(await listPurchaseOrders(session.id));
  } catch (error) {
    return opErrorResponse(error, "Loading purchase orders");
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const data = await parseBody(request, createPurchaseOrderSchema);
  if (data instanceof NextResponse) return data;

  try {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, userId: session.id },
      select: { id: true },
    });
    if (!supplier) throw new InventoryOpError("Supplier not found", 404);
    if (data.warehouseId) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: data.warehouseId, userId: session.id },
        select: { id: true },
      });
      if (!wh) throw new InventoryOpError("Warehouse not found", 404);
    }
    const products = await prisma.product.findMany({
      where: { id: { in: data.lines.map((l) => l.productId) }, userId: session.id },
      select: { id: true, name: true, sku: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const merged = new Map<string, PurchaseOrderLine>();
    for (const l of data.lines) {
      const p = byId.get(l.productId);
      if (!p) throw new InventoryOpError("Product not found", 404);
      const prev = merged.get(l.productId);
      merged.set(l.productId, {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        quantity: (prev?.quantity ?? 0) + l.quantity,
        receivedQuantity: 0,
        unitCost: l.unitCost,
      });
    }
    const lines = [...merged.values()];
    const total =
      Math.round(lines.reduce((s, l) => s + l.quantity * l.unitCost, 0) * 100) / 100;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: await nextDocumentNumber("purchaseOrder", "PO"),
        userId: session.id,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId ?? null,
        status: data.submit ? "ordered" : "draft",
        orderedAt: data.submit ? new Date() : null,
        lines: lines as unknown as object,
        total,
        notes: data.notes ?? null,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      },
    });
    const [dto] = await toPurchaseOrderDTOs([po]);
    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    return opErrorResponse(error, "Creating purchase order");
  }
}
