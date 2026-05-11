"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const decisionSchema = z.enum([
  "TRUST_HUBSPOT",
  "TRUST_QUICKBOOKS",
  "MANUAL_REVIEW",
  "IGNORE",
]);

const inputSchema = z.object({
  reportId: z.string().uuid(),
  conflictId: z.string().min(1),
  decision: decisionSchema,
  notes: z.string().nullable(),
  wasBulk: z.boolean().optional(),
});

export type DecisionInput = z.infer<typeof inputSchema>;

interface DecisionResult {
  ok: boolean;
  error?: string;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function saveDecisionAction(
  rawInput: unknown,
): Promise<DecisionResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid decision payload.",
    };
  }
  const supabase = adminClient();
  const { error } = await supabase.from("conflict_decisions").insert({
    report_id: parsed.data.reportId,
    conflict_id: parsed.data.conflictId,
    decision: parsed.data.decision,
    notes: parsed.data.notes,
    was_bulk: parsed.data.wasBulk ?? false,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath(`/report/${parsed.data.reportId}`);
  return { ok: true };
}

const bulkInputSchema = z.object({
  reportId: z.string().uuid(),
  conflictIds: z.array(z.string().min(1)).min(1).max(500),
  decision: decisionSchema,
});

export async function saveBulkDecisionsAction(
  rawInput: unknown,
): Promise<DecisionResult> {
  const parsed = bulkInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bulk decision payload.",
    };
  }
  const supabase = adminClient();
  const rows = parsed.data.conflictIds.map((conflictId) => ({
    report_id: parsed.data.reportId,
    conflict_id: conflictId,
    decision: parsed.data.decision,
    notes: null,
    was_bulk: true,
  }));
  const { error } = await supabase.from("conflict_decisions").insert(rows);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath(`/report/${parsed.data.reportId}`);
  return { ok: true };
}
