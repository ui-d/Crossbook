"use client";

import { Download, FileSpreadsheet } from "lucide-react";

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
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-ambient flex flex-col gap-4">
      <header className="flex items-start gap-4">
        <div className="size-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          <Download className="size-4" />
        </div>
        <div>
          <h2 className="font-display text-[16px] font-semibold text-on-surface">Export corrected CSV</h2>
          <p className="text-[13px] text-on-surface-variant mt-1">
            {disabled
              ? "Resolve all HIGH-priority conflicts before exporting."
              : "Download your CSVs with 5 reconciliation columns appended, or the summary file."}
          </p>
        </div>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button asChild disabled={disabled} variant="cta">
          <a href={`${base}?side=hubspot`} download className="gap-2">
            <FileSpreadsheet className="size-4" />
            HubSpot CSV
          </a>
        </Button>
        <Button asChild disabled={disabled} variant="cta">
          <a href={`${base}?side=quickbooks`} download className="gap-2">
            <FileSpreadsheet className="size-4" />
            QuickBooks CSV
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`${base}?side=summary`} download className="gap-2">
            <FileSpreadsheet className="size-4" />
            Summary CSV
          </a>
        </Button>
      </div>
    </section>
  );
}
