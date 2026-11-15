/**
 * Builds the demo's in-memory database: the Northgate Supply Co. store owned by
 * DEMO_ADMIN (the "Try demo" login), its clients, inventory operations, support
 * tickets, and DEMO_SUPPLIER linked to the "Apex Distribution" supplier.
 */

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { DEMO_SUPPLIER, DEMO_SUPPLIER_COMPANY } from "@/lib/demo/accounts";
import { seedWarehouse } from "./warehouse";
import { seedInventoryOps } from "./inventory-ops";

/** Same cost as real sign-ups, so the demo login behaves like the real one. */
const OWNER_PASSWORD_COST = 10;
/** Low bcrypt cost: these hashes only fill the required column, nobody signs in with them. */
const UNUSED_PASSWORD_COST = 4;

export async function seedDemoDatabase(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<void> {
  const [owner, other] = await Promise.all([
    bcrypt.hash(DEMO_ACCOUNT.password, OWNER_PASSWORD_COST),
    bcrypt.hash(randomUUID(), UNUSED_PASSWORD_COST),
  ]);

  const { ownerId } = await seedWarehouse(prisma, { owner, other }, now);
  await seedInventoryOps(prisma, ownerId, now);

  const supplierUser = await prisma.user.create({
    data: {
      name: DEMO_SUPPLIER.name,
      email: DEMO_SUPPLIER.email,
      username: DEMO_SUPPLIER.username,
      password: other,
      role: "supplier",
      createdAt: now,
    },
    select: { id: true },
  });

  // The supplier portal resolves a supplier user's company via Supplier.userId.
  // Admins still see this supplier through the global demo supplier rule
  // (prisma/supplier.ts → getSuppliersForAdminIncludingDemo).
  const apex = await prisma.supplier.findFirst({
    where: { userId: ownerId, name: DEMO_SUPPLIER_COMPANY },
    select: { id: true },
  });
  if (!apex) throw new Error(`Seed is missing the "${DEMO_SUPPLIER_COMPANY}" supplier`);
  await prisma.supplier.update({
    where: { id: apex.id },
    data: { userId: supplierUser.id },
  });
}
