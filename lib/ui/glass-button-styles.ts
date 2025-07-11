/**
 * CTA / toolbar buttons. Calm theme: solid indigo primaries (red for
 * destructive "rose"), neutral outline toolbar buttons; hue keys kept for API compat.
 * Builds on focus-ring-styles.ts; rings use box-shadow only (no layout shift).
 */
import {
  FOCUS_NO_LAYOUT_SHIFT_CLASS,
  GLASS_FOCUS_RING,
  type GlassFocusHue,
} from "@/lib/ui/focus-ring-styles";
import { cn } from "@/lib/utils";

/** Parent must include `group` — scales child svg on hover. */
export const GLASS_BUTTON_ICON_HOVER =
  "group";

/** Strips shadcn Button default shadow bleed; do NOT use bg-transparent — it kills GLASS_PRIMARY gradients via tailwind-merge */
export const GLASS_BUTTON_SHELL_RESET =
  "shadow-none hover:shadow-none";

/** Faded disabled submit/toolbar state */
export const GLASS_BUTTON_DISABLED =
  "disabled:opacity-50 disabled:cursor-not-allowed";

const PRIMARY_LAYOUT =
  "h-11 inline-flex items-center justify-center rounded-xl font-semibold money-primary-action";

const ACTION_LAYOUT =
  "inline-flex items-center justify-center rounded-xl font-medium money-secondary-action";

/** Cancel / reset — gray glass (dialog footers). */
export const GLASS_GHOST_BUTTON = `${FOCUS_NO_LAYOUT_SHIFT_CLASS} focus-visible:ring-2 focus-visible:ring-ring/50 h-11 inline-flex items-center justify-center rounded-xl font-medium money-secondary-action`;

/**
 * Compact "Write review" under order-line price (h-8).
 * Amber glass + stronger hover glow (no gray ghost wash).
 */
export const GLASS_COMPACT_AMBER_BUTTON = `${FOCUS_NO_LAYOUT_SHIFT_CLASS} ${GLASS_FOCUS_RING.amber} ${GLASS_BUTTON_ICON_HOVER} h-8 inline-flex items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-normal text-amber-700 dark:text-amber-300 border border-amber-400/40 bg-amber-500/20 dark:bg-amber-500/25 transition duration-200 hover:border-amber-300/50 hover:bg-amber-500/40 hover:text-amber-800 dark:hover:text-amber-200 `;

const PRIMARY_SKY = `${PRIMARY_LAYOUT} `;

const PRIMARY_ROSE = `${PRIMARY_LAYOUT} bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 border border-transparent`;

const PRIMARY_EMERALD = `${PRIMARY_LAYOUT} `;

const PRIMARY_VIOLET = `${PRIMARY_LAYOUT} `;

const PRIMARY_INDIGO = `${PRIMARY_LAYOUT} `;

const PRIMARY_AMBER = `${PRIMARY_LAYOUT} `;

const PRIMARY_TEAL = `${PRIMARY_LAYOUT} `;

const PRIMARY_CYAN = `${PRIMARY_LAYOUT} `;

const PRIMARY_BLUE = `${PRIMARY_LAYOUT} `;

const ACTION_SKY = ACTION_LAYOUT;

const ACTION_ROSE = ACTION_LAYOUT;

const ACTION_EMERALD = ACTION_LAYOUT;

const ACTION_VIOLET = ACTION_LAYOUT;

const ACTION_INDIGO = ACTION_LAYOUT;

const ACTION_AMBER = ACTION_LAYOUT;

const ACTION_TEAL = ACTION_LAYOUT;

const ACTION_CYAN = ACTION_LAYOUT;

const ACTION_BLUE = ACTION_LAYOUT;

function withFocusRing(shell: string, hue: GlassFocusHue): string {
  return `${FOCUS_NO_LAYOUT_SHIFT_CLASS} ${GLASS_FOCUS_RING[hue]} ${shell}`;
}

/** Strong CTA — dialog submit, checkout. */
export const GLASS_PRIMARY_BUTTON: Record<GlassFocusHue, string> = {
  sky: withFocusRing(PRIMARY_SKY, "sky"),
  rose: withFocusRing(PRIMARY_ROSE, "rose"),
  emerald: withFocusRing(PRIMARY_EMERALD, "emerald"),
  violet: withFocusRing(PRIMARY_VIOLET, "violet"),
  indigo: withFocusRing(PRIMARY_INDIGO, "indigo"),
  amber: withFocusRing(PRIMARY_AMBER, "amber"),
  teal: withFocusRing(PRIMARY_TEAL, "teal"),
  cyan: withFocusRing(PRIMARY_CYAN, "cyan"),
  blue: withFocusRing(PRIMARY_BLUE, "blue"),
};

/** Toolbar — refresh, export, save. */
export const GLASS_ACTION_BUTTON: Record<GlassFocusHue, string> = {
  sky: withFocusRing(ACTION_SKY, "sky"),
  rose: withFocusRing(ACTION_ROSE, "rose"),
  emerald: withFocusRing(ACTION_EMERALD, "emerald"),
  violet: withFocusRing(ACTION_VIOLET, "violet"),
  indigo: withFocusRing(ACTION_INDIGO, "indigo"),
  amber: withFocusRing(ACTION_AMBER, "amber"),
  teal: withFocusRing(ACTION_TEAL, "teal"),
  cyan: withFocusRing(ACTION_CYAN, "cyan"),
  blue: withFocusRing(ACTION_BLUE, "blue"),
};

export function glassPrimaryButtonClass(hue: GlassFocusHue): string {
  return GLASS_PRIMARY_BUTTON[hue];
}

export function glassActionButtonClass(hue: GlassFocusHue): string {
  return GLASS_ACTION_BUTTON[hue];
}

/** Detail page footer CTA — omit variant="ghost"; readable contrast on light backgrounds. */
export function glassDetailFooterButtonClass(
  hue: GlassFocusHue,
  extra?: string,
): string {
  return cn(
    GLASS_BUTTON_ICON_HOVER,
    GLASS_BUTTON_SHELL_RESET,
    GLASS_BUTTON_DISABLED,
    "group w-full sm:w-auto gap-2 !text-white",
    GLASS_PRIMARY_BUTTON[hue],
    extra,
  );
}

/** Detail page footer Back — white text parity with Edit/Duplicate CTAs. */
export function glassDetailBackButtonClass(extra?: string): string {
  return cn(
    GLASS_BUTTON_ICON_HOVER,
    GLASS_BUTTON_SHELL_RESET,
    GLASS_BUTTON_DISABLED,
    "group w-full sm:w-auto gap-2 !text-white",
    GLASS_PRIMARY_BUTTON.sky,
    extra,
  );
}

/**
 * Icon-only back in PageSectionHeader leading slot (all detail pages).
 * Light gray border + gray-100/200 wash; icon gray-600/700 light, white/80 dark.
 * Pair with Button variant="ghost" (default Button paints bg-primary / red over this token).
 */
export const DETAIL_HEADER_BACK_ICON_CLASS =
  "h-10 w-10 shrink-0 self-center rounded-xl border border-gray-300/60 dark:border-white/15 bg-white dark:bg-white/10 text-gray-600 hover:text-gray-700 dark:text-white/80 dark:hover:text-white/90 hover:border-gray-400/70 dark:hover:border-white/25 hover:bg-white dark:hover:bg-white/15 ";
