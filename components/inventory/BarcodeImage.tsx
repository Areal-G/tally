"use client";

/**
 * A product barcode drawn as SVG (prints sharp). EAN-13 / EAN-8 / UPC-A codes keep their
 * retail format; anything else is drawn as Code 128.
 */
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { barcodeFormatFor } from "@/lib/inventory/barcode";
import { cn } from "@/lib/utils";

export function BarcodeImage({
  value,
  height = 56,
  barWidth = 2,
  showText = false,
  className,
}: {
  value: string;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  // Code 128 carries any printable ASCII.
  const encodable = /^[\x20-\x7E]+$/.test(value);
  useEffect(() => {
    if (!ref.current || !encodable) return;
    const opts = {
      height,
      width: barWidth,
      margin: 0,
      displayValue: showText,
      fontSize: 14,
      textMargin: 2,
      background: "#ffffff",
      lineColor: "#141629",
    };
    try {
      JsBarcode(ref.current, value, { ...opts, format: barcodeFormatFor(value) });
    } catch {
      try {
        JsBarcode(ref.current, value, { ...opts, format: "CODE128" });
      } catch {
        /* leave the SVG empty; callers show the code as text */
      }
    }
  }, [value, height, barWidth, showText, encodable]);
  if (!encodable) return <p className="text-[10px] text-rose-600">This code can&apos;t be drawn as a barcode</p>;
  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} className={cn("h-auto max-w-full", className)} />;
}
