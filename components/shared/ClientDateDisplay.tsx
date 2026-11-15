"use client";

/**
 * Hydration-safe date display for client components pre-rendered on the server.
 * Server and first client paint use the same UTC string; after mount the label
 * switches to the visitor's local time zone (relative labels update too).
 */

import { useEffect, useMemo, useState } from "react";
import {
  formatStableDate,
  formatStableDateTime,
  formatStableRelative,
  formatUtcDate,
  formatUtcDateTime,
  toDate,
} from "@/lib/date/format-stable";
import { useMounted } from "@/hooks/use-mounted";
import {
  semanticDateClass,
  type SemanticDateKind,
} from "@/lib/ui/semantic-date-styles";
import { cn } from "@/lib/utils";

type DateInput = Date | string | number;

export type ClientRelativeTimeProps = {
  date: DateInput;
  className?: string;
  /** Optional prefix, e.g. "Created " */
  prefix?: string;
  semantic?: SemanticDateKind;
};

export function ClientRelativeTime({
  date,
  className,
  prefix = "",
  semantic,
}: ClientRelativeTimeProps) {
  const d = useMemo(() => toDate(date), [date]);
  const stable = useMemo(() => formatUtcDate(d), [d]);
  const [label, setLabel] = useState(stable);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const tick = () => setLabel(formatStableRelative(d));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [mounted, d]);

  return (
    <span
      className={cn(semanticDateClass(semantic), className)}
      // Relative label swaps after mount (stable → "X ago"); suppress React #418.
      suppressHydrationWarning
    >
      {prefix}
      {label}
    </span>
  );
}

export type ClientDateTimeProps = {
  date: DateInput;
  className?: string;
  semantic?: SemanticDateKind;
};

/** Absolute date+time — UTC on the server and first paint, visitor local time after mount. */
export function ClientDateTime({ date, className, semantic }: ClientDateTimeProps) {
  const mounted = useMounted();
  const text = useMemo(
    () => (mounted ? formatStableDateTime(date) : formatUtcDateTime(date)),
    [mounted, date],
  );
  return (
    <span className={cn(semanticDateClass(semantic), className)}>{text}</span>
  );
}

export type ClientDateProps = {
  date: DateInput;
  className?: string;
  prefix?: string;
  semantic?: SemanticDateKind;
};

/** Absolute date only — UTC on the server and first paint, visitor local date after mount. */
export function ClientDate({
  date,
  className,
  prefix = "",
  semantic,
}: ClientDateProps) {
  const mounted = useMounted();
  const text = useMemo(
    () => (mounted ? formatStableDate(date) : formatUtcDate(date)),
    [mounted, date],
  );
  return (
    <span className={cn(semanticDateClass(semantic), className)}>
      {prefix}
      {text}
    </span>
  );
}
