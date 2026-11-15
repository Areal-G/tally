/**
 * Platform-level user management (list/create/edit/delete every account).
 *
 * Every signup is an "admin" of its own store, so the store-admin role must not
 * grant control over other people's accounts. Only emails listed in
 * PLATFORM_ADMIN_EMAILS (comma-separated, server-only) may manage users.
 * Unset = nobody can, which is the safe default.
 */
export function isPlatformAdmin(
  user: { email?: string | null; role?: string | null } | null | undefined,
): boolean {
  if (!user?.email || user.role !== "admin") return false;
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
