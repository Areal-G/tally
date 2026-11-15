/** Shared control styles for the login page. */

import { glassFormFieldClasses } from "@/lib/ui/focus-ring-styles";

/** Readable inputs on the page background in both themes. */
const AUTH_FORM_FIELD_BASE =
  "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";

/** Login inputs (email, password). */
export const AUTH_FORM_FIELD_SKY = glassFormFieldClasses(
  "sky",
  `${AUTH_FORM_FIELD_BASE} border border-slate-200 dark:border-slate-700 `,
);

/** Google OAuth button — soft opaque fill in light mode. */
export const AUTH_GOOGLE_BUTTON = {
  login:
    "w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
} as const;
