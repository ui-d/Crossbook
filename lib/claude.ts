import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type { MatchPair } from "./conflict-scorer";
import type { NormalizedRecord } from "./normalize-record";
import type { ConflictType, RecommendedAction } from "./pattern-library";

const CLAUDE_MODEL = "claude-sonnet-4-6";
export const CONFIDENCE_FALLBACK_THRESHOLD = 0.65;
export const MAX_BATCH_SIZE = 8;
export const MAX_CONCURRENCY = 4;

export const SYSTEM_PROMPT = `You are a financial data reconciliation expert helping SMB RevOps teams.
You receive pairs of records from HubSpot CRM (deals) and QuickBooks (customers/invoices)
that appear to represent the same company, after pre-processing has normalized company names,
currencies, and dates.

Your job:
1. Confirm whether they represent the same entity, or are a false match.
2. Identify all conflicts between the two records.
3. Explain each conflict in plain English (1-2 sentences max, no jargon).
4. Recommend an action with reasoning, BUT NEVER take the action - only recommend.
5. Cite source row indices for every claim.

Strict rules:
- NEVER fabricate values. If a field is missing, say "missing" - never invent.
- ALWAYS cite source_row_index from both records when making a claim.
- Use plain English. No "discrepancy" - say "different". No "reconcile" - say "match up".
- Be precise about money. "$12,400 in HubSpot vs $10,200 in QuickBooks" - not "amounts differ".
- If confidence < 0.7 that records represent the same entity, mark entity_match=false and add a single "POSSIBLE_FALSE_MATCH" conflict.

Respond in valid JSON only. No markdown, no preamble, no code fences. The JSON must be:
{
  "results": [
    {
      "pair_index": number,
      "entity_match": boolean,
      "entity_match_confidence": number,
      "conflicts": [
        {
          "field": string,
          "hubspot_value": string | null,
          "hubspot_row_index": number | null,
          "quickbooks_value": string | null,
          "quickbooks_row_index": number | null,
          "explanation": string,
          "recommended_action": "TRUST_HUBSPOT" | "TRUST_QUICKBOOKS" | "MANUAL_REVIEW" | "IGNORE",
          "priority": "HIGH" | "MEDIUM" | "LOW",
          "amount_at_risk_cents": number | null,
          "confidence": number,
          "conflict_type": "AMOUNT" | "STATUS" | "MISSING" | "DUPLICATE" | "DATE" | "CURRENCY" | "EMAIL"
        }
      ]
    }
  ]
}`;

const conflictSchema = z.object({
  field: z.string(),
  hubspot_value: z.string().nullish().transform((v) => v ?? null),
  hubspot_row_index: z.number().int().nullish().transform((v) => v ?? null),
  quickbooks_value: z.string().nullish().transform((v) => v ?? null),
  quickbooks_row_index: z.number().int().nullish().transform((v) => v ?? null),
  explanation: z.string(),
  recommended_action: z.enum([
    "TRUST_HUBSPOT",
    "TRUST_QUICKBOOKS",
    "MANUAL_REVIEW",
    "IGNORE",
  ]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  amount_at_risk_cents: z.number().nullish().transform((v) => v ?? null),
  confidence: z.number().min(0).max(1),
  conflict_type: z.enum([
    "AMOUNT",
    "STATUS",
    "MISSING",
    "DUPLICATE",
    "DATE",
    "CURRENCY",
    "EMAIL",
  ]),
});

const resultSchema = z.object({
  pair_index: z.number().int(),
  entity_match: z.boolean(),
  entity_match_confidence: z.number().min(0).max(1),
  conflicts: z.array(conflictSchema),
});

const responseSchema = z.object({
  results: z.array(resultSchema),
});

export type Conflict = z.infer<typeof conflictSchema>;
export type AnalysisResult = z.infer<typeof resultSchema>;

export interface ClaudePairInput {
  pair_index: number;
  hubspot_record: SerializedRecord | null;
  quickbooks_record: SerializedRecord | null;
  match_confidence: number;
}

interface SerializedRecord {
  source_row_index: number;
  company_name: string;
  amount_cents: number | null;
  currency: string;
  email: string | null;
  status: string | null;
  date: string | null;
}

function formatDateForClaude(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function serialize(record: NormalizedRecord | null): SerializedRecord | null {
  if (!record) return null;
  return {
    source_row_index: record.source_row_index,
    company_name: record.company_name_raw,
    amount_cents: record.amount_cents,
    currency: record.currency,
    email: record.email,
    status: record.status,
    date: formatDateForClaude(record.date),
  };
}

export function buildBatch(
  pairs: MatchPair[],
  skipIndexes: Set<number> = new Set(),
): ClaudePairInput[] {
  const out: ClaudePairInput[] = [];
  for (let i = 0; i < pairs.length; i++) {
    if (skipIndexes.has(i)) continue;
    const pair = pairs[i];
    out.push({
      pair_index: i,
      hubspot_record: serialize(pair.hubspot_record),
      quickbooks_record: serialize(pair.quickbooks_record),
      match_confidence: pair.match_confidence,
    });
  }
  return out;
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function applyConfidenceFallback(result: AnalysisResult): AnalysisResult {
  if (!result.entity_match) {
    return result;
  }
  const conflicts = result.conflicts.map((c) =>
    c.confidence < CONFIDENCE_FALLBACK_THRESHOLD &&
    (c.recommended_action === "TRUST_HUBSPOT" ||
      c.recommended_action === "TRUST_QUICKBOOKS")
      ? { ...c, recommended_action: "MANUAL_REVIEW" as RecommendedAction }
      : c,
  );
  return { ...result, conflicts };
}

export function parseClaudeJson(jsonText: string): AnalysisResult[] {
  const trimmed = jsonText.trim();
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(stripped);
  return responseSchema.parse(parsed).results;
}

export interface AnalyzeBatchOptions {
  client?: Anthropic;
  model?: string;
  maxTokens?: number;
}

export async function analyzeBatch(
  inputs: ClaudePairInput[],
  options: AnalyzeBatchOptions = {},
): Promise<AnalysisResult[]> {
  if (inputs.length === 0) return [];
  if (inputs.length > MAX_BATCH_SIZE) {
    throw new Error(
      `analyzeBatch received ${inputs.length} inputs; max is ${MAX_BATCH_SIZE}. Use analyzePairs.`,
    );
  }

  const client = options.client ?? new Anthropic();
  const response = await client.messages.create({
    model: options.model ?? CLAUDE_MODEL,
    max_tokens: options.maxTokens ?? 4000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify({ pairs: inputs }),
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response contained no text block.");
  }

  const rawResults = parseClaudeJson(textBlock.text);
  return rawResults.map(applyConfidenceFallback);
}

async function runWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function analyzePairs(
  pairs: MatchPair[],
  skipIndexes: Set<number> = new Set(),
  options: AnalyzeBatchOptions = {},
): Promise<AnalysisResult[]> {
  const inputs = buildBatch(pairs, skipIndexes);
  if (inputs.length === 0) return [];
  const batches = chunk(inputs, MAX_BATCH_SIZE);
  const batchResults = await runWithConcurrency(batches, MAX_CONCURRENCY, (batch) =>
    analyzeBatch(batch, options),
  );
  return batchResults.flat();
}

export function mergeWithPatterns(
  results: AnalysisResult[],
  patternMatchCount: number,
): {
  total_pairs_analyzed_by_claude: number;
  total_pairs_handled_by_patterns: number;
} {
  return {
    total_pairs_analyzed_by_claude: results.length,
    total_pairs_handled_by_patterns: patternMatchCount,
  };
}

export type { ConflictType };
