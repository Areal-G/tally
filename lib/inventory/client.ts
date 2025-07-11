/**
 * Browser-side fetch wrapper for the inventory-operations API
 * (purchase orders, stock movements, counts, returns, scanner lookup).
 */
import type {
  MovementType,
  ProductReturnDTO,
  PurchaseOrderDTO,
  StockCountDTO,
  StockMovementDTO,
} from "./schemas";

export class InventoryApiError extends Error {
  status: number;
  /** Parsed JSON error body (e.g. `unknownCode` from the scanner lookup). */
  body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: string; message?: string }).error
      ?? (body as { message?: string }).message
      ?? "Something went wrong";
    throw new InventoryApiError(msg, res.status, body as Record<string, unknown>);
  }
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  body: JSON.stringify(data),
});

export type ReorderSuggestionDTO = {
  productId: string;
  name: string;
  sku: string;
  available: number;
  reorderPoint: number;
  onOrder: number;
  suggestedQuantity: number;
  unitCost: number;
  supplierId: string | null;
  supplierName: string | null;
};

export type ReturnableOrderDTO = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName: string | null;
  items: { productId: string; productName: string; sku: string | null; quantity: number; price: number }[];
};

export type BarcodeActionInput =
  | { action: "link"; code: string; productId: string }
  | {
      action: "create";
      code: string;
      name: string;
      price: number;
      quantity: number;
      categoryId: string;
      supplierId: string;
      sku?: string;
    }
  | { action: "generate"; productId: string }
  | { action: "remove"; productId: string };

export type LookupProductDTO = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  reservedQuantity: number;
  status: string;
  reorderPoint: number | null;
  lotNumber: string | null;
  barcode: string | null;
  /** When it was last found on /scan (ISO), or null. */
  lastScannedAt?: string | null;
  categoryName: string | null;
  supplierName: string | null;
  warehouses: { id: string; name: string; quantity: number; reserved: number }[];
};

export const inventoryApi = {
  purchaseOrders: () => call<PurchaseOrderDTO[]>("/purchase-orders"),
  reorderSuggestions: () => call<ReorderSuggestionDTO[]>("/purchase-orders/suggestions"),
  createPurchaseOrder: (data: unknown) => call<PurchaseOrderDTO>("/purchase-orders", json("POST", data)),
  purchaseOrderAction: (id: string, data: unknown) =>
    call<PurchaseOrderDTO>(`/purchase-orders/${id}`, json("PATCH", data)),
  deletePurchaseOrder: (id: string) => call<{ ok: true }>(`/purchase-orders/${id}`, { method: "DELETE" }),

  movements: (params: { type?: MovementType; productId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.type) qs.set("type", params.type);
    if (params.productId) qs.set("productId", params.productId);
    const q = qs.toString();
    return call<StockMovementDTO[]>(`/stock-movements${q ? `?${q}` : ""}`);
  },
  adjustStock: (data: unknown) => call<{ ok: true; balance: number }>("/stock-movements", json("POST", data)),

  stockCounts: () => call<StockCountDTO[]>("/stock-counts"),
  createStockCount: (data: unknown) => call<StockCountDTO>("/stock-counts", json("POST", data)),
  updateStockCount: (id: string, data: unknown) => call<StockCountDTO>(`/stock-counts/${id}`, json("PATCH", data)),
  deleteStockCount: (id: string) => call<{ ok: true }>(`/stock-counts/${id}`, { method: "DELETE" }),

  returns: () => call<ProductReturnDTO[]>("/returns"),
  returnableOrders: () => call<ReturnableOrderDTO[]>("/returns/orders"),
  createReturn: (data: unknown) => call<ProductReturnDTO>("/returns", json("POST", data)),
  returnAction: (id: string, data: unknown) => call<ProductReturnDTO>(`/returns/${id}`, json("PATCH", data)),

  /** record=true remembers the hit for "Recent scans". */
  lookup: (code: string, record = false) =>
    call<LookupProductDTO>(`/products/lookup?code=${encodeURIComponent(code)}${record ? "&record=1" : ""}`),
  recentScans: () => call<LookupProductDTO[]>("/products/barcode"),
  /** link | create | generate | remove — see app/api/products/barcode/route.ts */
  barcode: (data: BarcodeActionInput) =>
    call<{ productId: string; barcode: string | null }>("/products/barcode", json("POST", data)),
};
