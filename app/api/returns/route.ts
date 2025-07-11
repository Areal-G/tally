/**
 * Returns (RMA) — GET list, POST create a return request against a sold order.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { createReturnSchema, type ReturnLine } from "@/lib/inventory/schemas";
import {
  InventoryOpError,
  nextDocumentNumber,
  toReturnDTOs,
} from "@/lib/inventory/stock-ops.server";
import { opErrorResponse, parseBody, requireStoreOwner } from "@/lib/inventory/route-helpers";

const RETURNABLE_ORDER_STATUSES = ["confirmed", "processing", "shipped", "delivered"];

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  try {
    const rows = await prisma.productReturn.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(await toReturnDTOs(rows));
  } catch (error) {
    return opErrorResponse(error, "Loading returns");
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const data = await parseBody(request, createReturnSchema);
  if (data instanceof NextResponse) return data;

  try {
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, userId: session.id },
      include: { items: true },
    });
    if (!order) throw new InventoryOpError("Order not found", 404);
    if (!RETURNABLE_ORDER_STATUSES.includes(order.status)) {
      throw new InventoryOpError("Only confirmed, shipped or delivered orders can be returned");
    }
    if (data.warehouseId) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: data.warehouseId, userId: session.id },
        select: { id: true },
      });
      if (!wh) throw new InventoryOpError("Warehouse not found", 404);
    }

    // Quantities already returned (not rejected) on this order.
    const previous = await prisma.productReturn.findMany({
      where: { orderId: order.id, status: { not: "rejected" } },
      select: { lines: true },
    });
    const alreadyReturned = new Map<string, number>();
    for (const r of previous) {
      for (const l of (r.lines as unknown as ReturnLine[]) ?? []) {
        alreadyReturned.set(l.productId, (alreadyReturned.get(l.productId) ?? 0) + l.quantity);
      }
    }

    const lines: ReturnLine[] = [];
    for (const want of data.lines) {
      const items = order.items.filter((i) => i.productId === want.productId);
      if (items.length === 0) throw new InventoryOpError("That product is not on this order");
      const ordered = items.reduce((s, i) => s + i.quantity, 0);
      const left = ordered - (alreadyReturned.get(want.productId) ?? 0);
      if (want.quantity > left) {
        throw new InventoryOpError(`Only ${left} of ${items[0]!.productName} can still be returned`);
      }
      lines.push({
        productId: want.productId,
        name: items[0]!.productName,
        sku: items[0]!.sku ?? "",
        quantity: want.quantity,
        unitPrice: items[0]!.price,
      });
    }
    const refundAmount =
      Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;

    const row = await prisma.productReturn.create({
      data: {
        returnNumber: await nextDocumentNumber("productReturn", "RET"),
        userId: session.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        warehouseId: data.warehouseId ?? items0Warehouse(order.items, lines) ?? null,
        status: "requested",
        reason: data.reason,
        condition: data.condition,
        lines: lines as unknown as object,
        refundAmount,
        notes: data.notes ?? null,
      },
    });
    const [dto] = await toReturnDTOs([row]);
    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    return opErrorResponse(error, "Creating return");
  }
}

/** Default the return warehouse to where the first returned item was picked from. */
function items0Warehouse(
  items: { productId: string; warehouseId: string | null }[],
  lines: ReturnLine[],
): string | null {
  const first = items.find((i) => i.productId === lines[0]?.productId && i.warehouseId);
  return first?.warehouseId ?? null;
}
