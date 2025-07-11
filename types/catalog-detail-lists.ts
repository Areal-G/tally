/**
 * Shared product/order list shapes for category + supplier detail pages.
 */

export type CatalogDetailPartySnapshot = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export type CatalogDetailProductItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  sku?: string | null;
  quantity?: number;
  reservedQuantity?: number;
  /** Display-only list enrichment */
  committedQuantity?: number;
  price?: number;
  status?: string;
  owner?: CatalogDetailPartySnapshot | null;
  supplier?: { id: string; name: string } | null;
  /** Category link on product grid (supplier detail + category parity). */
  category?: { id: string; name: string } | null;
};

export type CatalogDetailRecentOrderItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  productImageUrl?: string | null;
  quantity: number;
  price: number;
  orderDate: string;
  subtotal: number;
  proportionalAmount?: number;
  orderTotal?: number;
  orderStatus: string;
  /** Paid/refunded statusAt hue on recent-order cards */
  paymentStatus?: string;
  /** Terminal status date for recent-order cards */
  statusAt?: string;
  owner?: CatalogDetailPartySnapshot | null;
  placedBy?: CatalogDetailPartySnapshot | null;
  /** Category link between SKU and Qty */
  category?: { id: string; name: string } | null;
  /** Linked invoice indicator beside order number */
  invoiceForOrder?: { id: string; invoiceNumber: string } | null;
};
