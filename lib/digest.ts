import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const MIN_DAYS_SINCE_LAST_REPORT = 25;
export const MAX_DAYS_SINCE_LAST_REPORT = 60;

const FROM_ADDRESS =
  process.env.DIGEST_FROM_ADDRESS ?? "Crossbook <onboarding@resend.dev>";

export interface DigestCandidate {
  user_id: string;
  email: string;
  last_report_id: string;
  last_report_created_at: string;
  days_since_last_report: number;
}

export interface DigestRunResult {
  candidates_found: number;
  skipped_already_sent: number;
  sent: number;
  failed: number;
  details: Array<{
    user_id: string;
    email: string;
    status: "sent" | "skipped" | "failed";
    error?: string;
  }>;
}

interface DigestRowSupabaseClient {
  from: SupabaseClient["from"];
}

function currentMonthDate(now: Date = new Date()): string {
  const yyyy = now.getFullYear().toString().padStart(4, "0");
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

interface SubscriptionRow {
  user_id: string;
  status: string;
}

interface ReportRow {
  id: string;
  user_id: string | null;
  email: string;
  created_at: string;
}

export async function findDigestCandidates(
  supabase: DigestRowSupabaseClient,
  now: Date = new Date(),
): Promise<DigestCandidate[]> {
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id,status")
    .in("status", ["active", "trialing"]);
  const subscriptions = (subs ?? []) as SubscriptionRow[];
  if (subscriptions.length === 0) return [];

  const userIds = subscriptions.map((s) => s.user_id);
  const minCreatedAt = new Date(now);
  minCreatedAt.setDate(minCreatedAt.getDate() - MAX_DAYS_SINCE_LAST_REPORT);
  const maxCreatedAt = new Date(now);
  maxCreatedAt.setDate(maxCreatedAt.getDate() - MIN_DAYS_SINCE_LAST_REPORT);

  const { data: reports } = await supabase
    .from("reports")
    .select("id,user_id,email,created_at")
    .in("user_id", userIds)
    .lte("created_at", maxCreatedAt.toISOString())
    .gte("created_at", minCreatedAt.toISOString())
    .order("created_at", { ascending: false });

  const rows = (reports ?? []) as ReportRow[];
  const latestByUserId = new Map<string, ReportRow>();
  for (const row of rows) {
    if (!row.user_id) continue;
    if (!latestByUserId.has(row.user_id)) {
      latestByUserId.set(row.user_id, row);
    }
  }

  const candidates: DigestCandidate[] = [];
  for (const row of latestByUserId.values()) {
    const days = Math.floor(
      (now.getTime() - new Date(row.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    candidates.push({
      user_id: row.user_id!,
      email: row.email,
      last_report_id: row.id,
      last_report_created_at: row.created_at,
      days_since_last_report: days,
    });
  }
  return candidates;
}

export function renderDigestEmail(candidate: DigestCandidate): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Time for your monthly reconciliation? Your last report was ${candidate.days_since_last_report} days ago.`;
  const lastDate = new Date(candidate.last_report_created_at).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crossbook.app";
  const text = `Drop your latest HubSpot + QuickBooks exports — we'll show you exactly what's changed since ${lastDate}. Should take 60 seconds.

Upload your CSVs: ${appUrl}/upload

— Crossbook`;
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h2 style="margin: 0 0 12px;">It's time for your monthly reconciliation</h2>
  <p style="line-height: 1.5;">Drop your latest HubSpot + QuickBooks exports — we'll show you exactly <strong>what's changed since ${lastDate}</strong>. Should take 60 seconds.</p>
  <p style="margin: 24px 0;">
    <a href="${appUrl}/upload" style="display: inline-block; background: #18181b; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Upload your CSVs</a>
  </p>
  <p style="color: #71717a; font-size: 13px; line-height: 1.5;">Your last report was ${candidate.days_since_last_report} days ago. We won't send another reminder until next month.</p>
  <p style="color: #71717a; font-size: 13px;">— Crossbook</p>
</body></html>`;
  return { subject, html, text };
}

export interface SendDigestOptions {
  resend?: Resend;
  now?: Date;
  dryRun?: boolean;
}

export async function runDigestBatch(
  supabase: DigestRowSupabaseClient,
  options: SendDigestOptions = {},
): Promise<DigestRunResult> {
  const now = options.now ?? new Date();
  const month = currentMonthDate(now);

  const candidates = await findDigestCandidates(supabase, now);
  const result: DigestRunResult = {
    candidates_found: candidates.length,
    skipped_already_sent: 0,
    sent: 0,
    failed: 0,
    details: [],
  };

  if (candidates.length === 0) return result;

  const userIds = candidates.map((c) => c.user_id);
  const { data: sentRows } = await supabase
    .from("digest_sends")
    .select("user_id")
    .eq("digest_month", month)
    .in("user_id", userIds);
  const alreadySent = new Set(
    ((sentRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
  );

  const resend =
    options.resend ??
    (process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null);

  for (const candidate of candidates) {
    if (alreadySent.has(candidate.user_id)) {
      result.skipped_already_sent++;
      result.details.push({
        user_id: candidate.user_id,
        email: candidate.email,
        status: "skipped",
      });
      continue;
    }

    if (options.dryRun) {
      result.sent++;
      result.details.push({
        user_id: candidate.user_id,
        email: candidate.email,
        status: "sent",
      });
      continue;
    }

    if (!resend) {
      result.failed++;
      result.details.push({
        user_id: candidate.user_id,
        email: candidate.email,
        status: "failed",
        error: "RESEND_API_KEY not configured",
      });
      continue;
    }

    const { subject, html, text } = renderDigestEmail(candidate);

    try {
      const response = await resend.emails.send({
        from: FROM_ADDRESS,
        to: candidate.email,
        subject,
        html,
        text,
      });
      if (response.error) {
        result.failed++;
        result.details.push({
          user_id: candidate.user_id,
          email: candidate.email,
          status: "failed",
          error: response.error.message,
        });
        continue;
      }
      const insertResult = await supabase
        .from("digest_sends")
        .insert({ user_id: candidate.user_id, digest_month: month });
      if (insertResult.error) {
        result.failed++;
        result.details.push({
          user_id: candidate.user_id,
          email: candidate.email,
          status: "failed",
          error: insertResult.error.message,
        });
        continue;
      }
      result.sent++;
      result.details.push({
        user_id: candidate.user_id,
        email: candidate.email,
        status: "sent",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "unknown send error";
      result.failed++;
      result.details.push({
        user_id: candidate.user_id,
        email: candidate.email,
        status: "failed",
        error: message,
      });
    }
  }

  return result;
}
