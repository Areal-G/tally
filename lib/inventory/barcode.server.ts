/**
 * Server helpers for product barcodes: uniqueness per owner and generating unused codes.
 */
import { prisma } from "@/prisma/client";
import { generateInternalEan13, normalizeBarcode } from "./barcode";

const notDeleted = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

/** The owner's live product already using this barcode, if any. */
export async function findBarcodeOwner(
  userId: string,
  code: string | null | undefined,
  exceptProductId?: string,
): Promise<{ id: string; name: string } | null> {
  const barcode = normalizeBarcode(code);
  if (!barcode) return null;
  return prisma.product.findFirst({
    where: {
      userId,
      barcode,
      ...(exceptProductId ? { id: { not: exceptProductId } } : {}),
      AND: [notDeleted],
    },
    select: { id: true, name: true },
  });
}

export function barcodeTakenMessage(owner: { name: string }): string {
  return `That barcode is already on “${owner.name}”`;
}

/** A generated in-store EAN-13 no other product of this owner uses. */
export async function generateUniqueBarcode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateInternalEan13();
    if (!(await findBarcodeOwner(userId, code))) return code;
  }
  throw new Error("Could not generate a unique barcode");
}

/* ------------------------------ Scanner DTOs ------------------------------ */

export const LOOKUP_PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  price: true,
  quantity: true,
  reservedQuantity: true,
  status: true,
  reorderPoint: true,
  lotNumber: true,
  barcode: true,
  lastScannedAt: true,
  categoryId: true,
  supplierId: true,
} as const;

type LookupRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: bigint;
  reservedQuantity: bigint | null;
  status: string;
  reorderPoint: number | null;
  lotNumber: string | null;
  barcode: string | null;
  lastScannedAt: Date | null;
  categoryId: string;
  supplierId: string;
};

/** Product + category/supplier names + stock per warehouse, as the scanner shows it. */
export async function toLookupDTOs(rows: LookupRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [categories, suppliers, allocations] = await Promise.all([
    prisma.category.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.categoryId))] } }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.supplierId))] } }, select: { id: true, name: true } }),
    prisma.stockAllocation.findMany({
      where: { productId: { in: ids } },
      select: { productId: true, quantity: true, reservedQuantity: true, warehouseId: true },
    }),
  ]);
  const warehouses = allocations.length
    ? await prisma.warehouse.findMany({
        where: { id: { in: [...new Set(allocations.map((a) => a.warehouseId))] } },
        select: { id: true, name: true },
      })
    : [];
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const supName = new Map(suppliers.map((s) => [s.id, s.name]));
  const whName = new Map(warehouses.map((w) => [w.id, w.name]));
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    quantity: Number(p.quantity),
    reservedQuantity: Number(p.reservedQuantity ?? 0),
    status: p.status,
    reorderPoint: p.reorderPoint ?? null,
    lotNumber: p.lotNumber ?? null,
    barcode: p.barcode ?? null,
    lastScannedAt: p.lastScannedAt ? p.lastScannedAt.toISOString() : null,
    categoryName: catName.get(p.categoryId) ?? null,
    supplierName: supName.get(p.supplierId) ?? null,
    warehouses: allocations
      .filter((a) => a.productId === p.id)
      .map((a) => ({
        id: a.warehouseId,
        name: whName.get(a.warehouseId) ?? "Warehouse",
        quantity: Number(a.quantity),
        reserved: Number(a.reservedQuantity),
      })),
  }));
}

/** The owner's most recently scanned products, newest first. */
export async function recentScans(userId: string, take = 6) {
  const rows = await prisma.product.findMany({
    where: { userId, lastScannedAt: { not: null }, AND: [notDeleted] },
    orderBy: { lastScannedAt: "desc" },
    take,
    select: LOOKUP_PRODUCT_SELECT,
  });
  return toLookupDTOs(rows);
}
