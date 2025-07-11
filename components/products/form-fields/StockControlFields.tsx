"use client";

/**
 * Stock-control inputs on the product form: reorder point, reorder quantity, lot number,
 * and the product barcode (type/scan one, or generate an in-store EAN-13).
 * Kept outside react-hook-form (optional, numeric-or-empty) and parsed on submit.
 */
import { Barcode, BellRing, Hash, PackagePlus, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DialogFormLabel } from "@/components/shared/dialog-form-label";
import { DIALOG_FORM_FIELD_ROSE } from "@/components/shared/dialog-form-field";
import { cn } from "@/lib/utils";
import { DEFAULT_REORDER_POINT } from "@/lib/inventory/schemas";
import { barcodeKindLabel, generateInternalEan13 } from "@/lib/inventory/barcode";

export type StockControlValues = {
  reorderPoint: string;
  reorderQuantity: string;
  lotNumber: string;
  barcode: string;
};

export const EMPTY_STOCK_CONTROL: StockControlValues = {
  reorderPoint: "",
  reorderQuantity: "",
  lotNumber: "",
  barcode: "",
};

export function stockControlFromProduct(p?: {
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  lotNumber?: string | null;
  barcode?: string | null;
} | null): StockControlValues {
  return {
    reorderPoint: p?.reorderPoint != null ? String(p.reorderPoint) : "",
    reorderQuantity: p?.reorderQuantity != null ? String(p.reorderQuantity) : "",
    lotNumber: p?.lotNumber ?? "",
    barcode: p?.barcode ?? "",
  };
}

/** Empty → null (clears the value); otherwise a non-negative integer. */
export function parseStockControl(v: StockControlValues) {
  const int = (s: string, min: number) => {
    if (s.trim() === "") return null;
    const n = Math.floor(Number(s));
    return Number.isFinite(n) ? Math.max(min, n) : null;
  };
  return {
    reorderPoint: int(v.reorderPoint, 0),
    reorderQuantity: int(v.reorderQuantity, 1),
    lotNumber: v.lotNumber.trim() || null,
    barcode: v.barcode.trim() || null,
  };
}

export default function StockControlFields({
  value,
  onChange,
}: {
  value: StockControlValues;
  onChange: (v: StockControlValues) => void;
}) {
  const set = (k: keyof StockControlValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <DialogFormLabel htmlFor="reorder-point" icon={BellRing} optional>
          Reorder point
        </DialogFormLabel>
        <Input
          id="reorder-point"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder={`Default ${DEFAULT_REORDER_POINT}`}
          value={value.reorderPoint}
          onChange={set("reorderPoint")}
          className={cn("h-11", DIALOG_FORM_FIELD_ROSE)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <DialogFormLabel htmlFor="reorder-quantity" icon={PackagePlus} optional>
          Reorder qty
        </DialogFormLabel>
        <Input
          id="reorder-quantity"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Auto"
          value={value.reorderQuantity}
          onChange={set("reorderQuantity")}
          className={cn("h-11", DIALOG_FORM_FIELD_ROSE)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <DialogFormLabel htmlFor="lot-number" icon={Hash} optional>
          Lot / batch
        </DialogFormLabel>
        <Input
          id="lot-number"
          maxLength={80}
          placeholder="e.g. LOT-2611-A"
          value={value.lotNumber}
          onChange={set("lotNumber")}
          className={cn("h-11", DIALOG_FORM_FIELD_ROSE)}
        />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-3">
        <DialogFormLabel htmlFor="barcode" icon={Barcode} optional>
          Barcode
        </DialogFormLabel>
        <div className="flex gap-2">
          <Input
            id="barcode"
            maxLength={64}
            placeholder="Scan or type the code on the item"
            value={value.barcode}
            onChange={set("barcode")}
            onKeyDown={(e) => {
              // Handheld scanners end with Enter; don't submit the form.
              if (e.key === "Enter") e.preventDefault();
            }}
            className={cn("h-11 min-w-0 flex-1 font-mono", DIALOG_FORM_FIELD_ROSE)}
          />
          <button
            type="button"
            onClick={() => onChange({ ...value, barcode: generateInternalEan13() })}
            className="money-secondary-action inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium"
          >
            <Wand2 className="h-4 w-4" aria-hidden /> Generate
          </button>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          {value.barcode.trim()
            ? `${barcodeKindLabel(value.barcode.trim())} · scanning it on the Scan page opens this product.`
            : "Use the manufacturer's barcode, or generate an in-store EAN-13 to print on labels."}
        </p>
      </div>
    </div>
  );
}
