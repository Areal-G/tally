/**
 * Focus styles without border-width change (prevents toolbar/input shift).
 * Rings use box-shadow only; never grow border width on focus.
 */

/** Suppress outline and ring-offset; never use focus:border-2 or bare focus-visible:border. */
export const FOCUS_NO_LAYOUT_SHIFT_CLASS =
  "focus:outline-none focus-visible:outline-none focus:ring-offset-0 data-[state=open]:outline-none";

/** Default primitive ring when no feature hue is set (Input/Select/Textarea). */
export const FOCUS_VISIBLE_NEUTRAL_RING_CLASS =
  "focus-visible:ring-2 focus-visible:ring-ring/50 dark:focus-visible:ring-white/35";

export type GlassFocusHue =
  | "sky"
  | "rose"
  | "emerald"
  | "violet"
  | "indigo"
  | "amber"
  | "teal"
  | "cyan"
  | "blue";

/** Hue-matched keyboard ring — visible in dark mode; no layout shift. */
/** Calm theme: one indigo keyboard ring for every hue key; no layout shift. */
const ACCENT_FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:focus-visible:ring-indigo-400/70";

export const GLASS_FOCUS_RING: Record<GlassFocusHue, string> = {
  sky: ACCENT_FOCUS_RING,
  rose: ACCENT_FOCUS_RING,
  emerald: ACCENT_FOCUS_RING,
  violet: ACCENT_FOCUS_RING,
  indigo: ACCENT_FOCUS_RING,
  amber: ACCENT_FOCUS_RING,
  teal: ACCENT_FOCUS_RING,
  cyan: ACCENT_FOCUS_RING,
  blue: ACCENT_FOCUS_RING,
};

/** Compose glass field shell + no-shift + hue ring (dialog/form inputs). */
export function glassFormFieldClasses(
  hue: GlassFocusHue,
  shell: string,
): string {
  return `${shell} ${FOCUS_NO_LAYOUT_SHIFT_CLASS} ${GLASS_FOCUS_RING[hue]}`;
}
