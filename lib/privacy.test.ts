import { describe, expect, it, vi } from "vitest";

import {
  cascadeDeleteByEmail,
  createDeletionToken,
  RETENTION_DAYS,
  runRetentionSweep,
  verifyDeletionToken,
} from "./privacy";

const ORIGINAL_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

function withSecret<T>(secret: string, fn: () => T): T {
  process.env.SUPABASE_SERVICE_ROLE_KEY = secret;
  try {
    return fn();
  } finally {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_SECRET;
    }
  }
}

describe("createDeletionToken + verifyDeletionToken", () => {
  it("round-trips for the same email + valid window", () => {
    withSecret("test-secret-abc", () => {
      const { token, expiresAt } = createDeletionToken("user@example.com");
      const result = verifyDeletionToken("user@example.com", token);
      expect(result.valid).toBe(true);
      expect(expiresAt).toBeGreaterThan(Date.now());
    });
  });

  it("rejects when expired", () => {
    withSecret("test-secret-abc", () => {
      const expired = Date.now() - 1000;
      const { token } = createDeletionToken("user@example.com", expired);
      const result = verifyDeletionToken("user@example.com", token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("expired");
    });
  });

  it("rejects when email changes", () => {
    withSecret("test-secret-abc", () => {
      const { token } = createDeletionToken("user@example.com");
      const result = verifyDeletionToken("attacker@example.com", token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("signature mismatch");
    });
  });

  it("rejects when token is malformed", () => {
    withSecret("test-secret-abc", () => {
      expect(verifyDeletionToken("u@b.com", "not-a-token").valid).toBe(false);
      expect(verifyDeletionToken("u@b.com", "abc").valid).toBe(false);
    });
  });

  it("rejects when signing secret changes (signature mismatch)", () => {
    let token: string;
    withSecret("test-secret-abc", () => {
      token = createDeletionToken("user@example.com").token;
    });
    withSecret("different-secret-xyz", () => {
      const result = verifyDeletionToken("user@example.com", token);
      expect(result.valid).toBe(false);
    });
  });
});

function buildDeleteMock(seed: {
  reports?: Array<{ id: string; email: string }>;
  decisions?: Array<{ report_id: string }>;
  free?: Array<{ email: string }>;
}) {
  const reports = seed.reports ?? [];
  const decisions = seed.decisions ?? [];
  const free = seed.free ?? [];
  const audit: unknown[] = [];

  const from = vi.fn((table: string) => {
    if (table === "reports") {
      return {
        select: () => ({
          eq: (_col: string, email: string) =>
            Promise.resolve({
              data: reports.filter((r) => r.email === email),
            }),
        }),
        delete: () => ({
          eq: (_col: string, email: string) => {
            const matching = reports.filter((r) => r.email === email);
            for (const r of matching) {
              const idx = reports.indexOf(r);
              if (idx >= 0) reports.splice(idx, 1);
            }
            return Promise.resolve({ error: null, count: matching.length });
          },
        }),
      };
    }
    if (table === "conflict_decisions") {
      return {
        delete: () => ({
          in: (_col: string, ids: string[]) => {
            const idSet = new Set(ids);
            const matching = decisions.filter((d) => idSet.has(d.report_id));
            for (const d of matching) {
              const idx = decisions.indexOf(d);
              if (idx >= 0) decisions.splice(idx, 1);
            }
            return Promise.resolve({ error: null, count: matching.length });
          },
        }),
      };
    }
    if (table === "free_report_usage") {
      return {
        delete: () => ({
          eq: (_col: string, email: string) => {
            const matching = free.filter((f) => f.email === email);
            for (const f of matching) {
              const idx = free.indexOf(f);
              if (idx >= 0) free.splice(idx, 1);
            }
            return Promise.resolve({ error: null, count: matching.length });
          },
        }),
      };
    }
    if (table === "data_deletion_requests") {
      return {
        insert: (row: unknown) => {
          audit.push(row);
          return Promise.resolve({ error: null });
        },
      };
    }
    throw new Error(`unknown table ${table}`);
  });

  return { client: { from } as never, reports, decisions, free, audit };
}

describe("cascadeDeleteByEmail", () => {
  it("deletes decisions, reports, and free-tier rows in order", async () => {
    const mock = buildDeleteMock({
      reports: [
        { id: "r1", email: "a@b.com" },
        { id: "r2", email: "a@b.com" },
      ],
      decisions: [
        { report_id: "r1" },
        { report_id: "r1" },
        { report_id: "r2" },
      ],
      free: [{ email: "a@b.com" }],
    });
    const outcome = await cascadeDeleteByEmail(mock.client, "a@b.com");
    expect(outcome.records_deleted).toBe(3 + 2 + 1); // decisions + reports + free
    expect(outcome.tables_touched).toEqual([
      "conflict_decisions",
      "reports",
      "free_report_usage",
      "data_deletion_requests",
    ]);
    expect(mock.audit).toHaveLength(1);
    expect(mock.audit[0]).toMatchObject({
      email: "a@b.com",
      records_deleted_count: 6,
    });
  });

  it("normalizes email to lowercase + trim", async () => {
    const mock = buildDeleteMock({ reports: [{ id: "r1", email: "u@x.com" }] });
    await cascadeDeleteByEmail(mock.client, "  U@X.COM ");
    expect(mock.audit[0]).toMatchObject({ email: "u@x.com" });
  });

  it("handles empty result gracefully", async () => {
    const mock = buildDeleteMock({});
    const outcome = await cascadeDeleteByEmail(mock.client, "nobody@example.com");
    expect(outcome.records_deleted).toBe(0);
    expect(outcome.tables_touched).toEqual(["data_deletion_requests"]);
  });
});

function buildSweepMock(rows: Array<{
  id: string;
  result_json: unknown;
}>) {
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];

  const from = vi.fn(() => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      lt: () => builder,
      is: () =>
        Promise.resolve({
          data: rows,
          error: null,
        }),
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          updates.push({ id, patch });
          return Promise.resolve({ error: null });
        },
      }),
    };
    return builder;
  });
  return { client: { from } as never, updates };
}

describe("runRetentionSweep", () => {
  it("strips conflicts from old reports and stamps files_purged_at", async () => {
    const NOW = new Date("2026-05-12T00:00:00.000Z");
    const mock = buildSweepMock([
      {
        id: "old1",
        result_json: {
          summary: { total_conflicts: 4 },
          conflicts: [{ conflict_id: "c1", explanation: "PII inside" }],
        },
      },
      {
        id: "old2",
        result_json: null,
      },
    ]);
    const result = await runRetentionSweep(mock.client, NOW);
    expect(result.reports_examined).toBe(2);
    expect(result.reports_purged).toBe(2);
    expect(mock.updates).toHaveLength(2);
    const patch1 = mock.updates.find((u) => u.id === "old1")!.patch;
    expect(patch1.result_json).toEqual({
      summary: { total_conflicts: 4 },
      conflicts: [],
    });
    expect(patch1.files_purged_at).toBe(NOW.toISOString());
    const patch2 = mock.updates.find((u) => u.id === "old2")!.patch;
    expect(patch2.result_json).toBeNull();
  });

  it("retention window is the documented constant", () => {
    expect(RETENTION_DAYS).toBe(30);
  });
});
