import { afterEach, describe, expect, it, vi } from "vitest";

import {
  renderReportEmail,
  sendReportReadyEmail,
  type ReportEmailInput,
} from "./report-email";

const summary: ReportEmailInput["summary"] = {
  total_records_hubspot: 180,
  total_records_quickbooks: 132,
  total_pairs_analyzed: 150,
  total_conflicts: 47,
  high_priority_conflicts: 12,
  total_amount_at_risk_cents: 4_320_000,
  pattern_match_count: 20,
  claude_analyzed_count: 27,
  missing_qbo_invoices: 8,
  orphan_quickbooks: 3,
};

const baseInput: ReportEmailInput = {
  email: "user@company.com",
  reportId: "rep_123",
  summary,
  requiresUpgrade: true,
};

function fakeResend(
  send: (args: unknown) => Promise<{ error: { message: string } | null }>,
) {
  return { emails: { send: vi.fn(send) } } as never;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderReportEmail", () => {
  it("includes summary numbers and the report link", () => {
    const { subject, html, text } = renderReportEmail(baseInput);
    expect(subject).toContain("47 conflicts");
    expect(subject).toContain("$43,200.00");
    expect(html).toContain("/report/rep_123");
    expect(text).toContain("/report/rep_123");
    expect(html).toContain("12"); // high priority
    expect(text).toContain("8 deals likely missing QuickBooks invoices");
  });

  it("uses a no-conflict subject when there are zero conflicts", () => {
    const { subject } = renderReportEmail({
      ...baseInput,
      summary: { ...summary, total_conflicts: 0 },
    });
    expect(subject).toBe(
      "Your Crossbook report is ready — no conflicts found",
    );
  });

  it("adds an upgrade prompt only for free reports", () => {
    const free = renderReportEmail({ ...baseInput, requiresUpgrade: true });
    const paid = renderReportEmail({ ...baseInput, requiresUpgrade: false });
    expect(free.text).toContain("free report");
    expect(paid.text).not.toContain("free report");
  });
});

describe("sendReportReadyEmail", () => {
  it("returns sent on a successful Resend response", async () => {
    const resend = fakeResend(async () => ({ error: null }));
    const result = await sendReportReadyEmail(baseInput, { resend });
    expect(result.status).toBe("sent");
  });

  it("returns failed when Resend responds with an error", async () => {
    const resend = fakeResend(async () => ({
      error: { message: "domain not verified" },
    }));
    const result = await sendReportReadyEmail(baseInput, { resend });
    expect(result).toEqual({ status: "failed", error: "domain not verified" });
  });

  it("returns failed (never throws) when the send call throws", async () => {
    const resend = fakeResend(async () => {
      throw new Error("network down");
    });
    const result = await sendReportReadyEmail(baseInput, { resend });
    expect(result).toEqual({ status: "failed", error: "network down" });
  });

  it("returns skipped when no Resend client is available", async () => {
    const prev = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const result = await sendReportReadyEmail(baseInput);
      expect(result.status).toBe("skipped");
    } finally {
      if (prev !== undefined) process.env.RESEND_API_KEY = prev;
    }
  });
});
