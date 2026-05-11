import { describe, expect, it, vi } from "vitest";

import type { MatchPair } from "./conflict-scorer";
import type { NormalizedRecord } from "./normalize-record";
import {
  CONFIDENCE_FALLBACK_THRESHOLD,
  MAX_BATCH_SIZE,
  analyzeBatch,
  analyzePairs,
  applyConfidenceFallback,
  buildBatch,
  chunk,
  parseClaudeJson,
  type AnalysisResult,
} from "./claude";

const buildRecord = (overrides: Partial<NormalizedRecord> = {}): NormalizedRecord => ({
  source: "HUBSPOT",
  source_row_index: 0,
  company_name_raw: "Acme",
  company_name_normalized: "acme",
  amount_raw: "10000",
  amount_cents: 1000000,
  currency: "USD",
  email: "a@b.com",
  status: null,
  date_raw: "2026-01-01",
  date: new Date("2026-01-01T00:00:00Z"),
  raw: {},
  ...overrides,
});

const buildPair = (overrides: Partial<MatchPair> = {}): MatchPair => ({
  hubspot_record: buildRecord(),
  quickbooks_record: buildRecord({ source: "QUICKBOOKS" }),
  match_confidence: 0.9,
  match_signals: {
    name_score: 1,
    email_score: 1,
    amount_score: 1,
    date_score: 1,
    combined: 1,
  },
  ...overrides,
});

const buildClaudeResponse = (results: AnalysisResult[]) => ({
  id: "msg_test",
  type: "message" as const,
  role: "assistant" as const,
  model: "claude-sonnet-4-6",
  stop_reason: "end_turn" as const,
  stop_sequence: null,
  usage: { input_tokens: 0, output_tokens: 0 } as Record<string, unknown>,
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({ results }),
    },
  ],
});

describe("chunk", () => {
  it("splits an array evenly", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns empty when input empty", () => {
    expect(chunk([], 4)).toEqual([]);
  });
  it("rejects non-positive size", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe("buildBatch", () => {
  it("serializes records into Claude input shape", () => {
    const pair = buildPair();
    const out = buildBatch([pair]);
    expect(out).toHaveLength(1);
    expect(out[0].pair_index).toBe(0);
    expect(out[0].hubspot_record?.company_name).toBe("Acme");
    expect(out[0].hubspot_record?.amount_cents).toBe(1000000);
    expect(out[0].hubspot_record?.date).toBe("2026-01-01");
  });

  it("skips pairs handled by pattern library", () => {
    const pairs = [buildPair(), buildPair(), buildPair()];
    const out = buildBatch(pairs, new Set([1]));
    expect(out.map((p) => p.pair_index)).toEqual([0, 2]);
  });

  it("nulls record side when missing", () => {
    const orphan = buildPair({ quickbooks_record: null, match_confidence: 0 });
    const out = buildBatch([orphan]);
    expect(out[0].quickbooks_record).toBeNull();
  });
});

describe("parseClaudeJson", () => {
  it("parses well-formed JSON", () => {
    const text = JSON.stringify({
      results: [
        {
          pair_index: 0,
          entity_match: true,
          entity_match_confidence: 0.95,
          conflicts: [],
        },
      ],
    });
    const results = parseClaudeJson(text);
    expect(results).toHaveLength(1);
    expect(results[0].entity_match).toBe(true);
  });

  it("strips code-fence wrappers", () => {
    const text = "```json\n" + JSON.stringify({
      results: [
        { pair_index: 0, entity_match: false, entity_match_confidence: 0.4, conflicts: [] },
      ],
    }) + "\n```";
    const results = parseClaudeJson(text);
    expect(results[0].entity_match).toBe(false);
  });

  it("throws on schema-invalid output", () => {
    expect(() => parseClaudeJson('{"results": [{"bogus": true}]}')).toThrow();
  });

  it("throws on non-JSON", () => {
    expect(() => parseClaudeJson("not json at all")).toThrow();
  });

  it("rejects out-of-range confidence", () => {
    const text = JSON.stringify({
      results: [
        {
          pair_index: 0,
          entity_match: true,
          entity_match_confidence: 1.5,
          conflicts: [],
        },
      ],
    });
    expect(() => parseClaudeJson(text)).toThrow();
  });
});

describe("applyConfidenceFallback", () => {
  const baseConflict = {
    field: "amount",
    hubspot_value: "$10,000",
    hubspot_row_index: 0,
    quickbooks_value: "$10,000",
    quickbooks_row_index: 0,
    explanation: "x",
    priority: "MEDIUM" as const,
    amount_at_risk_cents: null,
    conflict_type: "AMOUNT" as const,
  };

  it("downgrades TRUST_HUBSPOT below threshold to MANUAL_REVIEW", () => {
    const result: AnalysisResult = {
      pair_index: 0,
      entity_match: true,
      entity_match_confidence: 0.9,
      conflicts: [
        {
          ...baseConflict,
          recommended_action: "TRUST_HUBSPOT",
          confidence: CONFIDENCE_FALLBACK_THRESHOLD - 0.01,
        },
      ],
    };
    const out = applyConfidenceFallback(result);
    expect(out.conflicts[0].recommended_action).toBe("MANUAL_REVIEW");
  });

  it("downgrades TRUST_QUICKBOOKS below threshold to MANUAL_REVIEW", () => {
    const result: AnalysisResult = {
      pair_index: 0,
      entity_match: true,
      entity_match_confidence: 0.9,
      conflicts: [
        {
          ...baseConflict,
          recommended_action: "TRUST_QUICKBOOKS",
          confidence: 0.3,
        },
      ],
    };
    const out = applyConfidenceFallback(result);
    expect(out.conflicts[0].recommended_action).toBe("MANUAL_REVIEW");
  });

  it("leaves TRUST_* alone when confidence >= threshold", () => {
    const result: AnalysisResult = {
      pair_index: 0,
      entity_match: true,
      entity_match_confidence: 0.9,
      conflicts: [
        {
          ...baseConflict,
          recommended_action: "TRUST_HUBSPOT",
          confidence: 0.9,
        },
      ],
    };
    const out = applyConfidenceFallback(result);
    expect(out.conflicts[0].recommended_action).toBe("TRUST_HUBSPOT");
  });

  it("leaves IGNORE / MANUAL_REVIEW alone regardless of confidence", () => {
    const result: AnalysisResult = {
      pair_index: 0,
      entity_match: true,
      entity_match_confidence: 0.9,
      conflicts: [
        {
          ...baseConflict,
          recommended_action: "IGNORE",
          confidence: 0.1,
        },
      ],
    };
    const out = applyConfidenceFallback(result);
    expect(out.conflicts[0].recommended_action).toBe("IGNORE");
  });

  it("skips fallback entirely when entity_match=false", () => {
    const result: AnalysisResult = {
      pair_index: 0,
      entity_match: false,
      entity_match_confidence: 0.3,
      conflicts: [
        {
          ...baseConflict,
          recommended_action: "TRUST_HUBSPOT",
          confidence: 0.1,
        },
      ],
    };
    const out = applyConfidenceFallback(result);
    expect(out.conflicts[0].recommended_action).toBe("TRUST_HUBSPOT");
  });
});

describe("analyzeBatch (mocked Anthropic client)", () => {
  it("calls Anthropic with system prompt cached + parses response", async () => {
    const sample: AnalysisResult = {
      pair_index: 0,
      entity_match: true,
      entity_match_confidence: 0.95,
      conflicts: [],
    };
    const mockCreate = vi.fn().mockResolvedValue(buildClaudeResponse([sample]));
    const client = { messages: { create: mockCreate } } as unknown as import(
      "@anthropic-ai/sdk"
    ).default;

    const inputs = buildBatch([buildPair()]);
    const results = await analyzeBatch(inputs, { client });
    expect(results).toEqual([sample]);

    const call = mockCreate.mock.calls[0][0];
    expect(call.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(call.model).toBe("claude-sonnet-4-6");
  });

  it("applies confidence fallback after parsing", async () => {
    const lowConf: AnalysisResult = {
      pair_index: 0,
      entity_match: true,
      entity_match_confidence: 0.9,
      conflicts: [
        {
          field: "amount",
          hubspot_value: "$10,000",
          hubspot_row_index: 0,
          quickbooks_value: "$8,000",
          quickbooks_row_index: 0,
          explanation: "x",
          recommended_action: "TRUST_HUBSPOT",
          priority: "MEDIUM",
          amount_at_risk_cents: 200000,
          confidence: 0.4,
          conflict_type: "AMOUNT",
        },
      ],
    };
    const mockCreate = vi.fn().mockResolvedValue(buildClaudeResponse([lowConf]));
    const client = { messages: { create: mockCreate } } as unknown as import(
      "@anthropic-ai/sdk"
    ).default;
    const results = await analyzeBatch(buildBatch([buildPair()]), { client });
    expect(results[0].conflicts[0].recommended_action).toBe("MANUAL_REVIEW");
  });

  it("returns [] on empty input without calling Claude", async () => {
    const mockCreate = vi.fn();
    const client = { messages: { create: mockCreate } } as unknown as import(
      "@anthropic-ai/sdk"
    ).default;
    const results = await analyzeBatch([], { client });
    expect(results).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects oversized batch", async () => {
    const inputs = buildBatch(Array.from({ length: MAX_BATCH_SIZE + 1 }, () => buildPair()));
    await expect(analyzeBatch(inputs)).rejects.toThrow(/max is/);
  });

  it("throws when Claude returns no text block", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "image", source: {} }],
    });
    const client = { messages: { create: mockCreate } } as unknown as import(
      "@anthropic-ai/sdk"
    ).default;
    await expect(
      analyzeBatch(buildBatch([buildPair()]), { client }),
    ).rejects.toThrow(/no text block/);
  });
});

describe("analyzePairs (batching + concurrency)", () => {
  it("splits >MAX_BATCH_SIZE pairs into chunks", async () => {
    const pairs = Array.from({ length: 10 }, (_, i) =>
      buildPair({ hubspot_record: buildRecord({ source_row_index: i }) }),
    );
    const respond = (input: unknown) => {
      const { pairs: batch } = input as { pairs: { pair_index: number }[] };
      return buildClaudeResponse(
        batch.map((p) => ({
          pair_index: p.pair_index,
          entity_match: true,
          entity_match_confidence: 0.9,
          conflicts: [],
        })),
      );
    };
    const mockCreate = vi.fn().mockImplementation(async (args: { messages: { content: string }[] }) => {
      const userMessage = JSON.parse(args.messages[0].content);
      return respond(userMessage);
    });
    const client = { messages: { create: mockCreate } } as unknown as import(
      "@anthropic-ai/sdk"
    ).default;
    const results = await analyzePairs(pairs, new Set(), { client });
    expect(results).toHaveLength(10);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("returns [] when every pair is in skipIndexes", async () => {
    const mockCreate = vi.fn();
    const client = { messages: { create: mockCreate } } as unknown as import(
      "@anthropic-ai/sdk"
    ).default;
    const pairs = [buildPair(), buildPair()];
    const results = await analyzePairs(pairs, new Set([0, 1]), { client });
    expect(results).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
