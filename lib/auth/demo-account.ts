/**
 * Public demo account behind the login page "Try demo" button.
 * Seeded by `npx tsx --env-file=.env scripts/seed-demo-warehouse.ts`.
 * Test values only — this password ships in the client bundle by design.
 */
export const DEMO_ACCOUNT = {
  name: "Dana Reyes",
  email: "demo@northgate.test",
  password: "Northgate-Demo-2026",
  company: "Northgate Supply Co.",
} as const;
