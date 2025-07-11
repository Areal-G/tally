/**
 * Logged-in app shell width.
 * Full viewport minus horizontal padding; no max-width cap on ultrawide.
 * Auth routes use max-w-7xl in AuthPageShell only.
 */
export const APP_SHELL_WIDTH_CLASS = "mx-auto w-full min-w-0";

/** Detail/static shells: single 24px gap-6 rhythm (no space-y-4 + pb-6 stack). */
export const APP_SHELL_DETAIL_CLASS = `${APP_SHELL_WIDTH_CLASS} flex flex-col gap-6`;

/** Header inside APP_SHELL_DETAIL_CLASS; gap-6 owns spacing below header. */
export const DETAIL_PAGE_HEADER_SPACING_CLASS = "pb-0";

/** Portal/list section wrappers between major blocks. */
export const PAGE_SECTION_SPACING_CLASS = "pb-6";

/** Consistent gap below page/list section headers (matches OrderList, InvoiceList). */
export const PAGE_SECTION_HEADER_SPACING_CLASS = "pb-6";

/** Stats card grid — bottom gap before filters/table row. */
export const PAGE_STATS_GRID_CLASS =
  "grid gap-2 items-stretch pb-6";

/** Stats grid under flex flex-col gap-6; parent gap owns rhythm (no pb-6). */
export const PAGE_STATS_GRID_IN_SHELL_CLASS = "grid gap-2 items-stretch";
