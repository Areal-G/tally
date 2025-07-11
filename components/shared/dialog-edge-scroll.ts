/**
 * Edge-aligned vertical scrollbar layout for large dialogs (same as PaymentDialog).
 * Shell uses pr-0 so the scrollbar sits on the dialog border; inner content keeps pr-* inset.
 */

/** DialogContent base — pair with feature-specific border/shadow classes */
export const DIALOG_EDGE_SCROLL_SHELL =
  "flex max-h-[90vh] flex-col overflow-hidden min-w-0 pl-4 sm:pl-8 pt-4 sm:pt-7 pb-4 sm:pb-7 pr-0";

/** DialogHeader — inset content, not the scroll track */
export const DIALOG_EDGE_SCROLL_HEADER = "flex-shrink-0 pb-0.5 pr-4 sm:pr-8";

/** Full-width scroll region; y-scrollbar flush to the shell right edge (no overflow-x-hidden — avoids clipping input/table shadows) */
export const DIALOG_EDGE_SCROLL_BODY =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto w-full";

/** Padded content inside the scroll region */
/** pl-2 gives rose input shadow room on the left inside the scroll area */
export const DIALOG_EDGE_SCROLL_INNER = "flex flex-col pr-4 sm:pr-8 pl-2 pb-4";

/** Wrapper around dialog embedded list tables */
export const DIALOG_TABLE_SECTION = "mt-6 min-w-0";

/** Embedded table heading — dark glass dialogs always use white title */
export const DIALOG_TABLE_SECTION_TITLE = "text-white/90";

/** Icon + label stay on one row; !important beats stray `block` on Label */
export const DIALOG_FORM_LABEL_ROW =
  "!inline-flex items-center gap-2 w-full min-w-0";

/** Aliases; canonical tokens in lib/ui/popover-readability-styles.ts */
export {
  DIALOG_SELECT_CONTENT_CLASS,
  DIALOG_SELECT_ITEM_CLASS,
  READABLE_POPOVER_CONTENT_CLASS,
  READABLE_POPOVER_ITEM_CLASS,
} from "@/lib/ui/popover-readability-styles";

/** Dialog field labels; table frame for category dialog — light opaque island + dark glass. */
export const DIALOG_TABLE_FRAME_SKY =
  "rounded-md border border-white/10 bg-white/60 bg-white/20 dark:bg-white/5 ring-1 ring-sky-400/25 shadow-sm";

/**
 * Table frame for supplier dialog — light opaque island + dark glass.
 */
export const DIALOG_TABLE_FRAME_EMERALD =
  "rounded-md border border-white/10 bg-white/60 bg-white/20 dark:bg-white/5 ring-1 ring-emerald-400/25 shadow-sm";

/**
 * Embedded dialog tables: list-page parity in light mode; dark glass in dark mode.
 * Use td-level zebra so horizontal scroll does not break striping.
 */
export const DIALOG_TABLE_TEXT = "text-gray-700 dark:text-white/80";
export const DIALOG_TABLE_TEXT_MUTED = "text-gray-600 dark:text-white/80";
export const DIALOG_TABLE_HEAD_TEXT = "text-gray-700 dark:text-white/80";
export const DIALOG_TABLE_HEAD_ROW =
  "[&_th]:bg-white/40 dark:[&_th]:bg-white/10";
export const DIALOG_TABLE_ROW_EVEN =
  "[&_td]:bg-white/30 dark:[&_td]:bg-white/10";
export const DIALOG_TABLE_ROW_ODD =
  "[&_td]:bg-white/20 dark:[&_td]:bg-white/[0.06]";
export const DIALOG_TABLE_ROW_HOVER =
  "hover:[&_td]:bg-muted/50 dark:hover:[&_td]:bg-white/15";
export const DIALOG_TABLE_SURFACE = "bg-transparent dark:bg-black/20";

/** Name column links — matches TABLE_LINK_PRIMARY in light; sky-400 in dark dialog */
export const DIALOG_TABLE_LINK =
  "font-normal text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300";

/** Kebab / row action icon in embedded dialog tables */
export const DIALOG_TABLE_ACTION_ICON =
  "text-gray-600 dark:text-white/80 hover:text-gray-700 dark:hover:text-white";

/** Full-width feedback row below dialog field grids */
export const DIALOG_FORM_FEEDBACK_ROW =
  "col-span-full mt-1 w-full space-y-1 sm:col-span-2";

/** Inline hint under dialog fields (dark glass dialogs) */
export const DIALOG_FORM_HINT_TEXT = "text-xs text-white/60";

/** Validation error copy */
export const DIALOG_FORM_ERROR_TEXT =
  "text-xs text-rose-400 dark:text-rose-300";

/** Valid quantity confirmation */
export const DIALOG_FORM_SUCCESS_TEXT =
  "text-xs text-emerald-500/90 dark:text-emerald-400/90";

/** Shrink / caution preview */
export const DIALOG_FORM_WARN_TEXT = "text-xs text-amber-400/90";

/** Dialog field labels */
export const DIALOG_FORM_LABEL = "text-sm font-medium text-white/80";

/** Compact grid field labels under a section DialogFormLabel */
export const DIALOG_FORM_SUB_LABEL = "text-xs font-medium text-white/70";

/** Required field asterisk */
export const DIALOG_FORM_REQUIRED_MARK = "text-red-400";

/** Catalog meta links in tables (light + dark) */
export const TABLE_CATALOG_LINK_CLASS =
  "text-xs font-normal text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300";
