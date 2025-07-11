/**
 * Seed a realistic warehouse catalog for the local demo account.
 *
 * 1. Sign up on http://localhost:3607/register with the values in
 *    scripts/demo-warehouse.config.ts (or let this script create the user).
 * 2. npx tsx --env-file=.env scripts/seed-demo-warehouse.ts
 *
 * Re-running wipes and recreates the demo account's own catalog rows only.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_WAREHOUSE_ACCOUNT } from "./demo-warehouse.config";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

// Deterministic PRNG so every reseed looks the same.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

const CATEGORIES = [
  ["Electronics", "Consumer electronics and accessories"],
  ["Office Supplies", "Paper, writing and desk essentials"],
  ["Packaging", "Boxes, mailers, tape and void fill"],
  ["Tools & Hardware", "Hand tools, power tools and fasteners"],
  ["Safety & PPE", "Protective equipment for warehouse staff"],
  ["Cleaning & Janitorial", "Facility cleaning supplies"],
  ["Food & Beverage", "Shelf-stable breakroom and resale stock"],
] as const;

const SUPPLIERS = [
  ["Apex Distribution", "National electronics wholesaler", "Net 30. Rep: Marcus Lee"],
  ["Bluewater Paper Co.", "Office and paper goods", "Free freight over $500"],
  ["Crestline Packaging", "Corrugated and poly packaging", "Lead time 5 business days"],
  ["Ironforge Tools", "Industrial tools and hardware", "Annual contract pricing"],
  ["SafeGuard Industrial", "PPE and safety gear", "Certified ANSI supplier"],
  ["PureClean Supply", "Janitorial and sanitation", "Monthly standing order"],
  ["Harvest Pantry Foods", "Snacks and beverages", "Check expiry on receipt"],
] as const;

const WAREHOUSES = [
  ["Northgate Main DC", "1200 Industrial Pkwy, Columbus, OH 43219", "main"],
  ["Eastside Overflow", "88 Dock St, Pittsburgh, PA 15222", "secondary"],
  ["Lakefront Cold Storage", "455 Harbor Rd, Cleveland, OH 44114", "storage"],
] as const;

// name, sku, category index, supplier index, price, qty, expires in days (perishable)
const PRODUCTS: [string, string, number, number, number, number, number?][] = [
  ["Wireless Barcode Scanner", "EL-SCN-100", 0, 0, 89.99, 64],
  ["Thermal Label Printer", "EL-PRT-210", 0, 0, 249.0, 18],
  ["USB-C Charging Hub 7-Port", "EL-HUB-007", 0, 0, 39.5, 142],
  ["Rugged Handheld Terminal", "EL-TRM-450", 0, 0, 699.0, 9],
  ["Noise-Cancel Headset", "EL-HDS-320", 0, 0, 129.0, 0],
  ["Copy Paper A4 (case/10 reams)", "OF-PAP-A4C", 1, 1, 42.0, 310],
  ["Gel Pens Black (box/24)", "OF-PEN-G24", 1, 1, 11.25, 220],
  ["Shipping Labels 4x6 (roll/500)", "OF-LBL-46R", 1, 1, 18.9, 15],
  ["Clipboard Hardboard", "OF-CLP-HB1", 1, 1, 3.4, 95],
  ["Corrugated Box 12x12x12 (bundle/25)", "PK-BOX-121", 2, 2, 31.0, 480],
  ["Poly Mailer 10x13 (pack/100)", "PK-MLR-1013", 2, 2, 16.5, 260],
  ["Packing Tape 2in (case/36)", "PK-TPE-236", 2, 2, 54.0, 12],
  ["Bubble Wrap Roll 12in x 175ft", "PK-BWR-175", 2, 2, 27.75, 74],
  ["Stretch Film 18in Hand Wrap", "PK-STR-18H", 2, 2, 22.0, 0],
  ["Cordless Drill 20V Kit", "TL-DRL-20V", 3, 3, 149.0, 22],
  ["Pallet Jack 5500lb", "TL-PJK-55", 3, 3, 389.0, 6],
  ["Box Cutter Safety Knife", "TL-KNF-SAF", 3, 3, 7.95, 340],
  ["Hex Bolt Assortment (kit/240)", "TL-BLT-240", 3, 3, 24.6, 58],
  ["Hi-Vis Safety Vest (L)", "SF-VST-HVL", 4, 4, 8.5, 175],
  ["Nitrile Gloves (box/100)", "SF-GLV-N100", 4, 4, 12.99, 16],
  ["Steel-Toe Boot Covers", "SF-BTC-STL", 4, 4, 19.0, 44],
  ["Hard Hat Type II", "SF-HHT-T2", 4, 4, 27.0, 31],
  ["Safety Glasses Anti-Fog", "SF-GLS-AF", 4, 4, 6.25, 260],
  ["Floor Cleaner Concentrate 1gal", "CL-FLR-1G", 5, 5, 18.4, 66],
  ["Paper Towels (case/12)", "CL-TWL-C12", 5, 5, 34.0, 11],
  ["Heavy-Duty Trash Bags 55gal", "CL-BAG-55", 5, 5, 29.9, 120],
  ["Bottled Water 16.9oz (case/24)", "FB-WTR-24", 6, 6, 5.99, 200, 365],
  ["Granola Bars Variety (box/48)", "FB-GRN-48", 6, 6, 21.5, 14, 120],
  ["Ground Coffee 2lb", "FB-COF-2LB", 6, 6, 16.75, 48, 200],
  ["Energy Drink 12oz (case/24)", "FB-NRG-24", 6, 6, 32.0, 0, 240],
];

const CLIENTS = [
  ["Riverbend Hardware", "orders@riverbend.test"],
  ["Summit Office Outfitters", "purchasing@summitoffice.test"],
  ["Greenline Logistics", "ap@greenline.test"],
  ["Maple Street Market", "buyer@maplestreet.test"],
] as const;

const CITIES = [
  ["410 Commerce Dr", "Columbus", "OH", "43215"],
  ["72 Market St", "Pittsburgh", "PA", "15219"],
  ["9 Lakeview Ave", "Cleveland", "OH", "44113"],
  ["1550 Elm St", "Cincinnati", "OH", "45202"],
] as const;

const statusFor = (qty: number) =>
  qty === 0 ? "Stock Out" : qty < 20 ? "Stock Low" : "Available";

async function ensureUser(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_WAREHOUSE_ACCOUNT.email },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      name: DEMO_WAREHOUSE_ACCOUNT.name,
      email: DEMO_WAREHOUSE_ACCOUNT.email,
      username: "demo-northgate",
      password: await bcrypt.hash(DEMO_WAREHOUSE_ACCOUNT.password, 10),
      role: "admin",
      createdAt: now,
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureClient(name: string, email: string, i: number) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const row = await prisma.user.create({
    data: {
      name,
      email,
      username: email.split("@")[0]! + i,
      // Clients are display-only; random password nobody knows.
      password: await bcrypt.hash(Math.random().toString(36), 10),
      role: "client",
      createdAt: daysAgo(120),
    },
    select: { id: true },
  });
  return row.id;
}

async function wipeOwned(userId: string) {
  const orders = await prisma.order.findMany({ where: { userId }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  await prisma.invoice.deleteMany({ where: { userId } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.stockTransfer.deleteMany({ where: { userId } });
  await prisma.stockAllocation.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.supplier.deleteMany({ where: { userId } });
  await prisma.warehouse.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.importHistory.deleteMany({ where: { userId } });
}

async function main() {
  const userId = await ensureUser();
  await wipeOwned(userId);
  const audit = { userId, createdBy: userId, updatedBy: userId };

  const categoryIds: string[] = [];
  for (const [name, description] of CATEGORIES) {
    const c = await prisma.category.create({
      data: { name, description, status: true, ...audit, createdAt: daysAgo(150), updatedAt: daysAgo(150) },
    });
    categoryIds.push(c.id);
  }

  const supplierIds: string[] = [];
  for (const [name, description, notes] of SUPPLIERS) {
    const s = await prisma.supplier.create({
      data: { name, description, notes, status: true, ...audit, createdAt: daysAgo(150), updatedAt: daysAgo(150) },
    });
    supplierIds.push(s.id);
  }

  const warehouseIds: string[] = [];
  for (const [name, address, type] of WAREHOUSES) {
    const w = await prisma.warehouse.create({
      data: { name, address, type, status: true, ...audit, createdAt: daysAgo(150), updatedAt: daysAgo(150) },
    });
    warehouseIds.push(w.id);
  }

  const products: { id: string; name: string; sku: string; price: number; qty: number }[] = [];
  for (const [i, [name, sku, cat, sup, price, qty, expires]] of PRODUCTS.entries()) {
    const created = daysAgo(140 - i * 3);
    const p = await prisma.product.create({
      data: {
        name,
        sku,
        price,
        // Local illustrated product image (public/products/<sku>.svg)
        imageUrl: `/products/${sku.toLowerCase()}.svg`,
        quantity: BigInt(qty),
        reservedQuantity: BigInt(0),
        status: statusFor(qty),
        categoryId: categoryIds[cat]!,
        supplierId: supplierIds[sup]!,
        expirationDate: expires ? new Date(now.getTime() + expires * DAY) : null,
        ...audit,
        createdAt: created,
        updatedAt: created,
      },
    });
    products.push({ id: p.id, name, sku, price, qty });

    // Split stock across warehouses: ~70% main, rest overflow (food also in cold storage).
    if (qty > 0) {
      const main = Math.ceil(qty * 0.7);
      const rest = qty - main;
      await prisma.stockAllocation.create({
        data: { productId: p.id, warehouseId: warehouseIds[0]!, quantity: BigInt(main), reservedQuantity: BigInt(0), userId, createdAt: created, updatedAt: created },
      });
      if (rest > 0) {
        await prisma.stockAllocation.create({
          data: { productId: p.id, warehouseId: warehouseIds[cat === 6 ? 2 : 1]!, quantity: BigInt(rest), reservedQuantity: BigInt(0), userId, createdAt: created, updatedAt: created },
        });
      }
    }
  }

  const clientIds: string[] = [];
  for (const [i, [name, email]] of CLIENTS.entries()) {
    clientIds.push(await ensureClient(name, email, i));
  }

  // Orders spread over the last 90 days, newest ones still in progress.
  const inStock = products.filter((p) => p.qty > 0);
  for (let n = 1; n <= 36; n++) {
    const age = Math.round(90 - n * 2.4);
    const date = daysAgo(age);
    const status =
      n % 13 === 0 ? "cancelled" : age > 20 ? "delivered" : age > 10 ? "shipped" : age > 4 ? "confirmed" : "pending";
    const paymentStatus =
      status === "cancelled" ? "refunded" : status === "delivered" ? "paid" : status === "shipped" ? pick(["paid", "partial"] as const) : "unpaid";
    const clientIdx = n % 5 === 0 ? -1 : n % CLIENTS.length;
    const clientId = clientIdx === -1 ? null : clientIds[clientIdx];
    const [street, city, state, zipCode] = CITIES[n % CITIES.length]!;
    const address = {
      name: clientIdx === -1 ? DEMO_WAREHOUSE_ACCOUNT.company : CLIENTS[clientIdx]![0],
      email: clientIdx === -1 ? DEMO_WAREHOUSE_ACCOUNT.email : CLIENTS[clientIdx]![1],
      street, city, state, zipCode, country: "US",
    } as unknown as Prisma.InputJsonValue;

    const lines = Array.from({ length: between(1, 3) }, () => pick(inStock));
    const unique = [...new Map(lines.map((l) => [l.id, l])).values()];
    const items = unique.map((p) => {
      const quantity = between(1, Math.max(1, Math.min(12, Math.floor(p.qty / 4))));
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantity,
        price: p.price,
        subtotal: Math.round(p.price * quantity * 100) / 100,
        warehouseId: warehouseIds[0]!,
        warehouseName: WAREHOUSES[0][0],
        createdAt: date,
      };
    });
    const subtotal = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
    const tax = Math.round(subtotal * 0.0725 * 100) / 100;
    const shipping = subtotal > 500 ? 0 : 14.95;
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;
    const orderNumber = `ORD-2026-${String(1000 + n)}`;
    const shipped = status === "shipped" || status === "delivered";
    const tracking = shipped ? `1Z${String(880000000 + n * 7919)}` : null;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        clientId,
        status,
        paymentStatus,
        subtotal,
        tax,
        shipping: shipping || null,
        total,
        shippingAddress: address,
        billingAddress: address,
        notes: n % 4 === 0 ? "Deliver to receiving dock B" : null,
        trackingNumber: tracking,
        trackingCarrier: tracking ? "ups" : null,
        shippedAt: shipped ? new Date(date.getTime() + 2 * DAY) : null,
        deliveredAt: status === "delivered" ? new Date(date.getTime() + 5 * DAY) : null,
        cancelledAt: status === "cancelled" ? new Date(date.getTime() + DAY) : null,
        createdBy: clientId ?? userId,
        updatedBy: userId,
        createdAt: date,
        updatedAt: date,
        items: { create: items },
      },
    });

    if (status !== "pending") {
      const paid = paymentStatus === "paid" ? total : paymentStatus === "partial" ? Math.round(total * 0.4 * 100) / 100 : 0;
      const due = new Date(date.getTime() + 30 * DAY);
      const invStatus =
        status === "cancelled" ? "cancelled" : paymentStatus === "paid" ? "paid" : due < now ? "overdue" : "sent";
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2026-${String(1000 + n)}`,
          orderId: order.id,
          userId,
          clientId,
          status: invStatus,
          subtotal,
          tax,
          shipping: shipping || null,
          total,
          amountPaid: paid,
          amountDue: Math.max(0, Math.round((total - paid) * 100) / 100),
          dueDate: due,
          issuedAt: date,
          sentAt: date,
          paidAt: invStatus === "paid" ? new Date(date.getTime() + 3 * DAY) : null,
          billingAddress: address,
          createdBy: userId,
          updatedBy: userId,
          createdAt: date,
          updatedAt: date,
        },
      });
    }
  }

  // A few inter-warehouse transfers.
  for (const [i, p] of inStock.slice(0, 5).entries()) {
    await prisma.stockTransfer.create({
      data: {
        productId: p.id,
        fromWarehouseId: warehouseIds[0]!,
        toWarehouseId: warehouseIds[1]!,
        quantity: BigInt(Math.max(1, Math.floor(p.qty * 0.05))),
        status: i === 4 ? "pending" : "completed",
        notes: "Rebalance for regional demand",
        userId,
        createdAt: daysAgo(30 - i * 5),
        completedAt: i === 4 ? null : daysAgo(29 - i * 5),
      },
    });
  }

  const lowStock = products.filter((p) => p.qty > 0 && p.qty < 20);
  const outStock = products.filter((p) => p.qty === 0);
  const notes = [
    ...lowStock.slice(0, 3).map((p) => ({ type: "low_stock", title: "Low stock", message: `${p.name} is down to ${p.qty} units`, link: `/products/${p.id}` })),
    ...outStock.slice(0, 2).map((p) => ({ type: "stock_out", title: "Out of stock", message: `${p.name} (${p.sku}) is out of stock`, link: `/products/${p.id}` })),
  ];
  for (const [i, n] of notes.entries()) {
    await prisma.notification.create({
      data: { userId, ...n, read: i > 2, readAt: i > 2 ? daysAgo(1) : null, createdAt: daysAgo(i) },
    });
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${SUPPLIERS.length} suppliers, ${WAREHOUSES.length} warehouses, ` +
      `${PRODUCTS.length} products, 36 orders for ${DEMO_WAREHOUSE_ACCOUNT.email}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
