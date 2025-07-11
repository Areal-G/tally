import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shared empty array for `query.data ?? EMPTY_LIST` fallbacks. A literal `[]`
 * would be a new array every render and re-run any useMemo that depends on it.
 * Never mutate it.
 */
export const EMPTY_LIST: never[] = [];

/**
 * Clears Radix UI (and similar) scroll lock / pointer-events from document.body.
 * Call after closing a dialog before navigation, or when the page is left unclickable after a dialog closes.
 * See: https://github.com/radix-ui/primitives/issues/3797
 */
export function clearBodyScrollLock(): void {
  if (typeof document === "undefined") return
  document.body.style.overflow = ""
  document.body.style.pointerEvents = ""
  document.body.removeAttribute("data-scroll-locked")
}
