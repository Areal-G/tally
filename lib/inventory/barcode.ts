/**
 * Product barcodes (client-safe).
 *
 * A product's `barcode` is any code a scanner reads off the item — a manufacturer
 * EAN/UPC, or one generated here. Generated codes are EAN-13 in the 200–299
 * "in-store use" range, so they never clash with real manufacturer barcodes.
 */
import { z } from "zod";

export const BARCODE_MAX_LENGTH = 64;

/** Printable ASCII only — what handheld scanners and Code 128 can carry. */
export const barcodeSchema = z
  .string()
  .trim()
  .max(BARCODE_MAX_LENGTH, `Barcode must be ${BARCODE_MAX_LENGTH} characters or fewer`)
  .regex(/^[\x20-\x7E]*$/, "Barcode can only contain letters, numbers and symbols")
  .nullable()
  .optional();

export function normalizeBarcode(code: string | null | undefined): string | null {
  const v = (code ?? "").trim();
  return v ? v : null;
}

/** GS1 check digit for the first 7 (EAN-8), 11 (UPC-A) or 12 (EAN-13) digits. */
export function gs1CheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits.charCodeAt(digits.length - 1 - i) - 48;
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(code: string, length: number): boolean {
  if (!new RegExp(`^\\d{${length}}$`).test(code)) return false;
  return gs1CheckDigit(code.slice(0, -1)) === Number(code.at(-1));
}

export const isEan13 = (code: string) => hasValidCheckDigit(code, 13);
export const isEan8 = (code: string) => hasValidCheckDigit(code, 8);
export const isUpcA = (code: string) => hasValidCheckDigit(code, 12);

/** Fresh in-store EAN-13: 2 + 11 random digits + check digit. */
export function generateInternalEan13(random: () => number = Math.random): string {
  let body = "2";
  for (let i = 0; i < 11; i++) body += Math.floor(random() * 10).toString();
  return body + gs1CheckDigit(body);
}

/** jsbarcode format that matches the code, so the printed label looks like the original. */
export function barcodeFormatFor(code: string): "EAN13" | "EAN8" | "UPC" | "CODE128" {
  if (isEan13(code)) return "EAN13";
  if (isEan8(code)) return "EAN8";
  if (isUpcA(code)) return "UPC";
  return "CODE128";
}

/** Human label for the code type. */
export function barcodeKindLabel(code: string): string {
  const f = barcodeFormatFor(code);
  if (f === "EAN13") return code.startsWith("2") ? "In-store EAN-13" : "EAN-13";
  if (f === "EAN8") return "EAN-8";
  if (f === "UPC") return "UPC-A";
  return "Code 128";
}
