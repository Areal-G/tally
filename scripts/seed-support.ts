/**
 * Sample support tickets (with reply threads) and product reviews for
 * SEED_ACCOUNT, so the admin Tickets and Reviews pages look lived-in.
 *
 * - Clients open tickets about real products and orders; the store owner replies.
 * - A mix of open / in progress / resolved / closed and low → urgent priorities,
 *   spread over the last few weeks.
 * - Reviews are written by the buyer of a delivered order line (mostly approved,
 *   a few pending, one rejected).
 *
 * Safe to re-run: clears this store's tickets/reviews first.
 * Run alone:  npx tsx --env-file=.env scripts/seed-support.ts
 * Also called by scripts/seed-inventory-ops.ts.
 */
import { PrismaClient } from "@prisma/client";
import { SEED_ACCOUNT, SEED_ACCOUNT_MISSING_MESSAGE } from "./seed.config";

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR);

type Who = "client" | "owner";
type TicketSpec = {
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  /** Client email who opened it; omit for a ticket the owner opened. */
  client?: string;
  sku?: string;
  /** Use the client's n-th order (0-based) as the related order. */
  orderIndex?: number;
  openedHoursAgo: number;
  /** Thread after the description: [author, hours after opening, text]. */
  replies: [Who, number, string][];
};

const TICKETS: TicketSpec[] = [
  {
    subject: "Handheld terminal won't hold a charge",
    description:
      "Two of the rugged terminals from our last order drop from 100% to 20% in about three hours. Is this a known battery issue? We use them on full shifts.",
    status: "in_progress",
    priority: "high",
    client: "buyer@maplestreet.test",
    sku: "EL-TRM-450",
    orderIndex: 0,
    openedHoursAgo: 30,
    replies: [
      ["owner", 2, "Sorry about that. Could you send the serial numbers from the back label? We'll check them against the supplier's battery recall list."],
      ["client", 5, "Serials are TRM45-88213 and TRM45-88219. Both bought in the same order."],
      ["owner", 20, "Both are in the affected batch. Replacement batteries ship tomorrow, and you'll get a tracking number by email."],
    ],
  },
  {
    subject: "Missing box from delivery",
    description:
      "Our delivery arrived with 3 of 4 cartons. The packing slip lists the packing tape case but it wasn't in the shipment.",
    status: "open",
    priority: "urgent",
    client: "ap@greenline.test",
    sku: "PK-TPE-236",
    orderIndex: 0,
    openedHoursAgo: 3,
    replies: [],
  },
  {
    subject: "Can we get net-30 terms?",
    description:
      "We're placing regular weekly orders now. Is it possible to move our account to net-30 invoices instead of paying at checkout?",
    status: "open",
    priority: "low",
    client: "purchasing@summitoffice.test",
    openedHoursAgo: 52,
    replies: [
      ["owner", 6, "Happy to look at this. I'll review your order history and get back to you by Friday."],
    ],
  },
  {
    subject: "Wrong size safety vests",
    description:
      "We ordered large hi-vis vests but received a mix of large and medium. Can we swap the mediums?",
    status: "resolved",
    priority: "medium",
    client: "orders@riverbend.test",
    sku: "SF-VST-HVL",
    orderIndex: 1,
    openedHoursAgo: 140,
    replies: [
      ["owner", 3, "Apologies for the mix-up. We've created a return label for the mediums and are sending larges today."],
      ["client", 30, "Larges arrived this morning, thanks for the quick turnaround."],
      ["owner", 31, "Great to hear. Marking this one resolved."],
    ],
  },
  {
    subject: "Label printer prints blank labels",
    description:
      "The thermal label printer feeds labels but nothing prints. We've tried two rolls of labels.",
    status: "resolved",
    priority: "high",
    client: "orders@riverbend.test",
    sku: "EL-PRT-210",
    openedHoursAgo: 220,
    replies: [
      ["owner", 1, "Those are direct-thermal labels — make sure the shiny side faces the print head. Could you try flipping the roll?"],
      ["client", 2, "That was it. Printing fine now!"],
    ],
  },
  {
    subject: "Invoice shows the wrong ship-to address",
    description:
      "The latest invoice lists our old Cleveland address. Our accounts team needs it corrected before they can pay.",
    status: "in_progress",
    priority: "medium",
    client: "ap@greenline.test",
    orderIndex: 1,
    openedHoursAgo: 75,
    replies: [
      ["owner", 4, "Thanks for flagging. I've updated the address on your account. I'll reissue the invoice once our accountant signs off."],
      ["client", 26, "Any update? Our payment run is on Thursday."],
    ],
  },
  {
    subject: "Bulk pricing on nitrile gloves",
    description:
      "We go through about 40 boxes of nitrile gloves a month. Do you offer a volume discount at that level?",
    status: "closed",
    priority: "low",
    client: "buyer@maplestreet.test",
    sku: "SF-GLV-N100",
    openedHoursAgo: 400,
    replies: [
      ["owner", 8, "Yes — at 40+ boxes a month we can do 12% off. I've added that to your account pricing."],
      ["client", 12, "Perfect, thank you."],
    ],
  },
  {
    subject: "Pallet jack arrived with a hydraulic leak",
    description:
      "The new pallet jack is leaking oil from the pump. We've taken it out of service.",
    status: "open",
    priority: "high",
    client: "purchasing@summitoffice.test",
    sku: "TL-PJK-55",
    orderIndex: 0,
    openedHoursAgo: 9,
    replies: [
      ["owner", 1, "Thanks for pulling it from use. Please send a photo of the leak and we'll start a warranty claim with the manufacturer."],
    ],
  },
  {
    subject: "Coffee order delivered past best-by date",
    description:
      "Two bags of ground coffee in our order are already past their best-by date.",
    status: "closed",
    priority: "medium",
    client: "orders@riverbend.test",
    sku: "FB-COF-2LB",
    openedHoursAgo: 520,
    replies: [
      ["owner", 5, "Sorry about that. We've credited both bags to your account and pulled the old lot from the shelf."],
    ],
  },
  {
    subject: "Need a copy of the safety data sheet",
    description:
      "Could you send the SDS for the floor cleaner concentrate? Our safety audit is next week.",
    status: "resolved",
    priority: "low",
    client: "buyer@maplestreet.test",
    sku: "CL-FLR-1G",
    openedHoursAgo: 96,
    replies: [
      ["owner", 2, "Attached to your account documents now. Let us know if the auditor needs anything else."],
    ],
  },
  {
    subject: "Restock date for bubble wrap",
    description: "Our usual bubble wrap roll shows low stock. When is the next delivery expected?",
    status: "in_progress",
    priority: "medium",
    client: "ap@greenline.test",
    sku: "PK-BWR-175",
    openedHoursAgo: 20,
    replies: [
      ["owner", 3, "A purchase order is out with the supplier. We expect it on our shelves early next week and will hold 10 rolls for you."],
    ],
  },
  {
    subject: "Scanner battery recall — follow up with supplier",
    description:
      "Internal: confirm the battery batch numbers with the electronics supplier and arrange replacements for affected customers.",
    status: "open",
    priority: "medium",
    sku: "EL-SCN-100",
    openedHoursAgo: 26,
    replies: [],
  },
];

type ReviewSpec = { rating: number; comment: string; status: "approved" | "pending" | "rejected" };
const REVIEWS: ReviewSpec[] = [
  { rating: 5, comment: "Exactly what we needed. Arrived on time and well packed.", status: "approved" },
  { rating: 4, comment: "Good quality for the price. Would order again.", status: "approved" },
  { rating: 5, comment: "Our team uses these every day — holding up great so far.", status: "approved" },
  { rating: 3, comment: "Does the job, but the packaging was a bit damaged on arrival.", status: "approved" },
  { rating: 5, comment: "Fast delivery and the quantity was spot on.", status: "approved" },
  { rating: 4, comment: "Solid product. Instructions could be clearer.", status: "pending" },
  { rating: 2, comment: "Not as durable as we hoped. Two broke in the first week.", status: "approved" },
  { rating: 5, comment: "Best price we've found for this item. Reordering monthly.", status: "pending" },
  { rating: 4, comment: "Works well, the warehouse crew likes it.", status: "approved" },
  { rating: 1, comment: "Check out my website for cheap deals!!!", status: "rejected" },
  { rating: 5, comment: "Great service from the Northgate team as always.", status: "approved" },
  { rating: 4, comment: "Reliable and consistent from order to order.", status: "pending" },
];

export async function seedSupport(
  prisma: PrismaClient,
  ownerId: string,
): Promise<{ tickets: number; replies: number; reviews: number }> {
  const clients = await prisma.user.findMany({
    where: { role: "client", email: { endsWith: ".test" } },
    select: { id: true, email: true },
  });
  const clientId = new Map(clients.map((c) => [c.email, c.id]));
  const products = await prisma.product.findMany({
    where: { userId: ownerId },
    select: { id: true, sku: true, name: true, supplierId: true },
  });
  const productId = new Map(products.map((p) => [p.sku, p]));
  const productIds = products.map((p) => p.id);
  const orders = await prisma.order.findMany({
    where: { userId: ownerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientId: true,
      status: true,
      createdAt: true,
      items: { select: { id: true, productId: true, productName: true, sku: true } },
    },
  });

  // Fresh start for this store.
  const people = [ownerId, ...clients.map((c) => c.id)];
  await prisma.supportTicket.deleteMany({
    where: { OR: [{ userId: { in: people } }, { assignedToId: ownerId }] },
  });
  await prisma.productReview.deleteMany({ where: { productId: { in: productIds } } });

  let replies = 0;
  for (const spec of TICKETS) {
    const authorId = spec.client ? clientId.get(spec.client) : ownerId;
    if (!authorId) continue;
    const product = spec.sku ? productId.get(spec.sku) : undefined;
    const order =
      spec.orderIndex !== undefined && spec.client
        ? orders.filter((o) => o.clientId === authorId)[spec.orderIndex]
        : undefined;
    const opened = ago(spec.openedHoursAgo);
    const thread = spec.replies.map(([who, after, body]) => ({
      userId: who === "owner" ? ownerId : authorId,
      body,
      createdAt: new Date(opened.getTime() + after * HOUR),
    }));
    const last = thread.at(-1)?.createdAt ?? opened;
    await prisma.supportTicket.create({
      data: {
        subject: spec.subject,
        description: spec.description,
        status: spec.status,
        priority: spec.priority,
        userId: authorId,
        assignedToId: ownerId,
        productId: product?.id ?? null,
        supplierId: product?.supplierId ?? null,
        orderId: order?.id ?? null,
        createdAt: opened,
        updatedAt: last,
        ...(thread.length ? { replies: { create: thread } } : {}),
      },
    });
    replies += thread.length;
  }

  // One review per delivered order line, buyer = the order's client.
  const lines = orders
    .filter((o) => o.status === "delivered" && o.clientId)
    .flatMap((o) => o.items.map((item) => ({ order: o, item })));
  let reviews = 0;
  for (const [i, spec] of REVIEWS.entries()) {
    const line = lines[i * 2];
    if (!line) break;
    const created = new Date(line.order.createdAt.getTime() + (3 + (i % 4)) * 24 * HOUR);
    await prisma.productReview.create({
      data: {
        productId: line.item.productId,
        userId: line.order.clientId!,
        orderId: line.order.id,
        orderItemId: line.item.id,
        productName: line.item.productName,
        productSku: line.item.sku,
        rating: spec.rating,
        comment: spec.comment,
        status: spec.status,
        createdAt: created < new Date() ? created : ago(12 + i),
        updatedAt: null,
      },
    });
    reviews++;
  }

  return { tickets: TICKETS.length, replies, reviews };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: SEED_ACCOUNT.email },
      select: { id: true },
    });
    if (!user) throw new Error(SEED_ACCOUNT_MISSING_MESSAGE);
    const r = await seedSupport(prisma, user.id);
    console.log(`Support: ${r.tickets} tickets, ${r.replies} replies, ${r.reviews} reviews`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed-support.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
