import { describe, expect, it } from "vitest";

import {
  MATCH_THRESHOLD,
  findCandidatePairs,
  scoreAmount,
  scoreDate,
  scoreEmail,
  scoreMatch,
  scoreName,
} from "./conflict-scorer";
import { listFixtures, loadFixture } from "./test-utils/fixtures";

describe("scoreEmail", () => {
  it("returns 1 on exact match", () => {
    expect(scoreEmail("a@b.com", "a@b.com")).toBe(1);
  });
  it("returns 0.5 on domain-only match", () => {
    expect(scoreEmail("a@b.com", "c@b.com")).toBe(0.5);
  });
  it("returns 0 on no match", () => {
    expect(scoreEmail("a@b.com", "a@x.com")).toBe(0);
  });
  it("returns 0 when either side null", () => {
    expect(scoreEmail(null, "a@b.com")).toBe(0);
    expect(scoreEmail("a@b.com", null)).toBe(0);
  });
});

describe("scoreAmount", () => {
  it("returns 1 on equal amounts", () => {
    expect(scoreAmount(10000, 10000)).toBe(1);
  });
  it("decays log-normalized for diverging amounts", () => {
    const score = scoreAmount(10000, 5000);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
  it("returns 0 on null", () => {
    expect(scoreAmount(null, 100)).toBe(0);
    expect(scoreAmount(100, null)).toBe(0);
  });
  it("clamps to >= 0", () => {
    expect(scoreAmount(1, 1_000_000_000)).toBe(0);
  });
});

describe("scoreDate", () => {
  const day = (yyyy: number, mm: number, dd: number) => new Date(Date.UTC(yyyy, mm - 1, dd));
  it("returns 1 within 90 days", () => {
    expect(scoreDate(day(2026, 1, 1), day(2026, 3, 1))).toBe(1);
  });
  it("returns 0 beyond 365 days", () => {
    expect(scoreDate(day(2024, 1, 1), day(2026, 1, 1))).toBe(0);
  });
  it("decays linearly between 90 and 365 days", () => {
    const score = scoreDate(day(2026, 1, 1), day(2026, 9, 1));
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
  it("returns 0 on null", () => {
    expect(scoreDate(null, day(2026, 1, 1))).toBe(0);
    expect(scoreDate(day(2026, 1, 1), null)).toBe(0);
  });
});

describe("scoreName", () => {
  it("returns 1 on exact match", () => {
    expect(scoreName("acme", "acme")).toBe(1);
  });
  it("returns ~0.8 for one-character difference in 5-char string", () => {
    const score = scoreName("acme", "acne");
    expect(score).toBeGreaterThanOrEqual(0.7);
    expect(score).toBeLessThan(1);
  });
  it("returns 0 on empty string either side", () => {
    expect(scoreName("", "acme")).toBe(0);
    expect(scoreName("acme", "")).toBe(0);
  });
});

describe("scoreMatch (composite)", () => {
  it("weighted sum equals 0.4*name + 0.3*email + 0.2*amount + 0.1*date", () => {
    const sample = {
      source: "HUBSPOT" as const,
      source_row_index: 0,
      company_name_raw: "Acme",
      company_name_normalized: "acme",
      amount_cents: 10000,
      currency: "USD",
      email: "x@y.com",
      status: null,
      date: new Date("2026-01-01T00:00:00Z"),
      raw: {},
    };
    const same = { ...sample, source: "QUICKBOOKS" as const };
    const signals = scoreMatch(sample, same);
    expect(signals.combined).toBeCloseTo(1, 5);
  });
});

describe("findCandidatePairs over fixtures", () => {
  const ids = listFixtures();

  it("loads all 10 fixtures", () => {
    expect(ids.length).toBe(10);
  });

  it.each(ids)("fixture %i: matches expectations", (id) => {
    const fixture = loadFixture(id);
    const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);

    const matched = pairs.filter(
      (p) => p.hubspot_record !== null && p.quickbooks_record !== null,
    );
    const orphanHubspot = pairs
      .filter((p) => p.hubspot_record !== null && p.quickbooks_record === null)
      .map((p) => p.hubspot_record!.source_row_index);
    const orphanQuickbooks = pairs
      .filter((p) => p.hubspot_record === null && p.quickbooks_record !== null)
      .map((p) => p.quickbooks_record!.source_row_index);

    for (const expected of fixture.expected.expected_match_pairs) {
      const found = matched.find(
        (p) =>
          p.hubspot_record!.source_row_index === expected.hubspot_row &&
          p.quickbooks_record!.source_row_index === expected.quickbooks_row,
      );
      expect(found, `expected match pair for fixture ${fixture.caseId}`).toBeTruthy();
      if (found) {
        expect(found.match_confidence).toBeGreaterThanOrEqual(
          expected.min_confidence,
        );
      }
    }

    expect(orphanHubspot.sort()).toEqual(
      [...fixture.expected.expected_unmatched_hubspot_rows].sort(),
    );
    expect(orphanQuickbooks.sort()).toEqual(
      [...fixture.expected.expected_unmatched_quickbooks_rows].sort(),
    );
  });

  it("threshold default is 0.5", () => {
    expect(MATCH_THRESHOLD).toBe(0.5);
  });
});
