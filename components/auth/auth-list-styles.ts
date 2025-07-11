import type { AuthListHue } from "@/lib/auth/auth-panel-copy";
import { AUTH_LIST_ICON_GLASS } from "@/components/auth/auth-glass-styles";

/** Icon pill styles for auth list rows (glass glow wrap). */
export const AUTH_LIST_ICON_STYLES: Record<
  AuthListHue,
  { wrap: string; icon: string }
> = {
  sky: {
    wrap: AUTH_LIST_ICON_GLASS.sky,
    icon: "text-indigo-600 dark:text-indigo-300 ",
  },
  emerald: {
    wrap: AUTH_LIST_ICON_GLASS.emerald,
    icon: "text-indigo-600 dark:text-indigo-300 ",
  },
  amber: {
    wrap: AUTH_LIST_ICON_GLASS.amber,
    icon: "text-indigo-600 dark:text-indigo-300 ",
  },
  violet: {
    wrap: AUTH_LIST_ICON_GLASS.violet,
    icon: "text-indigo-600 dark:text-indigo-300 ",
  },
  blue: {
    wrap: AUTH_LIST_ICON_GLASS.blue,
    icon: "text-indigo-600 dark:text-indigo-300 ",
  },
};
