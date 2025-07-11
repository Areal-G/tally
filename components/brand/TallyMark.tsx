/**
 * Tally logo mark: four tally strokes crossed by a fifth — "counted" — that also read
 * as barcode bars (uneven widths). Drawn in currentColor so it sits on the brand gradient.
 * Keep in sync with public/tally-icon.svg (favicon).
 */
import type { SVGProps } from "react";

export function TallyMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="4" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" />
      <rect x="8.4" y="5" width="1.4" height="14" rx="0.7" fill="currentColor" />
      <rect x="11.8" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" />
      <rect x="16.2" y="5" width="1.4" height="14" rx="0.7" fill="currentColor" opacity="0.9" />
      <path d="M2.8 16.6 21.2 7.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export const BRAND_NAME = "Tally";
export const BRAND_TAGLINE = "Inventory";
