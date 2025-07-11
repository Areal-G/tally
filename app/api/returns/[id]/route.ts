/**
 * Return action — PATCH { action: restock | reject }.
 * Resellable items go back into stock; damaged items are closed without restocking.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import {
  scheduleInvalidateProductCaches,
  scheduleInvalidateStockAllocationCaches,
} from "@/lib/cache";
import { returnActionSchema, type ReturnLine } from "@/lib/inventory/schemas";
import {
  InventoryOpError,
  applyStockDelta,
  toReturnDTOs,
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
  const data = await parseBody(request, returnActionSchema);
  if (data instanceof NextResponse) return data;

  try {
    const ret = await prisma.productReturn.findFirst({ where: { id, userId: session.id } });
    if (!ret) throw new InventoryOpError("Return not found", 404);
    if (ret.status !== "requested") throw new InventoryOpError("This return is already closed");

    if (data.action === "restock" && ret.condition === "resellable") {
      for (const line of (ret.lines as unknown as ReturnLine[]) ?? []) {
        await applyStockDelta({
          ownerId: session.id,
          actorId: session.id,
          productId: line.productId,
          warehouseId: ret.warehouseId,
          delta: line.quantity,
          type: "return",
          reason: `Customer return — ${ret.reason}`,
          reference: ret.returnNumber,
          referenceId: ret.id,
        });
      }
    }

    const row = await prisma.productReturn.update({
      where: { id },
      data: {
        status: data.action === "restock" ? "restocked" : "rejected",
        resolvedAt: new Date(),
      },
    });
    if (data.action === "restock") await Promise.all([scheduleInvalidateProductCaches(), scheduleInvalidateStockAllocationCaches()]);
    const [dto] = await toReturnDTOs([row]);
    return NextResponse.json(dto);
  } catch (error) {
    return opErrorResponse(error, "Updating return");
  }
}
