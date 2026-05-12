"use client";

import { Button } from "@/components/ui/button";

interface ExportButtonsProps {
  reportId: string;
  hasHighPriorityUnresolved: boolean;
  isPaid: boolean;
}

export function ExportButtons({
  reportId,
  hasHighPriorityUnresolved,
  isPaid,
}: ExportButtonsProps) {
  if (!isPaid) return null;
  const disabled = hasHighPriorityUnresolved;
  const base = `/api/export/${reportId}`;
  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <header>
        <h2 className="text-base font-semibold">Export corrected CSV</h2>
        <p className="text-xs text-muted-foreground">
          {disabled
            ? "Resolve all HIGH-priority conflicts first."
            : "Download your CSVs with 5 reconciliation columns appended, or the summary."}
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button asChild disabled={disabled} variant="default">
          <a href={`${base}?side=hubspot`} download>
            HubSpot CSV
          </a>
        </Button>
        <Button asChild disabled={disabled} variant="default">
          <a href={`${base}?side=quickbooks`} download>
            QuickBooks CSV
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`${base}?side=summary`} download>
            Summary CSV
          </a>
        </Button>
      </div>
    </section>
  );
}
