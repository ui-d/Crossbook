import {
  AlertCircle,
  Wallet,
  TrendingUp,
  Receipt,
  Sparkles,
} from "lucide-react";

import { formatAmount, type ReportSummary } from "@/lib/report-builder";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  summary: ReportSummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const totalRecords =
    summary.total_records_hubspot + summary.total_records_quickbooks;

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Conflicts"
          value={summary.total_conflicts.toLocaleString()}
          sub={`across ${totalRecords.toLocaleString()} records`}
          icon={<AlertCircle className="size-5" />}
          tone="default"
        />
        <Metric
          label="At risk"
          value={formatAmount(summary.total_amount_at_risk_cents)}
          sub="amount mismatches"
          icon={<Wallet className="size-5" />}
          tone="default"
        />
        <Metric
          label="High priority"
          value={summary.high_priority_conflicts.toLocaleString()}
          sub="need a decision"
          icon={<TrendingUp className="size-5" />}
          tone="primary"
        />
        <Metric
          label="Missing invoices"
          value={summary.missing_qbo_invoices.toLocaleString()}
          sub="closed-won, no QBO"
          icon={<Receipt className="size-5" />}
          tone="default"
        />
      </div>
      <div className="flex items-center gap-2 text-[13px] text-on-surface-variant px-1">
        <Sparkles className="size-4 text-primary" />
        <span>
          <strong className="text-on-surface">{summary.pattern_match_count}</strong> explained by pattern library ·{" "}
          <strong className="text-on-surface">{summary.claude_analyzed_count}</strong> analyzed by Claude
        </span>
      </div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: "default" | "primary";
}

function Metric({ label, value, sub, icon, tone }: MetricProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2 shadow-ambient",
        tone === "primary"
          ? "bg-primary-fixed border-primary-container/30"
          : "bg-surface-container-lowest border-outline-variant",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-on-surface-variant">{label}</span>
        <span className={tone === "primary" ? "text-primary" : "text-on-surface-variant"}>
          {icon}
        </span>
      </div>
      <div className="font-display text-[28px] font-bold text-on-surface tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[12px] text-on-surface-variant">{sub}</div>
    </div>
  );
}
