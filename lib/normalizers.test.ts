import { describe, expect, it } from "vitest";

import {
  normalizeCompanyName,
  normalizeCurrency,
  normalizeDate,
  normalizeEmail,
  removeDiacritics,
} from "./normalizers";

describe("removeDiacritics", () => {
  it.each([
    ["Żółw", "Zolw"],
    ["Café", "Cafe"],
    ["Müller", "Muller"],
    ["Société", "Societe"],
    ["Łukasz", "Lukasz"],
    ["Straße", "Strasse"],
    ["Renée", "Renee"],
  ])("strips diacritics from %s", (input, expected) => {
    expect(removeDiacritics(input)).toBe(expected);
  });
});

describe("normalizeCompanyName", () => {
  const cases: Array<[string, string]> = [
    ["Acme Corp Ltd", "acme"],
    ["Acme, Inc.", "acme"],
    ["Acme LLC", "acme"],
    ["Żółw sp. z o.o.", "zolw"],
    ["Zolw Sp. z o.o.", "zolw"],
    ["Café Müller GmbH", "cafe muller"],
    ["Société Générale SA", "societe generale"],
    ["Globex S.A.S.", "globex"],
    ["Wayne Industries Co.", "wayne industries"],
    ["Initech, LLC", "initech"],
  ];

  it.each(cases)("normalizes %s -> %s", (input, expected) => {
    expect(normalizeCompanyName(input)).toBe(expected);
  });

  it("collapses repeated punctuation and whitespace", () => {
    expect(normalizeCompanyName("  Acme   ---   Co.  ")).toBe("acme");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeCompanyName("")).toBe("");
  });

  it("matches diacritic and non-diacritic forms identically", () => {
    expect(normalizeCompanyName("Żółw Sp. z o.o.")).toBe(
      normalizeCompanyName("Zolw sp. z o.o."),
    );
  });

  it("preserves ampersand-joined names", () => {
    expect(normalizeCompanyName("Smith & Jones LLC")).toBe("smith & jones");
  });
});

describe("normalizeCurrency", () => {
  it.each<[string, number | null, string]>([
    ["$1,234.56", 123456, "USD"],
    ["USD 12,400.00", 1240000, "USD"],
    ["€1.234,56", 123456, "EUR"],
    ["1234,56 zł", 123456, "PLN"],
    ["PLN 1234.56", 123456, "PLN"],
    ["£999.00", 99900, "GBP"],
    ["¥1000", 100000, "JPY"],
    ["1,000.50", 100050, "UNKNOWN"],
  ])("parses %s", (input, amount, code) => {
    const out = normalizeCurrency(input);
    expect(out.amount_cents).toBe(amount);
    expect(out.currency).toBe(code);
  });

  it("returns null amount + UNKNOWN for empty string", () => {
    const out = normalizeCurrency("");
    expect(out.amount_cents).toBeNull();
    expect(out.currency).toBe("UNKNOWN");
  });

  it("returns null amount + UNKNOWN for null", () => {
    const out = normalizeCurrency(null);
    expect(out.amount_cents).toBeNull();
    expect(out.currency).toBe("UNKNOWN");
  });

  it("returns null amount + UNKNOWN for whitespace only", () => {
    const out = normalizeCurrency("   ");
    expect(out.amount_cents).toBeNull();
    expect(out.currency).toBe("UNKNOWN");
  });
});

describe("normalizeDate", () => {
  const cases: Array<[string, string]> = [
    ["2026-05-09", "2026-05-09"],
    ["05/09/2026", "2026-05-09"],
    ["13/05/2026", "2026-05-13"],
    ["5.01.2026", "2026-01-05"],
    ["5 Jan 2026", "2026-01-05"],
    ["Jan 5, 2026", "2026-01-05"],
    ["5 January 2026", "2026-01-05"],
  ];

  it.each(cases)("parses %s", (input, isoExpected) => {
    const out = normalizeDate(input);
    expect(out).not.toBeNull();
    if (!out) return;
    const yyyy = out.getFullYear().toString().padStart(4, "0");
    const mm = (out.getMonth() + 1).toString().padStart(2, "0");
    const dd = out.getDate().toString().padStart(2, "0");
    expect(`${yyyy}-${mm}-${dd}`).toBe(isoExpected);
  });

  it("returns null for empty string", () => {
    expect(normalizeDate("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizeDate(null)).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(normalizeDate("not a date")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(normalizeDate("   ")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("returns null for empty string", () => {
    expect(normalizeEmail("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizeEmail(null)).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(normalizeEmail("    ")).toBeNull();
  });
});
