/**
 * Notification Bell Component
 * Displays a bell icon with unread notification count badge
 * Opens notification dropdown when clicked
 */

"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnreadNotificationCount, useNotifications } from "@/hooks/queries";
import { NotificationDropdown } from "./NotificationDropdown";
import { useShellSsr } from "@/contexts/shell-ssr-context";

/**
 * Notification Bell Component
 * Shows bell icon with unread count badge and opens dropdown on click.
 * Uses Radix DropdownMenu portal (same as navbar profile/theme) so the panel
 * is not clipped by header overflow-x-hidden / sticky layout.
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { initialNotifications, initialUnreadCount } = useShellSsr();

  // Fetch unread notification count for badge
  const {
    data: unreadCount = 0,
    isLoading: isLoadingCount,
  } = useUnreadNotificationCount(initialUnreadCount);

  // Fetch notifications for dropdown
  // Always fetch to keep data fresh, but only show when dropdown is open
  const {
    data: notifications = initialNotifications ?? [],
    isLoading: isLoadingNotifications,
    isError: isErrorNotifications,
  } = useNotifications({ limit: 20 }, initialNotifications, {
    enabled: isOpen,
  });

  // Always render the bell button, even if there's an error loading the count
  // This ensures the UI stays consistent and doesn't flicker

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="money-tool-button relative h-10 w-10 border-0 bg-transparent p-0 shadow-none"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {!isLoadingCount && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-medium rounded-full border-2 border-[var(--bg-main)] money-brand-fill"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 border-[var(--border-subtle)] bg-[var(--card-bg)] rounded-2xl shadow-xl overflow-hidden"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoadingNotifications}
          isError={isErrorNotifications}
          onClose={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
