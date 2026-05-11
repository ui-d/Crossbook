import type { ColumnMap, RawRecord, SourceKind } from "./csv-parser";
import {
  normalizeCompanyName,
  normalizeCurrency,
  normalizeDate,
  normalizeEmail,
} from "./normalizers";

export interface NormalizedRecord {
  source: SourceKind;
  source_row_index: number;
  company_name_raw: string;
  company_name_normalized: string;
  amount_cents: number | null;
  currency: string;
  email: string | null;
  status: string | null;
  date: Date | null;
  raw: Record<string, string>;
}

const inferCurrencyCode = (
  amountField: string | undefined,
  currencyField: string | undefined,
): string => {
  if (currencyField) {
    const upper = currencyField.trim().toUpperCase();
    if (upper.length >= 3) return upper.slice(0, 3);
  }
  if (amountField) {
    const detected = normalizeCurrency(amountField).currency;
    if (detected !== "UNKNOWN") return detected;
  }
  return "UNKNOWN";
};

export function normalizeRecord(
  raw: RawRecord,
  columns: ColumnMap,
): NormalizedRecord {
  const companyRaw = columns.company ? (raw.raw[columns.company] ?? "") : "";
  const amountField = columns.amount ? raw.raw[columns.amount] : undefined;
  const currencyField = columns.currency ? raw.raw[columns.currency] : undefined;
  const emailField = columns.email ? (raw.raw[columns.email] ?? null) : null;
  const dateField = columns.date ? (raw.raw[columns.date] ?? null) : null;
  const statusField = columns.status ? (raw.raw[columns.status] ?? null) : null;

  const { amount_cents } = normalizeCurrency(amountField ?? null);
  const currency = inferCurrencyCode(amountField, currencyField);

  return {
    source: raw.source,
    source_row_index: raw.source_row_index,
    company_name_raw: companyRaw,
    company_name_normalized: normalizeCompanyName(companyRaw),
    amount_cents,
    currency,
    email: normalizeEmail(emailField),
    status: statusField ? statusField.trim() : null,
    date: normalizeDate(dateField),
    raw: raw.raw,
  };
}

export function normalizeRecords(
  records: RawRecord[],
  columns: ColumnMap,
): NormalizedRecord[] {
  return records.map((record) => normalizeRecord(record, columns));
}
