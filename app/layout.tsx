/**
 * Root layout: fonts, metadata (SEO), and providers (Query, Auth, Theme, Toaster).
 * Wraps all pages; force-dynamic so useSearchParams and server session work correctly.
 */
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import React from "react";
import { AuthProvider } from "@/contexts";
import { ShellSsrProvider } from "@/contexts/shell-ssr-context";
import { getSession } from "@/lib/auth-server";
import { mapSessionToAppUser } from "@/lib/auth/map-session-user";
import { getShellNotificationsForUser } from "@/lib/server/notifications-data";
import { QueryProvider } from "@/lib/react-query";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AuthSessionToasts } from "@/components/shared/AuthSessionToasts";
import { SuppressApiErrorOverlay } from "@/components/shared/SuppressApiErrorOverlay";
import { RouteWarmPrefetch } from "@/components/providers/RouteWarmPrefetch";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/** UI font (part of the Tally design system). */
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

/** Force dynamic rendering for all routes so useSearchParams etc. work without Suspense and pages render instantly. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Tally — Warehouse & Stock Inventory Management System",
    template: "%s | Tally — Warehouse & Stock Inventory Management System",
  },
  description:
    "Tally is a full-stack warehouse and stock inventory management system built with Next.js. Manage products, categories, suppliers, orders, invoices, and warehouses. Role-based access for admin, client, and supplier. Analytics dashboard, QR codes, export, and secure JWT authentication.",
  authors: [{ name: "Tally" }],
  creator: "Tally",
  publisher: "Tally",
  applicationName: "Tally",
  keywords: [
    "stock inventory",
    "inventory management",
    "warehouse management",
    "stock management system",
    "Next.js",
    "React",
    "Prisma",
    "product catalog",
    "orders",
    "invoices",
    "suppliers",
    "categories",
    "JWT authentication",
    "responsive web app",
    "business dashboard",
  ],
  icons: {
    icon: [{ url: "/tally-icon.svg", type: "image/svg+xml" }],
    apple: "/tally-icon.svg",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Tally — Warehouse & Stock Inventory Management System",
    description:
      "Efficiently manage products, orders, invoices, and warehouses with Tally. Secure, responsive, role-based inventory system.",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    siteName: "Tally",
    images: [
      {
        url: "/tally-icon.svg",
        width: 64,
        height: 64,
        alt: "Tally — Stock Inventory Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tally — Warehouse & Stock Inventory Management System",
    description:
      "Efficiently manage products, orders, invoices, and warehouses. Secure, responsive inventory system.",
    images: ["/tally-icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** Optional: set NEXT_PUBLIC_DISABLE_BROWSER_TRANSLATE=true on Vercel prod only (blocks Chrome Translate). */
const disableBrowserTranslate =
  process.env.NEXT_PUBLIC_DISABLE_BROWSER_TRANSLATE === "true";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const initialUser = session ? mapSessionToAppUser(session) : null;
  const shellNotifications = session
    ? await getShellNotificationsForUser(session.id)
    : null;

  return (
    <html
      lang="en"
      {...(disableBrowserTranslate ? { translate: "no" as const } : {})}
      suppressHydrationWarning
      style={{ overscrollBehavior: "none" }}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} antialiased`}
        suppressHydrationWarning
        style={{ overscrollBehavior: "none" }}
      >
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider initialUser={initialUser}>
              <ShellSsrProvider
                value={
                  shellNotifications ?? {
                    initialNotifications: undefined,
                    initialUnreadCount: undefined,
                  }
                }
              >
              <RouteWarmPrefetch />
              <SuppressApiErrorOverlay />
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <TooltipProvider delayDuration={200}>
                  <KeyboardShortcutsProvider>
                    {children}
                  </KeyboardShortcutsProvider>
                </TooltipProvider>
              </ThemeProvider>
              {/* Toaster must mount before AuthSessionToasts so useToast listeners exist when deferred toasts fire */}
              <Toaster />
              <AuthSessionToasts />
              </ShellSsrProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
