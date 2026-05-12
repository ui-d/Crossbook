import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

export const DELETE_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const RETENTION_DAYS = 30;

interface SupabaseSubset {
  from: SupabaseClient["from"];
}

function signingSecret(): string {
  const secret =
    process.env.DELETION_TOKEN_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Either DELETION_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for HMAC signing.",
    );
  }
  return secret;
}

export function createDeletionToken(
  email: string,
  expiresAt: number = Date.now() + DELETE_TOKEN_TTL_MS,
): { token: string; expiresAt: number } {
  const payload = `${email.toLowerCase().trim()}::${expiresAt}`;
  const sig = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  const token = Buffer.from(`${expiresAt}.${sig}`).toString("base64url");
  return { token, expiresAt };
}

export function verifyDeletionToken(
  email: string,
  token: string,
  now: number = Date.now(),
): { valid: boolean; reason?: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "malformed token" };
  }
  const dot = decoded.indexOf(".");
  if (dot === -1) return { valid: false, reason: "malformed token" };
  const expiresAtRaw = decoded.slice(0, dot);
  const sig = decoded.slice(dot + 1);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return { valid: false, reason: "malformed token" };
  if (expiresAt < now) return { valid: false, reason: "expired" };
  const expected = createHmac("sha256", signingSecret())
    .update(`${email.toLowerCase().trim()}::${expiresAt}`)
    .digest("hex");
  const provided = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (provided.length !== expectedBuf.length) {
    return { valid: false, reason: "signature mismatch" };
  }
  if (!timingSafeEqual(provided, expectedBuf)) {
    return { valid: false, reason: "signature mismatch" };
  }
  return { valid: true };
}

export interface DeletionOutcome {
  records_deleted: number;
  tables_touched: string[];
}

export async function cascadeDeleteByEmail(
  supabase: SupabaseSubset,
  email: string,
): Promise<DeletionOutcome> {
  const normalized = email.toLowerCase().trim();
  const tablesTouched: string[] = [];
  let totalDeleted = 0;

  const { data: reports } = await supabase
    .from("reports")
    .select("id")
    .eq("email", normalized);
  const reportIds = ((reports ?? []) as { id: string }[]).map((r) => r.id);

  if (reportIds.length > 0) {
    const { error: decisionsError, count: decisionsCount } = await supabase
      .from("conflict_decisions")
      .delete({ count: "exact" })
      .in("report_id", reportIds);
    if (!decisionsError && decisionsCount) {
      tablesTouched.push("conflict_decisions");
      totalDeleted += decisionsCount;
    }
  }

  const { error: reportsError, count: reportsCount } = await supabase
    .from("reports")
    .delete({ count: "exact" })
    .eq("email", normalized);
  if (!reportsError && reportsCount) {
    tablesTouched.push("reports");
    totalDeleted += reportsCount;
  }

  const { error: freeError, count: freeCount } = await supabase
    .from("free_report_usage")
    .delete({ count: "exact" })
    .eq("email", normalized);
  if (!freeError && freeCount) {
    tablesTouched.push("free_report_usage");
    totalDeleted += freeCount;
  }

  const { error: auditError } = await supabase
    .from("data_deletion_requests")
    .insert({
      email: normalized,
      completed_at: new Date().toISOString(),
      records_deleted_count: totalDeleted,
    });
  if (!auditError) tablesTouched.push("data_deletion_requests");

  return { records_deleted: totalDeleted, tables_touched: tablesTouched };
}

export interface RetentionSweepResult {
  reports_examined: number;
  reports_purged: number;
}

export async function runRetentionSweep(
  supabase: SupabaseSubset,
  now: Date = new Date(),
): Promise<RetentionSweepResult> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const { data, error } = await supabase
    .from("reports")
    .select("id,result_json")
    .lt("created_at", cutoff.toISOString())
    .is("files_purged_at", null);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    result_json: { summary?: unknown; conflicts?: unknown } | null;
  }>;

  let purged = 0;
  for (const row of rows) {
    const sanitized = row.result_json
      ? {
          summary: row.result_json.summary ?? null,
          conflicts: [],
        }
      : null;
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        result_json: sanitized,
        files_purged_at: now.toISOString(),
      })
      .eq("id", row.id);
    if (updateError) continue;
    await supabase
      .from("report_files")
      .update({
        hubspot_csv_text: null,
        quickbooks_csv_text: null,
        purged_at: now.toISOString(),
      })
      .eq("report_id", row.id);
    purged++;
  }

  return {
    reports_examined: rows.length,
    reports_purged: purged,
  };
}
