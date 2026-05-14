import { FileSpreadsheet } from "lucide-react";

import AppShell from "@/components/AppShell";
import { UploadZone } from "@/components/UploadZone";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "New report",
  description:
    "Drop your HubSpot Deals CSV and QuickBooks Customers/Invoices CSV. AI explains every conflict in plain English with source-row citations. First report free.",
  path: "/upload",
});

export default function UploadPage() {
  return (
    <AppShell
      title="Match HubSpot Deals against QuickBooks"
      subtitle="Drop your two CSV exports. We explain every conflict in plain English and cite the exact row in both files. First report free."
    >
      <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
        <FileSpreadsheet className="size-4 text-primary" />
        <span className="text-label-caps text-primary">Step 1 of 2</span>
        <span>Upload your CSV exports</span>
      </div>
      <UploadZone />
    </AppShell>
  );
}
