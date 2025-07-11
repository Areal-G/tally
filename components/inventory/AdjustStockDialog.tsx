"use client";

/**
 * Manual stock adjustment with a reason (damaged, lost, found, …).
 * Used on the movements page and from the scanner.
 */
import { useState } from "react";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/queries/use-products";
import { useWarehouses } from "@/hooks/queries/use-warehouses";
import { useAdjustStock } from "@/hooks/queries/use-inventory-ops";
import { ADJUSTMENT_REASONS } from "@/lib/inventory/schemas";
import { cn } from "@/lib/utils";
import {
  Field,
  NativeSelect,
  OpsDialog,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  errorMessage,
} from "./ops-ui";

export function AdjustStockDialog({
  open,
  onOpenChange,
  productId: fixedProductId,
  productLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId?: string;
  productLabel?: string;
}) {
  const { toast } = useToast();
  const { data: products = [] } = useProducts(undefined, { enabled: !fixedProductId });
  const { data: warehouses = [] } = useWarehouses();
  const adjust = useAdjustStock();

  const [productId, setProductId] = useState(fixedProductId ?? "");
  const [direction, setDirection] = useState<"add" | "remove">("remove");
  const [amount, setAmount] = useState(1);
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState<(typeof ADJUSTMENT_REASONS)[number]>("Damaged");
  const [note, setNote] = useState("");

  const valid = productId && amount > 0;

  const submit = async () => {
    const quantity = direction === "add" ? amount : -amount;
    try {
      const res = await adjust.mutateAsync({
        productId,
        warehouseId: warehouseId || null,
        quantity,
        reason,
        note: note || null,
      });
      toast({
        title: `Stock ${direction === "add" ? "increased" : "reduced"} by ${amount}`,
        description: `New catalog balance: ${res.balance}`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not adjust stock", description: errorMessage(e), variant: "destructive" });
    }
  };

  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={SlidersHorizontal}
      title="Adjust stock"
      description="Record a correction with a reason. It shows up in the movement log."
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)}>Cancel</SecondaryButton>
          <PrimaryButton disabled={!valid} loading={adjust.isPending} onClick={submit}>
            Save adjustment
          </PrimaryButton>
        </>
      }
    >
      {fixedProductId ? (
        <p className="rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
          {productLabel}
        </p>
      ) : (
        <Field label="Product">
          <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Choose product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sku} · {p.quantity} in stock
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-full border border-[var(--border-subtle)] p-1">
        {(["remove", "add"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
              direction === d
                ? d === "add"
                  ? "bg-[var(--tint-emerald)] text-[var(--status-positive)]"
                  : "bg-[var(--tint-rose)] text-[var(--status-negative)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {d === "add" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {d === "add" ? "Add stock" : "Remove stock"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity">
          <TextInput
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value))))}
          />
        </Field>
        <Field label="Warehouse">
          <NativeSelect value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Catalog only</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Reason">
        <div className="flex flex-wrap gap-2">
          {ADJUSTMENT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                reason === r
                  ? "border-transparent bg-[image:var(--brand-gradient)] text-white"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Note">
        <TextInput value={note} maxLength={200} placeholder="Optional detail" onChange={(e) => setNote(e.target.value)} />
      </Field>
    </OpsDialog>
  );
}
