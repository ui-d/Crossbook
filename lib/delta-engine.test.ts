import { describe, expect, it } from "vitest";

import {
  computeDelta,
  conflictFingerprint,
  type PriorDecisionRecord,
} from "./delta-engine";
import type { BuiltReport, ReportConflict } from "./report-builder";

const buildConflict = (
  overrides: Partial<ReportConflict> = {},
): ReportConflict => ({
  conflict_id: "fixture-1",
  pair_index: 0,
  source: "CLAUDE",
  pattern_key: null,
  hubspot_row_index: 0,
  quickbooks_row_index: 0,
  hubspot_company: "Acme Corp",
  quickbooks_company: "Acme Corp",
  field: "amount",
  hubspot_value: "$10,000",
  quickbooks_value: "$8,000",
  explanation: "x",
  recommended_action: "MANUAL_REVIEW",
  priority: "HIGH",
  amount_at_risk_cents: 200000,
  confidence: 0.9,
  conflict_type: "AMOUNT",
  ...overrides,
});

const buildReport = (
  conflicts: ReportConflict[],
): BuiltReport => ({
  summary: {
    total_records_hubspot: 1,
    total_records_quickbooks: 1,
    total_pairs_analyzed: 1,
    total_conflicts: conflicts.length,
    high_priority_conflicts: conflicts.filter((c) => c.priority === "HIGH").length,
    total_amount_at_risk_cents: conflicts.reduce(
      (sum, c) => sum + (c.amount_at_risk_cents ?? 0),
      0,
    ),
    pattern_match_count: 0,
    claude_analyzed_count: conflicts.length,
    missing_qbo_invoices: 0,
    orphan_quickbooks: 0,
  },
  conflicts,
});

describe("conflictFingerprint", () => {
  it("is stable for same company + type + field across reports", () => {
    const a = buildConflict({ amount_at_risk_cents: 100 });
    const b = buildConflict({ amount_at_risk_cents: 999 });
    expect(conflictFingerprint(a)).toBe(conflictFingerprint(b));
  });

  it("differs by conflict_type", () => {
    expect(
      conflictFingerprint(buildConflict({ conflict_type: "AMOUNT" })),
    ).not.toBe(conflictFingerprint(buildConflict({ conflict_type: "CURRENCY" })));
  });

  it("differs by company name", () => {
    expect(
      conflictFingerprint(buildConflict({ hubspot_company: "Acme" })),
    ).not.toBe(conflictFingerprint(buildConflict({ hubspot_company: "Globex" })));
  });

  it("normalizes case + whitespace", () => {
    expect(
      conflictFingerprint(buildConflict({ hubspot_company: "  ACME CORP " })),
    ).toBe(conflictFingerprint(buildConflict({ hubspot_company: "acme corp" })));
  });

  it("falls back to quickbooks_company when hubspot is null", () => {
    const fp = conflictFingerprint(
      buildConflict({ hubspot_company: null, quickbooks_company: "Acme" }),
    );
    expect(fp).toContain("acme");
  });

  it("uses 'unknown' when both companies are null", () => {
    const fp = conflictFingerprint(
      buildConflict({ hubspot_company: null, quickbooks_company: null }),
    );
    expect(fp.startsWith("unknown::")).toBe(true);
  });
});

describe("computeDelta", () => {
  it("classifies new, resolved, and persistent conflicts by fingerprint", () => {
    const persistent = buildConflict({
      conflict_id: "p1",
      hubspot_company: "Acme",
      quickbooks_company: "Acme",
      conflict_type: "AMOUNT",
      amount_at_risk_cents: 200000,
    });
    const resolved = buildConflict({
      conflict_id: "r1",
      hubspot_company: "Globex",
      quickbooks_company: "Globex",
      conflict_type: "DATE",
      amount_at_risk_cents: null,
    });
    const newOne = buildConflict({
      conflict_id: "n1",
      hubspot_company: "Initech",
      quickbooks_company: "Initech",
      conflict_type: "CURRENCY",
      amount_at_risk_cents: 50000,
    });

    const delta = computeDelta({
      prior_report_id: "prior",
      prior_created_at: "2026-04-01T00:00:00.000Z",
      prior_report: buildReport([persistent, resolved]),
      current_created_at: "2026-05-01T00:00:00.000Z",
      current_report: buildReport([persistent, newOne]),
    });

    expect(delta.conflicts.persistent_conflicts).toHaveLength(1);
    expect(delta.conflicts.persistent_conflicts[0].conflict_id).toBe("p1");
    expect(delta.conflicts.resolved_conflicts).toHaveLength(1);
    expect(delta.conflicts.resolved_conflicts[0].conflict_id).toBe("r1");
    expect(delta.conflicts.new_conflicts).toHaveLength(1);
    expect(delta.conflicts.new_conflicts[0].conflict_id).toBe("n1");

    expect(delta.summary.new_at_risk_cents).toBe(50000);
    expect(delta.summary.resolved_at_risk_cents).toBe(0);
    expect(delta.summary.net_change_cents).toBe(50000);
    expect(delta.summary.days_between).toBe(30);
  });

  it("computes resolved_at_risk_cents from prior conflicts", () => {
    const resolved = buildConflict({
      conflict_id: "r1",
      hubspot_company: "Globex",
      quickbooks_company: "Globex",
      conflict_type: "AMOUNT",
      amount_at_risk_cents: 100000,
    });
    const delta = computeDelta({
      prior_report_id: "p",
      prior_created_at: "2026-04-01T00:00:00.000Z",
      prior_report: buildReport([resolved]),
      current_created_at: "2026-05-01T00:00:00.000Z",
      current_report: buildReport([]),
    });
    expect(delta.summary.resolved_at_risk_cents).toBe(100000);
    expect(delta.summary.net_change_cents).toBe(-100000);
  });

  it("flags a decision override when the user trusted X but conflict still appears", () => {
    const trustHubspot = buildConflict({
      conflict_id: "t1",
      hubspot_company: "Acme",
      quickbooks_company: "Acme",
      conflict_type: "AMOUNT",
      hubspot_value: "$10,000",
      quickbooks_value: "$8,000",
    });
    const fp = conflictFingerprint(trustHubspot);
    const priorDecisions: PriorDecisionRecord[] = [
      { fingerprint: fp, decision: "TRUST_HUBSPOT" },
    ];
    const delta = computeDelta({
      prior_report_id: "p",
      prior_created_at: "2026-04-01T00:00:00.000Z",
      prior_report: buildReport([trustHubspot]),
      current_created_at: "2026-05-01T00:00:00.000Z",
      current_report: buildReport([trustHubspot]),
      prior_decisions: priorDecisions,
    });
    expect(delta.overrides).toHaveLength(1);
    expect(delta.overrides[0].prior_decision).toBe("TRUST_HUBSPOT");
    expect(delta.overrides[0].current_state).toBe("STILL_PRESENT");
  });

  it("override current_state=FIELDS_CHANGED when underlying values differ", () => {
    const prior = buildConflict({
      hubspot_value: "$10,000",
      quickbooks_value: "$8,000",
    });
    const current = buildConflict({
      hubspot_value: "$10,000",
      quickbooks_value: "$9,500",
    });
    const fp = conflictFingerprint(prior);
    const delta = computeDelta({
      prior_report_id: "p",
      prior_created_at: "2026-04-01T00:00:00.000Z",
      prior_report: buildReport([prior]),
      current_created_at: "2026-05-01T00:00:00.000Z",
      current_report: buildReport([current]),
      prior_decisions: [{ fingerprint: fp, decision: "TRUST_HUBSPOT" }],
    });
    expect(delta.overrides[0].current_state).toBe("FIELDS_CHANGED");
  });

  it("ignores MANUAL_REVIEW and IGNORE in override detection", () => {
    const conflict = buildConflict();
    const fp = conflictFingerprint(conflict);
    const delta = computeDelta({
      prior_report_id: "p",
      prior_created_at: "2026-04-01T00:00:00.000Z",
      prior_report: buildReport([conflict]),
      current_created_at: "2026-05-01T00:00:00.000Z",
      current_report: buildReport([conflict]),
      prior_decisions: [
        { fingerprint: fp, decision: "MANUAL_REVIEW" },
        { fingerprint: fp, decision: "IGNORE" },
      ],
    });
    expect(delta.overrides).toHaveLength(0);
  });

  it("days_between never negative", () => {
    const delta = computeDelta({
      prior_report_id: "p",
      prior_created_at: "2026-05-01T00:00:00.000Z",
      prior_report: buildReport([]),
      current_created_at: "2026-04-01T00:00:00.000Z",
      current_report: buildReport([]),
    });
    expect(delta.summary.days_between).toBe(0);
  });
});
