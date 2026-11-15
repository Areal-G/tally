"use client";

/**
 * App shell: collapsible grouped sidebar (drawer on mobile) + slim top bar
 * (page title, ⌘K search, notifications, theme, account) + scrollable content.
 * Role is inferred from user.role or pathname so the right nav shows before auth resolves.
 * Name kept as "Navbar" because ~25 pages wrap themselves in <Navbar>.
 */
import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TallyMark } from "@/components/brand/TallyMark";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/contexts/auth-context";
import { setPostLogoutGoodbye } from "@/lib/auth/post-logout-goodbye";
import { clearAuthToastMarkers } from "@/components/shared/AuthSessionToasts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { SafeAvatarImage } from "@/components/ui/safe-avatar-image";
import { resolveUserAvatarSources } from "@/lib/ui/user-avatar-sources";
import ScrollControl from "../shared/ScrollControl";
import { NotificationBell } from "../shared";
import {
  DROPDOWN_NAV_CONTENT_CLASS,
  DROPDOWN_NAV_ITEM_CLASS,
} from "@/components/ui/menu-item-styles";
import { isNavPathActive } from "@/lib/navigation/is-nav-path-active";
import { getHomePathForRole } from "@/lib/navigation/role-nav-config";
import {
  getSidebarSectionsForRole,
  SIDEBAR_FOOTER_ITEMS,
  type SidebarNavItem,
  type SidebarNavSection,
} from "@/lib/navigation/sidebar-nav-config";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "tally-sidebar-collapsed";

const ROLE_LABEL: Record<string, string> = {
  admin: "Store admin",
  user: "Store admin",
  client: "Client",
  supplier: "Supplier",
};

/* ------------------------------------------------------------------ */
/* Sidebar pieces                                                      */
/* ------------------------------------------------------------------ */

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: SidebarNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.path}
      prefetch
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        collapsed && "justify-center px-0",
        active
          ? "money-nav-active"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarBody({
  sections,
  pathname,
  collapsed,
  homePath,
  onNavigate,
  onToggleCollapsed,
}: {
  sections: SidebarNavSection[];
  pathname: string | null;
  collapsed: boolean;
  homePath: string;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "relative flex shrink-0 items-center gap-3 px-4 py-6",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link
          href={homePath}
          prefetch
          onClick={onNavigate}
          aria-label="Tally home"
          title={collapsed ? "Tally" : undefined}
          className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}
        >
          <span className="money-brand-fill money-brand-shadow flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <TallyMark className="h-6 w-6" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Tally
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Inventory
              </span>
            </span>
          )}
        </Link>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
              collapsed &&
                "absolute -right-3 top-8 border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-sm",
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Sections */}
      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2"
      >
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-70">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  active={isNavPathActive(pathname, item.path)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-70">
              Resources
            </p>
          )}
          <div className="space-y-1">
            {SIDEBAR_FOOTER_ITEMS.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
                active={isNavPathActive(pathname, item.path)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar pieces                                                      */
/* ------------------------------------------------------------------ */

/** Light/dark switch beside the notification bell. Icons swap via the `dark` class (no hydration flash). */
function ThemeToggleButton() {
  const { theme, systemTheme, setTheme } = useTheme();
  const isDark = ((theme === "system" ? systemTheme : theme) ?? "light") === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle light or dark theme"
      title="Toggle theme"
      className="money-tool-button"
    >
      <Sun className="hidden h-[18px] w-[18px] dark:block" />
      <Moon className="h-[18px] w-[18px] dark:hidden" />
    </button>
  );
}

function CommandMenu({
  open,
  onOpenChange,
  sections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: SidebarNavSection[];
}) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const run = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a page or action…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {sections.map((section) => (
          <CommandGroup key={section.title} heading={section.title}>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.path}
                  value={`${section.title} ${item.label}`}
                  onSelect={() => run(() => router.push(item.path))}
                >
                  <Icon className="mr-2 h-4 w-4 text-slate-500" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Preferences">
          <CommandItem value="theme light" onSelect={() => run(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4 text-slate-500" /> Light theme
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => run(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4 text-slate-500" /> Dark theme
          </CommandItem>
          {SIDEBAR_FOOTER_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.path}
                value={item.label}
                onSelect={() => run(() => router.push(item.path))}
              >
                <Icon className="mr-2 h-4 w-4 text-slate-500" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

interface NavbarProps {
  children?: ReactNode;
}

export default function Navbar({ children }: NavbarProps) {
  const { user, isCheckingAuth } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Restore collapsed state after mount (avoids SSR/client mismatch).
  // Reading localStorage must wait until after hydration, so this effect is intentional.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage after hydration
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // ⌘K / Ctrl+K opens the command menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the mobile drawer on route change (adjusted during render, not in an effect).
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsMobileMenuOpen(false);
    try {
      const userName = user?.name || user?.email?.split("@")[0] || "User";
      clearAuthToastMarkers();
      setPostLogoutGoodbye({ userName });
      localStorage.removeItem("isAuth");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("token");
      localStorage.removeItem("getSession");
      localStorage.removeItem("prevUserId");
      localStorage.removeItem("stock-inventory-query-cache");
      // Server clears the httpOnly session cookie before we navigate.
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload clears all client state after logout
      window.location.href = "/login";
      return;
    } catch {
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const role =
    user?.role ??
    (pathname?.startsWith("/client")
      ? "client"
      : pathname?.startsWith("/supplier")
        ? "supplier"
        : "user");
  const sections = getSidebarSectionsForRole(role);
  const homePath = getHomePathForRole(role);
  const avatar = resolveUserAvatarSources(user);

  const topBar = (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-4">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[var(--text-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--bg-main)]"
      >
        Skip to content
      </a>

      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(true)}
          className="money-tool-button lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="lg:hidden">
          <span className="inline-flex items-center gap-1.5"><span className="money-brand-fill inline-flex h-6 w-6 items-center justify-center rounded-md"><TallyMark className="h-4 w-4" /></span>Tally</span>
        </span>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search pages and actions"
          className="hidden h-10 w-[min(380px,40vw)] items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] px-3.5 text-left text-sm font-normal text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[color-mix(in_srgb,var(--accent-purple)_35%,var(--border-subtle))] lg:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search pages, products, actions…</span>
          <kbd className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search pages and actions"
          className="money-tool-button lg:hidden"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
        <ThemeToggleButton />
        {isCheckingAuth ? (
          <span className="money-tool-button">
            <Bell className="h-[18px] w-[18px] opacity-40" />
          </span>
        ) : user ? (
          <NotificationBell />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Open account menu"
              className="ml-1 h-9 w-9 overflow-hidden rounded-full border border-[var(--border-subtle)] p-0 hover:opacity-90"
            >
              {isCheckingAuth ? (
                <span className="h-9 w-9 animate-pulse rounded-full bg-[var(--bg-elevated)]" />
              ) : avatar ? (
                <SafeAvatarImage
                  src={avatar.src}
                  fallbackSrc={avatar.fallbackSrc}
                  alt={user?.name || "User"}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                  priority
                />
              ) : (
                <span className="text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-60 ${DROPDOWN_NAV_CONTENT_CLASS}`}>
            <DropdownMenuLabel className="px-2 py-2 font-normal">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {user?.name}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {ROLE_LABEL[role] ?? "Member"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SIDEBAR_FOOTER_ITEMS.map(({ path, label, icon: Icon }) => (
              <DropdownMenuItem key={path} asChild className={DROPDOWN_NAV_ITEM_CLASS}>
                <Link href={path} prefetch>
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(DROPDOWN_NAV_ITEM_CLASS, "text-red-600 dark:text-red-400")}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );

  if (!children) return topBar;

  return (
    <div className="relative flex h-screen min-h-screen overflow-hidden">
      <ScrollControl />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative z-40 hidden shrink-0 border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)] backdrop-blur-xl transition-[width] duration-200 lg:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <SidebarBody
          sections={sections}
          pathname={pathname}
          collapsed={collapsed}
          homePath={homePath}
          onToggleCollapsed={toggleCollapsed}
        />
      </aside>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#0b0d1a]/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="money-tool-button absolute right-2 top-5 z-10"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody
              sections={sections}
              pathname={pathname}
              collapsed={false}
              homePath={homePath}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </aside>
        </div>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden focus:outline-none"
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 lg:px-10 xl:px-12">
          {topBar}
        </div>
        <div className="money-content mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-5 sm:px-8 lg:px-10 lg:pt-7 xl:px-12">
          {children}
        </div>
      </main>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} sections={sections} />
    </div>
  );
}
