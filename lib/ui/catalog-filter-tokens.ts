/**
 * Shared hue tokens for catalog status filters and export menus.
 * Category (sky), supplier (emerald), warehouse (cyan); export violet/teal.
 */
import type { LucideIcon } from "lucide-react";
import { FolderTree, Truck, Warehouse } from "lucide-react";
import { FOCUS_NO_LAYOUT_SHIFT_CLASS, GLASS_FOCUS_RING, type GlassFocusHue } from "@/lib/ui/focus-ring-styles";
import {
  catalogEntityPopoverContentClass,
  exportMenuPopoverContentClass,
  READABLE_POPOVER_ITEM_CLASS,
} from "@/lib/ui/popover-readability-styles";

export type CatalogEntity = "category" | "supplier" | "warehouse";

export type CatalogStatusFilter = "all" | "active" | "inactive";

export type ExportAccent = "violet" | "teal";

/** Filter + export toolbar triggers share px/gap/width rhythm. */
export const CATALOG_TOOLBAR_TRIGGER_LAYOUT = `${FOCUS_NO_LAYOUT_SHIFT_CLASS} h-10 w-full sm:w-auto px-4 gap-2 font-normal flex items-center`;

/** DeferredSelectGate placeholder — matches trigger + chevron slot. */
export const CATALOG_TOOLBAR_PLACEHOLDER_LAYOUT =
  "h-10 w-full sm:w-auto px-4 gap-2 font-normal flex items-center justify-between text-sm";

const CATEGORY_HUE =
  "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 ";

const SUPPLIER_HUE =
  "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 ";

const WAREHOUSE_HUE =
  "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 ";

function catalogSelectTriggerClass(hue: string, focusHue: GlassFocusHue): string {
  return `${CATALOG_TOOLBAR_TRIGGER_LAYOUT} ${GLASS_FOCUS_RING[focusHue]} rounded-lg ${hue}`;
}

function catalogSelectPlaceholderClass(hue: string): string {
  return `${CATALOG_TOOLBAR_PLACEHOLDER_LAYOUT} rounded-lg ${hue}`;
}

export const CATALOG_ENTITY_META: Record<
  CatalogEntity,
  {
    allLabel: string;
    icon: LucideIcon;
    selectTriggerClass: string;
    selectPlaceholderClass: string;
    selectContentClass: string;
    selectItemClass: string;
  }
> = {
  category: {
    allLabel: "All Categories",
    icon: FolderTree,
    selectTriggerClass: catalogSelectTriggerClass(CATEGORY_HUE, "sky"),
    selectPlaceholderClass: catalogSelectPlaceholderClass(CATEGORY_HUE),
    selectContentClass: catalogEntityPopoverContentClass("category"),
    selectItemClass: READABLE_POPOVER_ITEM_CLASS,
  },
  supplier: {
    allLabel: "All Suppliers",
    icon: Truck,
    selectTriggerClass: catalogSelectTriggerClass(SUPPLIER_HUE, "emerald"),
    selectPlaceholderClass: catalogSelectPlaceholderClass(SUPPLIER_HUE),
    selectContentClass: catalogEntityPopoverContentClass("supplier"),
    selectItemClass: READABLE_POPOVER_ITEM_CLASS,
  },
  warehouse: {
    allLabel: "All Warehouses",
    icon: Warehouse,
    selectTriggerClass: catalogSelectTriggerClass(WAREHOUSE_HUE, "cyan"),
    selectPlaceholderClass: catalogSelectPlaceholderClass(WAREHOUSE_HUE),
    selectContentClass: catalogEntityPopoverContentClass("warehouse"),
    selectItemClass: READABLE_POPOVER_ITEM_CLASS,
  },
};

const VIOLET_EXPORT_HUE =
  "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 ";

const TEAL_EXPORT_HUE =
  "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 ";

function exportTriggerClass(hue: string, focusHue: GlassFocusHue): string {
  return `group ${CATALOG_TOOLBAR_TRIGGER_LAYOUT} ${GLASS_FOCUS_RING[focusHue]} rounded-lg ${hue}`;
}

export const EXPORT_MENU_STYLES: Record<
  ExportAccent,
  { triggerClass: string; contentClass: string; itemFocusClass: string }
> = {
  violet: {
    triggerClass: exportTriggerClass(VIOLET_EXPORT_HUE, "violet"),
    contentClass: exportMenuPopoverContentClass("violet"),
    itemFocusClass: READABLE_POPOVER_ITEM_CLASS,
  },
  teal: {
    triggerClass: exportTriggerClass(TEAL_EXPORT_HUE, "teal"),
    contentClass: exportMenuPopoverContentClass("teal"),
    itemFocusClass: READABLE_POPOVER_ITEM_CLASS,
  },
};
