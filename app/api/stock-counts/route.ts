/**
 * Stock counts — GET list, POST start a new count sheet.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { createStockCountSchema } from "@/lib/inventory/schemas";
import {
  InventoryOpError,
  buildCountLines,
  nextDocumentNumber,
  toStockCountDTOs,
} from "@/lib/inventory/stock-ops.server";
import { opErrorResponse, parseBody, requireStoreOwner } from "@/lib/inventory/route-helpers";

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  try {
    const rows = await prisma.stockCount.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(await toStockCountDTOs(rows));
  } catch (error) {
    return opErrorResponse(error, "Loading stock counts");
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const data = await parseBody(request, createStockCountSchema);
  if (data instanceof NextResponse) return data;
  try {
    if (data.warehouseId) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: data.warehouseId, userId: session.id },
        select: { id: true },
      });
      if (!wh) throw new InventoryOpError("Warehouse not found", 404);
    }
    const lines = await buildCountLines(session.id, data.warehouseId, data.categoryId);
    if (lines.length === 0) {
      throw new InventoryOpError("No products to count for that selection");
    }
    const row = await prisma.stockCount.create({
      data: {
        countNumber: await nextDocumentNumber("stockCount", "CNT"),
        userId: session.id,
        warehouseId: data.warehouseId ?? null,
        status: "draft",
        lines: lines as unknown as object,
        notes: data.notes ?? null,
      },
    });
    const [dto] = await toStockCountDTOs([row]);
    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    return opErrorResponse(error, "Starting stock count");
  }
}
