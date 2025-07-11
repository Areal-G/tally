/**
 * Purchase order actions — PATCH { action: submit | cancel | receive }, DELETE draft.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import {
  scheduleInvalidateProductCaches,
  scheduleInvalidateStockAllocationCaches,
} from "@/lib/cache";
import { purchaseOrderActionSchema } from "@/lib/inventory/schemas";
import {
  InventoryOpError,
  receivePurchaseOrder,
  toPurchaseOrderDTOs,
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
  const data = await parseBody(request, purchaseOrderActionSchema);
  if (data instanceof NextResponse) return data;

  try {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, userId: session.id } });
    if (!po) throw new InventoryOpError("Purchase order not found", 404);

    if (data.action === "submit") {
      if (po.status !== "draft") throw new InventoryOpError("Only drafts can be sent");
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status: "ordered", orderedAt: new Date(), updatedAt: new Date() },
      });
    } else if (data.action === "cancel") {
      if (po.status === "received" || po.status === "cancelled") {
        throw new InventoryOpError("This purchase order can no longer be cancelled");
      }
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status: "cancelled", updatedAt: new Date() },
      });
    } else {
      await receivePurchaseOrder({
        ownerId: session.id,
        actorId: session.id,
        id,
        warehouseId: data.warehouseId,
        lotNumber: data.lotNumber,
        lines: data.lines,
      });
      await Promise.all([scheduleInvalidateProductCaches(), scheduleInvalidateStockAllocationCaches()]);
    }

    const fresh = await prisma.purchaseOrder.findUnique({ where: { id } });
    const [dto] = await toPurchaseOrderDTOs(fresh ? [fresh] : []);
    return NextResponse.json(dto);
  } catch (error) {
    return opErrorResponse(error, "Updating purchase order");
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, userId: session.id } });
    if (!po) throw new InventoryOpError("Purchase order not found", 404);
    if (po.status !== "draft") throw new InventoryOpError("Only drafts can be deleted");
    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return opErrorResponse(error, "Deleting purchase order");
  }
}
