import PurchaseOrdersPage from "@/components/inventory/PurchaseOrdersPage";
import { requireStoreOwnerPage } from "@/lib/inventory/page-guard";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStoreOwnerPage();
  return <PurchaseOrdersPage />;
}
