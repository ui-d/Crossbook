import { describe, expect, it, vi } from "vitest";

import {
  findDigestCandidates,
  renderDigestEmail,
  runDigestBatch,
} from "./digest";

interface QueryBuilder {
  select: (cols: string) => QueryBuilder;
  in: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  lte: (...args: unknown[]) => QueryBuilder;
  gte: (...args: unknown[]) => QueryBuilder;
  order: (...args: unknown[]) => QueryBuilder;
  insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
  then?: never;
  // resolves when await-ed via Promise.resolve in test
}

interface MockTables {
  subscriptions?: Array<{ user_id: string; status: string }>;
  reports?: Array<{
    id: string;
    user_id: string | null;
    email: string;
    created_at: string;
  }>;
  digest_sends?: Array<{ user_id: string; digest_month: string }>;
  insertError?: string;
}

function buildSupabaseMock(state: MockTables) {
  const insertedDigests: Array<{ user_id: string; digest_month: string }> = [];

  const from = vi.fn((table: string): QueryBuilder => {
    const rows: unknown[] = (state[table as keyof MockTables] as unknown[]) ?? [];
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];
    const builder: QueryBuilder = {
      select: () => builder,
      in: (col: unknown, values: unknown) => {
        const arr = values as unknown[];
        const set = new Set(arr.map(String));
        filters.push((row) => set.has(String(row[col as string])));
        return builder;
      },
      eq: (col: unknown, value: unknown) => {
        filters.push((row) => row[col as string] === value);
        return builder;
      },
      lte: (col: unknown, value: unknown) => {
        filters.push((row) => String(row[col as string]) <= String(value));
        return builder;
      },
      gte: (col: unknown, value: unknown) => {
        filters.push((row) => String(row[col as string]) >= String(value));
        return builder;
      },
      order: () => builder,
      insert: async (row) => {
        if (state.insertError) {
          return { error: { message: state.insertError } };
        }
        if (table === "digest_sends") {
          insertedDigests.push(row as { user_id: string; digest_month: string });
        }
        return { error: null };
      },
    };
    (builder as unknown as { then: (resolve: (v: { data: unknown[] }) => unknown) => void }).then =
      (resolve) => {
        const result = (rows as Array<Record<string, unknown>>).filter((row) =>
          filters.every((f) => f(row)),
        );
        return Promise.resolve({ data: result }).then(resolve);
      };
    return builder;
  });

  return {
    client: { from } as unknown as { from: typeof from },
    insertedDigests,
  };
}

const buildResendMock = (
  errorMessage?: string,
  throws?: boolean,
) => ({
  emails: {
    send: vi.fn(async () => {
      if (throws) throw new Error("network down");
      return errorMessage
        ? { error: { message: errorMessage } }
        : { data: { id: "email_1" }, error: null };
    }),
  },
});

const NOW = new Date("2026-05-12T12:00:00.000Z");

describe("findDigestCandidates", () => {
  it("returns latest report per active subscriber within the 25-60 day window", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [
        { user_id: "u_active", status: "active" },
        { user_id: "u_canceled", status: "canceled" },
      ],
      reports: [
        {
          id: "r_recent",
          user_id: "u_active",
          email: "active@example.com",
          created_at: "2026-04-15T00:00:00.000Z", // 27 days ago
        },
        {
          id: "r_older",
          user_id: "u_active",
          email: "active@example.com",
          created_at: "2026-04-01T00:00:00.000Z", // 41 days ago
        },
        {
          id: "r_too_recent",
          user_id: "u_canceled",
          email: "canceled@example.com",
          created_at: "2026-04-15T00:00:00.000Z",
        },
      ],
    });
    const candidates = await findDigestCandidates(supabase.client, NOW);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].user_id).toBe("u_active");
    expect(candidates[0].last_report_id).toBe("r_recent");
    expect(candidates[0].days_since_last_report).toBe(27);
  });

  it("returns empty when no active subscriptions", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [],
      reports: [],
    });
    expect(await findDigestCandidates(supabase.client, NOW)).toEqual([]);
  });
});

describe("renderDigestEmail", () => {
  it("renders subject + body with last-report date and days-ago count", () => {
    const out = renderDigestEmail({
      user_id: "u",
      email: "a@b.com",
      last_report_id: "r",
      last_report_created_at: "2026-04-10T00:00:00.000Z",
      days_since_last_report: 32,
    });
    expect(out.subject).toContain("32 days ago");
    expect(out.html).toContain("April 10, 2026");
    expect(out.text).toContain("April 10, 2026");
    expect(out.html).toContain("/upload");
  });
});

describe("runDigestBatch", () => {
  it("sends emails and writes digest_sends row when not yet sent", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [{ user_id: "u_a", status: "active" }],
      reports: [
        {
          id: "r1",
          user_id: "u_a",
          email: "a@example.com",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ],
      digest_sends: [],
    });
    const resend = buildResendMock();
    const result = await runDigestBatch(supabase.client, {
      resend: resend as unknown as import("resend").Resend,
      now: NOW,
    });
    expect(result.candidates_found).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.skipped_already_sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(resend.emails.send).toHaveBeenCalledTimes(1);
    expect(supabase.insertedDigests).toHaveLength(1);
    expect(supabase.insertedDigests[0]).toMatchObject({
      user_id: "u_a",
      digest_month: "2026-05-01",
    });
  });

  it("skips when digest_sends already has a row for current month", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [{ user_id: "u_a", status: "active" }],
      reports: [
        {
          id: "r1",
          user_id: "u_a",
          email: "a@example.com",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ],
      digest_sends: [{ user_id: "u_a", digest_month: "2026-05-01" }],
    });
    const resend = buildResendMock();
    const result = await runDigestBatch(supabase.client, {
      resend: resend as unknown as import("resend").Resend,
      now: NOW,
    });
    expect(result.skipped_already_sent).toBe(1);
    expect(result.sent).toBe(0);
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("dryRun marks candidates as sent without invoking Resend or writing digest_sends", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [{ user_id: "u_a", status: "active" }],
      reports: [
        {
          id: "r1",
          user_id: "u_a",
          email: "a@example.com",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ],
    });
    const resend = buildResendMock();
    const result = await runDigestBatch(supabase.client, {
      resend: resend as unknown as import("resend").Resend,
      now: NOW,
      dryRun: true,
    });
    expect(result.sent).toBe(1);
    expect(resend.emails.send).not.toHaveBeenCalled();
    expect(supabase.insertedDigests).toHaveLength(0);
  });

  it("records failure when Resend returns an error", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [{ user_id: "u_a", status: "active" }],
      reports: [
        {
          id: "r1",
          user_id: "u_a",
          email: "a@example.com",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ],
    });
    const resend = buildResendMock("rate limit");
    const result = await runDigestBatch(supabase.client, {
      resend: resend as unknown as import("resend").Resend,
      now: NOW,
    });
    expect(result.failed).toBe(1);
    expect(result.details[0].error).toContain("rate limit");
    expect(supabase.insertedDigests).toHaveLength(0);
  });

  it("records failure when Resend throws", async () => {
    const supabase = buildSupabaseMock({
      subscriptions: [{ user_id: "u_a", status: "active" }],
      reports: [
        {
          id: "r1",
          user_id: "u_a",
          email: "a@example.com",
          created_at: "2026-04-10T00:00:00.000Z",
        },
      ],
    });
    const resend = buildResendMock(undefined, true);
    const result = await runDigestBatch(supabase.client, {
      resend: resend as unknown as import("resend").Resend,
      now: NOW,
    });
    expect(result.failed).toBe(1);
    expect(result.details[0].error).toContain("network down");
  });

  it("returns zero counts when there are no candidates", async () => {
    const supabase = buildSupabaseMock({ subscriptions: [], reports: [] });
    const result = await runDigestBatch(supabase.client, { now: NOW });
    expect(result).toEqual({
      candidates_found: 0,
      skipped_already_sent: 0,
      sent: 0,
      failed: 0,
      details: [],
    });
  });
});
