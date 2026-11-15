/**
 * Sample barcodes + recent scans for SEED_ACCOUNT, so /scan opens with a
 * "Recent scans" list instead of an empty state.
 *
 * - Every product without a barcode gets a valid EAN-13 (manufacturer-style for most,
 *   in-store "2…" for a few) so labels and scanning work out of the box.
 * - Five products get a lastScannedAt in the last couple of hours.
 *
 * Run alone:  npx tsx --env-file=.env scripts/seed-barcodes.ts
 * Also called by scripts/seed-inventory-ops.ts.
 */
import { PrismaClient } from "@prisma/client";
import { SEED_ACCOUNT, SEED_ACCOUNT_MISSING_MESSAGE } from "./seed.config";
import { gs1CheckDigit } from "../lib/inventory/barcode";

/** Deterministic EAN-13 per product index, so reseeding gives the same codes. */
function sampleEan13(index: number): string {
  const prefixes = ["0", "50", "40", "761", "871", "2"];
  const prefix = prefixes[index % prefixes.length]!;
  const body = (prefix + String(1_000_003_217 * (index + 7)).padStart(12, "7")).slice(0, 12);
  return body + gs1CheckDigit(body);
}

const MINUTES_AGO = [3, 11, 26, 48, 95];

export async function seedBarcodes(prisma: PrismaClient, userId: string): Promise<{ barcodes: number; scans: number }> {
  const products = await prisma.product.findMany({
    where: { userId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true, barcode: true, quantity: true },
    orderBy: { name: "asc" },
  });

  const used = new Set(products.map((p) => p.barcode).filter(Boolean));
  let barcodes = 0;
  for (const [i, p] of products.entries()) {
    if (p.barcode) continue;
    let code = sampleEan13(i);
    for (let k = 1; used.has(code); k++) code = sampleEan13(i + k * 97);
    used.add(code);
    await prisma.product.update({ where: { id: p.id }, data: { barcode: code } });
    barcodes++;
  }

  // Clear old scan history, then mark five in-stock products as recently scanned.
  await prisma.product.updateMany({ where: { userId }, data: { lastScannedAt: null } });
  const picks = products.filter((p) => Number(p.quantity) > 0).filter((_, i) => i % 3 === 1).slice(0, 5);
  for (const [i, p] of picks.entries()) {
    await prisma.product.update({
      where: { id: p.id },
      data: { lastScannedAt: new Date(Date.now() - MINUTES_AGO[i]! * 60_000) },
    });
  }
  return { barcodes, scans: picks.length };
}

async function main() {
  const prisma = new PrismaClient();
  try {
  const user = await prisma.user.findUnique({
    where: { email: SEED_ACCOUNT.email },
    select: { id: true },
  });
  if (!user) throw new Error(SEED_ACCOUNT_MISSING_MESSAGE);
  const result = await seedBarcodes(prisma, user.id);
  console.log(`Barcodes: ${result.barcodes} added, ${result.scans} recent scans`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed-barcodes.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
