/**
 * Badge surfaces:
 * - OPAQUE_BADGE_CLASS — default table/detail chips (inline Tailwind utilities)
 * - GLASS_BADGE_CLASS — calendar-style gradient glow (product stock, active/inactive catalog entities)
 */

export type GlassBadgeHue =
  | "yellow"
  | "blue"
  | "purple"
  | "indigo"
  | "emerald"
  | "red"
  | "amber"
  | "violet"
  | "orange"
  | "gray"
  | "rose"
  | "teal"
  | "cyan"
  | "slate"
  | "sky";

/** Opaque filter-chip style — used by orders, invoices, roles, warehouse types, etc. */
export const OPAQUE_BADGE_CLASS: Record<GlassBadgeHue, string> = {
  yellow:
    "border-yellow-200/90 bg-yellow-100 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-950/50 dark:text-yellow-300",
  blue: "border-blue-200/90 bg-blue-100 text-sky-800 dark:border-blue-500/30 dark:bg-blue-950/50 dark:text-sky-300",
  purple:
    "border-purple-200/90 bg-purple-100 text-purple-800 dark:border-purple-500/30 dark:bg-purple-950/50 dark:text-purple-300",
  indigo:
    "border-indigo-200/90 bg-indigo-100 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300",
  emerald:
    "border-emerald-200/90 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300",
  red: "border-red-200/90 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300",
  amber:
    "border-amber-200/90 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300",
  violet:
    "border-violet-200/90 bg-violet-100 text-violet-800 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-300",
  orange:
    "border-orange-200/90 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/50 dark:text-orange-300",
  gray: "border-gray-200/90 bg-gray-100 text-gray-700 dark:border-gray-500/30 dark:bg-gray-900/50 dark:text-gray-300",
  rose: "border-rose-200/90 bg-rose-100 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300",
  teal: "border-teal-200/90 bg-teal-100 text-teal-800 dark:border-teal-500/30 dark:bg-teal-950/50 dark:text-teal-300",
  cyan: "border-cyan-200/90 bg-cyan-100 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/50 dark:text-cyan-300",
  slate:
    "border-slate-200/90 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-900/50 dark:text-slate-300",
  sky: "border-sky-200/90 bg-sky-100 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-300",
};

/**
 * Solid filled pill for Select triggers (white icon + label on hue).
 * Use with SemanticBadge contrast="solid".
 */
export const SOLID_BADGE_CLASS: Record<GlassBadgeHue, string> = {
  yellow:
    "border-yellow-500/50 bg-yellow-500 !text-white ",
  blue: "border-blue-500/50 bg-blue-500 !text-white ",
  purple:
    "border-purple-500/50 bg-purple-500 !text-white ",
  indigo:
    "border-indigo-500/50 bg-indigo-500 !text-white ",
  emerald:
    "border-emerald-500/50 bg-emerald-500 !text-white ",
  red: "border-red-500/50 bg-red-500 !text-white ",
  amber:
    "border-amber-500/50 bg-amber-500 !text-white ",
  violet:
    "border-violet-500/50 bg-violet-500 !text-white ",
  orange:
    "border-orange-500/50 bg-orange-500 !text-white ",
  gray: "border-gray-500/50 bg-gray-500 !text-white ",
  rose: "border-rose-500/50 bg-rose-500 !text-white ",
  teal: "border-teal-500/50 bg-teal-500 !text-white ",
  cyan: "border-cyan-500/50 bg-cyan-500 !text-white ",
  slate:
    "border-slate-500/50 bg-slate-500 !text-white ",
  sky: "border-sky-500/50 bg-sky-500 !text-white ",
};

/** Calendar glass gradient — readable in light + dark (Tailwind v3 safe). */
export const GLASS_BADGE_CLASS: Record<GlassBadgeHue, string> = {
  yellow:
    "border-yellow-400/35 bg-yellow-500/20 text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/30 dark:text-yellow-300 ",
  blue: "border-blue-400/35 bg-blue-500/20 text-sky-700 dark:border-blue-500/40 dark:bg-blue-500/30 dark:text-sky-300 ",
  purple:
    "border-purple-400/35 bg-purple-500/20 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/30 dark:text-purple-300 ",
  indigo:
    "border-indigo-400/35 bg-indigo-500/20 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/30 dark:text-indigo-300 ",
  emerald:
    "border-emerald-400/35 bg-emerald-500/20 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/30 dark:text-emerald-300 ",
  red: "border-red-400/35 bg-red-500/20 text-red-700 dark:border-red-500/40 dark:bg-red-500/30 dark:text-red-300 ",
  amber:
    "border-amber-400/35 bg-amber-500/20 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/30 dark:text-amber-300 ",
  violet:
    "border-violet-400/35 bg-violet-500/20 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/30 dark:text-violet-300 ",
  orange:
    "border-orange-400/35 bg-orange-500/20 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/30 dark:text-orange-300 ",
  gray: "border-gray-400/35 bg-gray-500/20 text-gray-700 dark:border-gray-500/40 dark:bg-gray-500/30 dark:text-gray-300 ",
  rose: "border-rose-400/35 bg-rose-500/20 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/30 dark:text-rose-300 ",
  teal: "border-teal-400/35 bg-teal-500/20 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/30 dark:text-teal-300 ",
  cyan: "border-cyan-400/35 bg-cyan-500/20 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/30 dark:text-cyan-300 ",
  slate:
    "border-slate-400/35 bg-slate-500/20 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/30 dark:text-slate-300 ",
  sky: "border-sky-400/35 bg-sky-500/20 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/30 dark:text-sky-300 ",
};
