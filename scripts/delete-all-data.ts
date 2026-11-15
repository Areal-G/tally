/**
 * Delete All Data
 *
 * Removes all documents from the database (fresh start). Run from project root
 * with the same DATABASE_URL as your app (local or VPS).
 *
 * Usage:
 *   npm run script:delete-all-data
 *   npx tsx scripts/delete-all-data.ts
 *
 * To refill the database afterwards with sample data, run:
 *   npm run seed
 */

import { PrismaClient } from "@prisma/client";
import { deleteAllDbData } from "./lib/delete-all-db-data";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🗑 Deleting all data...\n");

  const counts = await deleteAllDbData(prisma);
  for (const [model, count] of Object.entries(counts)) {
    console.log(`   ${model}: ${count}`);
  }

  console.log(
    "\n✅ All data deleted. Run  npm run seed  to load sample data.\n",
  );
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
