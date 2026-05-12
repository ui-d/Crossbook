import { UploadZone } from "@/components/UploadZone";

export const metadata = {
  title: "Crossbook — HubSpot ↔ QuickBooks",
  description:
    "Drop two CSVs. AI explains every conflict in plain English with source-row citations.",
};

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-3 text-center mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Match HubSpot Deals against QuickBooks
        </h1>
        <p className="text-muted-foreground">
          Drop your two CSV exports. We explain every conflict in plain English
          and cite the exact row in both files. First report free.
        </p>
      </div>
      <UploadZone />
    </main>
  );
}
