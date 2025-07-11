"use client";

import type { ReactNode } from "react";
import { SafeImage } from "@/components/ui/safe-image";

type AuthPageShellProps = {
  illustrationSrc: string;
  illustrationAlt: string;
  left: ReactNode;
  right: ReactNode;
};

/**
 * Shared login/register layout shell.
 * Viewport-centered bg illustration (fixed z-0); content max-w-7xl (auth-only cap).
 * Auth-page-root marker (document scroll); html scrollbar-gutter is global.
 */
export function AuthPageShell({
  illustrationSrc,
  illustrationAlt,
  left,
  right,
}: AuthPageShellProps) {
  return (
    <div className="auth-page-root relative flex min-h-screen flex-col items-center justify-center overflow-hidden ">
      <div className="pointer-events-none absolute inset-0 " />

      {/* Viewport x-y center — may sit under form column; authBgFloat */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
      >
        <div className="auth-bg-float relative h-[min(75vh,640px)] w-[min(92vw,860px)] opacity-[0.07] dark:opacity-[0.05] grayscale">
          <SafeImage
            src={illustrationSrc}
            alt={illustrationAlt}
            fill
            className="object-contain object-center"
            priority
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-2 sm:px-4">
        <div className="flex min-h-screen flex-col lg:flex-row lg:gap-8">
          <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center py-6 lg:py-12">
            <div className="relative z-10 w-full max-w-2xl space-y-2">
              {left}
            </div>
          </div>

          <div className="flex w-full lg:w-1/2 items-center justify-center py-6 sm:py-8 lg:py-12">
            {right}
          </div>
        </div>
      </div>
    </div>
  );
}
