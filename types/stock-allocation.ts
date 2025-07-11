/**
 * Stock Allocation & Transfer type definitions
 */

/**
 * Stock allocation status
 */
export type StockTransferStatus = "pending" | "completed" | "cancelled";

/**
 * Stock allocation interface (product in a warehouse)
 */
export interface StockAllocation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  userId: string;
  createdAt: string;
  updatedAt: string | null;
  // Extended with relations
  product?: {
    id: string;
    name: string;
    sku: string;
    /** Product image for allocation row thumbnails */
    imageUrl?: string | null;
    price?: number;
    /** Global product stock (not warehouse allocation qty) */
    quantity?: number;
    categoryId?: string | null;
    categoryName?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    /** Soft-deleted product still visible on warehouse detail */
    deletedAt?: string | null;
    isArchived?: boolean;
    /** Derived when all product allocations are loaded */
    allocatedTotal?: number;
    unallocated?: number;
    /** Catalog-level order commitment for warehouse row hints */
    committedQuantity?: number;
    reservedQuantity?: number;
  };
  warehouse?: {
    id: string;
    name: string;
    /** Warehouse active flag for product-detail inline badge */
    status?: boolean;
    /** Address + type for product detail warehouse stock rows */
    address?: string | null;
    type?: string | null;
  };
}

/**
 * Stock transfer interface
 */
export interface StockTransfer {
  id: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  status: StockTransferStatus;
  notes: string | null;
  userId: string;
  createdAt: string;
  completedAt: string | null;
  // Extended with relations
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  fromWarehouse?: {
    id: string;
    name: string;
  };
  toWarehouse?: {
    id: string;
    name: string;
  };
}

/**
 * Create stock allocation input
 */
export interface CreateStockAllocationInput {
  productId: string;
  warehouseId: string;
  quantity: number;
}

/**
 * Update stock allocation input
 */
export interface UpdateStockAllocationInput {
  quantity?: number;
}

/**
 * Create stock transfer input
 */
export interface CreateStockTransferInput {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  notes?: string;
}

/**
 * Stock by warehouse summary
 */
export interface WarehouseStockSummary {
  warehouseId: string;
  warehouseName: string;
  /** Warehouse type for BI breakdown label (e.g. "main", "storage") */
  warehouseType?: string | null;
  totalProducts: number;
  totalQuantity: number;
  totalReserved: number;
  totalValue: number;
}
