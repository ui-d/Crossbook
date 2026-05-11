import { describe, expect, it } from "vitest";

import type { ColumnMap, RawRecord } from "./csv-parser";
import { normalizeRecord } from "./normalize-record";

const fullMap: ColumnMap = {
  company: "Company Name",
  amount: "Amount",
  email: "Email",
  date: "Close Date",
  currency: "Currency",
  status: "Stage",
  stage_or_invoice_num: "Stage",
  owner: null,
};

const buildRaw = (raw: Record<string, string>): RawRecord => ({
  source: "HUBSPOT",
  source_row_index: 0,
  raw,
});

describe("normalizeRecord", () => {
  it("normalizes a complete row", () => {
    const record = normalizeRecord(
      buildRaw({
        "Company Name": "Żółw Sp. z o.o.",
        Amount: "120000",
        Email: " Foo@Bar.COM ",
        "Close Date": "5.01.2026",
        Currency: "PLN",
        Stage: "Closed Won",
      }),
      fullMap,
    );
    expect(record.company_name_normalized).toBe("zolw");
    expect(record.amount_cents).toBe(12000000);
    expect(record.email).toBe("foo@bar.com");
    expect(record.currency).toBe("PLN");
    expect(record.status).toBe("Closed Won");
    expect(record.date?.getFullYear()).toBe(2026);
  });

  it("handles entirely null column map", () => {
    const emptyMap: ColumnMap = {
      company: null,
      amount: null,
      email: null,
      date: null,
      currency: null,
      status: null,
      stage_or_invoice_num: null,
      owner: null,
    };
    const record = normalizeRecord(
      buildRaw({ Random: "x" }),
      emptyMap,
    );
    expect(record.company_name_raw).toBe("");
    expect(record.company_name_normalized).toBe("");
    expect(record.amount_cents).toBeNull();
    expect(record.currency).toBe("UNKNOWN");
    expect(record.email).toBeNull();
    expect(record.date).toBeNull();
    expect(record.status).toBeNull();
  });

  it("infers currency from amount when currency column missing", () => {
    const map: ColumnMap = { ...fullMap, currency: null };
    const record = normalizeRecord(
      buildRaw({
        "Company Name": "Acme",
        Amount: "$1,000.00",
        Email: "a@b.com",
        "Close Date": "2026-01-01",
        Stage: "Open",
      }),
      map,
    );
    expect(record.currency).toBe("USD");
  });

  it("falls back to UNKNOWN when neither amount nor currency yields a code", () => {
    const map: ColumnMap = { ...fullMap, currency: null };
    const record = normalizeRecord(
      buildRaw({
        "Company Name": "Acme",
        Amount: "1000",
        Email: "a@b.com",
        "Close Date": "2026-01-01",
        Stage: "Open",
      }),
      map,
    );
    expect(record.currency).toBe("UNKNOWN");
  });

  it("uses currency code from currency column even when short", () => {
    const record = normalizeRecord(
      buildRaw({
        "Company Name": "Acme",
        Amount: "1000",
        Email: "a@b.com",
        "Close Date": "2026-01-01",
        Currency: "EU",
        Stage: "Open",
      }),
      fullMap,
    );
    // 'EU' is < 3 chars → falls through to amount-based detection → UNKNOWN
    expect(record.currency).toBe("UNKNOWN");
  });
});
