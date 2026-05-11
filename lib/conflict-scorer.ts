import type { NormalizedRecord } from "./normalize-record";

const NAME_WEIGHT = 0.4;
const EMAIL_WEIGHT = 0.3;
const AMOUNT_WEIGHT = 0.2;
const DATE_WEIGHT = 0.1;

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const FULL_CREDIT_DAYS = 90;
const ZERO_CREDIT_DAYS = 365;

export const MATCH_THRESHOLD = 0.5;

export interface MatchSignals {
  name_score: number;
  email_score: number;
  amount_score: number;
  date_score: number;
  combined: number;
}

export interface MatchPair {
  hubspot_record: NormalizedRecord | null;
  quickbooks_record: NormalizedRecord | null;
  match_confidence: number;
  match_signals: MatchSignals;
}

const emailDomain = (email: string | null): string | null => {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1);
};

export function scoreEmail(
  hubspot: string | null,
  quickbooks: string | null,
): number {
  if (!hubspot || !quickbooks) return 0;
  if (hubspot === quickbooks) return 1;
  const hDomain = emailDomain(hubspot);
  const qDomain = emailDomain(quickbooks);
  if (hDomain && qDomain && hDomain === qDomain) return 0.5;
  return 0;
}

export function scoreAmount(
  hubspot: number | null,
  quickbooks: number | null,
): number {
  if (hubspot === null || quickbooks === null) return 0;
  if (hubspot === 0 && quickbooks === 0) return 1;
  if (hubspot <= 0 || quickbooks <= 0) return 0;
  const ratio = Math.log(hubspot / quickbooks);
  const score = 1 - Math.min(1, Math.abs(ratio));
  return Math.max(0, score);
}

export function scoreDate(
  hubspot: Date | null,
  quickbooks: Date | null,
): number {
  if (!hubspot || !quickbooks) return 0;
  const diffDays = Math.abs(hubspot.getTime() - quickbooks.getTime()) / MS_PER_DAY;
  if (diffDays <= FULL_CREDIT_DAYS) return 1;
  if (diffDays >= ZERO_CREDIT_DAYS) return 0;
  return 1 - (diffDays - FULL_CREDIT_DAYS) / (ZERO_CREDIT_DAYS - FULL_CREDIT_DAYS);
}

export function scoreName(hubspot: string, quickbooks: string): number {
  if (!hubspot || !quickbooks) return 0;
  if (hubspot === quickbooks) return 1;
  const distance = levenshtein(hubspot, quickbooks);
  const longest = Math.max(hubspot.length, quickbooks.length);
  if (longest === 0) return 0;
  return Math.max(0, 1 - distance / longest);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export function scoreMatch(
  hubspot: NormalizedRecord,
  quickbooks: NormalizedRecord,
): MatchSignals {
  const name_score = scoreName(
    hubspot.company_name_normalized,
    quickbooks.company_name_normalized,
  );
  const email_score = scoreEmail(hubspot.email, quickbooks.email);
  const amount_score = scoreAmount(hubspot.amount_cents, quickbooks.amount_cents);
  const date_score = scoreDate(hubspot.date, quickbooks.date);

  const combined =
    NAME_WEIGHT * name_score +
    EMAIL_WEIGHT * email_score +
    AMOUNT_WEIGHT * amount_score +
    DATE_WEIGHT * date_score;

  return { name_score, email_score, amount_score, date_score, combined };
}

export function findCandidatePairs(
  hubspot: NormalizedRecord[],
  quickbooks: NormalizedRecord[],
  options: { threshold?: number } = {},
): MatchPair[] {
  const threshold = options.threshold ?? MATCH_THRESHOLD;
  const pairs: MatchPair[] = [];
  const matchedHubspot = new Set<number>();
  const matchedQuickbooks = new Set<number>();

  for (const h of hubspot) {
    let best: { q: NormalizedRecord; signals: MatchSignals } | null = null;
    for (const q of quickbooks) {
      const signals = scoreMatch(h, q);
      if (signals.combined >= threshold) {
        if (!best || signals.combined > best.signals.combined) {
          best = { q, signals };
        }
      }
    }
    if (best) {
      pairs.push({
        hubspot_record: h,
        quickbooks_record: best.q,
        match_confidence: best.signals.combined,
        match_signals: best.signals,
      });
      matchedHubspot.add(h.source_row_index);
      matchedQuickbooks.add(best.q.source_row_index);
    }
  }

  for (const h of hubspot) {
    if (!matchedHubspot.has(h.source_row_index)) {
      pairs.push({
        hubspot_record: h,
        quickbooks_record: null,
        match_confidence: 0,
        match_signals: {
          name_score: 0,
          email_score: 0,
          amount_score: 0,
          date_score: 0,
          combined: 0,
        },
      });
    }
  }

  for (const q of quickbooks) {
    if (!matchedQuickbooks.has(q.source_row_index)) {
      pairs.push({
        hubspot_record: null,
        quickbooks_record: q,
        match_confidence: 0,
        match_signals: {
          name_score: 0,
          email_score: 0,
          amount_score: 0,
          date_score: 0,
          combined: 0,
        },
      });
    }
  }

  return pairs;
}
