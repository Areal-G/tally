"use client";

import Link from "next/link";
import { AuthAnimatedBlock } from "@/components/auth/AuthAnimatedBlock";
import { TallyMark } from "@/components/brand/TallyMark";

/**
 * Navbar-matched brand for auth left column.
 * Keep icon box + title classes in sync with components/layouts/Navbar.tsx.
 */
export function AuthBrandHeader() {
  return (
    <AuthAnimatedBlock delayMs={0}>
      <Link
        href="/"
        className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
        aria-label="Tally — Inventory Management"
      >
        <span className="money-brand-fill money-brand-shadow flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105">
          <TallyMark className="h-6 w-6" />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Tally</p>
          <p className="text-sm leading-snug text-[var(--text-secondary)]">Count every item. Know every shelf.</p>
        </div>
      </Link>
    </AuthAnimatedBlock>
  );
}
