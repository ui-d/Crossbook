import Papa from "papaparse";

export type SourceKind = "HUBSPOT" | "QUICKBOOKS";

export const HUBSPOT_COMPANY_COLS = [
  "Company Name",
  "Associated Company",
  "company_name",
  "Company",
  "Primary Company",
];
export const HUBSPOT_AMOUNT_COLS = [
  "Amount",
  "Deal Amount",
  "amount",
  "Total Contract Value",
  "TCV",
];
export const HUBSPOT_STAGE_COLS = ["Deal Stage", "stage", "dealstage"];
export const HUBSPOT_EMAIL_COLS = [
  "Contact Email",
  "email",
  "Email",
  "Primary Contact Email",
];
export const HUBSPOT_OWNER_COLS = ["Deal Owner", "owner", "HubSpot Owner"];
export const HUBSPOT_CLOSE_DATE_COLS = ["Close Date", "closedate", "Closed Date"];
export const HUBSPOT_CURRENCY_COLS = [
  "Currency",
  "deal_currency_code",
  "Deal Currency",
];

export const QB_COMPANY_COLS = [
  "Customer",
  "Customer Name",
  "Display Name",
  "Company",
  "Customer Full Name",
];
export const QB_AMOUNT_COLS = [
  "Balance",
  "Open Balance",
  "Amount",
  "Total",
  "Invoice Total",
  "Amount Due",
];
export const QB_EMAIL_COLS = [
  "Email",
  "Primary Email Address",
  "email",
  "Customer Email",
];
export const QB_STATUS_COLS = ["Status", "Active", "account_status"];
export const QB_INVOICE_DATE_COLS = ["Invoice Date", "Date", "Created", "Txn Date"];
export const QB_INVOICE_NUM_COLS = [
  "Invoice #",
  "Invoice Number",
  "Num",
  "Document Number",
];

export interface ColumnMap {
  company: string | null;
  amount: string | null;
  email: string | null;
  date: string | null;
  currency: string | null;
  status: string | null;
  stage_or_invoice_num: string | null;
  owner: string | null;
}

export interface RawRecord {
  source: SourceKind;
  source_row_index: number;
  raw: Record<string, string>;
}

export interface ParseResult {
  records: RawRecord[];
  detected_columns: ColumnMap;
  headers: string[];
  warnings: string[];
}

const detectColumn = (
  headers: string[],
  candidates: readonly string[],
): string | null => {
  const lookup = new Map(headers.map((h) => [h.trim().toLowerCase(), h]));
  for (const candidate of candidates) {
    const match = lookup.get(candidate.trim().toLowerCase());
    if (match) return match;
  }
  return null;
};

const buildHubSpotColumnMap = (headers: string[]): ColumnMap => ({
  company: detectColumn(headers, HUBSPOT_COMPANY_COLS),
  amount: detectColumn(headers, HUBSPOT_AMOUNT_COLS),
  email: detectColumn(headers, HUBSPOT_EMAIL_COLS),
  date: detectColumn(headers, HUBSPOT_CLOSE_DATE_COLS),
  currency: detectColumn(headers, HUBSPOT_CURRENCY_COLS),
  status: detectColumn(headers, HUBSPOT_STAGE_COLS),
  stage_or_invoice_num: detectColumn(headers, HUBSPOT_STAGE_COLS),
  owner: detectColumn(headers, HUBSPOT_OWNER_COLS),
});

const buildQuickBooksColumnMap = (headers: string[]): ColumnMap => ({
  company: detectColumn(headers, QB_COMPANY_COLS),
  amount: detectColumn(headers, QB_AMOUNT_COLS),
  email: detectColumn(headers, QB_EMAIL_COLS),
  date: detectColumn(headers, QB_INVOICE_DATE_COLS),
  currency: null,
  status: detectColumn(headers, QB_STATUS_COLS),
  stage_or_invoice_num: detectColumn(headers, QB_INVOICE_NUM_COLS),
  owner: null,
});

const collectMissingWarnings = (
  source: SourceKind,
  map: ColumnMap,
): string[] => {
  const warnings: string[] = [];
  if (!map.company)
    warnings.push(
      `${source}: could not detect a company-name column. Tried ${
        source === "HUBSPOT" ? HUBSPOT_COMPANY_COLS : QB_COMPANY_COLS
      }`,
    );
  if (!map.amount)
    warnings.push(`${source}: could not detect an amount column.`);
  if (!map.email)
    warnings.push(`${source}: could not detect an email column.`);
  if (!map.date) warnings.push(`${source}: could not detect a date column.`);
  return warnings;
};

const parseCsv = (
  csvText: string,
  source: SourceKind,
  buildMap: (headers: string[]) => ColumnMap,
): ParseResult => {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const detected_columns = buildMap(headers);
  const warnings = collectMissingWarnings(source, detected_columns);
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      warnings.push(
        `${source}: parse error at row ${err.row ?? "?"}: ${err.message}`,
      );
    }
  }

  const records: RawRecord[] = result.data.map((row, index) => ({
    source,
    source_row_index: index,
    raw: row,
  }));

  return { records, detected_columns, headers, warnings };
};

export const parseHubSpotCsv = (csvText: string): ParseResult =>
  parseCsv(csvText, "HUBSPOT", buildHubSpotColumnMap);

export const parseQuickBooksCsv = (csvText: string): ParseResult =>
  parseCsv(csvText, "QUICKBOOKS", buildQuickBooksColumnMap);
