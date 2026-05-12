import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Sparkles, Calendar } from "lucide-react";

import AppShell from "@/components/AppShell";
import { ConflictTable } from "@/components/ConflictTable";
import { DeltaSection } from "@/components/DeltaSection";
import { ExportButtons } from "@/components/ExportButtons";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import type { Delta } from "@/lib/delta-engine";
import type { BuiltReport } from "@/lib/report-builder";

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

function UpgradeBanner({ reportId }: { reportId: string }) {
  return (
    <section className="border border-primary-container/40 bg-primary-fixed rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4 shadow-ambient">
      <div className="size-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
        <Sparkles className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-display text-[16px] font-semibold text-on-surface">
          Free tier: first 5 conflicts unblurred
        </p>
        <p className="text-[13px] text-on-surface-variant mt-1">
          Upgrade to $49/month for unlimited reports, bulk actions, filters, monthly delta tracking, and
          corrected CSV export. 93% less than HubSpot Data Hub Professional ($720/seat/month).
        </p>
      </div>
      <form action={`/api/checkout?reportId=${reportId}`} method="post">
        <Button type="submit" variant="cta">Upgrade to $49/month</Button>
      </form>
    </section>
  );
}
