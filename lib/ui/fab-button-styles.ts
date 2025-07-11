/**
 * Floating action buttons — solid indigo accent (calm theme).
 */
import { cn } from "@/lib/utils";
import type { GlassFocusHue } from "@/lib/ui/focus-ring-styles";

const FAB_BASE =
  "h-14 rounded-full flex items-center justify-center gap-2 text-white font-medium transition duration-150";

/** Calm theme: one solid indigo FAB for every hue key (kept for API compat). */
const FAB_ACCENT =
  "border border-transparent money-brand-fill money-brand-shadow hover:opacity-90";

const FAB_BY_HUE: Record<GlassFocusHue, string> = {
  rose: FAB_ACCENT,
  sky: FAB_ACCENT,
  emerald: FAB_ACCENT,
  violet: FAB_ACCENT,
  indigo: FAB_ACCENT,
  amber: FAB_ACCENT,
  teal: FAB_ACCENT,
  cyan: FAB_ACCENT,
  blue: FAB_ACCENT,
};

export function fabButtonClass(hue: GlassFocusHue, expanded: boolean): string {
  return cn(
    FAB_BASE,
    FAB_BY_HUE[hue],
    expanded ? "w-auto px-4" : "w-14 px-0",
  );
}
