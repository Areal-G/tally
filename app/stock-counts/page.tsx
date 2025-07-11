import StockCountsPage from "@/components/inventory/StockCountsPage";
import { requireStoreOwnerPage } from "@/lib/inventory/page-guard";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStoreOwnerPage();
  return <StockCountsPage />;
}
