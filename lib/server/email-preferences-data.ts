/**
 * Server-side email preferences for SSR prefetch.
 */

import { getUserEmailPreferences } from "@/lib/email/preferences";
import type { EmailPreferences } from "@/types/auth";

export async function getEmailPreferencesForUser(
  userId: string,
): Promise<EmailPreferences> {
  return getUserEmailPreferences(userId);
}
