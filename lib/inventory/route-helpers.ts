/**
 * Shared guards for inventory-operation API routes (store owners only).
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { InventoryOpError } from "./stock-ops.server";

export type OwnerSession = { id: string; role?: string | null; name?: string | null };

/** Returns the session for admins/store users, or a 401/403 response. */
export async function requireStoreOwner(
  request: NextRequest,
): Promise<OwnerSession | NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.role ?? "user";
  if (role === "client" || role === "supplier") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session as OwnerSession;
}

export async function parseBody<S extends ZodTypeAny>(
  request: NextRequest,
  schema: S,
): Promise<z.infer<S> | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logger.warn("Invalid inventory request", { errors: parsed.error.errors });
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid request body", details: parsed.error.errors },
      { status: 400 },
    );
  }
  return parsed.data;
}

export function opErrorResponse(error: unknown, label: string): NextResponse {
  if (error instanceof InventoryOpError) {
    logger.warn(`${label} rejected: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  logger.error(`${label} failed:`, error);
  return NextResponse.json({ error: `${label} failed` }, { status: 500 });
}

