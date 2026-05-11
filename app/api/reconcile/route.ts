import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { analyzePairs } from "@/lib/claude";
import { findCandidatePairs } from "@/lib/conflict-scorer";
import {
  parseHubSpotCsv,
  parseQuickBooksCsv,
} from "@/lib/csv-parser";
import { normalizeRecords } from "@/lib/normalize-record";
import { matchPatterns } from "@/lib/pattern-library";
import { buildReport } from "@/lib/report-builder";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 4000;

const emailSchema = z.string().email();

interface InvariantError {
  status: number;
  body: { error: string; details?: unknown };
}

const errorResponse = (
  status: number,
  error: string,
  details?: unknown,
): InvariantError => ({ status, body: { error, details } });

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for /api/reconcile.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readFileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw errorResponse(
      413,
      `File ${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 5 MB.`,
    );
  }
  return await file.text();
}

function rowCountWithinLimit(records: { length: number }, label: string): void {
  if (records.length > MAX_ROWS) {
    throw errorResponse(
      413,
      `${label} has ${records.length} rows. Max ${MAX_ROWS} on the free tier.`,
    );
  }
}

async function getFreeUsage(
  supabase: ReturnType<typeof adminClient>,
  email: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("free_report_usage")
    .select("reports_used")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data?.reports_used ?? 0;
}

async function incrementFreeUsage(
  supabase: ReturnType<typeof adminClient>,
  email: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("free_report_usage")
    .select("reports_used")
    .eq("email", email)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("free_report_usage")
      .insert({ email, reports_used: 1 });
  } else {
    await supabase
      .from("free_report_usage")
      .update({ reports_used: existing.reports_used + 1 })
      .eq("email", email);
  }
}

async function findPriorReportId(
  supabase: ReturnType<typeof adminClient>,
  email: string,
  userId: string | null,
): Promise<string | null> {
  const filter = userId
    ? supabase.from("reports").select("id").eq("user_id", userId)
    : supabase.from("reports").select("id").eq("email", email);
  const { data } = await filter
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function userHasActiveSubscription(
  supabase: ReturnType<typeof adminClient>,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.status === "active" || data?.status === "trialing";
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const form = await req.formData();
    const hubspotFile = form.get("hubspot_file");
    const quickbooksFile = form.get("quickbooks_file");
    const emailRaw = form.get("email");

    if (!(hubspotFile instanceof File) || !(quickbooksFile instanceof File)) {
      return NextResponse.json(
        { error: "Both hubspot_file and quickbooks_file are required." },
        { status: 400 },
      );
    }
    if (typeof emailRaw !== "string") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }
    const emailParse = emailSchema.safeParse(emailRaw.trim());
    if (!emailParse.success) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }
    const email = emailParse.data.toLowerCase();

    const [hubspotText, quickbooksText] = await Promise.all([
      readFileText(hubspotFile),
      readFileText(quickbooksFile),
    ]);

    const hubspotParse = parseHubSpotCsv(hubspotText);
    const quickbooksParse = parseQuickBooksCsv(quickbooksText);
    rowCountWithinLimit(hubspotParse.records, "HubSpot CSV");
    rowCountWithinLimit(quickbooksParse.records, "QuickBooks CSV");

    const hubspot = normalizeRecords(
      hubspotParse.records,
      hubspotParse.detected_columns,
    );
    const quickbooks = normalizeRecords(
      quickbooksParse.records,
      quickbooksParse.detected_columns,
    );

    const supabase = adminClient();

    const { userId } = await auth();
    const isSubscribed = await userHasActiveSubscription(supabase, userId);
    const priorUsage = isSubscribed ? 0 : await getFreeUsage(supabase, email);
    const isPaid = isSubscribed || priorUsage === 0;
    const priorReportId = await findPriorReportId(supabase, email, userId);

    const pairs = findCandidatePairs(hubspot, quickbooks);
    const patternResult = matchPatterns(pairs);

    const claudeSkipIndexes = new Set<number>();
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair.hubspot_record || !pair.quickbooks_record) {
        claudeSkipIndexes.add(i);
      }
    }

    const claudeResults =
      process.env.ANTHROPIC_API_KEY
        ? await analyzePairs(pairs, claudeSkipIndexes)
        : [];

    const report = buildReport({
      hubspot_records: hubspot,
      quickbooks_records: quickbooks,
      pairs,
      pattern_matches: patternResult.matches,
      claude_results: claudeResults,
    });

    const filesPurgedAt = new Date();
    filesPurgedAt.setDate(filesPurgedAt.getDate() + 30);

    const { data: inserted, error: insertError } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        email,
        hubspot_filename: hubspotFile.name,
        quickbooks_filename: quickbooksFile.name,
        total_records_hubspot: report.summary.total_records_hubspot,
        total_records_quickbooks: report.summary.total_records_quickbooks,
        total_conflicts: report.summary.total_conflicts,
        high_priority_conflicts: report.summary.high_priority_conflicts,
        total_amount_at_risk_cents:
          report.summary.total_amount_at_risk_cents,
        status: "done",
        result_json: report,
        pattern_matches: patternResult.matches,
        is_paid: isPaid,
        prior_report_id: priorReportId,
        files_purged_at: filesPurgedAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("reports insert failed", insertError);
      return NextResponse.json(
        { error: "Failed to persist report.", details: insertError?.message },
        { status: 500 },
      );
    }

    if (!isSubscribed && priorUsage === 0) {
      await incrementFreeUsage(supabase, email);
    }

    return NextResponse.json({
      id: inserted.id,
      is_paid: isPaid,
      requires_upgrade: !isPaid,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      "body" in error
    ) {
      const invariant = error as InvariantError;
      return NextResponse.json(invariant.body, { status: invariant.status });
    }
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    console.error("/api/reconcile failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
