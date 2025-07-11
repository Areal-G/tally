/**
 * Reorder suggestions — products at/below their reorder point.
 */
import { NextRequest, NextResponse } from "next/server";
import { getReorderSuggestions } from "@/lib/inventory/stock-ops.server";
import { opErrorResponse, requireStoreOwner } from "@/lib/inventory/route-helpers";

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json(await getReorderSuggestions(session.id));
  } catch (error) {
    return opErrorResponse(error, "Loading reorder suggestions");
  }
}
