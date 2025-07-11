/**
 * Icon container tones for section/page headers (ChartCard, PageSectionHeader, etc.).
 */

export type SectionHeaderTone =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal"
  | "neutral";

/** Calm single-accent: every tone renders the same indigo tile. */
const CALM_ICON_TONE = {
  container: "border-transparent rounded-full bg-[var(--tint-violet)]",
  icon: "text-[var(--accent-purple)]",
};

export const SECTION_HEADER_ICON_TONE: Record<
  SectionHeaderTone,
  { container: string; icon: string }
> = Object.fromEntries(
  ([
    "sky",
    "emerald",
    "amber",
    "rose",
    "violet",
    "blue",
    "orange",
    "teal",
    "neutral",
  ] as const).map((tone) => [tone, CALM_ICON_TONE]),
) as Record<SectionHeaderTone, { container: string; icon: string }>;
