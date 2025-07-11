"use client";

/**
 * Shown on /scan when a scanned code doesn't belong to any product yet: name it as a new
 * product (name, price, stock) or attach it to a product you already have. Next time the
 * same code is scanned, the product comes straight up.
 */
import { useMemo, useState } from "react";
import { Check, Link2, PackagePlus, Search } from "lucide-react";
import { useCategories } from "@/hooks/queries/use-categories";
import { useSuppliers } from "@/hooks/queries/use-suppliers";
import { useProducts } from "@/hooks/queries/use-products";
import { useBarcodeAction } from "@/hooks/queries/use-inventory-ops";
import { barcodeKindLabel } from "@/lib/inventory/barcode";
import { cn } from "@/lib/utils";
import { BarcodeImage } from "./BarcodeImage";
import {
  Field,
  NativeSelect,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  errorMessage,
} from "./ops-ui";

type Mode = "new" | "existing";

export function NameBarcodePanel({
  code,
  onDone,
  onCancel,
}: {
  code: string;
  onDone: (productId: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>("new");
  const [error, setError] = useState<string | null>(null);
  const action = useBarcodeAction();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-center">
        <span className="rounded-full bg-[var(--tint-amber)] px-3 py-1 text-xs font-semibold text-[var(--status-warning)]">
          New code
        </span>
        <div className="rounded-xl bg-white px-4 py-3">
          <BarcodeImage value={code} height={44} barWidth={1.6} showText />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {barcodeKindLabel(code)} <span className="font-mono text-[var(--text-primary)]">{code}</span> isn&apos;t on
          any product yet. Name it once and it will come up every time you scan it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--border-subtle)] p-1" role="tablist">
        {(
          [
            ["new", "New product", PackagePlus],
            ["existing", "Add to existing", Link2],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold sm:text-sm",
              mode === m ? "bg-[image:var(--brand-gradient)] text-white" : "text-[var(--text-secondary)]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <NewProductForm
          code={code}
          pending={action.isPending}
          onSubmit={async (input) => {
            setError(null);
            try {
              const res = await action.mutateAsync({ action: "create", code, ...input });
              onDone(res.productId);
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
          onCancel={onCancel}
        />
      ) : (
        <LinkExistingForm
          pending={action.isPending}
          onSubmit={async (productId) => {
            setError(null);
            try {
              const res = await action.mutateAsync({ action: "link", code, productId });
              onDone(res.productId);
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
          onCancel={onCancel}
        />
      )}

      {error && (
        <p className="rounded-2xl bg-[var(--tint-rose)] px-4 py-3 text-sm font-medium text-[var(--status-negative)]">{error}</p>
      )}
    </div>
  );
}

function NewProductForm({
  code,
  pending,
  onSubmit,
  onCancel,
}: {
  code: string;
  pending: boolean;
  onSubmit: (input: {
    name: string;
    price: number;
    quantity: number;
    categoryId: string;
    supplierId: string;
    sku?: string;
  }) => void;
  onCancel: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [sku, setSku] = useState("");

  const category = categoryId || categories[0]?.id || "";
  const supplier = supplierId || suppliers[0]?.id || "";
  const valid = name.trim().length >= 2 && price.trim() !== "" && Number(price) >= 0 && category && supplier;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          name: name.trim(),
          price: Number(price),
          quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
          categoryId: category,
          supplierId: supplier,
          sku: sku.trim() || undefined,
        });
      }}
    >
      <Field label="Product name">
        <TextInput autoFocus placeholder="e.g. Sparkling Water 500ml" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price">
          <TextInput type="number" min={0} step="0.01" inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="In stock now">
          <TextInput type="number" min={0} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <NativeSelect value={category} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Supplier">
          <NativeSelect value={supplier} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.length === 0 && <option value="">No suppliers yet</option>}
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="SKU (optional)" hint="Leave blank and one is made from the name and code.">
        <TextInput placeholder={`Auto, e.g. ${autoSkuPreview(name, code)}`} value={sku} onChange={(e) => setSku(e.target.value)} />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <PrimaryButton type="submit" icon={Check} loading={pending} disabled={!valid}>
          Save product
        </PrimaryButton>
        <SecondaryButton onClick={onCancel}>Not now</SecondaryButton>
      </div>
    </form>
  );
}

function autoSkuPreview(name: string, code: string): string {
  const letters =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.slice(0, 3))
      .slice(0, 2)
      .join("-") || "ITEM";
  return `${letters}-${code.replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase()}`;
}

function LinkExistingForm({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  onSubmit: (productId: string) => void;
  onCancel: () => void;
}) {
  const { data: products = [] } = useProducts();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : products;
    return list.slice(0, 30);
  }, [products, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <TextInput autoFocus aria-label="Search products" placeholder="Search name or SKU" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul className="max-h-64 overflow-y-auto rounded-2xl border border-[var(--border-subtle)]">
        {matches.length === 0 ? (
          <li className="p-4 text-center text-sm text-[var(--text-secondary)]">No products match.</li>
        ) : (
          matches.map((p) => (
            <li key={p.id} className="border-t border-[var(--border-subtle)] first:border-t-0">
              <button
                type="button"
                onClick={() => setPicked(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-elevated)]",
                  picked === p.id && "bg-[var(--tint-violet)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    picked === p.id ? "border-transparent bg-[image:var(--brand-gradient)] text-white" : "border-[var(--border-subtle)]",
                  )}
                >
                  {picked === p.id && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  <span className="block truncate text-xs text-[var(--text-secondary)]">
                    {p.sku}
                    {p.barcode ? ` · has barcode ${p.barcode}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <PrimaryButton icon={Link2} loading={pending} disabled={!picked} onClick={() => picked && onSubmit(picked)}>
          Use this barcode
        </PrimaryButton>
        <SecondaryButton onClick={onCancel}>Not now</SecondaryButton>
      </div>
    </div>
  );
}
