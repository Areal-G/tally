/**
 * Shared nav link class builders.
 * Navbar + AdminSidebar use the same active/inactive tokens for consistent feel.
 */
import { cn } from "@/lib/utils";

/** Desktop or mobile navbar item — pair with next/link prefetch. */
export function navbarNavLinkClass(
  isActive: boolean,
  variant: "desktop" | "mobile" = "desktop",
): string {
  const base =
    variant === "mobile"
      ? "inline-flex w-full items-center justify-start px-2 text-sm font-normal transition-all duration-300 ease-in-out h-auto min-h-[44px]"
      : "inline-flex items-center text-sm font-normal will-change-[background,box-shadow,color] transition-[background-image,box-shadow,color] duration-300 ease-in-out rounded-md px-2 py-2";

  if (isActive) {
    return cn(
      base,
      "text-sky-600 dark:text-sky-400 bg-sky-500/15 dark:bg-sky-500/20 ",
      variant === "desktop" &&
        "",
    );
  }

  return cn(
    base,
    "text-gray-700 dark:text-muted-foreground hover:text-sky-600 dark:hover:text-foreground hover:bg-sky-500/10 dark:hover:bg-white/10 ",
    variant === "desktop" &&
      " ",
  );
}

/** True when `href` is the current admin route (or a child of it). */
export function isAdminNavActive(pathname: string | null, href: string): boolean {
  return pathname === href || (href !== "/admin" && (pathname?.startsWith(href) ?? false));
}
