import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getUsersForAdmin } from "@/lib/server/users-data";
import { prefetchListPageStats } from "@/lib/server/list-page-stats";
import AdminUserManagementContent from "@/components/admin/AdminUserManagementContent";

/** Blocking SSR prefetch (no Suspense shell flash). */
export const dynamic = "force-dynamic";

export default async function AdminUserManagementPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isPlatformAdmin(user)) redirect("/admin");

  const [initialUsers, listStats] = await Promise.all([
    getUsersForAdmin(),
    prefetchListPageStats(user),
  ]);
  return (
    <AdminUserManagementContent
      initialUsers={initialUsers}
      initialStats={listStats.initialStats}
    />
  );
}
