"use client";

import Link from "next/link";
import { SafeAvatarImage } from "@/components/ui/safe-avatar-image";
import { resolveAvatarSourcesFromSeed } from "@/lib/ui/user-avatar-sources";
import { AVATAR_RING_CLASS } from "@/lib/ui/avatar-ring-styles";
import { cn } from "@/lib/utils";

export type AvatarInlineLinkProps = {
  /** Display name beside avatar; omit for avatar-only (supplier table) */
  label?: string;
  /** Robohash / avatar seed (user id or supplier id) */
  seed: string;
  /** Optional Google profile image */
  image?: string | null;
  /** When set, name is a link */
  href?: string;
  size?: number;
  className?: string;
  linkClassName?: string;
  /** Avatars are off app-wide (only the top-bar account button shows one); pass true to opt in. */
  showAvatar?: boolean;
};

/** Round avatar + optional link for owner/supplier/buyer rows */
export function AvatarInlineLink({
  label,
  seed,
  image,
  href,
  size = 24,
  className,
  linkClassName,
  showAvatar = false,
}: AvatarInlineLinkProps) {
  const avatar = resolveAvatarSourcesFromSeed(seed, image ?? null);
  const showLabel = label != null && label !== "";
  const nameEl = !showLabel ? null : href ? (
    <Link
      href={href}
      className={cn(
        "text-sm font-normal text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 truncate",
        linkClassName,
      )}
    >
      {label}
    </Link>
  ) : (
    <span className={cn("text-sm font-normal truncate", linkClassName)}>
      {label}
    </span>
  );

  if (!showAvatar) {
    if (!nameEl) return null;
    return <span className={cn("inline-flex min-w-0 items-center", className)}>{nameEl}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0", className)}>
      {/* Ring on outer; overflow-hidden only on image (ring must not clip) */}
      <span
        className={cn("relative shrink-0 rounded-full", AVATAR_RING_CLASS)}
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <SafeAvatarImage
            src={avatar.src}
            fallbackSrc={avatar.fallbackSrc}
            alt=""
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        </span>
      </span>
      {nameEl}
    </span>
  );
}
