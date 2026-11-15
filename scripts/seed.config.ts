/**
 * Owner account created by `npm run seed` (scripts/seed-warehouse.ts).
 *
 * Override with SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD in .env. The defaults
 * are for a local development database only — never seed a shared or
 * production database with them.
 */
export const SEED_ACCOUNT = {
  name: process.env.SEED_OWNER_NAME ?? "Dana Reyes",
  email: process.env.SEED_OWNER_EMAIL ?? "owner@northgate.test",
  password: process.env.SEED_OWNER_PASSWORD ?? "change-me-locally",
  company: "Northgate Supply Co.",
} as const;

export const SEED_ACCOUNT_MISSING_MESSAGE =
  "Seed owner account not found. Run `npm run seed` (scripts/seed-warehouse.ts) first.";
