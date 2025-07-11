/** Glass tokens for auth login/register pages. */

import type { AuthListHue } from "@/lib/auth/auth-panel-copy";
import {
  FOCUS_NO_LAYOUT_SHIFT_CLASS,
  GLASS_FOCUS_RING,
  glassFormFieldClasses,
} from "@/lib/ui/focus-ring-styles";

export type AuthGlassVariant = "login" | "register";

/** Right form card — navbar-intensity frosted glass. */
export const AUTH_FORM_GLASS: Record<AuthGlassVariant, string> = {
  login:
    "border border-slate-200 dark:border-slate-700/70 bg-card shadow-sm",
  register:
    "border border-slate-200 dark:border-slate-700/70 bg-card shadow-sm",
};

/** Per-row micro-glass on flat left list (not a parent card). py-2 for tighter rhythm. */
export const AUTH_LIST_ROW_GLASS =
  "rounded-xl border border-slate-200 dark:border-slate-700/70 bg-card px-4 py-2";

/**
 * Icon pill glass glow (matches AuthBrandHeader rose box + GLASS_BADGE_CLASS pattern).
 * Applied on login + register list rows in AuthInfoListItem.
 */
export const AUTH_LIST_ICON_GLASS: Record<AuthListHue, string> = {
  sky:
    "border-transparent bg-indigo-50 dark:bg-indigo-500/15 ",
  emerald:
    "border-transparent bg-indigo-50 dark:bg-indigo-500/15 ",
  amber:
    "border-transparent bg-indigo-50 dark:bg-indigo-500/15 ",
  violet:
    "border-transparent bg-indigo-50 dark:bg-indigo-500/15 ",
  blue:
    "border-transparent bg-indigo-50 dark:bg-indigo-500/15 ",
};

/**
 * Auth form controls (light-mode readable on pale glass card).
 * Do not reuse DIALOG_FORM_FIELD_* — those assume dark modal shell.
 */
const AUTH_FORM_FIELD_BASE =
  "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";

const authSkyShell = `${AUTH_FORM_FIELD_BASE} border border-slate-200 dark:border-slate-700 `;
const authEmeraldShell = `${AUTH_FORM_FIELD_BASE} border border-slate-200 dark:border-slate-700 `;

/** Login page inputs + role Select trigger */
export const AUTH_FORM_FIELD_SKY = glassFormFieldClasses("sky", authSkyShell);

/** Register page inputs */
export const AUTH_FORM_FIELD_EMERALD = glassFormFieldClasses(
  "emerald",
  authEmeraldShell,
);

/** Google OAuth — soft opaque fill in light mode (not bg-white/10 on pale card) */
export const AUTH_GOOGLE_BUTTON: Record<AuthGlassVariant, string> = {
  login:
    "w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
  register:
    "w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
};

const AUTH_SUBMIT_LAYOUT =
  "h-11 w-full inline-flex items-center justify-center rounded-lg transition-colors duration-150 text-white font-medium";

/**
 * Register submit — richer opaque gradient on pale emerald glass (matches login CTA punch).
 * Login keeps GLASS_PRIMARY_BUTTON.sky (user-verified).
 */
export const AUTH_SUBMIT_BUTTON_EMERALD = `${FOCUS_NO_LAYOUT_SHIFT_CLASS} ${GLASS_FOCUS_RING.emerald} ${AUTH_SUBMIT_LAYOUT} border border-transparent bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 shadow-sm `;
