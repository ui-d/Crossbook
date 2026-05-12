import { parse, parseISO } from "date-fns";
import currency from "currency.js";

const LEGAL_SUFFIXES: RegExp[] = [
  // English
  /\s+(inc\.?|incorporated|corp\.?|corporation|llc|l\.l\.c\.|ltd\.?|limited|plc|co\.?)$/i,
  // Polish
  /\s+(sp\.?\s*z\s*o\.?\s*o\.?|spolka\s+z\s+o\.?o\.?|spolka\s+akcyjna|sp\.?\s*j\.?|sp\.?\s*k\.?)$/i,
  // German / DACH
  /\s+(gmbh|ag|kg|ohg|gbr|ug)$/i,
  // French / Italian / Spanish / Nordics
  /\s+(sarl|sas|s\.?a\.?s\.?|s\.?a\.?|spa|s\.?p\.?a\.?|srl|s\.?r\.?l\.?|sl|s\.?l\.?|ab|oy)$/i,
];

export function removeDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/ß/g, "ss");
}

export function normalizeCompanyName(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  s = removeDiacritics(s);
  s = s.toLowerCase();

  let prev: string;
  do {
    prev = s;
    for (const re of LEGAL_SUFFIXES) {
      s = s.replace(re, "");
    }
    s = s
      .trim()
      .replace(/[,.\-–—]+$/, "")
      .trim();
  } while (s !== prev);

  s = s.replace(/[^\p{L}\p{N}\s&]/gu, " ").replace(/\s+/g, " ").trim();
  return s;
}

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  "US$": "USD",
  USD: "USD",
  $: "USD",
  EUR: "EUR",
  "€": "EUR",
  GBP: "GBP",
  "£": "GBP",
  PLN: "PLN",
  zł: "PLN",
  JPY: "JPY",
  "¥": "JPY",
};

const CURRENCY_SYMBOL_ORDER = [
  "US$",
  "USD",
  "EUR",
  "GBP",
  "PLN",
  "JPY",
  "$",
  "€",
  "£",
  "zł",
  "¥",
] as const;

export interface NormalizedCurrency {
  amount_cents: number | null;
  currency: string;
}

export function normalizeCurrency(raw: string | null): NormalizedCurrency {
  if (raw === null || raw === undefined) {
    return { amount_cents: null, currency: "UNKNOWN" };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { amount_cents: null, currency: "UNKNOWN" };
  }

  let detected = "UNKNOWN";
  for (const sym of CURRENCY_SYMBOL_ORDER) {
    if (trimmed.includes(sym)) {
      detected = CURRENCY_SYMBOL_MAP[sym];
      break;
    }
  }

  const useEuropeanFormat =
    /,\d{2}(?:\D|$)/.test(trimmed) && !/\.\d{2}(?:\D|$)/.test(trimmed);

  try {
    const parsed = currency(trimmed, {
      symbol: "",
      separator: useEuropeanFormat ? "." : ",",
      decimal: useEuropeanFormat ? "," : ".",
    });
    if (Number.isNaN(parsed.value)) {
      return { amount_cents: null, currency: detected };
    }
    return {
      amount_cents: Math.round(parsed.value * 100),
      currency: detected,
    };
  } catch {
    return { amount_cents: null, currency: detected };
  }
}

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "dd.MM.yyyy",
  "d MMM yyyy",
  "MMM d, yyyy",
  "d MMMM yyyy",
] as const;

export function normalizeDate(raw: string | null): Date | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const iso = parseISO(trimmed);
  if (!Number.isNaN(iso.getTime())) {
    return iso;
  }

  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

export function normalizeEmail(raw: string | null): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return trimmed.toLowerCase();
}
