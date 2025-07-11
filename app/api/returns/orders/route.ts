/**
 * Orders eligible for a return, with their line items (for the return dialog).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { opErrorResponse, requireStoreOwner } from "@/lib/inventory/route-helpers";

const RETURNABLE = ["confirmed", "processing", "shipped", "delivered"];

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  try {
    const orders = await prisma.order.findMany({
      where: { userId: session.id, status: { in: RETURNABLE } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        clientId: true,
        items: {
          select: { productId: true, productName: true, sku: true, quantity: true, price: true },
        },
      },
    });
    const clientIds = [...new Set(orders.map((o) => o.clientId).filter((x): x is string => !!x))];
    const clients = clientIds.length
      ? await prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(clients.map((c) => [c.id, c.name]));
    return NextResponse.json(
      orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        customerName: o.clientId ? (names.get(o.clientId) ?? null) : null,
        items: o.items,
      })),
    );
  } catch (error) {
    return opErrorResponse(error, "Loading returnable orders");
  }
}
