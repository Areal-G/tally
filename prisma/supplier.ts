import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";

/**
 * Fetch the suppliers an admin/user owns, sorted by name.
 * Used by the suppliers list, product dropdowns, sidebar counts and the supplier portal.
 */
export async function getSuppliersForAdmin(
  userId: string,
): Promise<Awaited<ReturnType<typeof getSuppliersByUser>>> {
  return prisma.supplier.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

/**
 * Create a new supplier with audit fields
 */
export const createSupplier = async (data: {
  name: string;
  userId: string;
}) => {
  logger.debug("Creating supplier with data:", data);
  return prisma.supplier.create({
    data: {
      name: data.name,
      userId: data.userId,
      createdBy: data.userId, // Set createdBy same as userId
      createdAt: new Date(),
    },
  });
};

export const getSuppliersByUser = async (userId: string) => {
  return prisma.supplier.findMany({
    where: { userId },
  });
};

/**
 * Get the supplier entity linked to a supplier user (userId = supplier user id).
 * Used for role=supplier to resolve supplierId for "My Products" / "View Orders".
 * Returns null if no supplier is linked (e.g. supplier user not yet linked).
 */
export async function getSupplierByUserId(userId: string) {
  return prisma.supplier.findFirst({
    where: { userId },
    select: { id: true, name: true },
  });
}

/**
 * Get supplier by ID with all related data
 * Fetches a single supplier with products and related order items
 *
 * @param supplierId - Supplier ID
 * @param userId - User ID (for authorization check)
 * @returns Promise<Supplier | null> - Supplier or null if not found
 */
export const getSupplierById = async (supplierId: string, userId: string) => {
  return prisma.supplier.findFirst({
    where: {
      id: supplierId,
      userId, // Ensure user can only access their own suppliers
    },
    // Note: Products relation is not directly defined in schema;
    // we fetch products separately in the API route
  });
};

/**
 * Update a supplier with audit fields
 */
export const updateSupplier = async (
  id: string,
  data: { name?: string; updatedBy?: string }
) => {
  return prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.updatedBy && { updatedBy: data.updatedBy }),
      updatedAt: new Date(), // Always update timestamp
    },
  });
};

export const deleteSupplier = async (id: string) => {
  return prisma.supplier.delete({
    where: { id },
  });
};
