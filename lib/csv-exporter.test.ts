import { describe, expect, it } from "vitest";

import {
  buildAugmentedCsv,
  buildSummaryCsv,
  type DecisionRecord,
} from "./csv-exporter";
import type { ReportConflict } from "./report-builder";

const HUBSPOT_CSV = `Company Name,Amount,Close Date
Acme Corp,12400,2026-04-01
Wayne Industries,25000,2026-04-05
`;

const QB_CSV = `Customer,Amount,Status
Acme Corp,12400,Paid
`;

const buildConflict = (
  overrides: Partial<ReportConflict> = {},
): ReportConflict => ({
  conflict_id: "c1",
  pair_index: 0,
  source: "CLAUDE",
  pattern_key: null,
  hubspot_row_index: 0,
  quickbooks_row_index: 0,
  hubspot_company: "Acme Corp",
  quickbooks_company: "Acme Corp",
  field: "amount",
  hubspot_value: "$12,400",
  quickbooks_value: "$12,400",
  explanation: "x",
  recommended_action: "TRUST_HUBSPOT",
  priority: "MEDIUM",
  amount_at_risk_cents: 1240000,
  confidence: 0.9,
  conflict_type: "AMOUNT",
  ...overrides,
});

const sampleDecision = (
  conflictId: string,
  decision: DecisionRecord["decision"] = "TRUST_HUBSPOT",
  notes: string | null = null,
): DecisionRecord => ({
  conflict_id: conflictId,
  decision,
  notes,
  decided_at: "2026-05-12T12:00:00.000Z",
});

describe("buildAugmentedCsv (hubspot)", () => {
  it("appends 5 reconciliation columns and fills the row with a decision", () => {
    const conflicts = [buildConflict({ conflict_id: "c1" })];
    const csv = buildAugmentedCsv({
      originalCsv: HUBSPOT_CSV,
      side: "hubspot",
      conflicts,
      decisions: [sampleDecision("c1", "TRUST_HUBSPOT", "looks right")],
    });
    const header = csv.split("\n")[0];
    expect(header).toContain("Reconciliation_Decision");
    expect(header).toContain("Reconciliation_Notes");
    expect(header).toContain("Conflict_Type");
    expect(header).toContain("Recommended_Source_Of_Truth");
    expect(header).toContain("Decided_At");
    const acmeRow = csv.split("\n").find((line) => line.startsWith("Acme Corp,"));
    expect(acmeRow).toBeDefined();
    expect(acmeRow).toContain("TRUST_HUBSPOT");
    expect(acmeRow).toContain("looks right");
    expect(acmeRow).toContain("AMOUNT");
  });

  it("leaves untouched rows with empty reconciliation columns", () => {
    const conflicts = [buildConflict({ conflict_id: "c1", hubspot_row_index: 0 })];
    const csv = buildAugmentedCsv({
      originalCsv: HUBSPOT_CSV,
      side: "hubspot",
      conflicts,
      decisions: [sampleDecision("c1")],
    });
    const wayneRow = csv
      .split("\n")
      .find((line) => line.startsWith("Wayne Industries,"));
    expect(wayneRow).toBeDefined();
    expect(wayneRow!.endsWith(",,,,,")).toBe(true);
  });

  it("joins multi-conflict rows with ' | ' separator", () => {
    const conflicts = [
      buildConflict({ conflict_id: "c1", conflict_type: "AMOUNT" }),
      buildConflict({ conflict_id: "c2", conflict_type: "DATE" }),
    ];
    const decisions: DecisionRecord[] = [
      sampleDecision("c1", "TRUST_HUBSPOT", "note1"),
      sampleDecision("c2", "IGNORE", "note2"),
    ];
    const csv = buildAugmentedCsv({
      originalCsv: HUBSPOT_CSV,
      side: "hubspot",
      conflicts,
      decisions,
    });
    const acmeRow = csv.split("\n").find((line) => line.startsWith("Acme Corp,"));
    expect(acmeRow).toContain("TRUST_HUBSPOT | IGNORE");
    expect(acmeRow).toContain("AMOUNT | DATE");
    expect(acmeRow).toContain("note1 | note2");
  });

  it("skips decisions for rows without a hubspot_row_index", () => {
    const conflicts = [buildConflict({ conflict_id: "c1", hubspot_row_index: null })];
    const csv = buildAugmentedCsv({
      originalCsv: HUBSPOT_CSV,
      side: "hubspot",
      conflicts,
      decisions: [sampleDecision("c1")],
    });
    const acmeRow = csv.split("\n").find((line) => line.startsWith("Acme Corp,"));
    expect(acmeRow!.endsWith(",,,,,")).toBe(true);
  });
});

describe("buildAugmentedCsv (quickbooks)", () => {
  it("indexes off quickbooks_row_index when side=quickbooks", () => {
    const conflicts = [
      buildConflict({
        conflict_id: "c1",
        hubspot_row_index: 0,
        quickbooks_row_index: 0,
      }),
    ];
    const csv = buildAugmentedCsv({
      originalCsv: QB_CSV,
      side: "quickbooks",
      conflicts,
      decisions: [sampleDecision("c1", "TRUST_QUICKBOOKS")],
    });
    const acmeRow = csv.split("\n").find((line) => line.startsWith("Acme Corp,"));
    expect(acmeRow).toContain("TRUST_QUICKBOOKS");
  });
});

describe("buildSummaryCsv", () => {
  it("produces decision counts + type impact breakdown", () => {
    const conflicts = [
      buildConflict({
        conflict_id: "c1",
        conflict_type: "AMOUNT",
        amount_at_risk_cents: 100000,
      }),
      buildConflict({
        conflict_id: "c2",
        conflict_type: "AMOUNT",
        amount_at_risk_cents: 50000,
      }),
      buildConflict({
        conflict_id: "c3",
        conflict_type: "DATE",
        amount_at_risk_cents: null,
      }),
    ];
    const decisions: DecisionRecord[] = [
      sampleDecision("c1", "TRUST_HUBSPOT"),
      sampleDecision("c2", "IGNORE"),
    ];
    const csv = buildSummaryCsv({
      conflicts,
      decisions,
      reportMeta: {
        id: "report-1",
        created_at: "2026-05-12T00:00:00.000Z",
        hubspot_filename: "hs.csv",
        quickbooks_filename: "qb.csv",
      },
    });
    expect(csv).toContain("Crossbook reconciliation summary");
    expect(csv).toContain("Total conflicts,3");
    expect(csv).toContain("TRUST_HUBSPOT,1");
    expect(csv).toContain("IGNORE,1");
    expect(csv).toContain("UNRESOLVED,1");
    expect(csv).toContain("AMOUNT,2");
    expect(csv).toContain("DATE,1");
    expect(csv).toContain("report-1");
  });
});
