/**
 * Stock movements — GET unified history, POST manual adjustment.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  scheduleInvalidateProductCaches,
  scheduleInvalidateStockAllocationCaches,
} from "@/lib/cache";
import {
  MOVEMENT_TYPES,
  stockAdjustmentSchema,
  type MovementType,
} from "@/lib/inventory/schemas";
import { applyStockDelta, getStockMovementTimeline } from "@/lib/inventory/stock-ops.server";
import {
  opErrorResponse,
  parseBody,
  requireStoreOwner,
} from "@/lib/inventory/route-helpers";

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type");
  const productId = sp.get("productId");
  try {
    const rows = await getStockMovementTimeline(session.id, {
      productId: productId && /^[a-f0-9]{24}$/i.test(productId) ? productId : undefined,
      type: MOVEMENT_TYPES.includes(type as MovementType) ? (type as MovementType) : undefined,
      limit: Number(sp.get("limit")) || 300,
    });
    return NextResponse.json(rows);
  } catch (error) {
    return opErrorResponse(error, "Loading stock movements");
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const data = await parseBody(request, stockAdjustmentSchema);
  if (data instanceof NextResponse) return data;
  try {
    const balance = await applyStockDelta({
      ownerId: session.id,
      actorId: session.id,
      productId: data.productId,
      warehouseId: data.warehouseId ?? null,
      delta: data.quantity,
      type: "adjustment",
      reason: data.note ? `${data.reason} — ${data.note}` : data.reason,
    });
    await Promise.all([scheduleInvalidateProductCaches(), scheduleInvalidateStockAllocationCaches()]);
    return NextResponse.json({ ok: true, balance }, { status: 201 });
  } catch (error) {
    return opErrorResponse(error, "Adjusting stock");
  }
}
