import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { createMemoryPrismaClient } from "./memory-prisma";
import { seedDemoDatabase } from "./seed";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { DEMO_SUPPLIER } from "./accounts";

const FIXED_NOW = new Date("2026-11-15T12:00:00Z");

async function seededClient() {
  const prisma = createMemoryPrismaClient((c) => seedDemoDatabase(c, FIXED_NOW));
  await prisma.$connect();
  return prisma;
}

async function emptyClient() {
  return createMemoryPrismaClient();
}

describe("memory-prisma: writes and reads", () => {
  it("applies schema defaults and generates 24-char ObjectIds", async () => {
    const prisma = await emptyClient();
    const cat = await prisma.category.create({
      data: { name: "Tools", userId: "64d0e000aaaaaaaaaaaaaaaa", createdBy: "64d0e000aaaaaaaaaaaaaaaa" },
    });
    expect(cat.id).toMatch(/^[0-9a-f]{24}$/);
    expect(cat.status).toBe(true); // @default(true)
    expect(cat.createdAt).toBeInstanceOf(Date); // @default(now())
    expect(cat.description).toBeNull(); // optional, unset
  });

  it("throws P2002 on unique conflicts and P2025 on missing updates", async () => {
    const prisma = await emptyClient();
    const user = { name: "A", email: "a@x.test", username: "a", password: "x", role: "admin", createdAt: new Date() };
    await prisma.user.create({ data: user });
    await expect(prisma.user.create({ data: { ...user, username: "b" } })).rejects.toMatchObject({
      code: "P2002",
    });
    await expect(
      prisma.user.update({ where: { id: "64d0e000ffffffffffffffff" }, data: { name: "B" } }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("supports filters, ordering, pagination, distinct and isSet", async () => {
    const prisma = await emptyClient();
    const owner = "64d0e000aaaaaaaaaaaaaaaa";
    for (const [name, status] of [["Beta", true], ["alpha", false], ["Gamma", true]] as const) {
      await prisma.supplier.create({ data: { name, status, userId: owner, createdBy: owner } });
    }
    const insensitive = await prisma.supplier.findMany({
      where: { name: { contains: "A", mode: "insensitive" }, status: true },
      orderBy: { name: "desc" },
    });
    expect(insensitive.map((s) => s.name)).toEqual(["Gamma", "Beta"]);

    const page = await prisma.supplier.findMany({ orderBy: { name: "asc" }, skip: 1, take: 1 });
    expect(page.map((s) => s.name)).toEqual(["Gamma"]);

    const distinct = await prisma.supplier.findMany({ distinct: ["status"], select: { status: true } });
    expect(distinct).toHaveLength(2);

    expect(await prisma.supplier.count({ where: { notes: { isSet: false } } })).toBe(3);
    expect(await prisma.supplier.count({ where: { NOT: { status: true } } })).toBe(1);
  });

  it("creates nested children, includes relations and cascades deletes", async () => {
    const prisma = await emptyClient();
    const owner = "64d0e000aaaaaaaaaaaaaaaa";
    const product = await prisma.product.create({
      data: {
        name: "Drill",
        sku: "TL-1",
        price: 10,
        quantity: BigInt(5),
        status: "Available",
        categoryId: owner,
        supplierId: owner,
        userId: owner,
        createdBy: owner,
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: "ORD-1",
        userId: owner,
        total: 20,
        createdBy: owner,
        items: {
          create: [
            { productId: product.id, productName: "Drill", sku: "TL-1", quantity: 2, price: 10, subtotal: 20 },
          ],
        },
      },
      include: { items: true, _count: { select: { items: true } } },
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.orderId).toBe(order.id);
    expect((order as unknown as { _count: { items: number } })._count.items).toBe(1);

    const withSome = await prisma.order.findMany({ where: { items: { some: { sku: "TL-1" } } } });
    expect(withSome).toHaveLength(1);

    await prisma.order.delete({ where: { id: order.id } });
    expect(await prisma.orderItem.count()).toBe(0); // onDelete: Cascade
  });

  it("increments BigInt fields and aggregates / groups", async () => {
    const prisma = await emptyClient();
    const owner = "64d0e000aaaaaaaaaaaaaaaa";
    const base = { price: 1, status: "Available", categoryId: owner, userId: owner, createdBy: owner };
    const a = await prisma.product.create({ data: { ...base, name: "A", sku: "A", quantity: BigInt(2), supplierId: "s1" } });
    await prisma.product.create({ data: { ...base, name: "B", sku: "B", quantity: BigInt(3), supplierId: "s1" } });
    await prisma.product.create({ data: { ...base, name: "C", sku: "C", quantity: BigInt(4), supplierId: "s2" } });

    const updated = await prisma.product.update({ where: { id: a.id }, data: { quantity: { increment: 5 } } });
    expect(updated.quantity).toBe(BigInt(7));

    const agg = await prisma.product.aggregate({ _sum: { quantity: true, price: true }, _count: true });
    expect(agg._sum.quantity).toBe(BigInt(14));
    expect(agg._sum.price).toBe(3);
    expect(agg._count).toBe(3);

    const groups = await prisma.product.groupBy({
      by: ["supplierId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    expect(groups).toEqual([
      { supplierId: "s1", _count: { id: 2 } },
      { supplierId: "s2", _count: { id: 1 } },
    ]);
  });

  it("runs $transaction callbacks and arrays", async () => {
    const prisma = await emptyClient();
    const owner = "64d0e000aaaaaaaaaaaaaaaa";
    const [one, two] = await prisma.$transaction([
      prisma.warehouse.create({ data: { name: "W1", userId: owner, createdBy: owner } }),
      prisma.warehouse.create({ data: { name: "W2", userId: owner, createdBy: owner } }),
    ]);
    expect([one.name, two.name]).toEqual(["W1", "W2"]);
    const count = await prisma.$transaction(async (tx) => tx.warehouse.count());
    expect(count).toBe(2);
  });
});

describe("demo seed", () => {
  it("is deterministic: two instances produce identical ids", async () => {
    const [a, b] = await Promise.all([seededClient(), seededClient()]);
    const ids = async (p: typeof a) => ({
      users: (await p.user.findMany({ select: { id: true, email: true }, orderBy: { email: "asc" } })),
      products: (await p.product.findMany({ select: { id: true, sku: true }, orderBy: { sku: "asc" } })),
      orders: (await p.order.findMany({ select: { id: true, orderNumber: true }, orderBy: { orderNumber: "asc" } })),
    });
    expect(await ids(a)).toEqual(await ids(b));
  });

  it('lets the "Try demo" account sign in with its published password', async () => {
    const prisma = await seededClient();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_ACCOUNT.email } });
    expect(user.role).toBe("admin");
    expect(await bcrypt.compare(DEMO_ACCOUNT.password, user.password)).toBe(true);
  });

  it("fills the store and links the demo supplier to its company", async () => {
    const prisma = await seededClient();
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_ACCOUNT.email } });
    const supplier = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_SUPPLIER.email } });
    const client = await prisma.user.findUniqueOrThrow({ where: { email: "orders@riverbend.test" } });

    expect(await prisma.product.count({ where: { userId: admin.id } })).toBe(30);
    expect(await prisma.order.count({ where: { userId: admin.id } })).toBe(36);
    expect(await prisma.order.count({ where: { clientId: client.id } })).toBeGreaterThan(0);

    const apex = await prisma.supplier.findFirstOrThrow({ where: { userId: supplier.id } });
    expect(apex.name).toBe("Apex Distribution");
    expect(await prisma.product.count({ where: { supplierId: apex.id } })).toBeGreaterThan(0);
  });
});
