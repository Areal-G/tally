/**
 * Page-level section header — meaningful icon beside title/subtitle (list + detail pages).
 * Excludes StatisticsCard summary badges/cards.
 * Inside APP_SHELL_DETAIL_CLASS pass className={DETAIL_PAGE_HEADER_SPACING_CLASS}
 * so gap-6 owns vertical rhythm (avoids double pb-6 + space-y stack).
 */

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionHeaderTone } from "@/lib/ui/section-header-tones";
import { PAGE_SECTION_HEADER_SPACING_CLASS } from "@/lib/ui/shell-layout-styles";

export type PageSectionHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: SectionHeaderTone;
  as?: "h1" | "h2";
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

export function PageSectionHeader({
  title,
  description,
  as: TitleTag = "h2",
  leading,
  trailing,
  className,
}: PageSectionHeaderProps) {
  // Tally page header: large tight title + quiet description, no icon tile.
  return (
    <div
      className={cn(
        "flex flex-col gap-4 text-left sm:flex-row sm:items-end sm:justify-between",
        PAGE_SECTION_HEADER_SPACING_CLASS,
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <TitleTag className="text-[1.75rem] font-semibold leading-tight tracking-[-0.045em] text-[var(--text-primary)] sm:text-[2.1rem]">
            {title}
          </TitleTag>
          {description != null && description !== "" && (
            <p className="mt-2 max-w-[42rem] text-sm leading-relaxed text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {trailing && <div className="w-full shrink-0 sm:w-auto">{trailing}</div>}
    </div>
  );
}
