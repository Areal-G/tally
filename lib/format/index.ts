/**
 * Format barrel — stable SSR helpers + client-locale Intl.
 */

export {
  toDate,
  toDateOrNull,
  formatStableDate,
  formatStableDateTime,
  formatStableRelative,
  formatStableNumber,
  formatStableCurrency,
  formatStableCompactDateTime,
} from "@/lib/date/format-stable";

export {
  formatClientCurrency,
  formatClientCompactDateTime,
  formatClientNumber,
} from "./client-locale";

export { capitalizeFirst } from "./capitalize";
