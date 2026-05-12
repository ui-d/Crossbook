import Papa from "papaparse";

import type { ReportConflict } from "./report-builder";
import { formatAmount } from "./report-builder";

export type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

export type Side = "hubspot" | "quickbooks";

const RECONCILIATION_COLUMNS = [
  "Reconciliation_Decision",
  "Reconciliation_Notes",
  "Conflict_Type",
  "Recommended_Source_Of_Truth",
  "Decided_At",
] as const;

export interface DecisionRecord {
  conflict_id: string;
  decision: Decision;
  notes: string | null;
  decided_at: string;
}

interface BuildAugmentedCsvInput {
  originalCsv: string;
  side: Side;
  conflicts: ReportConflict[];
  decisions: DecisionRecord[];
}

interface RowAnnotation {
  decisions: Decision[];
  notes: string[];
  types: string[];
  recommended: string[];
  decidedAt: string[];
}

const emptyAnnotation = (): RowAnnotation => ({
  decisions: [],
  notes: [],
  types: [],
  recommended: [],
  decidedAt: [],
});

function annotateRows(
  side: Side,
  conflicts: ReportConflict[],
  decisions: DecisionRecord[],
): Map<number, RowAnnotation> {
  const decisionsById = new Map<string, DecisionRecord>();
  for (const d of decisions) {
    decisionsById.set(d.conflict_id, d);
  }
  const byRow = new Map<number, RowAnnotation>();
  for (const conflict of conflicts) {
    const rowIndex =
      side === "hubspot"
        ? conflict.hubspot_row_index
        : conflict.quickbooks_row_index;
    if (rowIndex === null) continue;
    const decision = decisionsById.get(conflict.conflict_id);
    if (!decision) continue;
    const annotation = byRow.get(rowIndex) ?? emptyAnnotation();
    annotation.decisions.push(decision.decision);
    annotation.notes.push(decision.notes ?? "");
    annotation.types.push(conflict.conflict_type);
    annotation.recommended.push(conflict.recommended_action);
    annotation.decidedAt.push(decision.decided_at);
    byRow.set(rowIndex, annotation);
  }
  return byRow;
}

function joinUnique(values: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.join(" | ");
}

export function buildAugmentedCsv({
  originalCsv,
  side,
  conflicts,
  decisions,
}: BuildAugmentedCsvInput): string {
  const parsed = Papa.parse<Record<string, string>>(originalCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data;
  const annotations = annotateRows(side, conflicts, decisions);

  const augmentedHeaders = [...headers, ...RECONCILIATION_COLUMNS];
  const augmentedRows = rows.map((row, index) => {
    const annotation = annotations.get(index);
    const augmented: Record<string, string> = { ...row };
    if (annotation) {
      augmented.Reconciliation_Decision = joinUnique(annotation.decisions);
      augmented.Reconciliation_Notes = joinUnique(annotation.notes);
      augmented.Conflict_Type = joinUnique(annotation.types);
      augmented.Recommended_Source_Of_Truth = joinUnique(annotation.recommended);
      augmented.Decided_At = joinUnique(annotation.decidedAt);
    } else {
      for (const col of RECONCILIATION_COLUMNS) augmented[col] = "";
    }
    return augmented;
  });

  return Papa.unparse(
    { fields: augmentedHeaders, data: augmentedRows },
    { newline: "\n" },
  );
}

export interface SummaryCsvInput {
  conflicts: ReportConflict[];
  decisions: DecisionRecord[];
  reportMeta: {
    id: string;
    created_at: string;
    hubspot_filename: string | null;
    quickbooks_filename: string | null;
  };
}

export function buildSummaryCsv({
  conflicts,
  decisions,
  reportMeta,
}: SummaryCsvInput): string {
  const decisionsById = new Map<string, DecisionRecord>();
  for (const d of decisions) decisionsById.set(d.conflict_id, d);

  const decisionCounts: Record<Decision | "UNRESOLVED", number> = {
    TRUST_HUBSPOT: 0,
    TRUST_QUICKBOOKS: 0,
    MANUAL_REVIEW: 0,
    IGNORE: 0,
    UNRESOLVED: 0,
  };
  const typeImpact: Record<string, { count: number; impact: number }> = {};
  let totalImpact = 0;
  let resolvedImpact = 0;

  for (const conflict of conflicts) {
    const decision = decisionsById.get(conflict.conflict_id);
    const bucket = decision ? decision.decision : "UNRESOLVED";
    decisionCounts[bucket]++;

    const impact = conflict.amount_at_risk_cents ?? 0;
    totalImpact += impact;
    if (decision && decision.decision !== "IGNORE") {
      resolvedImpact += impact;
    }

    const stats = typeImpact[conflict.conflict_type] ?? { count: 0, impact: 0 };
    stats.count++;
    stats.impact += impact;
    typeImpact[conflict.conflict_type] = stats;
  }

  const headerSection = [
    ["Crossbook reconciliation summary", ""],
    ["Report ID", reportMeta.id],
    ["Generated", new Date().toISOString()],
    ["Report created", reportMeta.created_at],
    ["HubSpot file", reportMeta.hubspot_filename ?? ""],
    ["QuickBooks file", reportMeta.quickbooks_filename ?? ""],
    [],
    ["Total conflicts", String(conflicts.length)],
    ["Total amount at risk", formatAmount(totalImpact)],
    ["Decisions covering amount at risk", formatAmount(resolvedImpact)],
    [],
    ["Decision", "Count"],
    ["TRUST_HUBSPOT", String(decisionCounts.TRUST_HUBSPOT)],
    ["TRUST_QUICKBOOKS", String(decisionCounts.TRUST_QUICKBOOKS)],
    ["MANUAL_REVIEW", String(decisionCounts.MANUAL_REVIEW)],
    ["IGNORE", String(decisionCounts.IGNORE)],
    ["UNRESOLVED", String(decisionCounts.UNRESOLVED)],
    [],
    ["Conflict type", "Count", "Amount at risk"],
  ];

  const typeRows = Object.entries(typeImpact)
    .sort((a, b) => b[1].impact - a[1].impact)
    .map(([type, stats]) => [type, String(stats.count), formatAmount(stats.impact)]);

  return Papa.unparse([...headerSection, ...typeRows], { newline: "\n" });
}
