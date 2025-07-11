import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import React from "react";
import { SectionCardHeader } from "@/components/shared/SectionCardHeader";
import type { SectionHeaderTone } from "@/lib/ui/section-header-tones";

/**
 * Color variant types for chart cards
 */
type CardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal"
  | "neutral";

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  description?: string;
  variant?: CardVariant;
}

/**
 * Color configuration for each variant - glassmorphic style
 */
const variantConfig: Record<
  CardVariant,
  {
    border: string;
    gradient: string;
    shadow: string;
    hoverBorder: string;
  }
> = {
  sky: {
    border: "",
    gradient: " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  emerald: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  amber: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  rose: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  violet: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  blue: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  orange: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  teal: {
    border: "",
    gradient:
      " money-surface ",
    shadow:
      " ",
    hoverBorder: "",
  },
  neutral: {
    border: "",
    gradient:
      " bg-gray-100/50 dark:bg-white/5 ",
    shadow:
      " ",
    hoverBorder: "",
  },
};

export function ChartCard({
  title,
  icon: Icon,
  children,
  className,
  description,
  variant = "neutral",
}: ChartCardProps) {
  const config = variantConfig[variant];

  return (
    <article
      className={cn(
        "group transition",
        config.border,
        config.gradient,
        config.shadow,
        config.hoverBorder,
        className,
      )}
    >
      <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <SectionCardHeader
          title={title}
          description={description}
          icon={Icon}
          tone={variant as SectionHeaderTone}
        />
      </div>
      <div className="overflow-visible px-4 pb-4 sm:px-5 sm:pb-5 pt-1">{children}</div>
    </article>
  );
}
