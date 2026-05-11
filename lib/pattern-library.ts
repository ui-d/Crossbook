import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { MatchPair } from "./conflict-scorer";
import { scoreName } from "./conflict-scorer";
import type { NormalizedRecord } from "./normalize-record";

export type RecommendedAction =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

export type ConflictType =
  | "AMOUNT"
  | "STATUS"
  | "MISSING"
  | "DUPLICATE"
  | "DATE"
  | "CURRENCY"
  | "EMAIL"
  | "NAME"
  | "TAX_ID";

export type DetectionSignature =
  | {
      kind: "amount_ratio";
      ratio_min: number;
      ratio_max: number;
      requires_match: boolean;
    }
  | { kind: "orphan_hubspot"; hubspot_stage_eq?: string }
  | {
      kind: "name_normalized_match";
      min_name_score: number;
      requires_email_match: boolean;
    }
  | { kind: "amount_match_currency_format_diff"; min_amount_score: number }
  | { kind: "tax_id_qbo_only"; tax_id_regex: string }
  | {
      kind: "multi_qbo_match_amount_sum";
      min_invoice_count: number;
      sum_within_pct: number;
    }
  | { kind: "qbo_name_contains"; delimiter: string }
  | { kind: "date_score_full_credit"; raw_strings_differ: boolean }
  | {
      kind: "status_mismatch";
      hubspot_stage_eq?: string;
      qbo_status_in?: string[];
    }
  | {
      kind: "missing_field";
      field: "company" | "email" | "tax_id" | "amount";
      side: "HUBSPOT" | "QUICKBOOKS";
    };

export interface PatternDefinition {
  pattern_key: string;
  pattern_name: string;
  detection_signature: DetectionSignature;
  explanation_template: string;
  recommended_action: RecommendedAction;
  confidence_floor: number;
}

export interface PatternMatch {
  pattern_key: string;
  pattern_name: string;
  recommended_action: RecommendedAction;
  explanation: string;
  confidence: number;
  conflict_type: ConflictType;
  pair_index: number;
  hubspot_row_index: number | null;
  quickbooks_row_index: number | null;
}

export interface MatchResult {
  matches: PatternMatch[];
  handled_pair_indexes: Set<number>;
}

const PATTERN_TO_CONFLICT_TYPE: Record<DetectionSignature["kind"], ConflictType> = {
  amount_ratio: "AMOUNT",
  orphan_hubspot: "MISSING",
  name_normalized_match: "NAME",
  amount_match_currency_format_diff: "CURRENCY",
  tax_id_qbo_only: "TAX_ID",
  multi_qbo_match_amount_sum: "AMOUNT",
  qbo_name_contains: "NAME",
  date_score_full_credit: "DATE",
  status_mismatch: "STATUS",
  missing_field: "MISSING",
};

const PATTERN_LIBRARY_PATH = join(
  process.cwd(),
  "data",
  "pattern-library.json",
);

export function loadPatternLibrary(): PatternDefinition[] {
  const raw = readFileSync(PATTERN_LIBRARY_PATH, "utf8");
  return JSON.parse(raw) as PatternDefinition[];
}

function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

function formatCents(cents: number | null): string {
  if (cents === null) return "?";
  return (cents / 100).toLocaleString(undefined, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateIso(date: Date | null): string {
  if (!date) return "?";
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildMatch(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
  vars: Record<string, string | number | null | undefined>,
  confidence: number,
): PatternMatch {
  return {
    pattern_key: pattern.pattern_key,
    pattern_name: pattern.pattern_name,
    recommended_action: pattern.recommended_action,
    explanation: renderTemplate(pattern.explanation_template, vars),
    confidence,
    conflict_type: PATTERN_TO_CONFLICT_TYPE[pattern.detection_signature.kind],
    pair_index: pairIndex,
    hubspot_row_index: pair.hubspot_record?.source_row_index ?? null,
    quickbooks_row_index: pair.quickbooks_record?.source_row_index ?? null,
  };
}

function detectAmountRatio(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "amount_ratio") return null;
  const h = pair.hubspot_record;
  const q = pair.quickbooks_record;
  if (!h || !q) return null;
  if (h.amount_cents === null || q.amount_cents === null) return null;
  if (h.amount_cents <= 0) return null;
  const ratio = q.amount_cents / h.amount_cents;
  if (ratio < sig.ratio_min || ratio > sig.ratio_max) return null;
  if (sig.requires_match && pair.match_confidence < pattern.confidence_floor) {
    return null;
  }
  const pct = Math.round(ratio * 100);
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      hubspot_amount: `${h.currency} ${formatCents(h.amount_cents)}`,
      qbo_amount: `${q.currency} ${formatCents(q.amount_cents)}`,
      pct,
    },
    pattern.confidence_floor,
  );
}

function detectOrphanHubspot(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "orphan_hubspot") return null;
  const h = pair.hubspot_record;
  if (!h || pair.quickbooks_record !== null) return null;
  if (sig.hubspot_stage_eq) {
    const stage = (h.status ?? "").toLowerCase();
    if (stage !== sig.hubspot_stage_eq.toLowerCase()) return null;
  }
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      deal_name: h.company_name_raw || "?",
      close_date: formatDateIso(h.date),
      amount: `${h.currency} ${formatCents(h.amount_cents)}`,
    },
    pattern.confidence_floor,
  );
}

function detectNameLegalSuffix(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "name_normalized_match") return null;
  const h = pair.hubspot_record;
  const q = pair.quickbooks_record;
  if (!h || !q) return null;
  const nameScore = scoreName(
    h.company_name_normalized,
    q.company_name_normalized,
  );
  if (nameScore < sig.min_name_score) return null;
  if (h.company_name_raw === q.company_name_raw) return null; // raw must differ
  if (sig.requires_email_match) {
    if (!h.email || !q.email || h.email !== q.email) {
      const sameDomain =
        h.email && q.email && h.email.split("@")[1] === q.email.split("@")[1];
      if (!sameDomain) return null;
    }
  }
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      hubspot_name: h.company_name_raw,
      qbo_name: q.company_name_raw,
    },
    Math.max(pattern.confidence_floor, nameScore),
  );
}

function detectCurrencyFormatDiff(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "amount_match_currency_format_diff") return null;
  const h = pair.hubspot_record;
  const q = pair.quickbooks_record;
  if (!h || !q) return null;
  if (pair.match_signals.amount_score < sig.min_amount_score) return null;
  if (h.amount_cents !== q.amount_cents) return null;
  if (h.currency !== q.currency) return null;
  if ((h.amount_raw ?? "") === (q.amount_raw ?? "")) return null;
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      hubspot_currency: h.amount_raw ?? "?",
      qbo_currency: q.amount_raw ?? "?",
    },
    pattern.confidence_floor,
  );
}

function detectQboSubcustomer(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "qbo_name_contains") return null;
  const q = pair.quickbooks_record;
  if (!q) return null;
  if (!q.company_name_raw.includes(sig.delimiter)) return null;
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      qbo_name: q.company_name_raw,
    },
    pattern.confidence_floor,
  );
}

function detectDateFormatOnly(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "date_score_full_credit") return null;
  const h = pair.hubspot_record;
  const q = pair.quickbooks_record;
  if (!h || !q) return null;
  if (!h.date || !q.date) return null;
  // Same calendar date required — date_score=1 isn't enough (90-day window).
  if (h.date.getTime() !== q.date.getTime()) return null;
  if (sig.raw_strings_differ) {
    if ((h.date_raw ?? "") === (q.date_raw ?? "")) return null;
  }
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      hubspot_date: h.date_raw ?? "?",
      qbo_date: q.date_raw ?? "?",
      iso_date: formatDateIso(h.date),
    },
    pattern.confidence_floor,
  );
}

function detectStatusMismatch(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "status_mismatch") return null;
  const h = pair.hubspot_record;
  const q = pair.quickbooks_record;
  if (!h || !q) return null;
  if (sig.hubspot_stage_eq) {
    const stage = (h.status ?? "").toLowerCase();
    if (stage !== sig.hubspot_stage_eq.toLowerCase()) return null;
  }
  if (sig.qbo_status_in) {
    const status = (q.status ?? "").toLowerCase();
    const wanted = sig.qbo_status_in.map((s) => s.toLowerCase());
    if (!wanted.includes(status)) return null;
  }
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      qbo_status: q.status ?? "?",
    },
    pattern.confidence_floor,
  );
}

function detectMissingField(
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
): PatternMatch | null {
  const sig = pattern.detection_signature;
  if (sig.kind !== "missing_field") return null;
  const subject =
    sig.side === "HUBSPOT" ? pair.hubspot_record : pair.quickbooks_record;
  const other =
    sig.side === "HUBSPOT" ? pair.quickbooks_record : pair.hubspot_record;
  if (!subject || !other) return null;
  let missing = false;
  switch (sig.field) {
    case "company":
      missing = subject.company_name_raw.trim() === "";
      break;
    case "email":
      missing = !subject.email;
      break;
    case "amount":
      missing = subject.amount_cents === null;
      break;
    case "tax_id":
      return null; // tax_id not in NormalizedRecord; deferred
  }
  if (!missing) return null;
  return buildMatch(
    pattern,
    pair,
    pairIndex,
    {
      deal_name: pair.hubspot_record?.company_name_raw ?? "?",
      email: pair.hubspot_record?.email ?? "?",
      qbo_name: pair.quickbooks_record?.company_name_raw ?? "?",
    },
    pattern.confidence_floor,
  );
}

type Detector = (
  pattern: PatternDefinition,
  pair: MatchPair,
  pairIndex: number,
) => PatternMatch | null;

const DETECTORS: Record<DetectionSignature["kind"], Detector | null> = {
  amount_ratio: detectAmountRatio,
  orphan_hubspot: detectOrphanHubspot,
  name_normalized_match: detectNameLegalSuffix,
  amount_match_currency_format_diff: detectCurrencyFormatDiff,
  qbo_name_contains: detectQboSubcustomer,
  date_score_full_credit: detectDateFormatOnly,
  status_mismatch: detectStatusMismatch,
  missing_field: detectMissingField,
  tax_id_qbo_only: null, // requires tax_id column; deferred
  multi_qbo_match_amount_sum: null, // requires N-to-1 match support; deferred
};

export function matchPatterns(
  pairs: MatchPair[],
  patterns: PatternDefinition[] = loadPatternLibrary(),
): MatchResult {
  const matches: PatternMatch[] = [];
  const handled = new Set<number>();

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    for (const pattern of patterns) {
      const detector = DETECTORS[pattern.detection_signature.kind];
      if (!detector) continue;
      const result = detector(pattern, pair, i);
      if (result) {
        matches.push(result);
        handled.add(i);
      }
    }
  }

  return { matches, handled_pair_indexes: handled };
}

export type { NormalizedRecord };
