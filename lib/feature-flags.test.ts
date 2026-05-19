import { afterEach, describe, expect, it } from "vitest";

import { isFeatureEnabled } from "./feature-flags";

const FLAG = "DISABLE_AI_FALLBACK";

describe("isFeatureEnabled", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("is off when the env var is unset", () => {
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it("is off when the env var is an empty string", () => {
    process.env[FLAG] = "";
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('is off for "0"', () => {
    process.env[FLAG] = "0";
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('is off for "false"', () => {
    process.env[FLAG] = "false";
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('is on for "1"', () => {
    process.env[FLAG] = "1";
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('is on for "true"', () => {
    process.env[FLAG] = "true";
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it("is on regardless of case and surrounding whitespace", () => {
    process.env[FLAG] = "  TRUE  ";
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('is on for "yes" and "on"', () => {
    process.env[FLAG] = "yes";
    expect(isFeatureEnabled(FLAG)).toBe(true);
    process.env[FLAG] = "on";
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });
});
