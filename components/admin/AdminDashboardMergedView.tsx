"use client";

import { PageContentWrapper } from "@/components/shared";
import AdminAnalyticsContent from "./AdminAnalyticsContent";
import type { DashboardStats } from "@/types";

export type AdminDashboardMergedViewProps = {
  variant: "store" | "personal";
  /** SSR-passed dashboard stats */
  initialStats?: DashboardStats | null;
  /** SSR-passed forecasting summary */
  initialForecasting?: import("@/types").ForecastingSummary;
};

/**
 * Merged dashboard: overview (KPIs + recent orders) + analytics (charts, AI).
 * Blocking SSR in page.tsx; no Suspense shell flash.
 */
export default function AdminDashboardMergedView({
  variant,
  initialStats,
  initialForecasting,
}: AdminDashboardMergedViewProps) {
  return (
    <PageContentWrapper noPadding={variant === "store"}>
      <div className="space-y-4">
        <AdminAnalyticsContent
          initialStats={initialStats}
          initialForecasting={initialForecasting}
        />
      </div>
    </PageContentWrapper>
  );
}
