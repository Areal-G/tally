/**
 * Admin Supplier Portal type definitions
 * Dashboard for viewing supplier (role=supplier) users, their products, orders, activity
 * Denser recent product/order catalog meta
 * Recent orders buyer (placedBy*) for date-row avatar
 */

export interface SupplierPortalStats {
  counts: SupplierPortalCounts;
  recentProducts: SupplierPortalRecentProduct[];
  recentOrders: SupplierPortalRecentOrder[];
  suppliers: SupplierPortalSupplier[];
}

export interface SupplierPortalCounts {
  suppliers: number;
  products: number;
  orders: number;
  totalValue: number;
}

export interface SupplierPortalRecentProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  status: string;
  supplierId: string;
  supplierName: string;
  /** Product thumb + supplier avatar seed */
  imageUrl?: string | null;
  supplierUserId?: string | null;
  supplierImage?: string | null;
  /** Category + reserved for denser meta row */
  categoryId?: string | null;
  categoryName?: string | null;
  reservedQuantity?: number;
  committedQuantity?: number;
  createdAt: string;
}

export interface SupplierPortalRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total: number;
  supplierId: string;
  supplierName: string;
  /** Supplier avatar on recent order rows */
  supplierUserId?: string | null;
  supplierImage?: string | null;
  createdAt: string;
  /** Terminal status date for recent-order cards */
  statusAt?: string;
  /** First-line product meta (dashboard Recent Orders parity) */
  productId?: string | null;
  productPreview?: string | null;
  productImageUrl?: string | null;
  extraItemCount?: number;
  categoryId?: string | null;
  categoryName?: string | null;
  /** Buyer for Calendar · date · AvatarInlineLink row */
  placedById?: string | null;
  placedByName?: string | null;
  placedByImage?: string | null;
}

export interface SupplierPortalSupplier {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  productCount: number;
  orderCount: number;
  totalValue: number;
}
