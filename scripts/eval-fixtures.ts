/**
 * Live-Claude fixture evaluation.
 *
 * Runs every fixture in data/test-fixtures/ through the full pipeline
 * (CSV parse → normalize → fuzzy match → pattern library → Claude) and
 * reports pass/fail against the labelled expectations in *_expected.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... pnpm eval:fixtures
 *
 * Costs roughly $0.05–$0.15 per full run with Sonnet 4.6 + prompt caching.
 *
 * This is the Day 9 / Day 10 evaluation harness. It is deliberately *not*
 * a vitest test — running it requires real API credit, so it should be
 * invoked explicitly by the operator while iterating on the system prompt.
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

import { findCandidatePairs } from "@/lib/conflict-scorer";
import { analyzePairs } from "@/lib/claude";
import { matchPatterns } from "@/lib/pattern-library";
import { listFixtures, loadFixture } from "@/lib/test-utils/fixtures";

interface FixtureOutcome {
  caseId: string;
  pairs: number;
  pattern_hits: number;
  claude_calls: number;
  expected_matches: number;
  detected_matches: number;
  expected_orphans_hubspot: number;
  detected_orphans_hubspot: number;
  expected_orphans_quickbooks: number;
  detected_orphans_quickbooks: number;
  passed: boolean;
  notes: string[];
}

async function evalFixture(id: number): Promise<FixtureOutcome> {
  const fixture = loadFixture(id);
  const pairs = findCandidatePairs(fixture.hubspot, fixture.quickbooks);
  const patternResult = matchPatterns(pairs);
  // Always call Claude on matched pairs — patterns are advisory, not replacement.
  // Only skip orphans (no record on one side) — Claude can't analyze a single side.
  const skipIndexes = new Set<number>();
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (!pair.hubspot_record || !pair.quickbooks_record) {
      skipIndexes.add(i);
    }
  }
  const claudeResults = await analyzePairs(pairs, skipIndexes);

  const detectedMatchPairs = pairs.filter(
    (p) => p.hubspot_record !== null && p.quickbooks_record !== null,
  );
  const detectedOrphansHubspot = pairs.filter(
    (p) => p.hubspot_record !== null && p.quickbooks_record === null,
  );
  const detectedOrphansQuickbooks = pairs.filter(
    (p) => p.hubspot_record === null && p.quickbooks_record !== null,
  );

  const notes: string[] = [];

  for (const expected of fixture.expected.expected_match_pairs) {
    const found = detectedMatchPairs.find(
      (p) =>
        p.hubspot_record!.source_row_index === expected.hubspot_row &&
        p.quickbooks_record!.source_row_index === expected.quickbooks_row,
    );
    if (!found) {
      notes.push(
        `MISSED match: HubSpot row ${expected.hubspot_row} ↔ QBO row ${expected.quickbooks_row}`,
      );
    } else if (found.match_confidence < expected.min_confidence) {
      notes.push(
        `LOW conf on pair (got ${found.match_confidence.toFixed(2)} < expected ${expected.min_confidence})`,
      );
    }
  }

  if (
    detectedOrphansHubspot.length !==
    fixture.expected.expected_unmatched_hubspot_rows.length
  ) {
    notes.push(
      `HubSpot orphan count mismatch (got ${detectedOrphansHubspot.length}, expected ${fixture.expected.expected_unmatched_hubspot_rows.length})`,
    );
  }
  if (
    detectedOrphansQuickbooks.length !==
    fixture.expected.expected_unmatched_quickbooks_rows.length
  ) {
    notes.push(
      `QBO orphan count mismatch (got ${detectedOrphansQuickbooks.length}, expected ${fixture.expected.expected_unmatched_quickbooks_rows.length})`,
    );
  }

  for (const expected of fixture.expected.expected_match_pairs) {
    if (expected.expected_conflict_types.length === 0) continue;
    const claudeResult = claudeResults.find((r) => {
      const pair = pairs[r.pair_index];
      return (
        pair?.hubspot_record?.source_row_index === expected.hubspot_row &&
        pair?.quickbooks_record?.source_row_index === expected.quickbooks_row
      );
    });
    if (!claudeResult && !patternResult.matches.some((m) =>
        m.hubspot_row_index === expected.hubspot_row &&
        m.quickbooks_row_index === expected.quickbooks_row,
      )) {
      notes.push(
        `NO Claude+pattern coverage for HubSpot ${expected.hubspot_row} ↔ QBO ${expected.quickbooks_row}`,
      );
      continue;
    }
    const detectedTypes = new Set<string>([
      ...(claudeResult?.conflicts.map((c) => c.conflict_type) ?? []),
      ...patternResult.matches
        .filter(
          (m) =>
            m.hubspot_row_index === expected.hubspot_row &&
            m.quickbooks_row_index === expected.quickbooks_row,
        )
        .map((m) => m.conflict_type),
    ]);
    for (const want of expected.expected_conflict_types) {
      if (!detectedTypes.has(want)) {
        notes.push(`MISSING conflict_type=${want} on pair`);
      }
    }
  }

  return {
    caseId: fixture.caseId,
    pairs: pairs.length,
    pattern_hits: patternResult.matches.length,
    claude_calls: claudeResults.length,
    expected_matches: fixture.expected.expected_match_pairs.length,
    detected_matches: detectedMatchPairs.length,
    expected_orphans_hubspot:
      fixture.expected.expected_unmatched_hubspot_rows.length,
    detected_orphans_hubspot: detectedOrphansHubspot.length,
    expected_orphans_quickbooks:
      fixture.expected.expected_unmatched_quickbooks_rows.length,
    detected_orphans_quickbooks: detectedOrphansQuickbooks.length,
    passed: notes.length === 0,
    notes,
  };
}

function formatTable(outcomes: FixtureOutcome[]): string {
  const header =
    "case_id                                  pairs pat  cld m(d/e) hO(d/e) qO(d/e) status";
  const lines = [header, "-".repeat(header.length)];
  for (const o of outcomes) {
    const status = o.passed ? "PASS" : "FAIL";
    const line = [
      o.caseId.padEnd(40),
      String(o.pairs).padStart(5),
      String(o.pattern_hits).padStart(4),
      String(o.claude_calls).padStart(4),
      `${o.detected_matches}/${o.expected_matches}`.padStart(7),
      `${o.detected_orphans_hubspot}/${o.expected_orphans_hubspot}`.padStart(7),
      `${o.detected_orphans_quickbooks}/${o.expected_orphans_quickbooks}`.padStart(7),
      status,
    ].join(" ");
    lines.push(line);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or export it before running.",
    );
    process.exit(1);
  }

  const ids = listFixtures();
  console.log(`Evaluating ${ids.length} fixtures...\n`);

  const outcomes: FixtureOutcome[] = [];
  for (const id of ids) {
    process.stdout.write(`  ${id.toString().padStart(2, "0")} ... `);
    const started = Date.now();
    try {
      const outcome = await evalFixture(id);
      outcomes.push(outcome);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`${outcome.passed ? "PASS" : "FAIL"} (${elapsed}s)`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "unknown error";
      console.log(`ERROR: ${message}`);
      outcomes.push({
        caseId: `fixture_${id}`,
        pairs: 0,
        pattern_hits: 0,
        claude_calls: 0,
        expected_matches: 0,
        detected_matches: 0,
        expected_orphans_hubspot: 0,
        detected_orphans_hubspot: 0,
        expected_orphans_quickbooks: 0,
        detected_orphans_quickbooks: 0,
        passed: false,
        notes: [message],
      });
    }
  }

  console.log("\n" + formatTable(outcomes));

  const passed = outcomes.filter((o) => o.passed).length;
  console.log(`\nResult: ${passed}/${outcomes.length} fixtures passed.`);
  console.log(
    `Day 9 quality bar: 7/10. Day 10 quality bar: 17/20 once fixtures are expanded.`,
  );

  const failed = outcomes.filter((o) => !o.passed);
  if (failed.length > 0) {
    console.log("\nFailures:");
    for (const f of failed) {
      console.log(`  ${f.caseId}:`);
      for (const note of f.notes) {
        console.log(`    - ${note}`);
      }
    }
  }

  process.exit(passed >= 7 ? 0 : 1);
}

void main();
