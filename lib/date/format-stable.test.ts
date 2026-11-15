import { describe, it, expect } from "vitest";
import {
  formatStableCompactDateTime,
  formatStableCurrency,
  formatStableNumber,
  formatUtcDate,
  formatUtcDateTime,
} from "./format-stable";

describe("formatStableCurrency", () => {
  it("uses en-US grouping and two decimals", () => {
    expect(formatStableCurrency(1234.5)).toBe("$1,234.50");
    expect(formatStableCurrency(0)).toBe("$0.00");
  });

  it("returns identical output on repeated calls", () => {
    const a = formatStableCurrency(99999.99);
    const b = formatStableCurrency(99999.99);
    expect(a).toBe(b);
    expect(a).toBe("$99,999.99");
  });
});

describe("formatStableNumber", () => {
  it("uses en-US grouping", () => {
    expect(formatStableNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatStableCompactDateTime", () => {
  it("formats in UTC regardless of runtime TZ", () => {
    const iso = "2026-07-08T10:46:00.000Z";
    const result = formatStableCompactDateTime(iso);
    expect(result).toMatch(/Jul/);
    expect(result).toMatch(/8/);
    expect(result).toMatch(/10:46/);
  });

  it("returns identical output on repeated calls", () => {
    const iso = "2026-07-08T10:46:00.000Z";
    expect(formatStableCompactDateTime(iso)).toBe(
      formatStableCompactDateTime(iso),
    );
  });
});

describe("formatUtcDate / formatUtcDateTime", () => {
  // 21:05 UTC on Nov 9 is already Nov 10 in UTC+3: the UTC helpers must ignore the host zone.
  const instant = "2026-11-09T21:05:00.000Z";

  it("formats the date in UTC with the stable pattern", () => {
    expect(formatUtcDate(instant)).toBe("Nov 9, 2026");
  });

  it("formats date and time in UTC with the stable pattern", () => {
    expect(formatUtcDateTime(instant)).toBe("Nov 9, 2026 9:05 PM");
    expect(formatUtcDateTime("2026-01-02T00:07:00.000Z")).toBe("Jan 2, 2026 12:07 AM");
  });
});
