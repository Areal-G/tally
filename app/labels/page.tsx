import LabelsPage from "@/components/inventory/LabelsPage";
import { requireStoreOwnerPage } from "@/lib/inventory/page-guard";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStoreOwnerPage();
  return <LabelsPage />;
}
