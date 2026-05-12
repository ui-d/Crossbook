import { BarChart3, AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";

import type { Delta } from "@/lib/delta-engine";
import { formatAmount } from "@/lib/report-builder";

interface DeltaSectionProps {
  delta: Delta;
}

export function DeltaSection({ delta }: DeltaSectionProps) {
  const { summary, overrides } = delta;
  const priorDateLabel = new Date(summary.prior_created_at).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-ambient">
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
          <BarChart3 className="size-5" />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <span className="text-label-caps text-primary">Delta tracking</span>
            <h2 className="font-display text-[18px] font-semibold text-on-surface">
              What&apos;s changed since your {priorDateLabel} report
              <span className="text-on-surface-variant font-normal">
                {" "}({summary.days_between} {summary.days_between === 1 ? "day" : "days"} ago)
              </span>
            </h2>
          </header>

          <ul className="space-y-2">
            <DeltaLine
              icon={<Sparkles className="size-4 text-primary" />}
              text={
                <>
                  <strong className="text-on-surface">{summary.new_count}</strong> new conflict
                  {summary.new_count === 1 ? "" : "s"}{" "}
                  <span className="text-on-surface-variant">
                    ({formatAmount(summary.new_at_risk_cents)} newly at risk)
                  </span>
                </>
              }
            />
            <DeltaLine
              icon={<CheckCircle2 className="size-4 text-primary" />}
              text={
                <>
                  <strong className="text-on-surface">{summary.resolved_count}</strong> conflict
                  {summary.resolved_count === 1 ? "" : "s"} resolved{" "}
                  <span className="text-on-surface-variant">
                    ({formatAmount(summary.resolved_at_risk_cents)} cleared)
                  </span>
                </>
              }
            />
            <DeltaLine
              icon={<Clock className="size-4 text-tertiary" />}
              text={
                <>
                  <strong className="text-on-surface">{summary.persistent_count}</strong> persistent conflict
                  {summary.persistent_count === 1 ? "" : "s"} — still unresolved
                </>
              }
            />
            {summary.override_count > 0 ? (
              <DeltaLine
                icon={<AlertTriangle className="size-4 text-error" />}
                text={
                  <>
                    <strong className="text-on-surface">{summary.override_count}</strong> item
                    {summary.override_count === 1 ? "" : "s"} you previously decided on now show different
                    data — review below
                  </>
                }
              />
            ) : null}
          </ul>

          {overrides.length > 0 ? (
            <details className="text-[13px] text-on-surface-variant">
              <summary className="cursor-pointer text-on-surface-variant hover:text-on-surface">
                Review {overrides.length} decision{overrides.length === 1 ? "" : "s"} potentially affected
              </summary>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {overrides.map((o) => (
                  <li key={o.fingerprint}>
                    <strong className="text-on-surface">{o.hubspot_company ?? o.quickbooks_company ?? "?"}</strong>{" "}
                    — previously decided{" "}
                    <code className="font-mono text-on-surface bg-surface-container-low px-1 rounded">
                      {o.prior_decision}
                    </code>{" "}
                    for{" "}
                    <code className="font-mono text-on-surface bg-surface-container-low px-1 rounded">
                      {o.conflict_type}
                    </code>
                    ;{" "}
                    {o.current_state === "FIELDS_CHANGED" ? "values have changed" : "conflict still present"}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface DeltaLineProps {
  icon: React.ReactNode;
  text: React.ReactNode;
}

function DeltaLine({ icon, text }: DeltaLineProps) {
  return (
    <li className="flex items-baseline gap-2 text-[14px] text-on-surface-variant">
      <span className="translate-y-[2px]">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
