/**
 * Grouped sidebar navigation for the app shell (Navbar).
 * Paths mirror role-nav-config (which still drives RSC warm prefetch).
 */
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Printer,
  ScanLine,
  Undo2,

  FileCode,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Warehouse,
} from "lucide-react";

export type SidebarNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export type SidebarNavSection = {
  title: string;
  items: SidebarNavItem[];
};

const ADMIN_SECTIONS: SidebarNavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Insights", path: "/business-insights", icon: BarChart3 },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", path: "/products", icon: Package },
      { label: "Categories", path: "/categories", icon: Tags },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Warehouses", path: "/warehouses", icon: Warehouse },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Purchase orders", path: "/purchase-orders", icon: ClipboardList },
      { label: "Stock movements", path: "/stock-movements", icon: ArrowLeftRight },
      { label: "Stock counts", path: "/stock-counts", icon: ClipboardCheck },
      { label: "Scan", path: "/scan", icon: ScanLine },
      { label: "Labels", path: "/labels", icon: Printer },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", path: "/orders", icon: ShoppingCart },
      { label: "Invoices", path: "/invoices", icon: FileText },
      { label: "Returns", path: "/returns", icon: Undo2 },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Admin panel", path: "/admin", icon: ShieldCheck },
      { label: "Support", path: "/support-tickets", icon: MessageSquare },
    ],
  },
];

const CLIENT_SECTIONS: SidebarNavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Client portal", path: "/client", icon: LayoutDashboard }],
  },
  {
    title: "Shopping",
    items: [
      { label: "Browse products", path: "/products", icon: Store },
      { label: "My orders", path: "/orders", icon: ShoppingCart },
      { label: "My invoices", path: "/invoices", icon: FileText },
    ],
  },
  {
    title: "Help",
    items: [{ label: "Support", path: "/support-tickets", icon: MessageSquare }],
  },
];

const SUPPLIER_SECTIONS: SidebarNavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Supplier portal", path: "/supplier", icon: LayoutDashboard },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "My products", path: "/products", icon: Boxes },
      { label: "Orders", path: "/orders", icon: ShoppingCart },
      { label: "Invoices", path: "/invoices", icon: FileText },
    ],
  },
  {
    title: "Help",
    items: [{ label: "Support", path: "/support-tickets", icon: MessageSquare }],
  },
];

/** Secondary links pinned near the bottom of the sidebar (all roles). */
export const SIDEBAR_FOOTER_ITEMS: SidebarNavItem[] = [
  { label: "Email preferences", path: "/settings/email-preferences", icon: Settings },
  { label: "API docs", path: "/api-docs", icon: FileCode },
  { label: "API status", path: "/api-status", icon: Activity },
];

export function getSidebarSectionsForRole(
  role: string | null | undefined,
): SidebarNavSection[] {
  if (role === "client") return CLIENT_SECTIONS;
  if (role === "supplier") return SUPPLIER_SECTIONS;
  return ADMIN_SECTIONS;
}

/** Page title for the top bar, from the deepest matching nav item. */
export function resolveSidebarPageTitle(
  role: string | null | undefined,
  pathname: string | null | undefined,
): string {
  if (!pathname) return "";
  const all = [
    ...getSidebarSectionsForRole(role).flatMap((s) => s.items),
    ...SIDEBAR_FOOTER_ITEMS,
  ];
  let best: SidebarNavItem | undefined;
  for (const item of all) {
    const hit =
      pathname === item.path ||
      (item.path !== "/" && pathname.startsWith(`${item.path}/`));
    if (hit && (!best || item.path.length > best.path.length)) best = item;
  }
  return best?.label ?? "";
}

/** Icon for the brand tile — kept here so the shell has one icon source. */
export const BRAND_ICON = Boxes;
