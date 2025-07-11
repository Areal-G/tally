/**
 * Seed inventory-operations demo data for the local demo account:
 * reorder points, purchase orders (draft / ordered / partial / received),
 * a stock-movement history, stock counts and customer returns.
 *
 * Run after seed-demo-warehouse.ts:
 *   npx tsx --env-file=.env scripts/seed-inventory-ops.ts
 *
 * Re-running wipes and recreates only these operations rows for the demo account.
 * Historical rows are records only — current product quantities are left as seeded.
 */
import { PrismaClient } from "@prisma/client";
import { DEMO_WAREHOUSE_ACCOUNT } from "./demo-warehouse.config";
import { seedDemoBarcodes } from "./seed-demo-barcodes";
import { seedDemoSupport } from "./seed-demo-support";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const now = Date.now();
const daysAgo = (n: number, hour = 10) => {
  const d = new Date(now - n * DAY);
  d.setHours(hour, (n * 17) % 60, 0, 0);
  return d;
};
const year = new Date().getFullYear();
const num = (prefix: string, n: number) => `${prefix}-${year}-${String(n).padStart(4, "0")}`;

type P = { id: string; name: string; sku: string; price: number; quantity: number; supplierId: string };

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_WAREHOUSE_ACCOUNT.email },
    select: { id: true },
  });
  if (!user) throw new Error("Demo account not found — run seed-demo-warehouse.ts first");
  const userId = user.id;

  await prisma.stockMovement.deleteMany({ where: { userId } });
  await prisma.purchaseOrder.deleteMany({ where: { userId } });
  await prisma.stockCount.deleteMany({ where: { userId } });
  await prisma.productReturn.deleteMany({ where: { userId } });

  const raw = await prisma.product.findMany({
    where: { userId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true, name: true, sku: true, price: true, quantity: true, supplierId: true },
    orderBy: { name: "asc" },
  });
  const products: P[] = raw.map((p) => ({ ...p, quantity: Number(p.quantity) }));
  const warehouses = await prisma.warehouse.findMany({ where: { userId }, select: { id: true, name: true } });
  if (products.length < 6 || warehouses.length === 0) throw new Error("Seed the catalog first");
  const main = warehouses[0]!;
  const overflow = warehouses[1] ?? main;

  /* Reorder points: tighter for fast movers, looser for bulky stock. */
  for (const [i, p] of products.entries()) {
    const point = [10, 15, 25, 30, 40][i % 5]!;
    await prisma.product.update({
      where: { id: p.id },
      data: {
        reorderPoint: point,
        reorderQuantity: i % 3 === 0 ? point * 3 : null,
        lotNumber: i % 4 === 0 ? `LOT-${String(year).slice(2)}${String(10 + (i % 3)).padStart(2, "0")}-${"ABCD"[i % 4]}` : null,
      },
    });
  }

  /* Purchase orders grouped by supplier. */
  const bySupplier = new Map<string, P[]>();
  for (const p of products) bySupplier.set(p.supplierId, [...(bySupplier.get(p.supplierId) ?? []), p]);
  const groups = [...bySupplier.entries()].filter(([, ps]) => ps.length > 0);
  const line = (p: P, qty: number, received: number) => ({
    productId: p.id,
    name: p.name,
    sku: p.sku,
    quantity: qty,
    receivedQuantity: received,
    unitCost: Math.round(p.price * 0.6 * 100) / 100,
  });
  const total = (ls: ReturnType<typeof line>[]) =>
    Math.round(ls.reduce((s, l) => s + l.quantity * l.unitCost, 0) * 100) / 100;

  const poPlan: { status: string; created: number; expectedIn?: number; recv?: number; wh: string; fill: number }[] = [
    { status: "received", created: 58, recv: 52, wh: main.id, fill: 1 },
    { status: "received", created: 41, recv: 36, wh: overflow.id, fill: 1 },
    { status: "received", created: 22, recv: 17, wh: main.id, fill: 1 },
    { status: "partial", created: 9, expectedIn: 3, wh: main.id, fill: 0.5 },
    { status: "ordered", created: 4, expectedIn: 6, wh: main.id, fill: 0 },
    { status: "ordered", created: 2, expectedIn: 10, wh: overflow.id, fill: 0 },
    { status: "draft", created: 0, wh: main.id, fill: 0 },
  ];

  const movements: Parameters<typeof prisma.stockMovement.create>[0]["data"][] = [];
  for (const [i, plan] of poPlan.entries()) {
    const [supplierId, ps] = groups[i % groups.length]!;
    const lines = ps.slice(0, 3).map((p, j) => {
      const qty = [40, 24, 60][j % 3]!;
      return line(p, qty, Math.round(qty * plan.fill));
    });
    const poNumber = num("PO", i + 1);
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        userId,
        supplierId,
        warehouseId: plan.wh,
        status: plan.status,
        lines,
        total: total(lines),
        notes: plan.status === "draft" ? "Waiting on updated price list" : null,
        expectedDate: plan.expectedIn != null ? new Date(now + plan.expectedIn * DAY) : plan.recv != null ? daysAgo(plan.recv + 1) : null,
        orderedAt: plan.status === "draft" ? null : daysAgo(plan.created),
        receivedAt: plan.recv != null ? daysAgo(plan.recv, 14) : null,
        createdAt: daysAgo(plan.created, 9),
        updatedAt: daysAgo(plan.recv ?? plan.created),
      },
    });
    for (const l of lines) {
      if (l.receivedQuantity <= 0) continue;
      movements.push({
        userId,
        productId: l.productId,
        warehouseId: plan.wh,
        type: "received",
        quantity: l.receivedQuantity,
        reason: "Purchase order receipt",
        reference: poNumber,
        referenceId: po.id,
        createdBy: userId,
        createdAt: daysAgo(plan.recv ?? 5, 14),
      });
    }
  }

  /* Manual adjustments. */
  const adj: [number, number, string, number][] = [
    [1, -2, "Damaged — dropped from pallet", 30],
    [4, -1, "Lost / stolen — missing after audit", 19],
    [6, 3, "Found — misplaced in overflow bay", 12],
    [8, -4, "Expired", 6],
    [2, -1, "Correction — mis-scan on receipt", 1],
  ];
  for (const [idx, q, reason, d] of adj) {
    const p = products[idx % products.length]!;
    movements.push({
      userId,
      productId: p.id,
      warehouseId: idx % 2 ? main.id : null,
      type: "adjustment",
      quantity: q,
      balanceAfter: p.quantity,
      reason,
      createdBy: userId,
      createdAt: daysAgo(d, 16),
    });
  }

  /* Stock counts: one posted with variances, one in progress. */
  const countProducts = products.slice(0, 8);
  const done = await prisma.stockCount.create({
    data: {
      countNumber: num("CNT", 1),
      userId,
      warehouseId: null,
      status: "completed",
      notes: "Monthly cycle count",
      lines: countProducts.map((p, i) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        expected: p.quantity + (i === 2 ? 2 : i === 5 ? -1 : 0),
        counted: p.quantity,
      })),
      createdAt: daysAgo(15, 8),
      completedAt: daysAgo(15, 11),
    },
  });
  for (const [i, delta] of [[2, -2], [5, 1]] as const) {
    const p = countProducts[i]!;
    movements.push({
      userId,
      productId: p.id,
      type: "count",
      quantity: delta,
      balanceAfter: p.quantity,
      reason: "Cycle count variance",
      reference: done.countNumber,
      referenceId: done.id,
      createdBy: userId,
      createdAt: daysAgo(15, 11),
    });
  }
  await prisma.stockCount.create({
    data: {
      countNumber: num("CNT", 2),
      userId,
      warehouseId: main.id,
      status: "draft",
      notes: "Aisle B spot check",
      lines: products.slice(3, 11).map((p, i) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        expected: Math.max(0, Math.round(p.quantity * 0.6)),
        counted: i < 4 ? Math.max(0, Math.round(p.quantity * 0.6) - (i === 1 ? 1 : 0)) : null,
      })),
      createdAt: daysAgo(1, 9),
    },
  });

  /* Returns against sold orders. */
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: ["confirmed", "processing", "shipped", "delivered"] } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const retPlan = [
    { status: "restocked", condition: "resellable", reason: "No longer needed", d: 11 },
    { status: "requested", condition: "resellable", reason: "Wrong item sent", d: 2 },
    { status: "requested", condition: "damaged", reason: "Damaged in transit", d: 1 },
  ];
  for (const [i, o] of orders.entries()) {
    const item = o.items[0];
    if (!item) continue;
    const plan = retPlan[i]!;
    const qty = Math.min(item.quantity, 1 + (i % 2));
    const ret = await prisma.productReturn.create({
      data: {
        returnNumber: num("RET", i + 1),
        userId,
        orderId: o.id,
        orderNumber: o.orderNumber,
        warehouseId: item.warehouseId ?? main.id,
        status: plan.status,
        reason: plan.reason,
        condition: plan.condition,
        lines: [{ productId: item.productId, name: item.productName, sku: item.sku ?? "", quantity: qty, unitPrice: item.price }],
        refundAmount: Math.round(qty * item.price * 100) / 100,
        createdAt: daysAgo(plan.d, 13),
        resolvedAt: plan.status === "restocked" ? daysAgo(plan.d - 1, 10) : null,
      },
    });
    if (plan.status === "restocked") {
      movements.push({
        userId,
        productId: item.productId,
        warehouseId: ret.warehouseId,
        type: "return",
        quantity: qty,
        reason: `Customer return — ${plan.reason}`,
        reference: ret.returnNumber,
        referenceId: ret.id,
        createdBy: userId,
        createdAt: daysAgo(plan.d - 1, 10),
      });
    }
  }

  await prisma.stockMovement.createMany({ data: movements });
  const scanDemo = await seedDemoBarcodes(prisma, userId);
  console.log(`Demo barcodes: ${scanDemo.barcodes} added, ${scanDemo.scans} recent scans`);
  const support = await seedDemoSupport(prisma, userId);
  console.log(`Demo support: ${support.tickets} tickets, ${support.replies} replies, ${support.reviews} reviews`);
  console.log(
    `Seeded ${poPlan.length} purchase orders, ${movements.length} movements, 2 counts, ${orders.length} returns, reorder points on ${products.length} products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
