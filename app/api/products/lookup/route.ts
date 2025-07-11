/**
 * Scanner lookup — GET ?code= resolves a product by barcode, id, SKU, or the JSON payload
 * in its QR code. An unknown code returns 404 with `unknownCode` so the scanner can offer
 * to name it (create a product or link it to an existing one).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { opErrorResponse, requireStoreOwner } from "@/lib/inventory/route-helpers";
import { LOOKUP_PRODUCT_SELECT, toLookupDTOs } from "@/lib/inventory/barcode.server";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Scanners disagree on UPC-A: some send 12 digits, some the 13-digit EAN form with a leading 0. */
function barcodeVariants(code: string): string[] {
  const out = new Set([code]);
  if (/^\d{12}$/.test(code)) out.add(`0${code}`);
  if (/^0\d{12}$/.test(code)) out.add(code.slice(1));
  return [...out];
}

function candidatesFrom(code: string): { ids: string[]; skus: string[] } {
  const ids = new Set<string>();
  const skus = new Set<string>();
  const trimmed = code.trim();
  try {
    const parsed = JSON.parse(trimmed) as { productId?: unknown; id?: unknown; sku?: unknown };
    for (const v of [parsed.productId, parsed.id]) if (typeof v === "string") ids.add(v);
    if (typeof parsed.sku === "string") skus.add(parsed.sku);
  } catch {
    // Not JSON — could be a URL ending in /products/{id}, a raw id, or a SKU.
    const fromUrl = trimmed.match(/\/products\/([a-f0-9]{24})/i)?.[1];
    if (fromUrl) ids.add(fromUrl);
    if (OBJECT_ID.test(trimmed)) ids.add(trimmed);
    skus.add(trimmed);
  }
  return { ids: [...ids].filter((x) => OBJECT_ID.test(x)), skus: [...skus].filter(Boolean) };
}

export async function GET(request: NextRequest) {
  const session = await requireStoreOwner(request);
  if (session instanceof NextResponse) return session;
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!code.trim() || code.length > 500) {
    return NextResponse.json({ error: "Enter a SKU or scan a code" }, { status: 400 });
  }
  try {
    const { ids, skus } = candidatesFrom(code);
    const trimmed = code.trim();
    const or = [
      { barcode: { in: barcodeVariants(trimmed) } },
      ...(ids.length ? [{ id: { in: ids } }] : []),
      ...skus.map((sku) => ({ sku: { equals: sku, mode: "insensitive" as const } })),
    ];
    const product = await prisma.product.findFirst({
      where: {
        userId: session.id,
        AND: [{ OR: or }, { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] }],
      },
      select: LOOKUP_PRODUCT_SELECT,
    });
    if (!product) {
      return NextResponse.json(
        { error: "No product has this code yet", unknownCode: trimmed },
        { status: 404 },
      );
    }
    // ?record=1 comes from /scan: remember it for "Recent scans".
    if (request.nextUrl.searchParams.get("record") === "1") {
      const scannedAt = new Date();
      await prisma.product.update({ where: { id: product.id }, data: { lastScannedAt: scannedAt } });
      product.lastScannedAt = scannedAt;
    }
    const [dto] = await toLookupDTOs([product]);
    return NextResponse.json(dto);
  } catch (error) {
    return opErrorResponse(error, "Looking up product");
  }
}
