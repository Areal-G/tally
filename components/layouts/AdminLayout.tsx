"use client";

import { type ReactNode } from "react";
import Navbar from "@/components/layouts/Navbar";
import AdminSidebar from "@/components/layouts/AdminSidebar";

import type { AdminCounts } from "@/types";

/**
 * Admin layout: main Navbar sidebar + admin tab bar across the top of the content.
 * initialCounts from app/admin/layout.tsx SSR.
 */
export default function AdminLayout({
  children,
  initialCounts,
}: {
  children: ReactNode;
  initialCounts?: AdminCounts;
}) {
  return (
    <Navbar>
      <div className="flex min-w-0 flex-col gap-5">
        <AdminSidebar initialCounts={initialCounts} />
        <div className="min-w-0">{children}</div>
      </div>
    </Navbar>
  );
}
