import { describe, expect, it } from "vitest";

import {
  isDisposableEmail,
  validateEmailForFreeReport,
} from "./email-validation";

describe("isDisposableEmail", () => {
  it("allows gmail.com", () => {
    expect(isDisposableEmail("alice@gmail.com")).toBe(false);
  });

  it("allows a normal company domain", () => {
    expect(isDisposableEmail("ops@acme-corp.com")).toBe(false);
  });

  it("blocks mailinator.com", () => {
    expect(isDisposableEmail("test@mailinator.com")).toBe(true);
  });

  it("blocks 10minutemail.com", () => {
    expect(isDisposableEmail("foo@10minutemail.com")).toBe(true);
  });

  it("blocks tempmail.org (supplemental list)", () => {
    expect(isDisposableEmail("foo@tempmail.org")).toBe(true);
  });

  it("is case-insensitive for the domain", () => {
    expect(isDisposableEmail("Foo@Mailinator.COM")).toBe(true);
  });

  it("handles whitespace around the address", () => {
    expect(isDisposableEmail("   user@mailinator.com  ")).toBe(true);
  });

  it("returns false for clearly malformed input (no @)", () => {
    expect(isDisposableEmail("not-an-email")).toBe(false);
  });

  it("returns false for input with no domain", () => {
    expect(isDisposableEmail("user@")).toBe(false);
  });
});

describe("validateEmailForFreeReport", () => {
  it("returns valid=true with no reason for gmail.com", () => {
    expect(validateEmailForFreeReport("alice@gmail.com")).toEqual({
      valid: true,
      reason: null,
    });
  });

  it("returns valid=true for a normal company domain", () => {
    expect(validateEmailForFreeReport("ops@acme-corp.com")).toEqual({
      valid: true,
      reason: null,
    });
  });

  it("returns valid=false with a friendly reason for mailinator.com", () => {
    const result = validateEmailForFreeReport("test@mailinator.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      "Please use a business or personal email address.",
    );
  });

  it("returns valid=false for 10minutemail.com", () => {
    const result = validateEmailForFreeReport("foo@10minutemail.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      "Please use a business or personal email address.",
    );
  });

  it("returns valid=false for tempmail.org", () => {
    const result = validateEmailForFreeReport("foo@tempmail.org");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      "Please use a business or personal email address.",
    );
  });
});
