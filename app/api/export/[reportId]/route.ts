import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  buildAugmentedCsv,
  buildSummaryCsv,
  type DecisionRecord,
} from "@/lib/csv-exporter";
import type { BuiltReport } from "@/lib/report-builder";

export const runtime = "nodejs";
export const maxDuration = 60;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Export requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

interface ReportRow {
  id: string;
  is_paid: boolean;
  hubspot_filename: string | null;
  quickbooks_filename: string | null;
  result_json: BuiltReport;
  created_at: string;
}

interface FilesRow {
  hubspot_csv_text: string | null;
  quickbooks_csv_text: string | null;
  purged_at: string | null;
}

interface DecisionRow {
  conflict_id: string;
  decision: DecisionRecord["decision"];
  notes: string | null;
  decided_at: string;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  const { reportId } = await params;
  const side = req.nextUrl.searchParams.get("side");
  if (side !== "hubspot" && side !== "quickbooks" && side !== "summary") {
    return NextResponse.json(
      { error: "Invalid side parameter. Use hubspot, quickbooks, or summary." },
      { status: 400 },
    );
  }

  const supabase = adminClient();
  const { data: report } = await supabase
    .from("reports")
    .select(
      "id,is_paid,hubspot_filename,quickbooks_filename,result_json,created_at",
    )
    .eq("id", reportId)
    .maybeSingle<ReportRow>();

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  if (!report.is_paid) {
    return NextResponse.json(
      { error: "Export is a paid feature. Upgrade to download the corrected CSV." },
      { status: 402 },
    );
  }
  if (!report.result_json) {
    return NextResponse.json(
      { error: "Report has no conflicts to export." },
      { status: 410 },
    );
  }

  const { data: decisionRows } = await supabase
    .from("conflict_decisions")
    .select("conflict_id,decision,notes,decided_at")
    .eq("report_id", report.id);
  const decisions: DecisionRecord[] = ((decisionRows ?? []) as DecisionRow[]).map(
    (row) => ({
      conflict_id: row.conflict_id,
      decision: row.decision,
      notes: row.notes,
      decided_at: row.decided_at,
    }),
  );

  if (side === "summary") {
    const csv = buildSummaryCsv({
      conflicts: report.result_json.conflicts,
      decisions,
      reportMeta: {
        id: report.id,
        created_at: report.created_at,
        hubspot_filename: report.hubspot_filename,
        quickbooks_filename: report.quickbooks_filename,
      },
    });
    return csvResponse(csv, `crossbook-${report.id}-summary.csv`);
  }

  const { data: files } = await supabase
    .from("report_files")
    .select("hubspot_csv_text,quickbooks_csv_text,purged_at")
    .eq("report_id", report.id)
    .maybeSingle<FilesRow>();

  if (!files || files.purged_at) {
    return NextResponse.json(
      {
        error:
          "Original CSV content was purged (>30 days). Summary CSV is still available.",
      },
      { status: 410 },
    );
  }

  const originalCsv =
    side === "hubspot" ? files.hubspot_csv_text : files.quickbooks_csv_text;
  if (!originalCsv) {
    return NextResponse.json(
      { error: `No ${side} CSV stored for this report.` },
      { status: 404 },
    );
  }

  const csv = buildAugmentedCsv({
    originalCsv,
    side,
    conflicts: report.result_json.conflicts,
    decisions,
  });

  const baseName =
    side === "hubspot"
      ? report.hubspot_filename ?? "hubspot.csv"
      : report.quickbooks_filename ?? "quickbooks.csv";
  const downloadName = baseName.replace(/\.csv$/i, "") + "-reconciled.csv";

  return csvResponse(csv, downloadName);
}

function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
