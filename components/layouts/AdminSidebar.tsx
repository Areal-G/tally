"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  History,
  MessageSquare,
  Star,
  Store,
  Truck,
  Users,
  Mail,
  FileText,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminCounts } from "@/hooks/queries";
import { isDataSlotUnsettled } from "@/lib/react-query";
import { DataSlotPulse } from "@/components/shared/DataSlotPulse";
import {
  ADMIN_MANAGEMENT_ITEMS,
  ADMIN_MY_ACTIVITY_ITEMS,
  ADMIN_MY_STORE_ITEMS,
  ADMIN_SETTINGS_EMAIL_HREF,
  type AdminNavItemConfig,
} from "@/lib/navigation/admin-nav-config";
import { isAdminNavActive } from "@/lib/navigation/nav-link-styles";
import type { AdminCounts } from "@/types";

/** Icon per admin page (hrefs live in admin-nav-config). */
const ADMIN_NAV_ICONS: Record<string, LucideIcon> = {
  "/admin/dashboard-overall-insights": LayoutDashboard,
  "/admin/orders": ShoppingCart,
  "/admin/invoices": FileText,
  "/admin/support-tickets": MessageSquare,
  "/admin/product-reviews": Star,
  "/admin/products": Package,
  "/admin/warehouses": Warehouse,
  "/admin/supplier-portal": Truck,
  "/admin/client-portal": Store,
  "/admin/user-management": Users,
  "/admin/activity-history": History,
  "/admin/my-activity": UserCircle,
  [ADMIN_SETTINGS_EMAIL_HREF]: Mail,
};

/** Short tab labels so every tile fits. */
const ADMIN_TAB_LABELS: Record<string, string> = {
  "/admin/dashboard-overall-insights": "Overview",
  "/admin/support-tickets": "Tickets",
  "/admin/product-reviews": "Reviews",
  "/admin/supplier-portal": "Suppliers",
  "/admin/client-portal": "Clients",
  "/admin/user-management": "Users",
  "/admin/activity-history": "Activity",
  [ADMIN_SETTINGS_EMAIL_HREF]: "Email",
};

const ADMIN_TABS: AdminNavItemConfig[] = [
  ...ADMIN_MY_STORE_ITEMS,
  ...ADMIN_MANAGEMENT_ITEMS,
  ...ADMIN_MY_ACTIVITY_ITEMS,
  { href: ADMIN_SETTINGS_EMAIL_HREF, label: "Email Preferences" },
];

/**
 * Admin panel navigation: a tidy grid of equal tiles above the page (no second sidebar).
 * Two rows on desktop; compact icon-over-label tiles on phones. Never scrolls sideways.
 */
export default function AdminSidebar({
  initialCounts,
}: {
  /** SSR-passed sidebar badge counts */
  initialCounts?: AdminCounts;
} = {}) {
  const pathname = usePathname();
  const countsQuery = useAdminCounts(initialCounts);
  const counts = countsQuery.data ?? initialCounts;
  const countsLoading = isDataSlotUnsettled(countsQuery, initialCounts);

  const countBadge = (item: AdminNavItemConfig, active: boolean) => {
    if (!item.countKey) return null;
    const count = counts?.[item.countKey];
    if (!countsLoading && (count === undefined || count <= 0)) return null;
    return (
      <span
        className={cn(
          // Counts only where tiles are wide enough; labels must never get cut off.
          "ml-auto hidden shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums min-[1400px]:inline-block",
          active
            ? "bg-white/20 text-white"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
        )}
        aria-label={countsLoading ? "Loading count" : `${count} items`}
      >
        {countsLoading ? <DataSlotPulse variant="badge" /> : count! > 99 ? "99+" : count}
      </span>
    );
  };

  return (
    <nav
      aria-label="Admin navigation"
      className="money-surface grid grid-cols-4 gap-1 !rounded-2xl p-1.5 sm:grid-cols-5 lg:grid-cols-7"
    >
      {ADMIN_TABS.map((item) => {
        const Icon = ADMIN_NAV_ICONS[item.href] ?? Package;
        const active = isAdminNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition",
              "sm:flex-row sm:gap-1.5 sm:px-2.5 sm:text-sm",
              active
                ? "money-nav-active"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{ADMIN_TAB_LABELS[item.href] ?? item.label}</span>
            {countBadge(item, active)}
          </Link>
        );
      })}
    </nav>
  );
}
