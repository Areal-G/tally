"use client";

/**
 * Statistics Card Component
 * Glassmorphism card component for displaying warehouse statistics
 * Neutral card in light/dark mode; variant prop kept for API compat (calm theme)
 */

import React, { useState } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataSlotPulse } from "@/components/shared/DataSlotPulse";

/**
 * Color variant types for statistics cards
 */
type CardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal";

/**
 * Badge data structure
 */
interface BadgeData {
  label: string;
  value: string | number | React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Props for StatisticsCard component
 */
interface StatisticsCardProps {
  /**
   * Card title
   */
  title: string;
  /**
   * Main value to display (string, number, or hydration-safe client format node)
   */
  value: string | number | React.ReactNode;
  /**
   * Optional description text
   */
  description?: string;
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  /**
   * Color variant for the card
   */
  variant?: CardVariant;
  /**
   * Array of badges to display below the value
   */
  badges?: BadgeData[];
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * When true, main value shows inline pulse (title/icon/description stay visible —)
   */
  valueLoading?: boolean;
  /**
   * When true, badge values pulse; badge labels remain visible
   */
  badgeValuesLoading?: boolean;
  /**
   * Drop min-h-[210px] + tighter icon (forecast KPIs only)
   */
  compact?: boolean;
}

/** Chips shown before the rest collapse behind "+N more". */
const MAX_VISIBLE_BADGES = 4;

/**
 * StatisticsCard component
 * Displays a glassmorphism card with statistics, icon, and badges
 */
export function StatisticsCard({
  title,
  value,
  description,
  icon: Icon,
  badges = [],
  className,
  valueLoading = false,
  badgeValuesLoading = false,
  compact = false,
}: StatisticsCardProps) {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const visibleBadges =
    showAllBadges || badges.length <= MAX_VISIBLE_BADGES + 1
      ? badges
      : badges.slice(0, MAX_VISIBLE_BADGES);
  const hiddenCount = badges.length - visibleBadges.length;

  const displayValue = valueLoading ? (
    <DataSlotPulse variant="metric" />
  ) : (
    value
  );

  return (
    <article
      className={cn(
        // Tally stat card: surface + rotating accent bar + tinted round icon
        "money-surface money-stat flex h-full min-w-0 flex-col p-5 sm:p-6",
        !compact && "min-h-[124px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            {title}
          </p>
          <p className="mt-3 whitespace-nowrap text-[clamp(1.25rem,2vw,1.75rem)] font-semibold leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            {displayValue}
          </p>
          {description && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "money-stat-icon flex shrink-0 items-center justify-center rounded-full",
            compact ? "h-9 w-9" : "h-11 w-11",
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      </div>
      {badges.length > 0 && (
        <div className="mt-4 flex w-full min-w-0 flex-wrap gap-1.5">
          {visibleBadges.map((badge, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
            >
              {badge.label}
              <span className="font-semibold text-[var(--text-primary)]">
                {badgeValuesLoading ? <DataSlotPulse variant="badge" /> : badge.value}
              </span>
            </span>
          ))}
          {(hiddenCount > 0 || showAllBadges) && badges.length > MAX_VISIBLE_BADGES + 1 && (
            <button
              type="button"
              onClick={() => setShowAllBadges((v) => !v)}
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-purple)] transition-colors hover:bg-[var(--tint-violet)]"
            >
              {showAllBadges ? "Show less" : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
