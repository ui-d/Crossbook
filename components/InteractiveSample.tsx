"use client";

import { useMemo } from "react";

import { ConflictTable } from "@/components/ConflictTable";
import { SummaryCard } from "@/components/SummaryCard";
import sampleReport from "@/data/sample-report.json";
import type { BuiltReport } from "@/lib/report-builder";

const SAMPLE_REPORT_ID = "sample-report-fixture";

export function InteractiveSample() {
  const report = useMemo(
    () => sampleReport as unknown as BuiltReport,
    [],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <strong>Demo:</strong> decisions and filters are local-only. Nothing is
        sent to a server. To run on your real CSVs, scroll back to the top and
        drop two files.
      </div>
      <SummaryCard summary={report.summary} />
      <ConflictTable
        reportId={SAMPLE_REPORT_ID}
        conflicts={report.conflicts}
        initialDecisions={{}}
        isPaid={true}
        saveDecision={async () => ({ ok: true })}
        saveBulk={async () => ({ ok: true })}
      />
    </div>
  );
}
