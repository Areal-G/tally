/**
 * Stock count — PATCH { action: save | complete, lines }, DELETE draft.
 * Completing posts the variance (counted − expected) for each counted line.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import {
  scheduleInvalidateProductCaches,
  scheduleInvalidateStockAllocationCaches,
} from "@/lib/cache";
import { updateStockCountSchema, type StockCountLine } from "@/lib/inventory/schemas";
import {
  InventoryOpError,
  applyStockDelta,
  toStockCountDTOs,
} from "@/lib/inventory/stock-ops.server";
import {
  opErrorResponse,
  parseBody,
  requireStoreOwner,
} from "@/lib/inventory/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const data = await parseBody(request, updateStockCountSchema);
  if (data instanceof NextResponse) return data;

  try {
    const count = await prisma.stockCount.findFirst({ where: { id, userId: session.id } });
    if (!count) throw new InventoryOpError("Stock count not found", 404);
    if (count.status !== "draft") throw new InventoryOpError("This count is already completed");

    const counted = new Map(data.lines.map((l) => [l.productId, l.counted]));
    const lines = ((count.lines as unknown as StockCountLine[]) ?? []).map((l) =>
      counted.has(l.productId) ? { ...l, counted: counted.get(l.productId) ?? null } : l,
    );

    if (data.action === "complete") {
      if (!lines.some((l) => l.counted !== null)) {
        throw new InventoryOpError("Enter at least one counted quantity");
      }
      for (const line of lines) {
        if (line.counted === null) continue;
        const delta = line.counted - line.expected;
        if (delta === 0) continue;
        await applyStockDelta({
          ownerId: session.id,
          actorId: session.id,
          productId: line.productId,
          warehouseId: count.warehouseId,
          delta,
          type: "count",
          reason: "Cycle count variance",
          reference: count.countNumber,
          referenceId: count.id,
        });
      }
    }

    const row = await prisma.stockCount.update({
      where: { id },
      data: {
        lines: lines as unknown as object,
        ...(data.action === "complete" ? { status: "completed", completedAt: new Date() } : {}),
      },
    });
    if (data.action === "complete") await Promise.all([scheduleInvalidateProductCaches(), scheduleInvalidateStockAllocationCaches()]);
    const [dto] = await toStockCountDTOs([row]);
    return NextResponse.json(dto);
  } catch (error) {
    return opErrorResponse(error, "Updating stock count");
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const count = await prisma.stockCount.findFirst({ where: { id, userId: session.id } });
    if (!count) throw new InventoryOpError("Stock count not found", 404);
    if (count.status !== "draft") throw new InventoryOpError("Completed counts are kept for audit");
    await prisma.stockCount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return opErrorResponse(error, "Deleting stock count");
  }
}
