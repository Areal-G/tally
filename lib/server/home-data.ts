/**
 * Server-side data fetching for homepage SSR
 * Fetches products, categories, and suppliers using the same logic and cache as API routes.
 * Only import this from server code (e.g. app/page.tsx).
 */

import { getCache, setCache, cacheKeys } from "@/lib/cache";
import { mergeProductListWhere } from "@/lib/products/product-query";
import { enrichProductsWithCommittedQuantity } from "@/lib/products/enrich-product-committed-quantity";
import { prisma } from "@/prisma/client";

/** Product shape returned by products API GET (dates as ISO strings) */
export type ProductForHome = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  reservedQuantity: number;
  /** Display-only sum of disjoint reservation paths */
  committedQuantity: number;
  status: string;
  categoryId: string;
  supplierId: string;
  category: string;
  supplier: string;
  userId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  qrCodeUrl: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  expirationDate: string | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  lotNumber?: string | null;
  barcode?: string | null;
  /** Owner/supplier display for list densify */
  productOwnerName?: string | null;
  productOwnerImage?: string | null;
  productOwnerEmail?: string | null;
  supplierImage?: string | null;
};

/** Category shape returned by categories API GET (dates as ISO strings) */
export type CategoryForHome = {
  id: string;
  name: string;
  userId: string;
  status: boolean;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy?: string | null;
  productCount?: number;
  catalogProductTotal?: number;
};

/** Supplier shape returned by suppliers API GET (dates as ISO strings) */
export type SupplierForHome = {
  id: string;
  name: string;
  userId: string;
  status: boolean;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy?: string | null;
  email?: string | null;
  productCount?: number;
  catalogProductTotal?: number;
};

/**
 * Fetch products for the given user.
 * Uses the same cache key and transform as GET /api/products so Redis is shared.
 */
export async function getProductsForUser(userId: string): Promise<ProductForHome[]> {
  const cacheKey = cacheKeys.products.list({ userId });
  const cacheReadStartedAt = Date.now();
  const cached = await getCache<ProductForHome[]>(cacheKey);
  if (
    cached &&
    cached.every(
      (p) =>
        typeof p.committedQuantity === "number" &&
        "productOwnerImage" in p &&
        "productOwnerEmail" in p &&
        "supplierImage" in p,
    )
  ) {
    return cached;
  }

  const products = await prisma.product.findMany({
    where: mergeProductListWhere({ userId }),
    orderBy: { createdAt: "desc" },
  });

  const {
    loadProductListPartyMaps,
    productListPartyFields,
  } = await import("@/lib/server/product-list-party");
  const partyMaps = await loadProductListPartyMaps(products);

  const transformed: ProductForHome[] = await enrichProductsWithCommittedQuantity(
    products.map((product) => {
      const party = productListPartyFields(product, partyMaps);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        quantity: Number(product.quantity),
        reservedQuantity: Number(product.reservedQuantity ?? 0),
        status: product.status,
        categoryId: product.categoryId,
        supplierId: product.supplierId,
        category: party.category,
        supplier: party.supplier,
        userId: product.userId,
        createdBy: product.createdBy,
        updatedBy: product.updatedBy || null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt?.toISOString() ?? null,
        qrCodeUrl: product.qrCodeUrl ?? null,
        imageUrl: product.imageUrl ?? null,
        imageFileId: product.imageFileId ?? null,
        expirationDate: product.expirationDate?.toISOString() ?? null,
        reorderPoint: product.reorderPoint ?? null,
        reorderQuantity: product.reorderQuantity ?? null,
        lotNumber: product.lotNumber ?? null,
        barcode: product.barcode ?? null,
        productOwnerName: party.productOwnerName,
        productOwnerImage: party.productOwnerImage,
        productOwnerEmail: party.productOwnerEmail,
        supplierImage: party.supplierImage,
      };
    }),
  );

  await setCache(cacheKey, transformed, 300, { fetchedAt: cacheReadStartedAt });
  return transformed;
}

/**
 * Fetch products for a supplier (products where supplierId = this supplier).
 * Used when role=supplier: shows all products any admin assigned to this supplier (global).
 * Uses same shape as getProductsForUser for ProductsPage.
 */
export async function getProductsBySupplierId(
  supplierId: string,
): Promise<ProductForHome[]> {
  const cacheKey = cacheKeys.products.list({ supplierId });
  const cacheReadStartedAt = Date.now();
  const cached = await getCache<ProductForHome[]>(cacheKey);
  if (
    cached &&
    cached.every(
      (p) =>
        typeof p.committedQuantity === "number" &&
        "productOwnerImage" in p &&
        "productOwnerEmail" in p &&
        "supplierImage" in p,
    )
  ) {
    return cached;
  }

  const products = await prisma.product.findMany({
    where: mergeProductListWhere({ supplierId }),
    orderBy: { createdAt: "desc" },
  });

  const {
    loadProductListPartyMaps,
    productListPartyFields,
  } = await import("@/lib/server/product-list-party");
  const partyMaps = await loadProductListPartyMaps(products);

  const transformed: ProductForHome[] = await enrichProductsWithCommittedQuantity(
    products.map((product) => {
      const party = productListPartyFields(product, partyMaps);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        quantity: Number(product.quantity),
        reservedQuantity: Number(product.reservedQuantity ?? 0),
        status: product.status,
        categoryId: product.categoryId,
        supplierId: product.supplierId,
        category: party.category,
        supplier: party.supplier,
        userId: product.userId,
        createdBy: product.createdBy,
        updatedBy: product.updatedBy || null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt?.toISOString() ?? null,
        qrCodeUrl: product.qrCodeUrl ?? null,
        imageUrl: product.imageUrl ?? null,
        imageFileId: product.imageFileId ?? null,
        expirationDate: product.expirationDate?.toISOString() ?? null,
        reorderPoint: product.reorderPoint ?? null,
        reorderQuantity: product.reorderQuantity ?? null,
        lotNumber: product.lotNumber ?? null,
        barcode: product.barcode ?? null,
        productOwnerName: party.productOwnerName,
        productOwnerImage: party.productOwnerImage,
        productOwnerEmail: party.productOwnerEmail,
        supplierImage: party.supplierImage,
      };
    }),
  );

  await setCache(cacheKey, transformed, 300, { fetchedAt: cacheReadStartedAt });
  return transformed;
}

/**
 * Fetch categories for the given user.
 * Same query as GET /api/categories; returns serializable objects (dates as ISO strings).
 */
export async function getCategoriesForUser(userId: string): Promise<CategoryForHome[]> {
  const { enrichCategoriesWithProductCounts, countActiveCatalogProductsForUser } =
    await import("@/lib/server/catalog-list-enrich");
  const categories = await prisma.category.findMany({
    where: { userId },
  });
  const base = categories.map((c) => ({
    id: c.id,
    name: c.name,
    userId: c.userId,
    status: c.status,
    description: c.description ?? null,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() ?? null,
    createdBy: c.createdBy,
    updatedBy: c.updatedBy ?? null,
  }));
  const [enriched, catalogProductTotal] = await Promise.all([
    enrichCategoriesWithProductCounts(base, userId),
    countActiveCatalogProductsForUser(userId),
  ]);
  return enriched.map((c) => ({ ...c, catalogProductTotal }));
}

/**
 * Fetch suppliers for the given user.
 * Same query as GET /api/suppliers: the suppliers this admin/user owns.
 * Returns serializable objects (dates as ISO strings).
 */
export async function getSuppliersForUser(userId: string): Promise<SupplierForHome[]> {
  const { getSuppliersForAdmin } = await import("@/prisma/supplier");
  const { enrichSuppliersWithListFields, countActiveCatalogProductsForUser } =
    await import("@/lib/server/catalog-list-enrich");
  const [suppliers, catalogProductTotal] = await Promise.all([
    getSuppliersForAdmin(userId),
    countActiveCatalogProductsForUser(userId),
  ]);
  const base = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    userId: s.userId,
    status: s.status,
    description: s.description ?? null,
    notes: s.notes ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt?.toISOString() ?? null,
    createdBy: s.createdBy,
    updatedBy: s.updatedBy ?? null,
  }));
  // productCount scoped to list viewer catalog (userId)
  const enriched = await enrichSuppliersWithListFields(base, userId);
  return enriched.map((s) => ({ ...s, catalogProductTotal }));
}
