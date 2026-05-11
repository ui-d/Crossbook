import { describe, expect, it } from "vitest";

import type { MatchPair, MatchSignals } from "./conflict-scorer";
import { findCandidatePairs } from "./conflict-scorer";
import type { NormalizedRecord } from "./normalize-record";
import {
  loadPatternLibrary,
  matchPatterns,
  type PatternDefinition,
  type PatternMatch,
} from "./pattern-library";
import { listFixtures, loadFixture } from "./test-utils/fixtures";

const zeroSignals: MatchSignals = {
  name_score: 0,
  email_score: 0,
  amount_score: 0,
  date_score: 0,
  combined: 0,
};

const buildRecord = (overrides: Partial<NormalizedRecord> = {}): NormalizedRecord => ({
  source: "HUBSPOT",
  source_row_index: 0,
  company_name_raw: "Acme",
  company_name_normalized: "acme",
  amount_raw: "10000",
  amount_cents: 1000000,
  currency: "USD",
  email: "a@b.com",
  status: null,
  date_raw: "2026-01-01",
  date: new Date("2026-01-01T00:00:00Z"),
  raw: {},
  ...overrides,
});

const buildPair = (overrides: Partial<MatchPair> = {}): MatchPair => ({
  hubspot_record: buildRecord(),
  quickbooks_record: buildRecord({ source: "QUICKBOOKS" }),
  match_confidence: 1,
  match_signals: { ...zeroSignals, combined: 1 },
  ...overrides,
});

describe("loadPatternLibrary", () => {
  it("loads 10 patterns from data/pattern-library.json", () => {
    const patterns = loadPatternLibrary();
    expect(patterns.length).toBe(10);
  });

  it("every pattern has required fields", () => {
    const patterns = loadPatternLibrary();
    for (const pattern of patterns) {
      expect(pattern.pattern_key).toBeTruthy();
      expect(pattern.pattern_name).toBeTruthy();
      expect(pattern.explanation_template).toContain("{");
      expect(["TRUST_HUBSPOT", "TRUST_QUICKBOOKS", "MANUAL_REVIEW", "IGNORE"])
        .toContain(pattern.recommended_action);
      expect(pattern.detection_signature.kind).toBeTruthy();
    }
  });
});

describe("matchPatterns on fixtures", () => {
  const expectedHits: Record<string, string[]> = {
    "01_clean_match_email_diff": [],
    "02_legal_suffix_only": ["name_legal_suffix_only"],
    "03_missing_qbo_invoice": ["closed_won_no_qbo_invoice"],
    "04_thirty_percent_partial_payment": [],
    "05_currency_format_only": ["currency_symbol_vs_code_mismatch"],
    "06_polish_nip_in_qbo_only": [],
    "07_diacritic_match": ["name_legal_suffix_only"],
    "08_polish_date_format": [
      "name_legal_suffix_only",
      "date_format_only_mismatch",
    ],
    "09_currency_real_mismatch_eur_vs_usd": [],
    "10_currency_real_mismatch_gbp_vs_usd": [],
  };

  const ids = listFixtures();

  it.each(ids)("fixture %i: patterns match the expected set", (id) => {
    const fixture = loadFixture(id);
    const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
    const result = matchPatterns(pairs);

    const actualKeys = new Set(result.matches.map((m: PatternMatch) => m.pattern_key));
    const expected = expectedHits[fixture.caseId] ?? [];

    for (const key of expected) {
      expect(
        actualKeys.has(key),
        `${fixture.caseId} expected pattern '${key}' to match. Got: ${[...actualKeys].join(", ") || "(none)"}`,
      ).toBe(true);
    }
  });

  it("library hits >40% of fixtures (definition of done)", () => {
    let fixturesWithPatternHit = 0;
    for (const id of ids) {
      const fixture = loadFixture(id);
      const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
      const result = matchPatterns(pairs);
      if (result.matches.length > 0) fixturesWithPatternHit++;
    }
    const hitRate = fixturesWithPatternHit / ids.length;
    expect(hitRate).toBeGreaterThan(0.4);
  });

  it("template rendering substitutes placeholders", () => {
    const fixture = loadFixture(2); // legal_suffix_only
    const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
    const result = matchPatterns(pairs);
    const suffixMatch = result.matches.find(
      (m) => m.pattern_key === "name_legal_suffix_only",
    );
    expect(suffixMatch).toBeDefined();
    expect(suffixMatch!.explanation).toContain("Globex Corporation");
    expect(suffixMatch!.explanation).toContain("Globex Inc");
    expect(suffixMatch!.explanation).not.toContain("{hubspot_name}");
  });

  it("renders currency-format pattern with raw amount strings", () => {
    const fixture = loadFixture(5); // currency_format_only
    const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
    const result = matchPatterns(pairs);
    const currencyMatch = result.matches.find(
      (m) => m.pattern_key === "currency_symbol_vs_code_mismatch",
    );
    expect(currencyMatch).toBeDefined();
    expect(currencyMatch!.explanation).toMatch(/\$10,000\.00/);
    expect(currencyMatch!.explanation).toContain("USD 10000");
  });

  it("orphan hubspot pattern carries hubspot row index, null QBO index", () => {
    const fixture = loadFixture(3); // missing_qbo_invoice
    const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
    const result = matchPatterns(pairs);
    const orphanMatch = result.matches.find(
      (m) => m.pattern_key === "closed_won_no_qbo_invoice",
    );
    expect(orphanMatch).toBeDefined();
    expect(orphanMatch!.hubspot_row_index).toBe(1); // Wayne Industries
    expect(orphanMatch!.quickbooks_row_index).toBeNull();
  });

  it("handled_pair_indexes reports which pairs library handled", () => {
    const fixture = loadFixture(2);
    const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
    const result = matchPatterns(pairs);
    expect(result.handled_pair_indexes.size).toBeGreaterThan(0);
  });
});

describe("detector negative paths", () => {
  const patterns = loadPatternLibrary();

  const get = (key: string): PatternDefinition => {
    const pattern = patterns.find((p) => p.pattern_key === key);
    if (!pattern) throw new Error(`pattern ${key} missing`);
    return pattern;
  };

  it("amount_ratio: no match when one side has null amount", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ amount_cents: null }),
    });
    const result = matchPatterns([pair], [get("qbo_invoice_70pct_of_hubspot_deal")]);
    expect(result.matches.length).toBe(0);
  });

  it("amount_ratio: no match when ratio outside band", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ amount_cents: 1000000 }),
      quickbooks_record: buildRecord({
        source: "QUICKBOOKS",
        amount_cents: 100000,
      }),
    });
    const result = matchPatterns([pair], [get("qbo_invoice_70pct_of_hubspot_deal")]);
    expect(result.matches.length).toBe(0);
  });

  it("amount_ratio: hits when ratio in band and confidence above floor", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ amount_cents: 1000000 }),
      quickbooks_record: buildRecord({
        source: "QUICKBOOKS",
        amount_cents: 700000,
      }),
      match_confidence: 0.9,
    });
    const result = matchPatterns([pair], [get("qbo_invoice_70pct_of_hubspot_deal")]);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].explanation).toContain("70%");
  });

  it("orphan_hubspot: stage filter rejects non-Closed-Won", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ status: "Qualified" }),
      quickbooks_record: null,
    });
    const result = matchPatterns([pair], [get("closed_won_no_qbo_invoice")]);
    expect(result.matches.length).toBe(0);
  });

  it("status_mismatch: hits when stage + status both match", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ status: "Closed Won" }),
      quickbooks_record: buildRecord({ source: "QUICKBOOKS", status: "Open" }),
    });
    const result = matchPatterns([pair], [get("stage_closed_won_status_open")]);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].explanation).toContain("Open");
  });

  it("status_mismatch: skips when stage differs", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ status: "Qualified" }),
      quickbooks_record: buildRecord({ source: "QUICKBOOKS", status: "Open" }),
    });
    const result = matchPatterns([pair], [get("stage_closed_won_status_open")]);
    expect(result.matches.length).toBe(0);
  });

  it("missing_field company on HUBSPOT side", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ company_name_raw: "" }),
    });
    const result = matchPatterns([pair], [get("contact_without_company_in_hubspot")]);
    expect(result.matches.length).toBe(1);
  });

  it("missing_field skips when subject record is missing entirely", () => {
    const pair = buildPair({ hubspot_record: null });
    const result = matchPatterns([pair], [get("contact_without_company_in_hubspot")]);
    expect(result.matches.length).toBe(0);
  });

  it("qbo_name_contains: hits when QBO uses Parent:Child notation", () => {
    const pair = buildPair({
      quickbooks_record: buildRecord({
        source: "QUICKBOOKS",
        company_name_raw: "Acme:Subsidiary",
      }),
    });
    const result = matchPatterns([pair], [get("qb_subcustomer_notation")]);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].explanation).toContain("Acme:Subsidiary");
  });

  it("qbo_name_contains: misses when no delimiter present", () => {
    const pair = buildPair();
    const result = matchPatterns([pair], [get("qb_subcustomer_notation")]);
    expect(result.matches.length).toBe(0);
  });

  it("date_format_only: skips when date_score < 1", () => {
    const pair = buildPair({
      match_signals: { ...zeroSignals, date_score: 0.5 },
    });
    const result = matchPatterns([pair], [get("date_format_only_mismatch")]);
    expect(result.matches.length).toBe(0);
  });

  it("name_legal_suffix_only: skips when raw names identical", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({ company_name_raw: "Acme Inc" }),
      quickbooks_record: buildRecord({
        source: "QUICKBOOKS",
        company_name_raw: "Acme Inc",
      }),
    });
    const result = matchPatterns([pair], [get("name_legal_suffix_only")]);
    expect(result.matches.length).toBe(0);
  });

  it("name_legal_suffix_only: hits when emails share domain only", () => {
    const pair = buildPair({
      hubspot_record: buildRecord({
        company_name_raw: "Globex Corporation",
        company_name_normalized: "globex",
        email: "alice@globex.com",
      }),
      quickbooks_record: buildRecord({
        source: "QUICKBOOKS",
        company_name_raw: "Globex Inc",
        company_name_normalized: "globex",
        email: "billing@globex.com",
      }),
    });
    const result = matchPatterns([pair], [get("name_legal_suffix_only")]);
    expect(result.matches.length).toBe(1);
  });

  it("missing_field email branch hits when synthetic pattern targets email", () => {
    const synthetic: PatternDefinition = {
      pattern_key: "synthetic_missing_email",
      pattern_name: "Synthetic",
      detection_signature: { kind: "missing_field", field: "email", side: "HUBSPOT" },
      explanation_template: "missing email on {deal_name}",
      recommended_action: "MANUAL_REVIEW",
      confidence_floor: 0.5,
    };
    const pair = buildPair({
      hubspot_record: buildRecord({ email: null, company_name_raw: "Acme" }),
    });
    const result = matchPatterns([pair], [synthetic]);
    expect(result.matches.length).toBe(1);
  });

  it("missing_field amount branch hits when synthetic pattern targets amount", () => {
    const synthetic: PatternDefinition = {
      pattern_key: "synthetic_missing_amount",
      pattern_name: "Synthetic",
      detection_signature: { kind: "missing_field", field: "amount", side: "QUICKBOOKS" },
      explanation_template: "missing amount",
      recommended_action: "MANUAL_REVIEW",
      confidence_floor: 0.5,
    };
    const pair = buildPair({
      quickbooks_record: buildRecord({ source: "QUICKBOOKS", amount_cents: null }),
    });
    const result = matchPatterns([pair], [synthetic]);
    expect(result.matches.length).toBe(1);
  });

  it("missing_field tax_id branch is deferred (returns null)", () => {
    const synthetic: PatternDefinition = {
      pattern_key: "synthetic_missing_tax_id",
      pattern_name: "Synthetic",
      detection_signature: { kind: "missing_field", field: "tax_id", side: "HUBSPOT" },
      explanation_template: "n/a",
      recommended_action: "MANUAL_REVIEW",
      confidence_floor: 0.5,
    };
    const result = matchPatterns([buildPair()], [synthetic]);
    expect(result.matches.length).toBe(0);
  });

  it("currency_symbol_vs_code_mismatch: skips when raw amount strings equal", () => {
    const pair = buildPair({
      match_signals: { ...zeroSignals, amount_score: 1 },
      hubspot_record: buildRecord({ amount_raw: "$1000", amount_cents: 100000 }),
      quickbooks_record: buildRecord({
        source: "QUICKBOOKS",
        amount_raw: "$1000",
        amount_cents: 100000,
      }),
    });
    const result = matchPatterns([pair], [get("currency_symbol_vs_code_mismatch")]);
    expect(result.matches.length).toBe(0);
  });
});
