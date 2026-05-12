import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { ConflictTable } from "@/components/ConflictTable";
import { DeltaSection } from "@/components/DeltaSection";
import { ExportButtons } from "@/components/ExportButtons";
import { SummaryCard } from "@/components/SummaryCard";
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
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reconciliation report
        </h1>
        <p className="text-sm text-muted-foreground">
          {report.hubspot_filename} ↔ {report.quickbooks_filename} ·{" "}
          {new Date(report.created_at).toLocaleString()}
        </p>
      </header>

      <SummaryCard summary={summary} />

      {report.delta_json && report.is_paid ? (
        <DeltaSection delta={report.delta_json} />
      ) : null}

      {!report.is_paid ? (
        <UpgradeBanner reportId={report.id} />
      ) : null}

      {report.is_paid ? (
        <ExportButtons
          reportId={report.id}
          isPaid={report.is_paid}
          hasHighPriorityUnresolved={conflicts.some(
            (c) =>
              c.priority === "HIGH" &&
              !decisionsByConflictId[c.conflict_id],
          )}
        />
      ) : null}

      <ConflictTable
        reportId={report.id}
        conflicts={conflicts}
        initialDecisions={decisionsByConflictId}
        isPaid={report.is_paid}
      />
    </main>
  );
}

function UpgradeBanner({ reportId }: { reportId: string }) {
  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="font-medium">
        Free tier: full summary visible, action buttons enabled on the first 5
        conflicts.
      </p>
      <p className="text-muted-foreground mt-1">
        Upgrade to $49/month for unlimited reports, bulk actions, filters,
        monthly delta tracking, and corrected CSV export. 93% less than HubSpot
        Data Hub Professional ($720/seat/month).
      </p>
      <form action={`/api/checkout?reportId=${reportId}`} method="post" className="mt-3">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Upgrade to $49/month
        </button>
      </form>
    </section>
  );
}
