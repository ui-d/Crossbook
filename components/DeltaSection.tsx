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
    <section className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl">📊</span>
        <div className="flex-1">
          <h2 className="text-base font-semibold">
            What&apos;s changed since your {priorDateLabel} report
            <span className="text-muted-foreground font-normal">
              {" "}
              ({summary.days_between} {summary.days_between === 1 ? "day" : "days"} ago)
            </span>
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            <DeltaLine
              icon="🆕"
              text={
                <>
                  <strong>{summary.new_count}</strong> new conflict
                  {summary.new_count === 1 ? "" : "s"}{" "}
                  <span className="text-muted-foreground">
                    ({formatAmount(summary.new_at_risk_cents)} newly at risk)
                  </span>
                </>
              }
            />
            <DeltaLine
              icon="✅"
              text={
                <>
                  <strong>{summary.resolved_count}</strong> conflict
                  {summary.resolved_count === 1 ? "" : "s"} resolved{" "}
                  <span className="text-muted-foreground">
                    ({formatAmount(summary.resolved_at_risk_cents)} cleared)
                  </span>
                </>
              }
            />
            <DeltaLine
              icon="⏳"
              text={
                <>
                  <strong>{summary.persistent_count}</strong> persistent conflict
                  {summary.persistent_count === 1 ? "" : "s"} — still unresolved
                </>
              }
            />
            {summary.override_count > 0 ? (
              <DeltaLine
                icon="⚠️"
                text={
                  <>
                    <strong>{summary.override_count}</strong> item
                    {summary.override_count === 1 ? "" : "s"} you previously
                    decided on now show different data — review below
                  </>
                }
              />
            ) : null}
          </ul>

          {overrides.length > 0 ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Review {overrides.length} decision{overrides.length === 1 ? "" : "s"} potentially affected
              </summary>
              <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-muted-foreground">
                {overrides.map((o) => (
                  <li key={o.fingerprint}>
                    <strong>{o.hubspot_company ?? o.quickbooks_company ?? "?"}</strong>{" "}
                    — previously decided <code>{o.prior_decision}</code> for{" "}
                    <code>{o.conflict_type}</code>;{" "}
                    {o.current_state === "FIELDS_CHANGED"
                      ? "values have changed"
                      : "conflict still present"}
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
  icon: string;
  text: React.ReactNode;
}

function DeltaLine({ icon, text }: DeltaLineProps) {
  return (
    <li className="flex items-baseline gap-2">
      <span aria-hidden>{icon}</span>
      <span>{text}</span>
    </li>
  );
}
