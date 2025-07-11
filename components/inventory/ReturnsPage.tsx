"use client";

/**
 * Returns (RMA): log a customer return against an order, then restock resellable
 * items or close damaged ones. Restocking writes a "return" movement.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Clock,
  DollarSign,
  PackagePlus,
  Plus,
  Undo2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/queries/use-warehouses";
import {
  useCreateReturn,
  useReturnAction,
  useReturnableOrders,
  useReturns,
} from "@/hooks/queries/use-inventory-ops";
import { formatStableCurrency } from "@/lib/format";
import { RETURN_REASONS, type ProductReturnDTO } from "@/lib/inventory/schemas";
import { cn } from "@/lib/utils";
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

const STATUS_TONE: Record<ProductReturnDTO["status"], PillTone> = {
  requested: "amber",
  restocked: "emerald",
  rejected: "rose",
};

export default function ReturnsPage() {
  const { data: returns = [], isLoading } = useReturns();
  const [createOpen, setCreateOpen] = useState(false);

  const stats = useMemo(() => {
    const units = (r: ProductReturnDTO) => r.lines.reduce((s, l) => s + l.quantity, 0);
    return {
      open: returns.filter((r) => r.status === "requested").length,
      restockedUnits: returns.filter((r) => r.status === "restocked" && r.condition === "resellable").reduce((s, r) => s + units(r), 0),
      refunds: returns.filter((r) => r.status !== "rejected").reduce((s, r) => s + r.refundAmount, 0),
      damaged: returns.filter((r) => r.condition === "damaged" && r.status !== "rejected").reduce((s, r) => s + units(r), 0),
    };
  }, [returns]);

  return (
    <OpsPage
      title="Returns"
      description="Take items back from customers and put resellable stock back on the shelf."
      actions={
        <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>
          New return
        </PrimaryButton>
      }
    >
      <StatGrid>
        <StatTile label="Awaiting decision" value={stats.open} icon={Clock} loading={isLoading} hint="Returns to inspect" />
        <StatTile label="Units restocked" value={stats.restockedUnits} icon={PackagePlus} loading={isLoading} hint="Back in sellable stock" />
        <StatTile label="Refund value" value={formatStableCurrency(stats.refunds)} icon={DollarSign} loading={isLoading} hint="Approved and pending returns" />
        <StatTile label="Damaged units" value={stats.damaged} icon={Ban} loading={isLoading} hint="Written off, not restocked" />
      </StatGrid>

      <Panel title="Return requests" icon={Undo2}>
        {isLoading ? (
          <LoadingRows />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={Undo2}
            title="No returns yet"
            description="When a customer sends something back, log it here against their order."
            action={
              <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>
                New return
              </PrimaryButton>
            }
          />
        ) : (
          <OpsTable>
            <thead>
              <tr>
                <Th>Return</Th>
                <Th>Order</Th>
                <Th>Items</Th>
                <Th>Reason</Th>
                <Th>Refund</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <ReturnRow key={r.id} ret={r} />
              ))}
            </tbody>
          </OpsTable>
        )}
      </Panel>

      {createOpen && <CreateReturnDialog onClose={() => setCreateOpen(false)} />}
    </OpsPage>
  );
}

function ReturnRow({ ret }: { ret: ProductReturnDTO }) {
  const { toast } = useToast();
  const action = useReturnAction();
  const units = ret.lines.reduce((s, l) => s + l.quantity, 0);

  const run = async (kind: "restock" | "reject") => {
    try {
      await action.mutateAsync({ id: ret.id, action: kind });
      toast({
        title:
          kind === "reject"
            ? `${ret.returnNumber} rejected`
            : ret.condition === "resellable"
              ? `${units} units back in stock`
              : `${ret.returnNumber} closed as damaged`,
      });
    } catch (e) {
      toast({ title: "Could not update return", description: errorMessage(e), variant: "destructive" });
    }
  };

  return (
    <tr>
      <Td>
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-semibold">{ret.returnNumber}</span>
          <span className="text-xs text-[var(--text-secondary)]">{formatDate(ret.createdAt)}</span>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col">
          <Link href={`/orders/${ret.orderId}`} className="whitespace-nowrap font-medium text-[var(--accent-blue)] hover:underline">
            {ret.orderNumber}
          </Link>
          <span className="text-xs text-[var(--text-secondary)]">{ret.customerName ?? "Walk-in"}</span>
        </div>
      </Td>
      <Td>
        <div className="flex max-w-[220px] flex-col">
          <span className="truncate">{ret.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {units} unit{units === 1 ? "" : "s"} · {ret.warehouseName ?? "Catalog"}
          </span>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col gap-1">
          <span className="text-sm">{ret.reason}</span>
          <Pill tone={ret.condition === "resellable" ? "sky" : "rose"} className="w-fit">
            {ret.condition}
          </Pill>
        </div>
      </Td>
      <Td className="font-semibold">{formatStableCurrency(ret.refundAmount)}</Td>
      <Td>
        <Pill tone={STATUS_TONE[ret.status]}>{ret.status}</Pill>
      </Td>
      <Td>
        <div className="flex justify-end gap-1">
          {ret.status === "requested" ? (
            <>
              <SmallButton tone="brand" icon={CheckCircle2} disabled={action.isPending} onClick={() => run("restock")}>
                {ret.condition === "resellable" ? "Restock" : "Close"}
              </SmallButton>
              <SmallButton tone="danger" icon={Ban} disabled={action.isPending} onClick={() => run("reject")}>
                Reject
              </SmallButton>
            </>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">{formatDate(ret.resolvedAt)}</span>
          )}
        </div>
      </Td>
    </tr>
  );
}

function CreateReturnDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useReturnableOrders();
  const { data: warehouses = [] } = useWarehouses();
  const create = useCreateReturn();

  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState<(typeof RETURN_REASONS)[number]>("Damaged in transit");
  const [condition, setCondition] = useState<"resellable" | "damaged">("resellable");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});

  const order = orders.find((o) => o.id === orderId);
  const items = useMemo(() => {
    if (!order) return [];
    const m = new Map<string, { productId: string; name: string; sku: string | null; quantity: number; price: number }>();
    for (const i of order.items) {
      const prev = m.get(i.productId);
      m.set(i.productId, {
        productId: i.productId,
        name: i.productName,
        sku: i.sku,
        quantity: (prev?.quantity ?? 0) + i.quantity,
        price: i.price,
      });
    }
    return [...m.values()];
  }, [order]);

  const lines = items.filter((i) => (qty[i.productId] ?? 0) > 0).map((i) => ({ productId: i.productId, quantity: qty[i.productId]! }));
  const refund = items.reduce((s, i) => s + (qty[i.productId] ?? 0) * i.price, 0);

  const submit = async () => {
    try {
      const r = await create.mutateAsync({
        orderId,
        reason,
        condition,
        warehouseId: warehouseId || null,
        notes: notes || null,
        lines,
      });
      toast({ title: `${r.returnNumber} logged`, description: "Restock it once the items arrive." });
      onClose();
    } catch (e) {
      toast({ title: "Could not create return", description: errorMessage(e), variant: "destructive" });
    }
  };

  return (
    <OpsDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      icon={Undo2}
      title="New return"
      description="Choose the order, the items coming back and their condition."
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton disabled={!orderId || lines.length === 0} loading={create.isPending} onClick={submit}>
            Log return · {formatStableCurrency(refund)}
          </PrimaryButton>
        </>
      }
    >
      <Field label="Order">
        <NativeSelect
          value={orderId}
          disabled={isLoading}
          onChange={(e) => {
            setOrderId(e.target.value);
            setQty({});
          }}
        >
          <option value="">{isLoading ? "Loading orders…" : "Choose an order…"}</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} · {o.customerName ?? "Store"} · {o.status} · {formatDate(o.createdAt)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {order && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          {items.map((i) => (
            <div key={i.productId} className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{i.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {i.quantity} ordered · {formatStableCurrency(i.price)} each
                </p>
              </div>
              <TextInput
                type="number"
                min={0}
                max={i.quantity}
                aria-label={`Return quantity for ${i.name}`}
                className="w-24"
                value={qty[i.productId] ?? 0}
                onChange={(e) =>
                  setQty({ ...qty, [i.productId]: Math.min(i.quantity, Math.max(0, Math.floor(Number(e.target.value)))) })
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reason">
          <NativeSelect value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Restock into">
          <NativeSelect value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Where it was picked from</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Condition">
        <div className="grid grid-cols-2 gap-2">
          {(["resellable", "damaged"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-2xl border p-3 text-left transition-colors",
                condition === c
                  ? "border-[var(--accent-purple)] bg-[var(--tint-violet)]"
                  : "border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]",
              )}
            >
              <span className="text-sm font-semibold capitalize text-[var(--text-primary)]">{c}</span>
              <span className="text-xs text-[var(--text-secondary)]">
                {c === "resellable" ? "Goes back into sellable stock" : "Written off, not restocked"}
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Notes">
        <TextInput value={notes} maxLength={500} placeholder="Optional" onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </OpsDialog>
  );
}
