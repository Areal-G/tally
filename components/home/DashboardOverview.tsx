"use client";

/**
 * Admin dashboard home (Tally design system):
 * gradient welcome banner → KPI cards with sparklines → revenue trend + stock health →
 * recent orders + low stock → top products, inventory by category, order status.
 * Reads the same SSR-hydrated dashboard query as the old StatisticsSection.
 */
import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  FileText,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useDashboard } from "@/hooks/queries/use-dashboard";
import {
  isDataSlotUnsettled,
  queryKeys,
  useSyncSsrQueryData,
} from "@/lib/react-query";
import { useAuth } from "@/contexts";
import { formatStableCurrency } from "@/lib/format";
import { ResponsiveChartContainer } from "@/components/ui/responsive-chart-container";
import { OrderStatusBadge } from "@/lib/ui/semantic-badges";
import { effectiveReorderPoint } from "@/lib/inventory/schemas";
import {
  usePurchaseOrders,
  useReorderSuggestions,
  useStockMovements,
} from "@/hooks/queries/use-inventory-ops";
import { useHydrated } from "@/hooks/use-hydrated";
import { DataSlotPulse } from "@/components/shared/DataSlotPulse";
import type { DashboardStats } from "@/types";

type DashboardProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  committedQuantity?: number;
  reorderPoint?: number | null;
  category?: string | { id: string; name: string } | null;
};

const money = formatStableCurrency;
const compactMoney = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`;

type StatusKey = keyof NonNullable<DashboardStats["orderAnalytics"]>["statusDistribution"];
const ORDER_STATUS_ROWS: { key: StatusKey; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "var(--accent-amber)" },
  { key: "confirmed", label: "Confirmed", color: "var(--accent-blue)" },
  { key: "processing", label: "Processing", color: "var(--accent-purple)" },
  { key: "shipped", label: "Shipped", color: "var(--accent-teal)" },
  { key: "delivered", label: "Delivered", color: "var(--status-positive)" },
  { key: "cancelled", label: "Cancelled", color: "var(--status-negative)" },
];

const CATEGORY_COLORS = [
  "var(--accent-purple)",
  "var(--accent-blue)",
  "var(--accent-teal)",
  "var(--accent-amber)",
  "var(--accent-pink)",
];

const TOOLTIP_STYLE = {
  background: "var(--card-bg)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 14,
  boxShadow: "var(--card-shadow)",
  fontSize: 12,
};

function categoryName(c: DashboardProduct["category"]): string {
  if (!c) return "Uncategorized";
  return typeof c === "string" ? c : c.name;
}

/* ------------------------------------------------------------------ */

function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`money-surface flex min-w-0 flex-col p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--accent-purple)] transition-colors hover:bg-[var(--tint-violet)]"
    >
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function DeltaPill({ delta, vsLabel }: { delta: number | null; vsLabel: string }) {
  if (delta == null || !Number.isFinite(delta)) {
    return <span className="text-[11px] text-[var(--text-secondary)]">No prior month to compare</span>;
  }
  const up = delta >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
      <span
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold"
        style={{
          background: up ? "var(--tint-emerald)" : "var(--tint-rose)",
          color: up ? "var(--status-positive)" : "var(--status-negative)",
        }}
      >
        <Icon className="h-3 w-3" />
        {Math.abs(delta).toFixed(0)}%
      </span>
      vs {vsLabel}
    </span>
  );
}

function Sparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-12 w-full" aria-hidden>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minHeight={40}
        initialDimension={{ width: 200, height: 48 }}
      >
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${id})`}
            className="dash-gradient-area"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  tint,
  loading,
  footer,
  spark,
  sparkId,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tint: string;
  loading: boolean;
  footer: React.ReactNode;
  spark?: number[];
  sparkId: string;
}) {
  return (
    <article
      className="money-surface money-stat flex min-w-0 flex-col p-5"
      style={{ ["--stat-accent" as string]: color, ["--stat-tint" as string]: tint }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          {label}
        </p>
        <span className="money-stat-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-1 whitespace-nowrap text-[1.75rem] font-semibold leading-none tracking-[-0.045em] text-[var(--text-primary)]">
        {loading ? <DataSlotPulse variant="metric" /> : value}
      </p>
      <div className="mt-3 min-h-[20px]">{footer}</div>
      {spark && spark.length > 1 && (
        <div className="-mx-1 mt-auto pt-3">
          <Sparkline data={spark} color={color} id={sparkId} />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */

export function DashboardOverview({
  initialStats,
  products,
}: {
  initialStats?: DashboardStats | null;
  products: DashboardProduct[];
}) {
  const { user } = useAuth();
  const dashboardQuery = useDashboard(initialStats ?? undefined);
  const stats = dashboardQuery.data ?? initialStats ?? null;
  const loading = isDataSlotUnsettled(dashboardQuery, initialStats);

  useSyncSsrQueryData(
    queryKeys.dashboard.overview(user?.id ?? ""),
    user?.id && initialStats != null ? initialStats : undefined,
  );

  const firstName = user?.name?.split(" ")[0];
  const revenue =
    stats?.orderAnalytics?.totalRevenueExcludingCancelled ?? stats?.revenue?.fromOrders ?? 0;
  const statusDist = stats?.orderAnalytics?.statusDistribution;
  const statusTotal = statusDist
    ? ORDER_STATUS_ROWS.reduce((sum, r) => sum + (statusDist[r.key] ?? 0), 0)
    : 0;
  const breakdown = stats?.productStatusBreakdown;
  const stockAlerts = (breakdown?.stockLow ?? 0) + (breakdown?.stockOut ?? 0);
  const openOrders =
    (statusDist?.pending ?? 0) + (statusDist?.confirmed ?? 0) + (statusDist?.processing ?? 0);

  /* Trend series — drop empty leading months; compare the latest month that has activity. */
  const trend = useMemo(() => {
    const points = stats?.trends ?? [];
    const first = points.findIndex((p) => p.revenue > 0 || p.orders > 0);
    const start = first < 0 ? 0 : Math.max(0, Math.min(first - 1, points.length - 6));
    return points.slice(start);
  }, [stats?.trends]);

  const [range, setRange] = useState<3 | 6 | 12>(6);
  const chartTrend = useMemo(() => (stats?.trends ?? []).slice(-range), [stats?.trends, range]);
  const chartTotal = chartTrend.reduce((s, p) => s + p.revenue, 0);

  const comparison = useMemo(() => {
    const pts = [...trend];
    const last = pts[pts.length - 1];
    if (last && last.revenue === 0 && last.orders === 0) pts.pop();
    const cur = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const pct = (a?: number, b?: number) =>
      a == null || b == null || b === 0 ? null : ((a - b) / b) * 100;
    return {
      vsLabel: prev?.label?.split(" ")[0] ?? "last month",
      revenue: pct(cur?.revenue, prev?.revenue),
      orders: pct(cur?.orders, prev?.orders),
    };
  }, [trend]);

  const lowStock = useMemo(
    () =>
      products
        .map((p) => ({
          ...p,
          available: Math.max(0, p.quantity - (p.committedQuantity ?? 0)),
          point: effectiveReorderPoint(p.reorderPoint),
        }))
        .filter((p) => p.available <= p.point)
        .sort((a, b) => a.available - b.available)
        .slice(0, 5),
    [products],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const key = categoryName(p.category);
      map.set(key, (map.get(key) ?? 0) + p.price * p.quantity);
    }
    const rows = [...map.entries()].map(([name, value]) => ({ name, value }));
    rows.sort((a, b) => b.value - a.value);
    return rows.slice(0, 5);
  }, [products]);
  const categoryMax = byCategory[0]?.value ?? 0;

  const topProducts = [...(stats?.orderAnalytics?.topProducts ?? [])]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);
  const topMax = Math.max(1, ...topProducts.map((p) => p.totalRevenue));

  const health = [
    { name: "Healthy", value: breakdown?.available ?? 0, color: "var(--status-positive)" },
    { name: "Low", value: breakdown?.stockLow ?? 0, color: "var(--accent-amber)" },
    { name: "Out", value: breakdown?.stockOut ?? 0, color: "var(--status-negative)" },
  ];
  const healthTotal = health.reduce((s, h) => s + h.value, 0);
  const healthyPct = healthTotal ? Math.round(((health[0]?.value ?? 0) / healthTotal) * 100) : 0;
  const donutData = healthTotal
    ? health
    : [{ name: "None", value: 1, color: "var(--bg-elevated)" }];

  const recentOrders = stats?.recent?.orders?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* ---------- Welcome banner ---------- */}
      <section className="money-brand-fill money-brand-shadow relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-48 h-64 w-64 rounded-full bg-white/[0.07]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              Store overview
            </p>
            <h1 className="mt-2 text-[1.9rem] font-semibold leading-tight tracking-[-0.045em] text-white sm:text-[2.4rem]">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {loading
                ? "Loading your store summary…"
                : `${openOrders} open ${openOrders === 1 ? "order needs" : "orders need"} attention and ${stockAlerts} ${stockAlerts === 1 ? "product is" : "products are"} low or out of stock.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/orders"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#3d33a8] shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <ShoppingCart className="h-4 w-4" /> Review orders
              </Link>
              <Link
                href="/business-insights"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <BarChart3 className="h-4 w-4" /> Open insights
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            {[
              { label: "Inventory value", value: money(stats?.totalInventoryValue ?? 0) },
              { label: "Products", value: String(stats?.counts?.products ?? 0) },
              { label: "Warehouses", value: String(stats?.counts?.warehouses ?? 0) },
              { label: "Suppliers", value: String(stats?.counts?.suppliers ?? 0) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
                  {s.label}
                </p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">
                  {loading ? "—" : s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- KPI cards ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={money(revenue)}
          icon={DollarSign}
          color="var(--accent-purple)"
          tint="var(--tint-violet)"
          loading={loading}
          footer={<DeltaPill delta={comparison.revenue} vsLabel={comparison.vsLabel} />}
          spark={trend.map((t) => t.revenue)}
          sparkId="revenue"
        />
        <KpiCard
          label="Orders"
          value={stats?.counts?.orders ?? 0}
          icon={ShoppingCart}
          color="var(--accent-blue)"
          tint="var(--tint-sky)"
          loading={loading}
          footer={<DeltaPill delta={comparison.orders} vsLabel={comparison.vsLabel} />}
          spark={trend.map((t) => t.orders)}
          sparkId="orders"
        />
        <KpiCard
          label="Invoices"
          value={stats?.counts?.invoices ?? 0}
          icon={FileText}
          color="var(--accent-teal)"
          tint="var(--tint-emerald)"
          loading={loading}
          footer={
            <span className="text-[11px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {money(stats?.invoiceAnalytics?.outstandingAmount ?? 0)}
              </span>{" "}
              still due
            </span>
          }
          spark={trend.map((t) => t.invoices)}
          sparkId="invoices"
        />
        <KpiCard
          label="Stock alerts"
          value={stockAlerts}
          icon={AlertTriangle}
          color="var(--accent-amber)"
          tint="var(--tint-amber)"
          loading={loading}
          sparkId="alerts"
          footer={
            <div className="flex h-full flex-col">
              <span className="text-[11px] text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  {breakdown?.stockLow ?? 0}
                </span>{" "}
                low ·{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {breakdown?.stockOut ?? 0}
                </span>{" "}
                out of stock
              </span>
              <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                {health.map((h) => (
                  <div
                    key={h.name}
                    style={{
                      width: `${healthTotal ? (h.value / healthTotal) * 100 : 0}%`,
                      background: h.color,
                    }}
                  />
                ))}
              </div>
            </div>
          }
        />
      </div>

      {/* ---------- Revenue trend + stock health ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-3">
        <Panel
          title="Revenue trend"
          subtitle={`${money(chartTotal)} over the last ${range} months`}
          className="xl:col-span-2"
          action={<RangeToggle value={range} onChange={setRange} />}
        >
          {loading && chartTrend.length === 0 ? (
            <div className="h-[260px] animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
          ) : (
            <ResponsiveChartContainer className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <AreaChart data={chartTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dash-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis width={52} tickLine={false} axisLine={false} tickFormatter={compactMoney} />
                <Tooltip
                  cursor={{ stroke: "var(--accent-purple)", strokeOpacity: 0.25 }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [money(Number(value)), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent-purple)"
                  strokeWidth={2.5}
                  fill="url(#dash-revenue)"
                  className="dash-gradient-area"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveChartContainer>
          )}
        </Panel>

        <Panel
          title="Stock health"
          subtitle={`${healthTotal} products tracked`}
          action={<ViewAll href="/products" />}
        >
          <div className="relative mx-auto h-[190px] w-[190px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 190, height: 190 }}
            >
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={healthTotal ? 3 : 0}
                  cornerRadius={6}
                  stroke="none"
                  className="dash-donut"
                  isAnimationActive={false}
                >
                  {donutData.map((h) => (
                    <Cell key={h.name} fill={h.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[1.75rem] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">
                {healthyPct}%
              </span>
              <span className="text-xs text-[var(--text-secondary)]">healthy</span>
            </div>
          </div>
          <ul className="mt-5 grid grid-cols-3 gap-2">
            {health.map((h) => (
              <li
                key={h.name}
                className="rounded-2xl bg-[var(--bg-elevated)] px-3 py-2.5 text-center"
              >
                <span className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
                  {h.name}
                </span>
                <span className="mt-0.5 block text-base font-semibold text-[var(--text-primary)]">
                  {h.value}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---------- Recent orders + low stock ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-3">
        <Panel
          title="Recent orders"
          subtitle="Latest activity across your store"
          className="xl:col-span-2"
          action={<ViewAll href="/orders" />}
        >
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              {loading ? "Loading orders…" : "No orders yet."}
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {recentOrders.map((o) => {
                const initials = (o.placedByName ?? "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tint-violet)] text-xs font-semibold text-[var(--accent-purple)]">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {o.placedByName ?? o.orderNumber}
                        </p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {o.orderNumber}
                          {o.productPreview ? ` · ${o.productPreview}` : ""}
                        </p>
                      </div>
                      <OrderStatusBadge status={o.status} className="hidden sm:inline-flex" />
                      <span className="w-24 shrink-0 text-right text-sm font-semibold text-[var(--text-primary)]">
                        {money(o.total)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Low stock"
          subtitle="At or below the reorder point"
          action={<ViewAll href="/purchase-orders" label="Reorder" />}
        >
          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              All products are well stocked.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {lowStock.map((p) => {
                const pct = Math.min(100, (p.available / Math.max(1, p.point)) * 100);
                const out = p.available === 0;
                return (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="group block">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-purple)]">
                          {p.name}
                        </span>
                        <span
                          className="shrink-0 text-xs font-semibold"
                          style={{
                            color: out ? "var(--status-negative)" : "var(--status-warning)",
                          }}
                        >
                          {out ? "Out of stock" : `${p.available} left · reorder at ${p.point}`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${out ? 100 : Math.max(4, pct)}%`,
                            background: out ? "var(--tint-rose)" : "var(--accent-amber)",
                          }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <OperationsRow />

      {/* ---------- Top products / category value / order status ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        <Panel
          title="Top products"
          subtitle="By order revenue"
          action={<ViewAll href="/products" />}
        >
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No sales yet.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {topProducts.map((p, i) => (
                <li key={p.productId}>
                  <Link href={`/products/${p.productId}`} className="group block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-purple)]">
                          {p.productName}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                        {money(p.totalRevenue)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-[image:var(--brand-gradient)]"
                        style={{ width: `${(p.totalRevenue / topMax) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {p.totalQuantity} units · {p.orderCount} orders
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          title="Inventory by category"
          subtitle="Stock value on hand"
          action={<ViewAll href="/categories" />}
        >
          {byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              <Package className="mx-auto mb-2 h-5 w-5" />
              No products yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {byCategory.map((c, i) => (
                <li key={c.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: CATEGORY_COLORS[i] }}
                      />
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        {c.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--text-primary)]">
                      {money(c.value)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${categoryMax ? (c.value / categoryMax) * 100 : 0}%`,
                        background: CATEGORY_COLORS[i],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Order status"
          subtitle={`${statusTotal} orders in total`}
          className="lg:col-span-2 xl:col-span-1"
          action={<ViewAll href="/orders" />}
        >
          <div className="mb-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            {ORDER_STATUS_ROWS.map((row) => (
              <div
                key={row.key}
                title={`${row.label}: ${statusDist?.[row.key] ?? 0}`}
                style={{
                  width: `${statusTotal ? ((statusDist?.[row.key] ?? 0) / statusTotal) * 100 : 0}%`,
                  background: row.color,
                }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {ORDER_STATUS_ROWS.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between rounded-2xl bg-[var(--bg-elevated)] px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {loading ? <DataSlotPulse variant="badge" /> : (statusDist?.[row.key] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Range toggle + operations row (incoming stock, reorder now, movements) */

function RangeToggle({
  value,
  onChange,
}: {
  value: 3 | 6 | 12;
  onChange: (v: 3 | 6 | 12) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-subtle)] p-1">
      {([3, 6, 12] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-pressed={value === r}
          className={
            value === r
              ? "rounded-full bg-[image:var(--brand-gradient)] px-2.5 py-1 text-xs font-semibold text-white"
              : "rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }
        >
          {r}M
        </button>
      ))}
    </div>
  );
}

const MOVEMENT_LABEL: Record<string, string> = {
  received: "Received",
  sold: "Sold",
  transfer: "Transfer",
  adjustment: "Adjusted",
  count: "Count",
  return: "Returned",
};

function shortDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No date";
}

function OperationsRow() {
  const hydrated = useHydrated();
  const poQuery = usePurchaseOrders();
  const sugQuery = useReorderSuggestions();
  const movQuery = useStockMovements();
  // Before hydration render as empty+loading so SSR and the first client pass match.
  const pos = (hydrated && poQuery.data) || [];
  const suggestions = (hydrated && sugQuery.data) || [];
  const movements = (hydrated && movQuery.data) || [];
  const posLoadingRaw = poQuery.isLoading;
  const sugLoadingRaw = sugQuery.isLoading;
  const movLoadingRaw = movQuery.isLoading;
  const posLoading = posLoadingRaw || !hydrated;
  const sugLoading = sugLoadingRaw || !hydrated;
  const movLoading = movLoadingRaw || !hydrated;

  const open = pos.filter((p) => p.status === "ordered" || p.status === "partial");
  const incomingUnits = open.reduce(
    (s, p) => s + p.lines.reduce((t, l) => t + Math.max(0, l.quantity - l.receivedQuantity), 0),
    0,
  );
  const pulse = <div className="h-40 animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
      <Panel
        title="Incoming stock"
        subtitle={`${incomingUnits.toLocaleString()} units on ${open.length} open order${open.length === 1 ? "" : "s"}`}
        action={<ViewAll href="/purchase-orders" />}
      >
        {posLoading ? (
          pulse
        ) : open.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            <Truck className="mx-auto mb-2 h-5 w-5" />
            Nothing on order right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {open.slice(0, 4).map((p) => {
              const ordered = p.lines.reduce((s, l) => s + l.quantity, 0);
              const got = p.lines.reduce((s, l) => s + l.receivedQuantity, 0);
              return (
                <li key={p.id}>
                  <Link href="/purchase-orders" className="group block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-purple)]">
                        {p.supplierName}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                        Due {shortDate(p.expectedDate)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-[image:var(--brand-gradient)]"
                        style={{ width: `${Math.max(4, ordered ? (got / ordered) * 100 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {p.poNumber} · {got}/{ordered} received · {money(p.total)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Reorder now"
        subtitle={`${suggestions.length} product${suggestions.length === 1 ? "" : "s"} need restocking`}
        action={<ViewAll href="/purchase-orders" label="Create PO" />}
      >
        {sugLoading ? (
          pulse
        ) : suggestions.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            Everything is above its reorder point.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
            {suggestions.slice(0, 5).map((s) => (
              <li key={s.productId} className="flex items-center gap-3 py-2.5 first:pt-0">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    background: s.available === 0 ? "var(--tint-rose)" : "var(--tint-amber)",
                    color: s.available === 0 ? "var(--status-negative)" : "var(--status-warning)",
                  }}
                >
                  {s.available}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{s.name}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {s.supplierName} · reorder at {s.reorderPoint}
                    {s.onOrder > 0 ? ` · ${s.onOrder} on order` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-[var(--accent-purple)]">
                  +{s.suggestedQuantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Latest stock movements"
        subtitle="Receipts, sales, transfers and corrections"
        action={<ViewAll href="/stock-movements" />}
        className="lg:col-span-2 xl:col-span-1"
      >
        {movLoading ? (
          pulse
        ) : movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No stock movements yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
            {movements.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{m.productName}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {MOVEMENT_LABEL[m.type] ?? m.type}
                    {m.reference ? ` · ${m.reference}` : ""} · {shortDate(m.createdAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 text-sm font-semibold tabular-nums"
                  style={{
                    color:
                      m.type === "transfer"
                        ? "var(--accent-blue)"
                        : m.quantity >= 0
                          ? "var(--status-positive)"
                          : "var(--status-negative)",
                  }}
                >
                  {m.type === "transfer"
                    ? `⇄ ${Math.abs(m.quantity)}`
                    : `${m.quantity > 0 ? "+" : "−"}${Math.abs(m.quantity)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
