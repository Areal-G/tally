"use client";

/**
 * Home (store overview) for admin: statistics cards and quick links to products, categories, suppliers.
 * Shell-first layout; hooks receive SSR initialData directly.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts";
import { DashboardOverview } from "@/components/home/DashboardOverview";
import Navbar from "@/components/layouts/Navbar";
import { PageContentWrapper } from "@/components/shared";
import FloatingActionButtons from "@/components/shared/FloatingActionButtons";
import { useProducts } from "@/hooks/queries";
import { queryKeys, useSyncSsrQueryData } from "@/lib/react-query";
import type {
  ProductForHome,
  CategoryForHome,
  SupplierForHome,
} from "@/lib/server/home-data";
import type { DashboardStats } from "@/types";

export type HomePageProps = {
  initialProducts?: ProductForHome[];
  initialCategories?: CategoryForHome[];
  initialSuppliers?: SupplierForHome[];
  initialStats?: DashboardStats | null;
  /** From server searchParams — avoids relying on client-only OAuth detection on first paint */
  initialOAuthSuccess?: boolean;
};

/**
 * Home page client component (initialOAuthSuccess from server; useSearchParams for URL fallback).
 * Accepts optional server-fetched data for first-render hydration via hook initialData.
 */
export default function HomePage({
  initialProducts,
  initialCategories,
  initialSuppliers,
  initialStats,
  initialOAuthSuccess = false,
}: HomePageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isCheckingAuth, user, refreshSession } = useAuth();
  const { data: allProducts = [] } = useProducts(initialProducts);

  useSyncSsrQueryData(queryKeys.products.lists(), initialProducts);
  useSyncSsrQueryData(queryKeys.categories.lists(), initialCategories);
  useSyncSsrQueryData(queryKeys.suppliers.lists(), initialSuppliers);

  const [isRefreshingOAuth, setIsRefreshingOAuth] = useState(false);
  const [oauthRefreshComplete, setOauthRefreshComplete] = useState(false);
  const oauthHandledRef = useRef(false);
  const urlCleanedRef = useRef(false);

  useEffect(() => {
    const isOAuthFlow =
      initialOAuthSuccess || searchParams.get("oauth_success") === "true";

    if (isOAuthFlow && !oauthHandledRef.current) {
      oauthHandledRef.current = true;
      queueMicrotask(() => setIsRefreshingOAuth(true));

      refreshSession()
        .then(() => {
          setOauthRefreshComplete(true);
          setIsRefreshingOAuth(false);
          if (
            !urlCleanedRef.current &&
            typeof window !== "undefined" &&
            window.location.search.includes("oauth_success=true")
          ) {
            urlCleanedRef.current = true;
            window.history.replaceState(
              { ...window.history.state, as: "/", url: "/" },
              "",
              "/",
            );
          }
        })
        .catch(() => {
          setOauthRefreshComplete(true);
          setIsRefreshingOAuth(false);
        });
      return;
    }

    if (!isOAuthFlow || oauthRefreshComplete) {
      if (isOAuthFlow && oauthRefreshComplete) {
        if (!isCheckingAuth && !isLoggedIn) {
          router.replace("/login", { scroll: false });
        }
        return;
      }

      if (!isOAuthFlow && !isCheckingAuth && !isLoggedIn) {
        router.replace("/login", { scroll: false });
      }
    }
  }, [
    initialOAuthSuccess,
    searchParams,
    isLoggedIn,
    isCheckingAuth,
    router,
    refreshSession,
    isRefreshingOAuth,
    oauthRefreshComplete,
  ]);

  return (
    <Navbar>
      <PageContentWrapper>

        <div id="statistics" className="scroll-mt-20 pb-6">
          <DashboardOverview initialStats={initialStats} products={allProducts} />
        </div>

        <FloatingActionButtons
          allProducts={allProducts}
          userId={user?.id || ""}
        />
      </PageContentWrapper>
    </Navbar>
  );
}
