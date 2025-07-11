"use client";

/**
 * Stock counts (cycle counts): start a count sheet for a warehouse or category,
 * enter what is physically on the shelf, review variances, then post them.
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Play,
  Save,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/queries/use-warehouses";
import { useCategories } from "@/hooks/queries/use-categories";
import {
  useCreateStockCount,
  useDeleteStockCount,
  useStockCounts,
  useUpdateStockCount,
} from "@/hooks/queries/use-inventory-ops";
import type { StockCountDTO } from "@/lib/inventory/schemas";
import { cn } from "@/lib/utils";
import {
  DeltaQty,
  EmptyState,
  Field,
  LoadingRows,
  NativeSelect,
  OpsDialog,
  OpsPage,
  Panel,
  Pill,
  PrimaryButton,
  SecondaryButton,
  SmallButton,
  StatGrid,
  StatTile,
  TextInput,
  errorMessage,
  formatDate,
} from "./ops-ui";

function variance(c: StockCountDTO) {
  const counted = c.lines.filter((l) => l.counted !== null);
  const off = counted.filter((l) => l.counted !== l.expected);
  const net = counted.reduce((s, l) => s + ((l.counted ?? 0) - l.expected), 0);
  const accuracy = counted.length ? Math.round(((counted.length - off.length) / counted.length) * 100) : null;
  return { counted: counted.length, off: off.length, net, accuracy };
}

export default function StockCountsPage() {
  const { data: counts = [], isLoading } = useStockCounts();
  const [startOpen, setStartOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = counts.find((c) => c.id === activeId) ?? null;

  const stats = useMemo(() => {
    const done = counts.filter((c) => c.status === "completed");
    const acc = done.map((c) => variance(c).accuracy).filter((a): a is number => a !== null);
    return {
      open: counts.filter((c) => c.status === "draft").length,
      completed: done.length,
      accuracy: acc.length ? Math.round(acc.reduce((s, a) => s + a, 0) / acc.length) : null,
      lastDone: done[0]?.completedAt ?? null,
    };
  }, [counts]);

  return (
    <OpsPage
      title="Stock counts"
      description="Count what is on the shelf, compare it with the system and fix the difference."
      actions={
        <PrimaryButton icon={Play} onClick={() => setStartOpen(true)}>
          Start a count
        </PrimaryButton>
      }
    >
      <StatGrid>
        <StatTile label="In progress" value={stats.open} icon={ClipboardList} loading={isLoading} hint="Draft count sheets" />
        <StatTile label="Completed" value={stats.completed} icon={ClipboardCheck} loading={isLoading} hint="Posted counts" />
        <StatTile label="Average accuracy" value={stats.accuracy === null ? "—" : `${stats.accuracy}%`} icon={CheckCircle2} loading={isLoading} hint="Lines that matched the system" />
        <StatTile label="Last count" value={formatDate(stats.lastDone)} icon={AlertTriangle} loading={isLoading} hint="Most recent completed count" />
      </StatGrid>

      {isLoading ? (
        <Panel>
          <LoadingRows />
        </Panel>
      ) : counts.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ClipboardCheck}
            title="No counts yet"
            description="Start a count for one warehouse or one category to check your stock is right."
            action={
              <PrimaryButton icon={Play} onClick={() => setStartOpen(true)}>
                Start a count
              </PrimaryButton>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {counts.map((c) => (
            <CountCard key={c.id} count={c} onOpen={() => setActiveId(c.id)} />
          ))}
        </div>
      )}

      {startOpen && (
        <StartCountDialog
          onClose={() => setStartOpen(false)}
          onStarted={(id) => {
            setStartOpen(false);
            setActiveId(id);
          }}
        />
      )}
      {active && <CountSheetDialog count={active} onClose={() => setActiveId(null)} />}
    </OpsPage>
  );
}

function CountCard({ count, onOpen }: { count: StockCountDTO; onOpen: () => void }) {
  const v = variance(count);
  const pct = Math.round((v.counted / Math.max(1, count.lines.length)) * 100);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="money-surface money-interactive-surface flex flex-col gap-4 p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-[var(--text-primary)]">{count.countNumber}</p>
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {count.warehouseName ?? "All stock (catalog)"} · {formatDate(count.createdAt)}
          </p>
        </div>
        <Pill tone={count.status === "completed" ? "emerald" : "amber"}>
          {count.status === "completed" ? "Completed" : "In progress"}
        </Pill>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>
            {v.counted} of {count.lines.length} counted
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div className="h-full rounded-full bg-[image:var(--brand-gradient)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Matched" value={v.counted - v.off} />
        <MiniStat label="Off" value={v.off} tone={v.off ? "warn" : undefined} />
        <div className="rounded-xl bg-[var(--bg-elevated)] px-3 py-2">
          <p className="text-[11px] text-[var(--text-secondary)]">Net</p>
          <DeltaQty value={v.net} className="text-sm" />
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl bg-[var(--bg-elevated)] px-3 py-2">
      <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
      <p className={cn("text-sm font-semibold", tone === "warn" ? "text-[var(--status-warning)]" : "text-[var(--text-primary)]")}>
        {value}
      </p>
    </div>
  );
}

function StartCountDialog({ onClose, onStarted }: { onClose: () => void; onStarted: (id: string) => void }) {
  const { toast } = useToast();
  const { data: warehouses = [] } = useWarehouses();
  const { data: categories = [] } = useCategories();
  const create = useCreateStockCount();
  const [warehouseId, setWarehouseId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    try {
      const c = await create.mutateAsync({
        warehouseId: warehouseId || null,
        categoryId: categoryId || null,
        notes: notes || null,
      });
      toast({ title: `${c.countNumber} started`, description: `${c.lines.length} products to count` });
      onStarted(c.id);
    } catch (e) {
      toast({ title: "Could not start count", description: errorMessage(e), variant: "destructive" });
    }
  };

  return (
    <OpsDialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={ClipboardCheck}
      title="Start a stock count"
      description="We snapshot the expected quantities now; you fill in what you find."
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton icon={Play} loading={create.isPending} onClick={submit}>
            Start count
          </PrimaryButton>
        </>
      }
    >
      <Field label="Where" hint="Pick a warehouse to count its shelf stock, or leave it to count the catalog total.">
        <NativeSelect value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">All stock (catalog)</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Category">
        <NativeSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Every category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Notes">
        <TextInput value={notes} maxLength={500} placeholder="e.g. Monthly aisle B check" onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </OpsDialog>
  );
}

function CountSheetDialog({ count, onClose }: { count: StockCountDTO; onClose: () => void }) {
  const { toast } = useToast();
  const update = useUpdateStockCount();
  const remove = useDeleteStockCount();
  const readOnly = count.status === "completed";
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(count.lines.map((l) => [l.productId, l.counted === null ? "" : String(l.counted)])),
  );

  const lines = count.lines.map((l) => {
    const raw = values[l.productId] ?? "";
    const counted = raw === "" ? null : Math.max(0, Math.floor(Number(raw)));
    return { ...l, counted };
  });
  const filled = lines.filter((l) => l.counted !== null);
  const net = filled.reduce((s, l) => s + ((l.counted ?? 0) - l.expected), 0);
  const off = filled.filter((l) => l.counted !== l.expected).length;

  const save = async (action: "save" | "complete") => {
    try {
      await update.mutateAsync({
        id: count.id,
        data: { action, lines: lines.map((l) => ({ productId: l.productId, counted: l.counted })) },
      });
      toast({
        title: action === "complete" ? `${count.countNumber} posted` : "Progress saved",
        description: action === "complete" ? `${off} variance${off === 1 ? "" : "s"} applied to stock` : undefined,
      });
      if (action === "complete") onClose();
    } catch (e) {
      toast({ title: "Could not save count", description: errorMessage(e), variant: "destructive" });
    }
  };

  return (
    <OpsDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      icon={ClipboardCheck}
      title={count.countNumber}
      description={`${count.warehouseName ?? "All stock (catalog)"} · ${filled.length} of ${count.lines.length} counted · ${off} off · net ${net > 0 ? "+" : ""}${net}`}
      footer={
        readOnly ? (
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        ) : (
          <>
            <SmallButton
              tone="danger"
              icon={Trash2}
              className="mr-auto h-10"
              disabled={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(count.id);
                  toast({ title: `${count.countNumber} discarded` });
                  onClose();
                } catch (e) {
                  toast({ title: "Could not discard", description: errorMessage(e), variant: "destructive" });
                }
              }}
            >
              Discard
            </SmallButton>
            <SecondaryButton icon={Save} loading={update.isPending} onClick={() => save("save")}>
              Save progress
            </SecondaryButton>
            <PrimaryButton icon={CheckCircle2} disabled={filled.length === 0} loading={update.isPending} onClick={() => save("complete")}>
              Post count
            </PrimaryButton>
          </>
        )
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        <div className="grid grid-cols-[minmax(0,1fr)_40px_68px_44px] gap-2 px-3 sm:grid-cols-[minmax(0,1fr)_70px_90px_70px] sm:gap-3 sm:px-4 bg-[var(--bg-elevated)] py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          <span>Product</span>
          <span className="text-right">System</span>
          <span className="text-right">Counted</span>
          <span className="text-right">Diff</span>
        </div>
        <div className="max-h-[48vh] overflow-y-auto">
          {lines.map((l) => {
            const diff = l.counted === null ? null : l.counted - l.expected;
            return (
              <div
                key={l.productId}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_40px_68px_44px] gap-2 px-3 sm:grid-cols-[minmax(0,1fr)_70px_90px_70px] sm:gap-3 sm:px-4 items-center border-t border-[var(--border-subtle)] py-2.5",
                  diff !== null && diff !== 0 && "bg-[color-mix(in_srgb,var(--status-warning)_6%,transparent)]",
                )}
              >
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)] sm:truncate">{l.name}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{l.sku}</p>
                </div>
                <span className="text-right text-sm tabular-nums text-[var(--text-secondary)]">{l.expected}</span>
                {readOnly ? (
                  <span className="text-right text-sm font-semibold tabular-nums">{l.counted ?? "—"}</span>
                ) : (
                  <TextInput
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Counted quantity for ${l.name}`}
                    className="h-9 px-2 text-right sm:px-3"
                    placeholder="—"
                    value={values[l.productId] ?? ""}
                    onChange={(e) => setValues({ ...values, [l.productId]: e.target.value })}
                  />
                )}
                <span className="text-right text-sm">
                  {diff === null ? <span className="text-[var(--text-secondary)]">—</span> : <DeltaQty value={diff} />}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {!readOnly && (
        <p className="text-xs text-[var(--text-secondary)]">
          Leave a line blank to skip it. Posting applies each difference as a count adjustment in the movement log.
        </p>
      )}
    </OpsDialog>
  );
}
