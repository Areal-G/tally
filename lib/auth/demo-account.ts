/**
 * Public demo account behind the login page "Try demo" button.
 * Seeded into the in-memory demo database at startup (lib/demo/seed).
 * Test values only — this password ships in the client bundle by design.
 */
export const DEMO_ACCOUNT = {
  name: "Dana Reyes",
  email: "demo@northgate.test",
  password: "Northgate-Demo-2026",
  company: "Northgate Supply Co.",
} as const;
