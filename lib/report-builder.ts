import type { AnalysisResult, Conflict as ClaudeConflict } from "./claude";
import type { MatchPair } from "./conflict-scorer";
import type { NormalizedRecord } from "./normalize-record";
import type {
  ConflictType,
  PatternMatch,
  RecommendedAction,
} from "./pattern-library";

export type ConflictSource = "PATTERN" | "CLAUDE";

export interface ReportConflict {
  conflict_id: string;
  pair_index: number;
  source: ConflictSource;
  pattern_key: string | null;
  hubspot_row_index: number | null;
  quickbooks_row_index: number | null;
  hubspot_company: string | null;
  quickbooks_company: string | null;
  field: string;
  hubspot_value: string | null;
  quickbooks_value: string | null;
  explanation: string;
  recommended_action: RecommendedAction;
  priority: "HIGH" | "MEDIUM" | "LOW";
  amount_at_risk_cents: number | null;
  confidence: number;
  conflict_type: ConflictType;
}

export interface ReportSummary {
  total_records_hubspot: number;
  total_records_quickbooks: number;
  total_pairs_analyzed: number;
  total_conflicts: number;
  high_priority_conflicts: number;
  total_amount_at_risk_cents: number;
  pattern_match_count: number;
  claude_analyzed_count: number;
  missing_qbo_invoices: number;
  orphan_quickbooks: number;
}

export interface BuiltReport {
  summary: ReportSummary;
  conflicts: ReportConflict[];
}

const PATTERN_PRIORITY_BY_ACTION: Record<RecommendedAction, "HIGH" | "MEDIUM" | "LOW"> = {
  TRUST_HUBSPOT: "LOW",
  TRUST_QUICKBOOKS: "LOW",
  MANUAL_REVIEW: "HIGH",
  IGNORE: "LOW",
};

function deriveAmountAtRisk(
  pair: MatchPair | undefined,
  conflictType: ConflictType,
): number | null {
  if (!pair) return null;
  if (conflictType !== "AMOUNT" && conflictType !== "CURRENCY") return null;
  const h = pair.hubspot_record?.amount_cents ?? null;
  const q = pair.quickbooks_record?.amount_cents ?? null;
  if (h === null && q === null) return null;
  if (h === null) return q;
  if (q === null) return h;
  return Math.abs(h - q);
}

function companyName(record: NormalizedRecord | null): string | null {
  return record?.company_name_raw ?? null;
}

function patternToConflict(
  match: PatternMatch,
  pair: MatchPair | undefined,
  conflictIndex: number,
): ReportConflict {
  const amountAtRisk = deriveAmountAtRisk(pair, match.conflict_type);
  return {
    conflict_id: `pat-${match.pattern_key}-${conflictIndex}`,
    pair_index: match.pair_index,
    source: "PATTERN",
    pattern_key: match.pattern_key,
    hubspot_row_index: match.hubspot_row_index,
    quickbooks_row_index: match.quickbooks_row_index,
    hubspot_company: companyName(pair?.hubspot_record ?? null),
    quickbooks_company: companyName(pair?.quickbooks_record ?? null),
    field: match.conflict_type.toLowerCase(),
    hubspot_value: null,
    quickbooks_value: null,
    explanation: match.explanation,
    recommended_action: match.recommended_action,
    priority: PATTERN_PRIORITY_BY_ACTION[match.recommended_action],
    amount_at_risk_cents: amountAtRisk,
    confidence: match.confidence,
    conflict_type: match.conflict_type,
  };
}

function claudeToConflict(
  result: AnalysisResult,
  conflict: ClaudeConflict,
  pair: MatchPair | undefined,
  conflictIndex: number,
): ReportConflict {
  return {
    conflict_id: `clu-${result.pair_index}-${conflictIndex}`,
    pair_index: result.pair_index,
    source: "CLAUDE",
    pattern_key: null,
    hubspot_row_index: conflict.hubspot_row_index,
    quickbooks_row_index: conflict.quickbooks_row_index,
    hubspot_company: companyName(pair?.hubspot_record ?? null),
    quickbooks_company: companyName(pair?.quickbooks_record ?? null),
    field: conflict.field,
    hubspot_value: conflict.hubspot_value,
    quickbooks_value: conflict.quickbooks_value,
    explanation: conflict.explanation,
    recommended_action: conflict.recommended_action,
    priority: conflict.priority,
    amount_at_risk_cents: conflict.amount_at_risk_cents,
    confidence: conflict.confidence,
    conflict_type: conflict.conflict_type,
  };
}

const PRIORITY_ORDER: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

interface BuildReportInput {
  hubspot_records: NormalizedRecord[];
  quickbooks_records: NormalizedRecord[];
  pairs: MatchPair[];
  pattern_matches: PatternMatch[];
  claude_results: AnalysisResult[];
}

export function buildReport(input: BuildReportInput): BuiltReport {
  const conflicts: ReportConflict[] = [];
  let index = 0;
  for (const match of input.pattern_matches) {
    const pair = input.pairs[match.pair_index];
    conflicts.push(patternToConflict(match, pair, index++));
  }
  for (const result of input.claude_results) {
    const pair = input.pairs[result.pair_index];
    for (const conflict of result.conflicts) {
      conflicts.push(claudeToConflict(result, conflict, pair, index++));
    }
  }

  conflicts.sort((a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    return (b.amount_at_risk_cents ?? 0) - (a.amount_at_risk_cents ?? 0);
  });

  const summary: ReportSummary = {
    total_records_hubspot: input.hubspot_records.length,
    total_records_quickbooks: input.quickbooks_records.length,
    total_pairs_analyzed: input.pairs.length,
    total_conflicts: conflicts.length,
    high_priority_conflicts: conflicts.filter((c) => c.priority === "HIGH").length,
    total_amount_at_risk_cents: conflicts.reduce(
      (sum, c) => sum + (c.amount_at_risk_cents ?? 0),
      0,
    ),
    pattern_match_count: input.pattern_matches.length,
    claude_analyzed_count: input.claude_results.length,
    missing_qbo_invoices: input.pairs.filter(
      (p) => p.hubspot_record !== null && p.quickbooks_record === null,
    ).length,
    orphan_quickbooks: input.pairs.filter(
      (p) => p.hubspot_record === null && p.quickbooks_record !== null,
    ).length,
  };

  return { summary, conflicts };
}

export function formatAmount(cents: number | null, currency = "USD"): string {
  if (cents === null) return "—";
  const value = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
