import blocklist from "disposable-email-domains";
import wildcardBlocklist from "disposable-email-domains/wildcard.json";

const blocklistSet = new Set<string>(
  (blocklist as readonly string[]).map((d) => d.toLowerCase()),
);

const wildcardSuffixes: readonly string[] = (
  wildcardBlocklist as readonly string[]
).map((d) => d.toLowerCase());

// Supplemental block list for well-known disposable providers absent from the
// upstream package (e.g. tempmail.org). Keep small and concrete.
const SUPPLEMENTAL_DISPOSABLE_DOMAINS: readonly string[] = [
  "tempmail.org",
  "temp-mail.org",
];

const supplementalSet = new Set<string>(
  SUPPLEMENTAL_DISPOSABLE_DOMAINS.map((d) => d.toLowerCase()),
);

export interface EmailValidationResult {
  valid: boolean;
  reason: string | null;
}

const FRIENDLY_REASON =
  "Please use a business or personal email address.";

function extractDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex < 1 || atIndex === trimmed.length - 1) return null;
  const domain = trimmed.slice(atIndex + 1);
  if (!domain.includes(".")) return null;
  return domain;
}

function matchesWildcardSuffix(domain: string): boolean {
  for (const suffix of wildcardSuffixes) {
    if (domain === suffix || domain.endsWith(`.${suffix}`)) return true;
  }
  return false;
}

export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;
  if (blocklistSet.has(domain)) return true;
  if (supplementalSet.has(domain)) return true;
  if (matchesWildcardSuffix(domain)) return true;
  return false;
}

export function validateEmailForFreeReport(
  email: string,
): EmailValidationResult {
  if (isDisposableEmail(email)) {
    return { valid: false, reason: FRIENDLY_REASON };
  }
  return { valid: true, reason: null };
}
