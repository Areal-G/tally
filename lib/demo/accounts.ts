/**
 * Seeded demo users. The store owner is the account behind the login page's
 * "Try demo" button (lib/auth/demo-account.ts); the supplier and client users
 * own the supplier-portal and client-portal data.
 */

import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";

type DemoUser = { name: string; email: string; username: string };

/** Store owner: owns the whole Northgate Supply Co. catalog. */
export const DEMO_ADMIN: DemoUser = {
  name: DEMO_ACCOUNT.name,
  email: DEMO_ACCOUNT.email,
  username: "demo-northgate",
};

/** Supplier user linked to the "Apex Distribution" supplier. */
export const DEMO_SUPPLIER: DemoUser = {
  name: "Marcus Lee",
  email: "test@supplier.com",
  username: "apex-distribution",
};

export const DEMO_COMPANY = DEMO_ACCOUNT.company;

/** Supplier record owned by DEMO_SUPPLIER (shared with every admin as the global demo supplier). */
export const DEMO_SUPPLIER_COMPANY = "Apex Distribution";
