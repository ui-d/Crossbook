import type { BuiltReport, ReportConflict } from "./report-builder";

export interface ConflictDelta {
  new_conflicts: ReportConflict[];
  resolved_conflicts: ReportConflict[];
  persistent_conflicts: ReportConflict[];
}

export interface DecisionOverride {
  fingerprint: string;
  hubspot_company: string | null;
  quickbooks_company: string | null;
  conflict_type: string;
  prior_decision: string;
  current_state: "FIELDS_CHANGED" | "STILL_PRESENT";
  current_conflict: ReportConflict;
}

export interface DeltaSummary {
  prior_report_id: string;
  prior_created_at: string;
  current_created_at: string;
  days_between: number;
  new_count: number;
  resolved_count: number;
  persistent_count: number;
  new_at_risk_cents: number;
  resolved_at_risk_cents: number;
  net_change_cents: number;
  override_count: number;
}

export interface Delta {
  summary: DeltaSummary;
  conflicts: ConflictDelta;
  overrides: DecisionOverride[];
}

function normalizeName(name: string | null): string {
  return (name ?? "").toLowerCase().trim();
}

export function conflictFingerprint(conflict: ReportConflict): string {
  const company =
    normalizeName(conflict.hubspot_company) ||
    normalizeName(conflict.quickbooks_company) ||
    "unknown";
  return `${company}::${conflict.conflict_type}::${conflict.field}`;
}

function sumAtRisk(conflicts: ReportConflict[]): number {
  return conflicts.reduce(
    (sum, c) => sum + (c.amount_at_risk_cents ?? 0),
    0,
  );
}

function daysBetween(prior: string, current: string): number {
  const ms =
    new Date(current).getTime() - new Date(prior).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export interface PriorDecisionRecord {
  fingerprint: string;
  decision: string;
}

export interface ComputeDeltaInput {
  prior_report_id: string;
  prior_created_at: string;
  prior_report: BuiltReport;
  current_created_at: string;
  current_report: BuiltReport;
  prior_decisions?: PriorDecisionRecord[];
}

export function computeDelta(input: ComputeDeltaInput): Delta {
  const priorByFp = new Map<string, ReportConflict>();
  for (const conflict of input.prior_report.conflicts) {
    priorByFp.set(conflictFingerprint(conflict), conflict);
  }

  const currentByFp = new Map<string, ReportConflict>();
  for (const conflict of input.current_report.conflicts) {
    currentByFp.set(conflictFingerprint(conflict), conflict);
  }

  const new_conflicts: ReportConflict[] = [];
  const persistent_conflicts: ReportConflict[] = [];
  for (const [fp, conflict] of currentByFp) {
    if (priorByFp.has(fp)) {
      persistent_conflicts.push(conflict);
    } else {
      new_conflicts.push(conflict);
    }
  }

  const resolved_conflicts: ReportConflict[] = [];
  for (const [fp, conflict] of priorByFp) {
    if (!currentByFp.has(fp)) {
      resolved_conflicts.push(conflict);
    }
  }

  const overrides: DecisionOverride[] = [];
  for (const record of input.prior_decisions ?? []) {
    if (record.decision !== "TRUST_HUBSPOT" && record.decision !== "TRUST_QUICKBOOKS") {
      continue;
    }
    const currentMatch = currentByFp.get(record.fingerprint);
    if (currentMatch) {
      const priorMatch = priorByFp.get(record.fingerprint);
      const fieldsChanged =
        priorMatch !== undefined &&
        (priorMatch.hubspot_value !== currentMatch.hubspot_value ||
          priorMatch.quickbooks_value !== currentMatch.quickbooks_value);
      overrides.push({
        fingerprint: record.fingerprint,
        hubspot_company: currentMatch.hubspot_company,
        quickbooks_company: currentMatch.quickbooks_company,
        conflict_type: currentMatch.conflict_type,
        prior_decision: record.decision,
        current_state: fieldsChanged ? "FIELDS_CHANGED" : "STILL_PRESENT",
        current_conflict: currentMatch,
      });
    }
  }

  const new_at_risk_cents = sumAtRisk(new_conflicts);
  const resolved_at_risk_cents = sumAtRisk(resolved_conflicts);

  return {
    summary: {
      prior_report_id: input.prior_report_id,
      prior_created_at: input.prior_created_at,
      current_created_at: input.current_created_at,
      days_between: daysBetween(input.prior_created_at, input.current_created_at),
      new_count: new_conflicts.length,
      resolved_count: resolved_conflicts.length,
      persistent_count: persistent_conflicts.length,
      new_at_risk_cents,
      resolved_at_risk_cents,
      net_change_cents: new_at_risk_cents - resolved_at_risk_cents,
      override_count: overrides.length,
    },
    conflicts: {
      new_conflicts,
      resolved_conflicts,
      persistent_conflicts,
    },
    overrides,
  };
}
