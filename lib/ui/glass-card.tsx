/**
 * Shared card shell + body padding token (calm neutral theme).
 * shell: article border/gradient/shadow only (detail pages wrap children in GlassCardBody).
 * body: article includes p-2 sm:p-4 (order detail cards without inner wrapper).
 */

import React from "react";
import { cn } from "@/lib/utils";

export type GlassCardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "blue"
  | "orange"
  | "teal"
  | "rose"
  | "cyan";

/** @deprecated Use GlassCardVariant — kept for order-detail barrel compat */
export type CardVariant = GlassCardVariant;

/** Calm theme: every variant renders the same neutral card (variant kept for API compat). */
const NEUTRAL_CARD = {
  border: "",
  gradient: "money-surface",
  shadow: "",
  hoverBorder: "",
  iconBg:
    "border-transparent bg-[var(--tint-violet)] text-[var(--accent-purple)]",
} as const;

export const GLASS_CARD_VARIANT_CONFIG: Record<
  GlassCardVariant,
  {
    border: string;
    gradient: string;
    shadow: string;
    hoverBorder: string;
    iconBg: string;
  }
> = {
  sky: NEUTRAL_CARD,
  emerald: NEUTRAL_CARD,
  amber: NEUTRAL_CARD,
  violet: NEUTRAL_CARD,
  blue: NEUTRAL_CARD,
  orange: NEUTRAL_CARD,
  teal: NEUTRAL_CARD,
  rose: NEUTRAL_CARD,
  cyan: NEUTRAL_CARD,
};

/** @deprecated Use GLASS_CARD_VARIANT_CONFIG */
export const variantConfig = GLASS_CARD_VARIANT_CONFIG;

export type GlassCardProps = {
  children: React.ReactNode;
  variant?: GlassCardVariant;
  className?: string;
  /** shell = no article padding; body = p-2 sm:p-4 on article */
  padding?: "shell" | "body";
};

export function GlassCard({
  children,
  variant = "blue",
  className,
  padding = "shell",
}: GlassCardProps) {
  const config = GLASS_CARD_VARIANT_CONFIG[variant];
  return (
    <article
      className={cn(
        "group transition-colors duration-200 overflow-hidden",
        padding === "body" && "p-4 sm:p-6",
        config.border,
        config.gradient,
        config.shadow,
        config.hoverBorder,
        className,
      )}
    >
      {children}
    </article>
  );
}

/** Canonical inner padding for shell-mode GlassCard. */
export function GlassCardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-2 sm:p-4", className)}>{children}</div>;
}
