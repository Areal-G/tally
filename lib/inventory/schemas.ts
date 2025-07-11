/**
 * Shared types + Zod request schemas for inventory operations
 * (purchase orders, stock adjustments, stock counts, returns).
 * Client-safe: no Prisma imports.
 */
import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

/* ----------------------------- Purchase orders ----------------------------- */

export const PO_STATUSES = ["draft", "ordered", "partial", "received", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export type PurchaseOrderLine = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
};

export type PurchaseOrderDTO = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string | null;
  warehouseName: string | null;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  total: number;
  notes: string | null;
  expectedDate: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

export const createPurchaseOrderSchema = z.object({
  supplierId: objectId,
  warehouseId: objectId.nullable().optional(),
  expectedDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  submit: z.boolean().optional(), // true → status "ordered" right away
  lines: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.number().int().positive().max(1_000_000),
        unitCost: z.number().min(0).max(10_000_000),
      }),
    )
    .min(1, "Add at least one product"),
});

export const purchaseOrderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("receive"),
    warehouseId: objectId.nullable().optional(),
    lotNumber: z.string().max(80).nullable().optional(),
    lines: z
      .array(z.object({ productId: objectId, quantity: z.number().int().min(0) }))
      .min(1),
  }),
]);

/* ----------------------------- Stock movements ----------------------------- */

export const MOVEMENT_TYPES = [
  "received",
  "sold",
  "transfer",
  "adjustment",
  "count",
  "return",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type StockMovementDTO = {
  id: string;
  type: MovementType;
  productId: string;
  productName: string;
  sku: string;
  quantity: number; // signed catalog change (transfers = 0 net)
  warehouseName: string | null;
  toWarehouseName?: string | null;
  balanceAfter: number | null;
  reason: string | null;
  reference: string | null;
  referenceHref: string | null;
  createdByName: string | null;
  createdAt: string;
};

export const ADJUSTMENT_REASONS = [
  "Damaged",
  "Lost / stolen",
  "Found",
  "Expired",
  "Correction",
  "Other",
] as const;

export const stockAdjustmentSchema = z.object({
  productId: objectId,
  warehouseId: objectId.nullable().optional(),
  quantity: z
    .number()
    .int()
    .refine((n) => n !== 0, "Change cannot be zero")
    .refine((n) => Math.abs(n) <= 1_000_000, "Too large"),
  reason: z.enum(ADJUSTMENT_REASONS),
  note: z.string().max(500).nullable().optional(),
});

/* ------------------------------- Stock counts ------------------------------ */

export type StockCountLine = {
  productId: string;
  name: string;
  sku: string;
  expected: number;
  counted: number | null;
};

export type StockCountDTO = {
  id: string;
  countNumber: string;
  warehouseId: string | null;
  warehouseName: string | null;
  status: "draft" | "completed";
  lines: StockCountLine[];
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
};

export const createStockCountSchema = z.object({
  warehouseId: objectId.nullable().optional(),
  categoryId: objectId.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateStockCountSchema = z.object({
  action: z.enum(["save", "complete"]),
  lines: z.array(
    z.object({ productId: objectId, counted: z.number().int().min(0).nullable() }),
  ),
});

/* --------------------------------- Returns --------------------------------- */

export type ReturnLine = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type ProductReturnDTO = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  status: "requested" | "restocked" | "rejected";
  reason: string;
  condition: "resellable" | "damaged";
  lines: ReturnLine[];
  refundAmount: number;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export const RETURN_REASONS = [
  "Damaged in transit",
  "Wrong item sent",
  "Not as described",
  "No longer needed",
  "Defective",
  "Other",
] as const;

export const createReturnSchema = z.object({
  orderId: objectId,
  reason: z.enum(RETURN_REASONS),
  condition: z.enum(["resellable", "damaged"]),
  warehouseId: objectId.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  lines: z
    .array(z.object({ productId: objectId, quantity: z.number().int().positive() }))
    .min(1, "Pick at least one item"),
});

export const returnActionSchema = z.object({
  action: z.enum(["restock", "reject"]),
});

/* --------------------------------- Helpers --------------------------------- */

export const DEFAULT_REORDER_POINT = 20;

export function effectiveReorderPoint(reorderPoint: number | null | undefined): number {
  return reorderPoint ?? DEFAULT_REORDER_POINT;
}
