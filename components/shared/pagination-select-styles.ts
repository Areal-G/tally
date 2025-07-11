/**
 * Theme classes for table footer page-size Select (matches per-domain table accents).
 */

import {
  paginationPopoverContentClass,
  READABLE_POPOVER_ITEM_CLASS,
} from "@/lib/ui/popover-readability-styles";

export type PaginationSelectVariant =
  | "sky"
  | "violet"
  | "rose"
  | "teal"
  | "amber"
  | "emerald";

export type PaginationSelectVariantStyles = {
  placeholder: string;
  trigger: string;
  content: string;
  item: string;
};

export const PAGINATION_SELECT_VARIANTS: Record<
  PaginationSelectVariant,
  PaginationSelectVariantStyles
> = {
  sky: {
    placeholder:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 px-2 w-16 sm:w-20 flex items-center justify-between font-normal",
    trigger:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 font-normal px-2 w-16 sm:w-20",
    content: paginationPopoverContentClass("sky"),
    item: READABLE_POPOVER_ITEM_CLASS,
  },
  violet: {
    placeholder:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 px-2 w-16 sm:w-20 flex items-center justify-between font-normal",
    trigger:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 font-normal px-2 w-16 sm:w-20",
    content: paginationPopoverContentClass("violet"),
    item: READABLE_POPOVER_ITEM_CLASS,
  },
  rose: {
    placeholder:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 px-2 w-16 sm:w-20 flex items-center justify-between font-normal",
    trigger:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 font-normal px-2 w-16 sm:w-20",
    content: paginationPopoverContentClass("rose"),
    item: READABLE_POPOVER_ITEM_CLASS,
  },
  teal: {
    placeholder:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 px-2 w-16 sm:w-20 flex items-center justify-between font-normal",
    trigger:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition duration-200 hover:border-slate-300 font-normal px-2 w-16 sm:w-20",
    content: paginationPopoverContentClass("teal"),
    item: READABLE_POPOVER_ITEM_CLASS,
  },
  amber: {
    placeholder:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 px-2 w-16 sm:w-20 flex items-center justify-between font-normal",
    trigger:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition duration-200 hover:border-slate-300 font-normal px-2 w-16 sm:w-20",
    content: paginationPopoverContentClass("amber"),
    item: READABLE_POPOVER_ITEM_CLASS,
  },
  emerald: {
    placeholder:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 px-2 w-16 sm:w-20 flex items-center justify-between font-normal",
    trigger:
      "h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 font-normal px-2 w-16 sm:w-20",
    content: paginationPopoverContentClass("emerald"),
    item: READABLE_POPOVER_ITEM_CLASS,
  },
};

export const PAGE_SIZE_OPTIONS = [4, 6, 8, 10, 15, 20, 30] as const;
