import { Resend } from "resend";

import { formatAmount, type ReportSummary } from "@/lib/report-builder";

// Mirrors the from-address convention in lib/digest.ts. Falls back to the
// shared DIGEST_FROM_ADDRESS so a single verified sender configures both flows.
const FROM_ADDRESS =
  process.env.REPORT_FROM_ADDRESS ??
  process.env.DIGEST_FROM_ADDRESS ??
  "Crossbook <onboarding@resend.dev>";

export interface ReportEmailInput {
  email: string;
  reportId: string;
  summary: ReportSummary;
  requiresUpgrade: boolean;
}

export interface SendReportEmailResult {
  status: "sent" | "skipped" | "failed";
  error?: string;
}

export interface SendReportEmailOptions {
  resend?: Resend;
}

export function renderReportEmail(input: ReportEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crossbook.app";
  const reportUrl = `${appUrl}/report/${input.reportId}`;
  const { summary } = input;

  const conflicts = summary.total_conflicts.toLocaleString();
  const highPriority = summary.high_priority_conflicts.toLocaleString();
  const atRisk = formatAmount(summary.total_amount_at_risk_cents);
  const missing = summary.missing_qbo_invoices.toLocaleString();

  const subject =
    summary.total_conflicts === 0
      ? "Your Crossbook report is ready — no conflicts found"
      : `Your Crossbook report is ready — ${conflicts} conflicts, ${atRisk} at risk`;

  const upgradeLine = input.requiresUpgrade
    ? "\n\nThis is a free report: the full summary plus the first 5 conflicts are unlocked. Upgrade to $49/mo to unblur every conflict, run bulk actions, and get monthly delta tracking."
    : "";

  const text = `Your reconciliation report is ready.

${conflicts} conflicts across ${summary.total_records_hubspot + summary.total_records_quickbooks} records
${highPriority} high priority
${atRisk} in amount mismatches
${missing} deals likely missing QuickBooks invoices

View your report: ${reportUrl}${upgradeLine}

Your CSV files are deleted after 30 days. Reports are kept while your account is active.

— Crossbook`;

  const upgradeHtml = input.requiresUpgrade
    ? `<p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 16px 0 0;">This is a free report: the full summary plus the first 5 conflicts are unlocked. <a href="${appUrl}/pricing" style="color: #18181b;">Upgrade to $49/mo</a> to unblur every conflict, run bulk actions, and get monthly delta tracking.</p>`
    : "";

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h2 style="margin: 0 0 12px;">Your reconciliation report is ready</h2>
  <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
    <tr><td style="padding: 6px 0; color: #71717a;">Conflicts</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${conflicts}</td></tr>
    <tr><td style="padding: 6px 0; color: #71717a;">High priority</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${highPriority}</td></tr>
    <tr><td style="padding: 6px 0; color: #71717a;">Amount at risk</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${atRisk}</td></tr>
    <tr><td style="padding: 6px 0; color: #71717a;">Likely missing QBO invoices</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${missing}</td></tr>
  </table>
  <p style="margin: 24px 0;">
    <a href="${reportUrl}" style="display: inline-block; background: #18181b; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View your report</a>
  </p>
  ${upgradeHtml}
  <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin-top: 24px;">Your CSV files are deleted after 30 days. Reports are kept while your account is active.</p>
  <p style="color: #71717a; font-size: 13px;">— Crossbook</p>
</body></html>`;

  return { subject, html, text };
}

/**
 * Sends the "your report is ready" email. Never throws: a failed send must not
 * fail report creation (the report is also viewable in-browser). Returns a
 * structured result the caller can log.
 */
export async function sendReportReadyEmail(
  input: ReportEmailInput,
  options: SendReportEmailOptions = {},
): Promise<SendReportEmailResult> {
  const resend =
    options.resend ??
    (process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null);

  if (!resend) {
    return { status: "skipped", error: "RESEND_API_KEY not configured" };
  }

  const { subject, html, text } = renderReportEmail(input);

  try {
    const response = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.email,
      subject,
      html,
      text,
    });
    if (response.error) {
      return { status: "failed", error: response.error.message };
    }
    return { status: "sent" };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "unknown send error";
    return { status: "failed", error: message };
  }
}
