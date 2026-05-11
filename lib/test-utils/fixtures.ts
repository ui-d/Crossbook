import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  parseHubSpotCsv,
  parseQuickBooksCsv,
  type ParseResult,
} from "@/lib/csv-parser";
import {
  normalizeRecords,
  type NormalizedRecord,
} from "@/lib/normalize-record";

export interface ExpectedMatchPair {
  hubspot_row: number;
  quickbooks_row: number;
  min_confidence: number;
  expected_conflict_types: string[];
}

export interface FixtureExpectation {
  case_id: string;
  description: string;
  expected_match_pairs: ExpectedMatchPair[];
  expected_unmatched_hubspot_rows: number[];
  expected_unmatched_quickbooks_rows: number[];
}

export interface LoadedFixture {
  caseId: string;
  hubspot: NormalizedRecord[];
  quickbooks: NormalizedRecord[];
  hubspot_parse: ParseResult;
  quickbooks_parse: ParseResult;
  expected: FixtureExpectation;
}

const FIXTURES_DIR = join(process.cwd(), "data", "test-fixtures");

const padId = (n: number): string => n.toString().padStart(2, "0");

export function loadFixture(n: number): LoadedFixture {
  const id = padId(n);
  const hubspotCsv = readFileSync(
    join(FIXTURES_DIR, `${id}_hubspot.csv`),
    "utf8",
  );
  const quickbooksCsv = readFileSync(
    join(FIXTURES_DIR, `${id}_quickbooks.csv`),
    "utf8",
  );
  const expectedJson = readFileSync(
    join(FIXTURES_DIR, `${id}_expected.json`),
    "utf8",
  );

  const hubspotParse = parseHubSpotCsv(hubspotCsv);
  const quickbooksParse = parseQuickBooksCsv(quickbooksCsv);

  const hubspot = normalizeRecords(
    hubspotParse.records,
    hubspotParse.detected_columns,
  );
  const quickbooks = normalizeRecords(
    quickbooksParse.records,
    quickbooksParse.detected_columns,
  );

  const expected = JSON.parse(expectedJson) as FixtureExpectation;

  return {
    caseId: expected.case_id,
    hubspot,
    quickbooks,
    hubspot_parse: hubspotParse,
    quickbooks_parse: quickbooksParse,
    expected,
  };
}

export function listFixtures(): number[] {
  const files = readdirSync(FIXTURES_DIR);
  const ids = new Set<number>();
  for (const file of files) {
    const match = file.match(/^(\d{2})_expected\.json$/);
    if (match) {
      ids.add(parseInt(match[1], 10));
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
}
