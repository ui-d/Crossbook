import { describe, expect, it } from "vitest";

import { parseHubSpotCsv, parseQuickBooksCsv } from "./csv-parser";

describe("parseHubSpotCsv", () => {
  it("detects standard HubSpot column names", () => {
    const csv = `Company Name,Contact Email,Amount,Deal Stage,Close Date,Currency
Acme,a@b.com,1000,Closed Won,2026-01-01,USD
`;
    const result = parseHubSpotCsv(csv);
    expect(result.records.length).toBe(1);
    expect(result.detected_columns.company).toBe("Company Name");
    expect(result.detected_columns.amount).toBe("Amount");
    expect(result.detected_columns.email).toBe("Contact Email");
    expect(result.detected_columns.date).toBe("Close Date");
    expect(result.detected_columns.currency).toBe("Currency");
    expect(result.warnings).toEqual([]);
  });

  it("emits warnings when columns are missing", () => {
    const csv = `Foo,Bar,Baz
1,2,3
`;
    const result = parseHubSpotCsv(csv);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.detected_columns.company).toBeNull();
    expect(result.detected_columns.amount).toBeNull();
    expect(result.detected_columns.email).toBeNull();
    expect(result.detected_columns.date).toBeNull();
  });

  it("matches headers case-insensitively", () => {
    const csv = `company name,EMAIL,amount,deal stage,close date
Acme,a@b.com,1000,Closed Won,2026-01-01
`;
    const result = parseHubSpotCsv(csv);
    expect(result.detected_columns.company).toBe("company name");
    expect(result.detected_columns.email).toBe("EMAIL");
  });
});

describe("parseQuickBooksCsv", () => {
  it("detects standard QuickBooks column names", () => {
    const csv = `Customer,Email,Amount,Status,Invoice Date,Invoice #
Acme,a@b.com,1000,Paid,2026-01-01,INV-1
`;
    const result = parseQuickBooksCsv(csv);
    expect(result.records.length).toBe(1);
    expect(result.detected_columns.company).toBe("Customer");
    expect(result.detected_columns.amount).toBe("Amount");
    expect(result.detected_columns.email).toBe("Email");
    expect(result.detected_columns.date).toBe("Invoice Date");
    expect(result.detected_columns.stage_or_invoice_num).toBe("Invoice #");
    expect(result.warnings).toEqual([]);
  });

  it("returns empty records on header-only CSV", () => {
    const csv = `Customer,Email,Amount,Status,Invoice Date,Invoice #
`;
    const result = parseQuickBooksCsv(csv);
    expect(result.records.length).toBe(0);
  });
});
