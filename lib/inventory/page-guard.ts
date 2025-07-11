/**
 * Server page guard for store-owner-only inventory pages.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getHomePathForRole } from "@/lib/navigation/role-nav-config";

export async function requireStoreOwnerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "client" || session.role === "supplier") {
    redirect(getHomePathForRole(session.role));
  }
  return session;
}
