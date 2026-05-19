/**
 * Minimal env-var-driven feature flags.
 *
 * No LaunchDarkly / Statsig — overkill at MVP scale. A flag is "on" when its
 * environment variable is set to a truthy string ("1", "true", "yes", "on",
 * case-insensitive, surrounding whitespace ignored). Anything else — unset,
 * empty, "0", "false" — is "off".
 *
 * Add new flags to the `FeatureFlag` union so callers stay type-checked.
 */

export type FeatureFlag = "DISABLE_AI_FALLBACK";

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const raw = process.env[flag];
  if (!raw) return false;
  return TRUTHY.has(raw.trim().toLowerCase());
}
