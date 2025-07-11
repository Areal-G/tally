/**
 * Server-only inventory operations: stock deltas with a movement ledger,
 * purchase-order receiving, counts, returns, and the unified movement timeline.
 *
 * Catalog stock lives on Product.quantity; per-warehouse stock on StockAllocation.
 * Every change made here keeps both in step and writes a StockMovement row.
 */
import { prisma } from "@/prisma/client";
import { calculateProductStatus } from "@/lib/validations/product";
import type {
  MovementType,
  PurchaseOrderDTO,
  PurchaseOrderLine,
  ProductReturnDTO,
  ReturnLine,
  StockCountDTO,
  StockCountLine,
  StockMovementDTO,
} from "./schemas";

export class InventoryOpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/* ------------------------------ Document numbers ----------------------------- */

type NumberedModel = "purchaseOrder" | "stockCount" | "productReturn";
/** Highest existing document number with this prefix (e.g. "PO-2026-"), or null. */
async function latestDocumentNumber(model: NumberedModel, startsWith: string): Promise<string | null> {
  switch (model) {
    case "purchaseOrder": {
      const row = await prisma.purchaseOrder.findFirst({
        where: { poNumber: { startsWith } },
        orderBy: { poNumber: "desc" },
        select: { poNumber: true },
      });
      return row?.poNumber ?? null;
    }
    case "stockCount": {
      const row = await prisma.stockCount.findFirst({
        where: { countNumber: { startsWith } },
        orderBy: { countNumber: "desc" },
        select: { countNumber: true },
      });
      return row?.countNumber ?? null;
    }
    case "productReturn": {
      const row = await prisma.productReturn.findFirst({
        where: { returnNumber: { startsWith } },
        orderBy: { returnNumber: "desc" },
        select: { returnNumber: true },
      });
      return row?.returnNumber ?? null;
    }
  }
}

export async function nextDocumentNumber(model: NumberedModel, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const latest = await latestDocumentNumber(model, `${prefix}-${year}-`);
  const last = latest ? Number(latest.split("-").pop()) : 0;
  return `${prefix}-${year}-${String(last + 1).padStart(4, "0")}`;
}

/* -------------------------------- Stock deltas ------------------------------- */

export type StockDeltaInput = {
  ownerId: string;
  actorId: string;
  productId: string;
  warehouseId?: string | null;
  delta: number;
  type: Exclude<MovementType, "sold" | "transfer">;
  reason?: string | null;
  reference?: string | null;
  referenceId?: string | null;
  lotNumber?: string | null;
};

/** Apply a signed quantity change to a product (and optionally one warehouse) + log it. */
export async function applyStockDelta(input: StockDeltaInput): Promise<number> {
  const product = await prisma.product.findFirst({
    where: {
      id: input.productId,
      userId: input.ownerId,
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    },
    select: { id: true, quantity: true, reservedQuantity: true, name: true },
  });
  if (!product) throw new InventoryOpError("Product not found", 404);

  const current = Number(product.quantity);
  const next = current + input.delta;
  if (next < 0) {
    throw new InventoryOpError(`Only ${current} of ${product.name} in stock`);
  }

  if (input.warehouseId) {
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: input.warehouseId, userId: input.ownerId },
      select: { id: true },
    });
    if (!warehouse) throw new InventoryOpError("Warehouse not found", 404);

    const allocation = await prisma.stockAllocation.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
    });
    if (input.delta < 0) {
      const free = allocation
        ? Number(allocation.quantity) - Number(allocation.reservedQuantity)
        : 0;
      if (free < -input.delta) {
        throw new InventoryOpError(`Only ${free} free in that warehouse`);
      }
    }
    if (allocation) {
      await prisma.stockAllocation.update({
        where: { id: allocation.id },
        data: { quantity: { increment: input.delta }, updatedAt: new Date() },
      });
    } else if (input.delta > 0) {
      await prisma.stockAllocation.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.delta,
          userId: input.ownerId,
          createdAt: new Date(),
        },
      });
    }
  }

  await prisma.product.update({
    where: { id: input.productId },
    data: {
      quantity: next,
      status: calculateProductStatus(next),
      updatedAt: new Date(),
      updatedBy: input.actorId,
      ...(input.lotNumber ? { lotNumber: input.lotNumber } : {}),
    },
  });

  await prisma.stockMovement.create({
    data: {
      userId: input.ownerId,
      productId: input.productId,
      warehouseId: input.warehouseId ?? null,
      type: input.type,
      quantity: input.delta,
      balanceAfter: next,
      reason: input.reason ?? null,
      reference: input.reference ?? null,
      referenceId: input.referenceId ?? null,
      createdBy: input.actorId,
    },
  });

  return next;
}

/* ------------------------------ Purchase orders ------------------------------ */

type PoRow = Awaited<ReturnType<typeof prisma.purchaseOrder.findFirst>>;

async function namesFor(supplierIds: string[], warehouseIds: string[]) {
  const [suppliers, warehouses] = await Promise.all([
    supplierIds.length
      ? prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } })
      : [],
    warehouseIds.length
      ? prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, name: true } })
      : [],
  ]);
  return {
    supplier: new Map(suppliers.map((s) => [s.id, s.name])),
    warehouse: new Map(warehouses.map((w) => [w.id, w.name])),
  };
}

export async function toPurchaseOrderDTOs(rows: NonNullable<PoRow>[]): Promise<PurchaseOrderDTO[]> {
  const names = await namesFor(
    [...new Set(rows.map((r) => r.supplierId))],
    [...new Set(rows.map((r) => r.warehouseId).filter((x): x is string => !!x))],
  );
  return rows.map((r) => ({
    id: r.id,
    poNumber: r.poNumber,
    supplierId: r.supplierId,
    supplierName: names.supplier.get(r.supplierId) ?? "Unknown supplier",
    warehouseId: r.warehouseId ?? null,
    warehouseName: r.warehouseId ? (names.warehouse.get(r.warehouseId) ?? null) : null,
    status: r.status as PurchaseOrderDTO["status"],
    lines: (r.lines as unknown as PurchaseOrderLine[]) ?? [],
    total: r.total,
    notes: r.notes ?? null,
    expectedDate: iso(r.expectedDate),
    orderedAt: iso(r.orderedAt),
    receivedAt: iso(r.receivedAt),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listPurchaseOrders(ownerId: string): Promise<PurchaseOrderDTO[]> {
  const rows = await prisma.purchaseOrder.findMany({
    where: { userId: ownerId },
    orderBy: { createdAt: "desc" },
  });
  return toPurchaseOrderDTOs(rows);
}

export async function receivePurchaseOrder(params: {
  ownerId: string;
  actorId: string;
  id: string;
  warehouseId?: string | null;
  lotNumber?: string | null;
  lines: { productId: string; quantity: number }[];
}): Promise<void> {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: params.id, userId: params.ownerId } });
  if (!po) throw new InventoryOpError("Purchase order not found", 404);
  if (po.status !== "ordered" && po.status !== "partial") {
    throw new InventoryOpError("Only ordered purchase orders can be received");
  }
  const lines = (po.lines as unknown as PurchaseOrderLine[]).map((l) => ({ ...l }));
  const warehouseId = params.warehouseId ?? po.warehouseId ?? null;
  let receivedAny = false;

  for (const req of params.lines) {
    if (req.quantity <= 0) continue;
    const line = lines.find((l) => l.productId === req.productId);
    if (!line) throw new InventoryOpError("Product is not on this purchase order");
    const remaining = line.quantity - line.receivedQuantity;
    if (req.quantity > remaining) {
      throw new InventoryOpError(`Only ${remaining} of ${line.name} left to receive`);
    }
    await applyStockDelta({
      ownerId: params.ownerId,
      actorId: params.actorId,
      productId: line.productId,
      warehouseId,
      delta: req.quantity,
      type: "received",
      reason: "Purchase order received",
      reference: po.poNumber,
      referenceId: po.id,
      lotNumber: params.lotNumber ?? null,
    });
    line.receivedQuantity += req.quantity;
    receivedAny = true;
  }
  if (!receivedAny) throw new InventoryOpError("Enter at least one quantity to receive");

  const complete = lines.every((l) => l.receivedQuantity >= l.quantity);
  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: {
      lines: lines as unknown as object,
      status: complete ? "received" : "partial",
      receivedAt: complete ? new Date() : po.receivedAt,
      warehouseId,
      updatedAt: new Date(),
    },
  });
}

/* ------------------------------- Stock counts -------------------------------- */

export async function toStockCountDTOs(
  rows: NonNullable<Awaited<ReturnType<typeof prisma.stockCount.findFirst>>>[],
): Promise<StockCountDTO[]> {
  const names = await namesFor([], [...new Set(rows.map((r) => r.warehouseId).filter((x): x is string => !!x))]);
  return rows.map((r) => ({
    id: r.id,
    countNumber: r.countNumber,
    warehouseId: r.warehouseId ?? null,
    warehouseName: r.warehouseId ? (names.warehouse.get(r.warehouseId) ?? null) : null,
    status: r.status as StockCountDTO["status"],
    lines: (r.lines as unknown as StockCountLine[]) ?? [],
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
    completedAt: iso(r.completedAt),
  }));
}

/** Snapshot expected quantities (warehouse allocation or catalog) for a new count sheet. */
export async function buildCountLines(
  ownerId: string,
  warehouseId?: string | null,
  categoryId?: string | null,
): Promise<StockCountLine[]> {
  const products = await prisma.product.findMany({
    where: {
      userId: ownerId,
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      ...(categoryId ? { categoryId } : {}),
    },
    select: { id: true, name: true, sku: true, quantity: true },
    orderBy: { name: "asc" },
  });
  if (!warehouseId) {
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      expected: Number(p.quantity),
      counted: null,
    }));
  }
  const allocations = await prisma.stockAllocation.findMany({
    where: { warehouseId, productId: { in: products.map((p) => p.id) } },
    select: { productId: true, quantity: true },
  });
  const byProduct = new Map(allocations.map((a) => [a.productId, Number(a.quantity)]));
  return products
    .filter((p) => byProduct.has(p.id))
    .map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      expected: byProduct.get(p.id) ?? 0,
      counted: null,
    }));
}

/* ---------------------------------- Returns ---------------------------------- */

export async function toReturnDTOs(
  rows: NonNullable<Awaited<ReturnType<typeof prisma.productReturn.findFirst>>>[],
): Promise<ProductReturnDTO[]> {
  const names = await namesFor([], [...new Set(rows.map((r) => r.warehouseId).filter((x): x is string => !!x))]);
  const orders = rows.length
    ? await prisma.order.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.orderId))] } },
        select: { id: true, clientId: true, userId: true },
      })
    : [];
  const buyerIds = [...new Set(orders.map((o) => o.clientId ?? o.userId))];
  const buyers = buyerIds.length
    ? await prisma.user.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } })
    : [];
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const orderBuyer = new Map(orders.map((o) => [o.id, buyerName.get(o.clientId ?? o.userId) ?? null]));
  return rows.map((r) => ({
    id: r.id,
    returnNumber: r.returnNumber,
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    customerName: orderBuyer.get(r.orderId) ?? null,
    warehouseId: r.warehouseId ?? null,
    warehouseName: r.warehouseId ? (names.warehouse.get(r.warehouseId) ?? null) : null,
    status: r.status as ProductReturnDTO["status"],
    reason: r.reason,
    condition: r.condition as ProductReturnDTO["condition"],
    lines: (r.lines as unknown as ReturnLine[]) ?? [],
    refundAmount: r.refundAmount,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: iso(r.resolvedAt),
  }));
}

/* ------------------------------ Movement timeline ---------------------------- */

const SOLD_STATUSES = ["confirmed", "processing", "shipped", "delivered"];

/**
 * Unified stock history: ledger rows (receipts, adjustments, counts, returns)
 * + sales from orders + completed warehouse transfers, newest first.
 */
export async function getStockMovementTimeline(
  ownerId: string,
  opts: { productId?: string; type?: MovementType; limit?: number } = {},
): Promise<StockMovementDTO[]> {
  const limit = Math.min(opts.limit ?? 200, 500);
  const wants = (t: MovementType) => !opts.type || opts.type === t;
  const productFilter = opts.productId ? { productId: opts.productId } : {};

  const [ledger, orderItems, transfers] = await Promise.all([
    wants("received") || wants("adjustment") || wants("count") || wants("return")
      ? prisma.stockMovement.findMany({
          where: { userId: ownerId, ...productFilter, ...(opts.type ? { type: opts.type } : {}) },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : [],
    wants("sold")
      ? prisma.orderItem.findMany({
          where: {
            ...productFilter,
            order: { userId: ownerId, status: { in: SOLD_STATUSES } },
          },
          select: {
            id: true,
            productId: true,
            productName: true,
            sku: true,
            quantity: true,
            warehouseName: true,
            order: { select: { id: true, orderNumber: true, createdAt: true, createdBy: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : [],
    wants("transfer")
      ? prisma.stockTransfer.findMany({
          where: { userId: ownerId, status: "completed", ...productFilter },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : [],
  ]);

  const productIds = new Set<string>([
    ...ledger.map((m) => m.productId),
    ...transfers.map((t) => t.productId),
  ]);
  const warehouseIds = new Set<string>([
    ...ledger.map((m) => m.warehouseId).filter((x): x is string => !!x),
    ...transfers.flatMap((t) => [t.fromWarehouseId, t.toWarehouseId]),
  ]);
  const userIds = new Set<string>([
    ...ledger.map((m) => m.createdBy),
    ...transfers.map((t) => t.userId),
    ...orderItems.map((i) => i.order.createdBy),
  ]);

  const [products, warehouses, users] = await Promise.all([
    productIds.size
      ? prisma.product.findMany({ where: { id: { in: [...productIds] } }, select: { id: true, name: true, sku: true } })
      : [],
    warehouseIds.size
      ? prisma.warehouse.findMany({ where: { id: { in: [...warehouseIds] } }, select: { id: true, name: true } })
      : [],
    userIds.size
      ? prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
      : [],
  ]);
  const P = new Map(products.map((p) => [p.id, p]));
  const W = new Map(warehouses.map((w) => [w.id, w.name]));
  const U = new Map(users.map((u) => [u.id, u.name]));

  const refHref = (type: string, referenceId: string | null) => {
    if (!referenceId) return null;
    if (type === "received") return `/purchase-orders?open=${referenceId}`;
    if (type === "count") return `/stock-counts?open=${referenceId}`;
    if (type === "return") return `/returns?open=${referenceId}`;
    return null;
  };

  const rows: StockMovementDTO[] = [
    ...ledger.map((m) => ({
      id: m.id,
      type: m.type as MovementType,
      productId: m.productId,
      productName: P.get(m.productId)?.name ?? "Deleted product",
      sku: P.get(m.productId)?.sku ?? "",
      quantity: m.quantity,
      warehouseName: m.warehouseId ? (W.get(m.warehouseId) ?? null) : null,
      balanceAfter: m.balanceAfter ?? null,
      reason: m.reason ?? null,
      reference: m.reference ?? null,
      referenceHref: refHref(m.type, m.referenceId ?? null),
      createdByName: U.get(m.createdBy) ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    ...orderItems.map((i) => ({
      id: `sold-${i.id}`,
      type: "sold" as const,
      productId: i.productId,
      productName: i.productName,
      sku: i.sku ?? "",
      quantity: -i.quantity,
      warehouseName: i.warehouseName ?? null,
      balanceAfter: null,
      reason: "Order fulfilled",
      reference: i.order.orderNumber,
      referenceHref: `/orders/${i.order.id}`,
      createdByName: U.get(i.order.createdBy) ?? null,
      createdAt: i.order.createdAt.toISOString(),
    })),
    ...transfers.map((t) => ({
      id: `tr-${t.id}`,
      type: "transfer" as const,
      productId: t.productId,
      productName: P.get(t.productId)?.name ?? "Deleted product",
      sku: P.get(t.productId)?.sku ?? "",
      quantity: Number(t.quantity),
      warehouseName: W.get(t.fromWarehouseId) ?? null,
      toWarehouseName: W.get(t.toWarehouseId) ?? null,
      balanceAfter: null,
      reason: t.notes ?? "Moved between warehouses",
      reference: null,
      referenceHref: null,
      createdByName: U.get(t.userId) ?? null,
      createdAt: (t.completedAt ?? t.createdAt).toISOString(),
    })),
  ];

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.slice(0, limit);
}

/** Products at/below their reorder point, with a suggested order quantity. */
export async function getReorderSuggestions(ownerId: string) {
  const products = await prisma.product.findMany({
    where: { userId: ownerId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      quantity: true,
      reservedQuantity: true,
      reorderPoint: true,
      reorderQuantity: true,
      supplierId: true,
    },
  });
  const open = await prisma.purchaseOrder.findMany({
    where: { userId: ownerId, status: { in: ["draft", "ordered", "partial"] } },
    select: { lines: true },
  });
  const incoming = new Map<string, number>();
  for (const po of open) {
    for (const l of po.lines as unknown as PurchaseOrderLine[]) {
      incoming.set(l.productId, (incoming.get(l.productId) ?? 0) + (l.quantity - l.receivedQuantity));
    }
  }
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: [...new Set(products.map((p) => p.supplierId))] } },
    select: { id: true, name: true },
  });
  const S = new Map(suppliers.map((s) => [s.id, s.name]));

  return products
    .map((p) => {
      const available = Math.max(0, Number(p.quantity) - Number(p.reservedQuantity));
      const point = p.reorderPoint ?? 20;
      const onOrder = incoming.get(p.id) ?? 0;
      const suggested = p.reorderQuantity ?? Math.max(point * 2 - available, 10);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unitCost: Math.round(p.price * 0.6 * 100) / 100,
        available,
        reorderPoint: point,
        onOrder,
        suggestedQuantity: suggested,
        supplierId: p.supplierId,
        supplierName: S.get(p.supplierId) ?? "Unknown supplier",
      };
    })
    .filter((p) => p.available <= p.reorderPoint)
    .sort((a, b) => a.available - b.available);
}

export type ReorderSuggestion = Awaited<ReturnType<typeof getReorderSuggestions>>[number];
