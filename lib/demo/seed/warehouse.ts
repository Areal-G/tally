/**
 * Northgate Supply Co. sample store for the demo: categories, suppliers,
 * warehouses, 30 products with stock allocations, client accounts, 36 orders
 * with invoices, stock transfers and notifications.
 *
 * Deterministic: the same PRNG seed and insertion order produce the same rows
 * (and, with the in-memory client, the same ids) on every server instance.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { DEMO_ADMIN, DEMO_COMPANY } from "@/lib/demo/accounts";

const DAY = 24 * 60 * 60 * 1000;

/** Linear congruential generator; same seed → same sequence. */
function createRandom(seed: number) {
  let state = seed;
  const rand = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return {
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!,
    between: (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min,
  };
}

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

export type WarehouseSeedResult = {
  ownerId: string;
  clientIds: string[];
};

/**
 * Create the store owner (DEMO_ADMIN) and the Northgate catalog.
 * `passwordHashes.owner` is the store owner's login ("Try demo"); clients get
 * `passwordHashes.other`, which nobody can sign in with.
 */
export async function seedWarehouse(
  prisma: PrismaClient,
  passwordHashes: { owner: string; other: string },
  now: Date = new Date(),
): Promise<WarehouseSeedResult> {
  const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
  const { pick, between } = createRandom(42);

  const { id: userId } = await prisma.user.create({
    data: {
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      username: DEMO_ADMIN.username,
      password: passwordHashes.owner,
      role: "admin",
      createdAt: daysAgo(160),
    },
    select: { id: true },
  });

  const ensureClient = async (name: string, email: string, i: number) => {
    const row = await prisma.user.create({
      data: {
        name,
        email,
        username: email.split("@")[0]! + i,
        password: passwordHashes.other,
        role: "client",
        createdAt: daysAgo(120),
      },
      select: { id: true },
    });
    return row.id;
  };

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
      name: clientIdx === -1 ? DEMO_COMPANY : CLIENTS[clientIdx]![0],
      email: clientIdx === -1 ? DEMO_ADMIN.email : CLIENTS[clientIdx]![1],
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

  return { ownerId: userId, clientIds };
}
