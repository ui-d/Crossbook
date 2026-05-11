import { formatAmount, type ReportSummary } from "@/lib/report-builder";

interface SummaryCardProps {
  summary: ReportSummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const totalRecords =
    summary.total_records_hubspot + summary.total_records_quickbooks;
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Reconciliation summary</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Conflicts"
          value={summary.total_conflicts.toLocaleString()}
          sub={`across ${totalRecords.toLocaleString()} records`}
        />
        <Stat
          label="At risk"
          value={formatAmount(summary.total_amount_at_risk_cents)}
          sub="amount mismatches"
        />
        <Stat
          label="HIGH priority"
          value={summary.high_priority_conflicts.toLocaleString()}
          sub="need a decision"
          accent="text-red-600"
        />
        <Stat
          label="Missing QBO invoices"
          value={summary.missing_qbo_invoices.toLocaleString()}
          sub="closed-won, no invoice"
        />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        {summary.pattern_match_count} explained by pattern library ·{" "}
        {summary.claude_analyzed_count} analyzed by Claude
      </div>
    </section>
  );
}

interface StatProps {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}

function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${accent ?? ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
