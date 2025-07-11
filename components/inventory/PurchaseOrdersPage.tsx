"use client";

/**
 * Purchase orders: reorder suggestions, PO list with status pills,
 * create dialog (draft or send), and a receive dialog that books stock into a warehouse.
 */
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/queries/use-products";
import { useSuppliers } from "@/hooks/queries/use-suppliers";
import { useWarehouses } from "@/hooks/queries/use-warehouses";
import {
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrderAction,
  usePurchaseOrders,
  useReorderSuggestions,
} from "@/hooks/queries/use-inventory-ops";
import { formatStableCurrency } from "@/lib/format";
import type {
  PurchaseOrderDTO,
  PurchaseOrderStatus,
} from "@/lib/inventory/schemas";
import type { ReorderSuggestionDTO } from "@/lib/inventory/client";
import {
  EmptyState,
  Field,
  LoadingRows,
  NativeSelect,
  OpsDialog,
  OpsPage,
  OpsTable,
  Panel,
  Pill,
  type PillTone,
  PrimaryButton,
  SecondaryButton,
  SmallButton,
  StatGrid,
  StatTile,
  Td,
  TextInput,
  Th,
  errorMessage,
  formatDate,
} from "./ops-ui";

const STATUS_TONE: Record<PurchaseOrderStatus, PillTone> = {
  draft: "neutral",
  ordered: "sky",
  partial: "amber",
  received: "emerald",
  cancelled: "rose",
};

const FILTERS: ("all" | PurchaseOrderStatus)[] = [
  "all",
  "draft",
  "ordered",
  "partial",
  "received",
  "cancelled",
];

type DraftLine = { productId: string; quantity: number; unitCost: number };
type Prefill = { supplierId: string; lines: DraftLine[] } | null;

export default function PurchaseOrdersPage() {
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: suggestions = [], isLoading: suggestionsLoading } =
    useReorderSuggestions();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill>(null);
  const [receiving, setReceiving] = useState<PurchaseOrderDTO | null>(null);

  const stats = useMemo(() => {
    const open = orders.filter(
      (o) => o.status === "ordered" || o.status === "partial",
    );
    const incomingUnits = open.reduce(
      (s, o) =>
        s +
        o.lines.reduce(
          (t, l) => t + Math.max(0, l.quantity - l.receivedQuantity),
          0,
        ),
      0,
    );
    const openValue = open.reduce((s, o) => s + o.total, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const receivedThisMonth = orders.filter(
      (o) => o.receivedAt && new Date(o.receivedAt) >= monthStart,
    ).length;
    return { open: open.length, incomingUnits, openValue, receivedThisMonth };
  }, [orders]);

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const openCreate = (p: Prefill = null) => {
    setPrefill(p);
    setCreateOpen(true);
  };

  const orderFromSuggestions = (rows: ReorderSuggestionDTO[]) => {
    const first = rows[0];
    if (!first?.supplierId) return openCreate();
    openCreate({
      supplierId: first.supplierId,
      lines: rows
        .filter((r) => r.supplierId === first.supplierId)
        .map((r) => ({
          productId: r.productId,
          quantity: r.suggestedQuantity,
          unitCost: r.unitCost,
        })),
    });
  };

  return (
    <OpsPage
      title="Purchase orders"
      description="Order stock from suppliers and receive it straight into a warehouse."
      actions={
        <PrimaryButton icon={Plus} onClick={() => openCreate()}>
          New purchase order
        </PrimaryButton>
      }
    >
      <StatGrid>
        <StatTile
          label="Open orders"
          value={stats.open}
          icon={ClipboardList}
          loading={isLoading}
          hint="Sent and waiting on delivery"
        />
        <StatTile
          label="Units incoming"
          value={stats.incomingUnits.toLocaleString()}
          icon={Truck}
          loading={isLoading}
          hint="Still to be received"
        />
        <StatTile
          label="Open value"
          value={formatStableCurrency(stats.openValue)}
          icon={PackageOpen}
          loading={isLoading}
          hint="Cost of open orders"
        />
        <StatTile
          label="Received this month"
          value={stats.receivedThisMonth}
          icon={PackageCheck}
          loading={isLoading}
          hint="Fully delivered orders"
        />
      </StatGrid>

      <SuggestionsPanel
        suggestions={suggestions}
        loading={suggestionsLoading}
        onOrder={orderFromSuggestions}
      />

      <Panel
        title="All purchase orders"
        icon={ClipboardList}
        actions={
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--border-subtle)] bg-[var(--card-bg)] p-1 [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "shrink-0 rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold capitalize text-white"
                    : "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        {isLoading ? (
          <LoadingRows />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={
              filter === "all"
                ? "No purchase orders yet"
                : `No ${filter} orders`
            }
            description="Create one from the reorder suggestions above or start from scratch."
            action={
              <PrimaryButton icon={Plus} onClick={() => openCreate()}>
                New purchase order
              </PrimaryButton>
            }
          />
        ) : (
          <OpsTable>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Supplier</Th>
                <Th>Progress</Th>
                <Th>Total</Th>
                <Th>Expected</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((po) => (
                <PurchaseOrderRow
                  key={po.id}
                  po={po}
                  onReceive={() => setReceiving(po)}
                />
              ))}
            </tbody>
          </OpsTable>
        )}
      </Panel>

      {createOpen && (
        <CreatePurchaseOrderDialog
          open={createOpen}
          prefill={prefill}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) setPrefill(null);
          }}
        />
      )}
      {receiving && (
        <ReceiveDialog po={receiving} onClose={() => setReceiving(null)} />
      )}
    </OpsPage>
  );
}

/* --------------------------------- Suggestions -------------------------------- */

function SuggestionsPanel({
  suggestions,
  loading,
  onOrder,
}: {
  suggestions: ReorderSuggestionDTO[];
  loading: boolean;
  onOrder: (rows: ReorderSuggestionDTO[]) => void;
}) {
  const bySupplier = useMemo(() => {
    const m = new Map<string, ReorderSuggestionDTO[]>();
    for (const s of suggestions) {
      const key = s.supplierId ?? "none";
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return [...m.values()];
  }, [suggestions]);

  return (
    <Panel
      title="Reorder suggestions"
      description="Products at or below their reorder point, grouped by supplier"
      icon={Sparkles}
    >
      {loading ? (
        <LoadingRows rows={2} />
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Stock levels look healthy"
          description="Nothing is at or below its reorder point."
        />
      ) : (
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {bySupplier.map((rows) => {
            const total = rows.reduce(
              (s, r) => s + r.suggestedQuantity * r.unitCost,
              0,
            );
            return (
              <div
                key={rows[0]!.supplierId ?? "none"}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {rows[0]!.supplierName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {rows.length} product{rows.length === 1 ? "" : "s"} · est.{" "}
                      {formatStableCurrency(total)}
                    </p>
                  </div>
                  <SmallButton
                    tone="brand"
                    icon={Plus}
                    onClick={() => onOrder(rows)}
                  >
                    Create PO
                  </SmallButton>
                </div>
                <ul className="flex flex-col gap-2">
                  {rows.slice(0, 4).map((r) => {
                    const pct = Math.min(
                      100,
                      Math.round(
                        (r.available / Math.max(1, r.reorderPoint)) * 100,
                      ),
                    );
                    return (
                      <li key={r.productId} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            {r.name}
                          </span>
                          <span className="shrink-0 text-[var(--text-secondary)]">
                            {r.available} / {r.reorderPoint}
                            {r.onOrder > 0 && (
                              <span className="text-[var(--accent-blue)]">
                                {" "}
                                · {r.onOrder} on order
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--card-bg)]">
                          <div
                            className={
                              r.available === 0
                                ? "h-full rounded-full bg-[var(--status-negative)]"
                                : "h-full rounded-full bg-[var(--status-warning)]"
                            }
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {rows.length > 4 && (
                    <li className="text-xs text-[var(--text-secondary)]">
                      +{rows.length - 4} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------ Row ------------------------------------ */

function PurchaseOrderRow({
  po,
  onReceive,
}: {
  po: PurchaseOrderDTO;
  onReceive: () => void;
}) {
  const { toast } = useToast();
  const action = usePurchaseOrderAction();
  const remove = useDeletePurchaseOrder();
  const ordered = po.lines.reduce((s, l) => s + l.quantity, 0);
  const received = po.lines.reduce((s, l) => s + l.receivedQuantity, 0);
  const pct = ordered ? Math.round((received / ordered) * 100) : 0;

  const run = async (kind: "submit" | "cancel") => {
    try {
      await action.mutateAsync({ id: po.id, data: { action: kind } });
      toast({
        title:
          kind === "submit"
            ? `${po.poNumber} sent to supplier`
            : `${po.poNumber} cancelled`,
      });
    } catch (e) {
      toast({
        title: "Could not update order",
        description: errorMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <tr>
      <Td>
        <div className="flex flex-col">
          <span className="font-semibold">{po.poNumber}</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {po.lines.length} line{po.lines.length === 1 ? "" : "s"} ·{" "}
            {formatDate(po.createdAt)}
          </span>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col">
          <span className="font-medium">{po.supplierName}</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {po.warehouseName ?? "No warehouse set"}
          </span>
        </div>
      </Td>
      <Td>
        <div className="flex w-36 flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">
            {received} / {ordered} received
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-[image:var(--brand-gradient)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Td>
      <Td className="font-semibold">{formatStableCurrency(po.total)}</Td>
      <Td className="text-[var(--text-secondary)]">
        {formatDate(po.expectedDate)}
      </Td>
      <Td>
        <Pill tone={STATUS_TONE[po.status]}>{po.status}</Pill>
      </Td>
      <Td>
        <div className="flex justify-end gap-1">
          {po.status === "draft" && (
            <>
              <SmallButton
                tone="brand"
                icon={Send}
                disabled={action.isPending}
                onClick={() => run("submit")}
              >
                Send
              </SmallButton>
              <SmallButton
                tone="danger"
                icon={Trash2}
                aria-label={`Delete ${po.poNumber}`}
                disabled={remove.isPending}
                onClick={async () => {
                  try {
                    await remove.mutateAsync(po.id);
                    toast({ title: `${po.poNumber} deleted` });
                  } catch (e) {
                    toast({
                      title: "Could not delete",
                      description: errorMessage(e),
                      variant: "destructive",
                    });
                  }
                }}
              />
            </>
          )}
          {(po.status === "ordered" || po.status === "partial") && (
            <>
              <SmallButton tone="brand" icon={PackageCheck} onClick={onReceive}>
                Receive
              </SmallButton>
              <SmallButton
                tone="danger"
                icon={XCircle}
                aria-label={`Cancel ${po.poNumber}`}
                disabled={action.isPending}
                onClick={() => run("cancel")}
              />
            </>
          )}
          {(po.status === "received" || po.status === "cancelled") && (
            <span className="text-xs text-[var(--text-secondary)]">
              {po.status === "received"
                ? `Received ${formatDate(po.receivedAt)}`
                : "Closed"}
            </span>
          )}
        </div>
      </Td>
    </tr>
  );
}

/* ---------------------------------- Create ---------------------------------- */

function CreatePurchaseOrderDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill: Prefill;
}) {
  const { toast } = useToast();
  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: products = [] } = useProducts();
  const create = useCreatePurchaseOrder();

  const [supplierId, setSupplierId] = useState(prefill?.supplierId ?? "");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(prefill?.lines ?? []);
  const [pick, setPick] = useState("");

  const supplierProducts = products.filter(
    (p) => !supplierId || p.supplierId === supplierId,
  );
  const productById = new Map(products.map((p) => [p.id, p]));
  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const valid =
    supplierId &&
    lines.length > 0 &&
    lines.every((l) => l.quantity > 0 && l.unitCost >= 0);

  const addLine = (productId: string) => {
    const p = productById.get(productId);
    if (!p || lines.some((l) => l.productId === productId)) return;
    setLines([
      ...lines,
      {
        productId,
        quantity: 10,
        unitCost: Math.round(p.price * 0.6 * 100) / 100,
      },
    ]);
    setPick("");
  };

  const submit = async (send: boolean) => {
    try {
      const po = await create.mutateAsync({
        supplierId,
        warehouseId: warehouseId || null,
        expectedDate: expectedDate || null,
        notes: notes || null,
        submit: send,
        lines,
      });
      toast({
        title: send
          ? `${po.poNumber} sent to supplier`
          : `${po.poNumber} saved as draft`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Could not create purchase order",
        description: errorMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      icon={ClipboardList}
      title="New purchase order"
      description="Pick a supplier, add products, then save a draft or send it."
      footer={
        <>
          <SecondaryButton
            disabled={!valid}
            loading={create.isPending}
            onClick={() => submit(false)}
          >
            Save draft
          </SecondaryButton>
          <PrimaryButton
            icon={Send}
            disabled={!valid}
            loading={create.isPending}
            onClick={() => submit(true)}
          >
            Send order
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Supplier">
          <NativeSelect
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setLines((ls) =>
                ls.filter(
                  (l) =>
                    productById.get(l.productId)?.supplierId === e.target.value,
                ),
              );
            }}
          >
            <option value="">Choose supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Deliver to">
          <NativeSelect
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Decide on receipt</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Expected">
          <TextInput
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Add product"
        hint={
          supplierId ? undefined : "Choose a supplier to see their products"
        }
      >
        <NativeSelect
          value={pick}
          disabled={!supplierId}
          onChange={(e) => addLine(e.target.value)}
        >
          <option value="">Select a product…</option>
          {supplierProducts
            .filter((p) => !lines.some((l) => l.productId === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sku} · {p.quantity} in stock
              </option>
            ))}
        </NativeSelect>
      </Field>

      {lines.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          {lines.map((l, i) => {
            const p = productById.get(l.productId);
            return (
              <div
                key={l.productId}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-x-3 gap-y-2 border-b border-[var(--border-subtle)] p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_90px_110px_90px_auto] sm:items-center"
              >
                <div className="order-first col-span-2 min-w-0 self-center sm:order-none sm:col-span-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {p?.name ?? "Product"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {p?.sku}
                  </p>
                </div>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] sm:hidden">
                    Qty
                  </span>
                  <TextInput
                    type="number"
                    min={1}
                    aria-label="Quantity"
                    value={l.quantity}
                    onChange={(e) =>
                      setLines(
                        lines.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                quantity: Math.max(
                                  0,
                                  Math.floor(Number(e.target.value)),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] sm:hidden">
                    Unit cost
                  </span>
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label="Unit cost"
                    value={l.unitCost}
                    onChange={(e) =>
                      setLines(
                        lines.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                unitCost: Math.max(0, Number(e.target.value)),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <span className="pb-2.5 text-right text-sm font-semibold text-[var(--text-primary)] sm:pb-0">
                  {formatStableCurrency(l.quantity * l.unitCost)}
                </span>
                <SmallButton
                  tone="danger"
                  icon={X}
                  className="order-first self-center justify-self-end sm:order-none"
                  aria-label="Remove line"
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                />
              </div>
            );
          })}
          <div className="flex items-center justify-between bg-[var(--bg-elevated)] px-4 py-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              {lines.reduce((s, l) => s + l.quantity, 0)} units
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              Total {formatStableCurrency(total)}
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-secondary)]">
          No products added yet.
        </p>
      )}

      <Field label="Notes">
        <TextInput
          value={notes}
          maxLength={1000}
          placeholder="Optional note for the supplier"
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
    </OpsDialog>
  );
}

/* ---------------------------------- Receive ---------------------------------- */

function ReceiveDialog({
  po,
  onClose,
}: {
  po: PurchaseOrderDTO;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: warehouses = [] } = useWarehouses();
  const action = usePurchaseOrderAction();
  const [warehouseId, setWarehouseId] = useState(po.warehouseId ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      po.lines.map((l) => [
        l.productId,
        Math.max(0, l.quantity - l.receivedQuantity),
      ]),
    ),
  );
  const totalUnits = Object.values(qty).reduce((s, n) => s + n, 0);

  const submit = async () => {
    try {
      const updated = await action.mutateAsync({
        id: po.id,
        data: {
          action: "receive",
          warehouseId: warehouseId || null,
          lotNumber: lotNumber || null,
          lines: po.lines.map((l) => ({
            productId: l.productId,
            quantity: qty[l.productId] ?? 0,
          })),
        },
      });
      toast({
        title: `${totalUnits} units received`,
        description:
          updated?.status === "received"
            ? `${po.poNumber} is complete`
            : `${po.poNumber} partly received`,
      });
      onClose();
    } catch (e) {
      toast({
        title: "Could not receive stock",
        description: errorMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <OpsDialog
      open
      onOpenChange={(o) => !o && onClose()}
      icon={PackageCheck}
      title={`Receive ${po.poNumber}`}
      description={`From ${po.supplierName}. Quantities default to what is still outstanding.`}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton
            icon={PackageCheck}
            disabled={totalUnits === 0}
            loading={action.isPending}
            onClick={submit}
          >
            Receive {totalUnits} units
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Warehouse">
          <NativeSelect
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Catalog only (no warehouse)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Lot / batch number">
          <TextInput
            value={lotNumber}
            maxLength={80}
            placeholder="e.g. LOT-2611-A"
            onChange={(e) => setLotNumber(e.target.value)}
          />
        </Field>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        {po.lines.map((l) => {
          const left = Math.max(0, l.quantity - l.receivedQuantity);
          return (
            <div
              key={l.productId}
              className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {l.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {l.receivedQuantity} of {l.quantity} received · {left} left
                </p>
              </div>
              <TextInput
                type="number"
                min={0}
                max={left}
                aria-label={`Receive quantity for ${l.name}`}
                className="w-24"
                disabled={left === 0}
                value={qty[l.productId] ?? 0}
                onChange={(e) =>
                  setQty({
                    ...qty,
                    [l.productId]: Math.min(
                      left,
                      Math.max(0, Math.floor(Number(e.target.value))),
                    ),
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </OpsDialog>
  );
}
