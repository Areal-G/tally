"use client";

import Link from "next/link";
import {
  Barcode,
  ClipboardCheck,
  FileText,
  Store,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { TallyMark } from "@/components/brand/TallyMark";
import { AuthAnimatedBlock } from "@/components/auth/AuthAnimatedBlock";
import { AUTH_STAGGER_MS } from "@/components/auth/auth-animation";

/** Figures from the Northgate sample store created by `npm run seed`. */
const STORE_STATS = [
  { label: "Inventory value", value: "$82,328.90" },
  { label: "Products", value: "30" },
  { label: "Warehouses", value: "3" },
  { label: "Orders", value: "36" },
] as const;

const FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "Multi-warehouse stock", icon: Warehouse },
  { label: "Purchase orders", icon: Truck },
  { label: "Stock counts", icon: ClipboardCheck },
  { label: "Barcode scanning", icon: Barcode },
  { label: "Invoices & payments", icon: FileText },
  { label: "Supplier & client portals", icon: Store },
];

/**
 * Left column of the login page (lg+): brand, value proposition, a preview of
 * an example store, and the main feature areas.
 */
export function LoginShowcase() {
  return (
    <div className="money-brand-fill relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] p-10 xl:p-12">
      {/* Soft light + fine grid for depth; purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/20 blur-3xl"
      />

      <AuthAnimatedBlock delayMs={0} className="relative">
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Tally — Inventory Management"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <TallyMark className="h-6 w-6" />
          </span>
          <span className="text-xl font-semibold tracking-[-0.03em]">Tally</span>
        </Link>
      </AuthAnimatedBlock>

      <div className="relative space-y-8">
        <AuthAnimatedBlock delayMs={AUTH_STAGGER_MS} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            Inventory management
          </p>
          <h1 className="max-w-md text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] xl:text-5xl">
            Count every item. Know every shelf.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/80">
            Products, stock across warehouses, purchase orders, invoices and
            barcode scanning in one workspace for owners, suppliers and clients.
          </p>
        </AuthAnimatedBlock>

        <AuthAnimatedBlock delayMs={AUTH_STAGGER_MS * 2}>
          <div className="max-w-md rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Northgate Supply Co.</p>
                <p className="text-xs text-white/70">Example store · sample data</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                Preview
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {STORE_STATS.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/10 px-3.5 py-3">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/65">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </AuthAnimatedBlock>
      </div>

      <AuthAnimatedBlock delayMs={AUTH_STAGGER_MS * 3} className="relative">
        <ul className="flex max-w-lg flex-wrap gap-2" aria-label="What's inside">
          {FEATURES.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium ring-1 ring-white/15"
            >
              <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </AuthAnimatedBlock>
    </div>
  );
}
