import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Calendar } from "lucide-react";

import AppShell from "@/components/AppShell";
import { ConflictTable } from "@/components/ConflictTable";
import { DeltaSection } from "@/components/DeltaSection";
import { ExportButtons } from "@/components/ExportButtons";
import { ReportAnalytics } from "@/components/ReportAnalytics";
import { SummaryCard } from "@/components/SummaryCard";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import type { Delta } from "@/lib/delta-engine";
import type { BuiltReport } from "@/lib/report-builder";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Report",
  description: "Your reconciliation report.",
  noIndex: true,
});

type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

interface PageProps {
  params: Promise<{ id: string }>;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Report page requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

interface ReportRow {
  id: string;
  email: string;
  hubspot_filename: string | null;
  quickbooks_filename: string | null;
  is_paid: boolean;
  status: string;
  result_json: BuiltReport;
  delta_json: Delta | null;
  created_at: string;
}

interface DecisionRow {
  conflict_id: string;
  decision: Decision;
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = adminClient();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id,email,hubspot_filename,quickbooks_filename,is_paid,status,result_json,delta_json,created_at",
    )
    .eq("id", id)
    .maybeSingle<ReportRow>();

  if (!report || !report.result_json) {
    notFound();
  }

  const { data: decisions } = await supabase
    .from("conflict_decisions")
    .select("conflict_id,decision")
    .eq("report_id", id);

  const decisionsByConflictId: Record<string, Decision> = {};
  for (const row of (decisions ?? []) as DecisionRow[]) {
    decisionsByConflictId[row.conflict_id] = row.decision;
  }

  const { summary, conflicts } = report.result_json;

  return (
    <AppShell
      title="Reconciliation report"
      subtitle={
        <span className="inline-flex items-center gap-1">
          <span className="font-mono text-[13px]">{report.hubspot_filename}</span>
          <span className="text-on-surface-variant/60">↔</span>
          <span className="font-mono text-[13px]">{report.quickbooks_filename}</span>
        </span>
      }
      actions={
        <span className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant">
          <Calendar className="size-4" />
          {new Date(report.created_at).toLocaleString()}
        </span>
      }
    >
      <ReportAnalytics
        isPaid={report.is_paid}
        conflictCount={summary.total_conflicts}
      />

      <SummaryCard summary={summary} />

      {report.delta_json && report.is_paid ? <DeltaSection delta={report.delta_json} /> : null}

      {!report.is_paid ? <UpgradeBanner reportId={report.id} /> : null}

      {report.is_paid ? (
        <ExportButtons
          reportId={report.id}
          isPaid={report.is_paid}
          hasHighPriorityUnresolved={conflicts.some(
            (c) =>
              c.priority === "HIGH" && !decisionsByConflictId[c.conflict_id],
          )}
        />
      ) : null}

      <ConflictTable
        reportId={report.id}
        conflicts={conflicts}
        initialDecisions={decisionsByConflictId}
        isPaid={report.is_paid}
      />
    </AppShell>
  );
}

