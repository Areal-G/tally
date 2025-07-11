"use client";

/**
 * Shared building blocks for the inventory-operations pages
 * (purchase orders, movements, counts, returns, scan, labels) in the Tally design system style.
 */
import React from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layouts/Navbar";
import { PageContentWrapper } from "@/components/shared";
import { PageSectionHeader } from "@/components/shared/PageSectionHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

/* ---------------------------------- Shell ---------------------------------- */

export function OpsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Data on these pages is client-fetched; render the body after hydration so a warm
  // query cache can never disagree with the server-rendered loading state.
  const hydrated = useHydrated();
  return (
    <Navbar>
      <PageContentWrapper>
        <div className="flex flex-col gap-6">
          <PageSectionHeader
            as="h1"
            title={title}
            description={description}
            trailing={actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : undefined}
          />
          {hydrated ? (
            children
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="money-surface h-[148px] animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </PageContentWrapper>
    </Navbar>
  );
}

/* ---------------------------------- Stats ---------------------------------- */

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>;
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <div className="money-surface money-stat flex min-w-0 flex-col gap-2 p-4 sm:gap-3 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
        <span className="text-[13px] font-medium leading-snug text-[var(--text-secondary)] sm:text-sm">{label}</span>
        <span className="money-stat-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
        </span>
      </div>
      {loading ? (
        <span className="h-8 w-24 animate-pulse rounded-lg bg-[var(--bg-elevated)]" />
      ) : (
        <span className="break-words text-xl font-semibold leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-2xl">
          {value}
        </span>
      )}
      {hint != null && <span className="text-xs text-[var(--text-secondary)]">{hint}</span>}
    </div>
  );
}

/* ---------------------------------- Panels --------------------------------- */

export function Panel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("money-surface min-w-0 overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tint-violet)] text-[var(--accent-purple)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h2>}
              {description && <p className="text-xs text-[var(--text-secondary)]">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tint-violet)] text-[var(--accent-purple)]">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
      ))}
    </div>
  );
}

/* ---------------------------------- Pills ---------------------------------- */

export type PillTone = "violet" | "emerald" | "sky" | "amber" | "rose" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  violet: "bg-[var(--tint-violet)] text-[var(--accent-purple)]",
  emerald: "bg-[var(--tint-emerald)] text-[var(--status-positive)]",
  sky: "bg-[var(--tint-sky)] text-[var(--accent-blue)]",
  amber: "bg-[var(--tint-amber)] text-[var(--status-warning)]",
  rose: "bg-[var(--tint-rose)] text-[var(--status-negative)]",
  neutral: "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
};

export function Pill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: PillTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        PILL_TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

/** Signed quantity like +12 / −4 coloured by direction. */
export function DeltaQty({ value, className }: { value: number; className?: string }) {
  const tone =
    value > 0
      ? "text-[var(--status-positive)]"
      : value < 0
        ? "text-[var(--status-negative)]"
        : "text-[var(--text-secondary)]";
  return (
    <span className={cn("font-semibold tabular-nums", tone, className)}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {Math.abs(value).toLocaleString()}
    </span>
  );
}

/* ---------------------------------- Tables --------------------------------- */

export function OpsTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm [&_td:first-child]:whitespace-nowrap [&_th]:whitespace-nowrap">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-5 py-3 text-left", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-t border-[var(--border-subtle)] px-5 py-3.5 align-middle text-[var(--text-primary)]", className)}>
      {children}
    </td>
  );
}

/* ---------------------------------- Forms ---------------------------------- */

export const FIELD_CLASS =
  "h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--text-secondary)]">{hint}</span>}
    </label>
  );
}

export function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD_CLASS, "cursor-pointer pr-8", props.className)} />;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_CLASS, props.className)} />;
}

export function PrimaryButton({
  loading,
  icon: Icon,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "money-primary-action inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  loading,
  icon: Icon,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "money-secondary-action inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

export function SmallButton({
  tone = "neutral",
  icon: Icon,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "neutral" | "brand" | "danger"; icon?: LucideIcon }) {
  const toneClass =
    tone === "brand"
      ? "bg-[var(--tint-violet)] text-[var(--accent-purple)] hover:brightness-95"
      : tone === "danger"
        ? "text-[var(--status-negative)] hover:bg-[var(--tint-rose)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]";
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-50",
        toneClass,
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------------------------------- Dialog --------------------------------- */

export function OpsDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] w-[calc(100vw-2rem)] gap-0 overflow-y-auto rounded-3xl !border-[var(--border-subtle)] !bg-[var(--card-bg)] p-0",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-[var(--border-subtle)] py-4 pl-4 pr-12 text-left sm:px-6 sm:py-5">
          {Icon && (
            <span className="money-brand-fill flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold text-[var(--text-primary)]">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-[var(--text-secondary)]">{description}</DialogDescription>
            )}
          </div>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <DialogFooter className="gap-2 border-t border-[var(--border-subtle)] px-4 py-4 sm:gap-2 sm:px-6">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Formats --------------------------------- */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
