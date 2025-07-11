"use client";

/**
 * Stock movement log — one timeline for receipts, sales, transfers, adjustments,
 * counts and returns, with who did it and a link to the source document.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ClipboardCheck,
  History,
  type LucideIcon,
  PackageCheck,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { useStockMovements } from "@/hooks/queries/use-inventory-ops";
import { MOVEMENT_TYPES, type MovementType, type StockMovementDTO } from "@/lib/inventory/schemas";
import { cn } from "@/lib/utils";
import { AdjustStockDialog } from "./AdjustStockDialog";
import {
  DeltaQty,
  EmptyState,
  LoadingRows,
  OpsPage,
  Panel,
  PrimaryButton,
  type PillTone,
  StatGrid,
  StatTile,
  TextInput,
  formatDateTime,
} from "./ops-ui";

const TYPE_META: Record<MovementType, { label: string; icon: LucideIcon; tone: PillTone }> = {
  received: { label: "Received", icon: PackageCheck, tone: "emerald" },
  sold: { label: "Sold", icon: ShoppingCart, tone: "violet" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, tone: "sky" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal, tone: "amber" },
  count: { label: "Count", icon: ClipboardCheck, tone: "sky" },
  return: { label: "Return", icon: Undo2, tone: "emerald" },
};

const TONE_BG: Record<PillTone, string> = {
  violet: "bg-[var(--tint-violet)] text-[var(--accent-purple)]",
  emerald: "bg-[var(--tint-emerald)] text-[var(--status-positive)]",
  sky: "bg-[var(--tint-sky)] text-[var(--accent-blue)]",
  amber: "bg-[var(--tint-amber)] text-[var(--status-warning)]",
  rose: "bg-[var(--tint-rose)] text-[var(--status-negative)]",
  neutral: "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

export default function StockMovementsPage() {
  const [type, setType] = useState<MovementType | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("productId");
    if (id) setProductId(id);
  }, []);
  const { data: rows = [], isLoading } = useStockMovements(type, productId);
  const { data: allRows = [], isLoading: allLoading } = useStockMovements(undefined);

  const stats = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    const recent = allRows.filter((r) => new Date(r.createdAt).getTime() >= since);
    const stock = recent.filter((r) => r.type !== "transfer");
    return {
      inbound: stock.filter((r) => r.quantity > 0).reduce((s, r) => s + r.quantity, 0),
      outbound: stock.filter((r) => r.quantity < 0).reduce((s, r) => s - r.quantity, 0),
      adjustments: recent.filter((r) => r.type === "adjustment" || r.type === "count").length,
      transfers: recent
        .filter((r) => r.type === "transfer")
        .reduce((s, r) => s + Math.abs(r.quantity), 0),
    };
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.reference ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const groups = useMemo(() => {
    const m = new Map<string, StockMovementDTO[]>();
    for (const r of filtered) {
      const key = dayLabel(r.createdAt);
      m.set(key, [...(m.get(key) ?? []), r]);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <OpsPage
      title="Stock movements"
      description="Every change to stock in one place: what moved, why, and who did it."
      actions={
        <PrimaryButton icon={SlidersHorizontal} onClick={() => setAdjustOpen(true)}>
          Adjust stock
        </PrimaryButton>
      }
    >
      <StatGrid>
        <StatTile label="Units in (30 days)" value={stats.inbound.toLocaleString()} icon={ArrowDownToLine} loading={allLoading} hint="Receipts, returns and corrections" />
        <StatTile label="Units out (30 days)" value={stats.outbound.toLocaleString()} icon={ArrowUpFromLine} loading={allLoading} hint="Sales and write-offs" />
        <StatTile label="Transfers (30 days)" value={stats.transfers.toLocaleString()} icon={ArrowLeftRight} loading={allLoading} hint="Units moved between warehouses" />
        <StatTile label="Corrections (30 days)" value={stats.adjustments} icon={SlidersHorizontal} loading={allLoading} hint="Adjustments and count variances" />
      </StatGrid>

      <Panel
        title="Timeline"
        icon={History}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <TextInput
              aria-label="Search movements"
              placeholder="Search product, SKU or reference"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-3">
          {productId && (
            <button
              type="button"
              onClick={() => {
                setProductId(undefined);
                window.history.replaceState(null, "", "/stock-movements");
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tint-violet)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-purple)]"
            >
              {rows[0]?.productName ?? "One product"} ✕
            </button>
          )}
          <TypeChip active={!type} label="All" onClick={() => setType(undefined)} />
          {MOVEMENT_TYPES.map((t) => (
            <TypeChip key={t} active={type === t} label={TYPE_META[t].label} icon={TYPE_META[t].icon} onClick={() => setType(t)} />
          ))}
        </div>
        {isLoading ? (
          <LoadingRows rows={6} />
        ) : groups.length === 0 ? (
          <EmptyState icon={History} title="No movements found" description="Receive a purchase order, adjust stock or run a count to see it here." />
        ) : (
          <div className="flex flex-col">
            {groups.map(([day, items]) => (
              <div key={day}>
                <p className="sticky top-0 z-[1] bg-[var(--bg-elevated)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {day}
                </p>
                <ul>
                  {items.map((r) => (
                    <MovementRow key={r.id} row={r} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {adjustOpen && <AdjustStockDialog open={adjustOpen} onOpenChange={setAdjustOpen} />}
    </OpsPage>
  );
}

function TypeChip({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-transparent bg-[image:var(--brand-gradient)] text-white"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );
}

function MovementRow({ row }: { row: StockMovementDTO }) {
  const meta = TYPE_META[row.type];
  const Icon = meta.icon;
  const where =
    row.type === "transfer"
      ? `${row.warehouseName ?? "?"} → ${row.toWarehouseName ?? "?"}`
      : row.warehouseName ?? "Catalog";
  return (
    <li className="flex items-center gap-4 border-t border-[var(--border-subtle)] px-5 py-3.5 first:border-t-0">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", TONE_BG[meta.tone])}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/products/${row.productId}`}
            className="truncate text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-purple)]"
          >
            {row.productName}
          </Link>
          <span className="text-xs text-[var(--text-secondary)]">{row.sku}</span>
        </div>
        <p className="truncate text-xs text-[var(--text-secondary)]">
          {meta.label} · {where}
          {row.reason ? ` · ${row.reason}` : ""}
          {row.createdByName ? ` · by ${row.createdByName}` : ""}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end sm:flex">
        {row.reference &&
          (row.referenceHref ? (
            <Link href={row.referenceHref} className="text-xs font-semibold text-[var(--accent-blue)] hover:underline">
              {row.reference}
            </Link>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{row.reference}</span>
          ))}
        <span className="text-xs text-[var(--text-secondary)]">{formatDateTime(row.createdAt)}</span>
      </div>
      <div className="flex w-20 shrink-0 flex-col items-end">
        {row.type === "transfer" ? (
          <span className="text-sm font-semibold text-[var(--accent-blue)]">{Math.abs(row.quantity) || "—"} moved</span>
        ) : (
          <DeltaQty value={row.quantity} className="text-sm" />
        )}
        {row.balanceAfter != null && (
          <span className="text-xs text-[var(--text-secondary)]">→ {row.balanceAfter}</span>
        )}
      </div>
    </li>
  );
}
