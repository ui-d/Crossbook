# Crossbook — App Summary & Current State

> Snapshot for external analysis. Generated 2026-05-11.
> Source of truth for the project brief is [`CLAUDE.md`](../CLAUDE.md).

---

## 1. One-liner

CSV-in / plain-English-out **HubSpot ↔ QuickBooks reconciliation** for SMB RevOps teams. Drop two CSV exports (HubSpot Deals + QuickBooks Customers/Invoices); Claude finds conflicts, duplicates, missing invoices, and amount mismatches; every claim cites the exact row in both files; no auto-merge — every action is a human click. $49/month flat, vs. HubSpot Data Hub Professional at $720/seat/month.

## 2. Product positioning

- **ICP:** SMBs (50–200 employees) on HubSpot CRM Starter / Sales Hub Pro who do NOT pay for Data Hub Professional. Buyer = RevOps Manager / Sales Ops Lead / Finance Ops Lead doing month-end reconciliation in Excel.
- **Wedge:** $49/mo vs. Data Hub Pro $720/seat/mo (93% cheaper). Doesn't replace Data Hub — replaces Excel + 4 hrs of an analyst's month-end.
- **Moat:** Pattern library (`discrepancy_patterns` table) that compounds with each paid report's user decisions (`times_user_confirmed` / `times_user_overrode`).
- **Retention mechanism:** Monthly delta digest — second upload by the same user computes "what's changed since your last report" (new/resolved/persistent conflicts). Reframes the product from a monthly transactional tool to an ongoing data-quality monitor.
- **Business model:** 1 free report per email → $49/month subscription, monthly only (no annual, no quarterly).

## 3. Build status (vs. 21-day plan in CLAUDE.md)

| Phase | Days | Status |
|---|---|---|
| Phase 1 — Foundation + normalization | 1–6 | ✅ Complete |
| Phase 2 — Core AI layer (pattern library + Claude) | 7–10 | ✅ Complete (10/10 fixture pass on live Claude eval) |
| Phase 3 — UX + paywall + bulk actions | 11–14 | 🟨 Days 11–13 done; Day 14 (build-in-public post) outstanding |
| Phase 4 — Delta loop + privacy + decisions export | 15–18 | 🚧 Not started |
| Phase 5 — Landing page + distribution | 19–21 | 🚧 Not started |
| Phase 6 — GO/NO-GO | 22–24 | 🚧 Not started |

**Latest commit:** `5fe6d29 feat: Phase 3 Days 11-13 — report pipeline + bulk actions + paywall` (working tree clean on `main`).

**Test suite:** 142 tests passing across 6 files (Vitest 4 + v8 coverage). README notes lib/ at ~97% line / ~85% branch coverage.

## 4. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.4.1 (App Router, Turbopack) + React 19 + TypeScript strict |
| Auth | Clerk (`@clerk/nextjs` 6.20.0), Google OAuth only for v1 |
| DB | Supabase Postgres (`@supabase/supabase-js` 2.49), RLS keyed off `auth.jwt() ->> 'sub'` (Clerk-issued, third-party-auth bridge) |
| Payments | Stripe 22.1 — $49/mo subscription, signature-verified webhook, test/live key auto-switch by `NODE_ENV` |
| AI | `@anthropic-ai/sdk` 0.95 — model `claude-sonnet-4-6`, prompt caching via `cache_control: ephemeral` on the system prompt; AI SDK 6 (`ai` + `@ai-sdk/anthropic`) also installed but **not used in the pipeline yet** |
| CSV | Papa Parse 5.5 |
| Fuzzy matching | Fuse.js 7.3 + custom Levenshtein layer in `lib/conflict-scorer.ts` |
| Date / currency | `date-fns` 4.1, `date-fns-tz` 3.2, `currency.js` 2.0 |
| Validation | `zod` 3.25 + `react-hook-form` 7.56 + `@hookform/resolvers` |
| UI | shadcn/ui (new-york / neutral) + Tailwind v4 (`@tailwindcss/postcss`) + lucide-react |
| Email | Resend 6.12 (installed, not yet wired) |
| Testing | Vitest 4.1 + `@vitest/coverage-v8` (≥80% threshold scoped to `lib/`) |
| Tooling | `tsx` for eval scripts, ESLint 9, `supabase` CLI |
| Deployment target | Vercel |
| Package manager | **pnpm only** (no `package-lock.json` — intentional) |

**MCP servers configured** (`.mcp.json`): Supabase, Context7, GitHub — used by Claude Code during build for migrations, pattern-library seeding, and Stripe product/price creation.

## 5. Repository layout

```
app/
  (auth)/sign-in/[[...sign-in]]/   Clerk custom sign-in
  api/
    reconcile/route.ts             Main pipeline endpoint (POST FormData)
    checkout/route.ts              POST → Stripe Checkout redirect
    webhooks/stripe/route.ts       Subscription + checkout webhook
  report/[id]/page.tsx             Report results (paywalled blur)
  subscription/page.tsx            Clerk <PricingTable />
  upload/page.tsx                  Canonical CSV upload entry
  layout.tsx                       ClerkProvider wrapper
  page.tsx                         Marketing landing (still placeholder copy)
components/
  UploadZone.tsx                   Drag-drop + email + retention notice
  SummaryCard.tsx                  Top-of-report summary
  ConflictTable.tsx                Filters + bulk bar + paginated rows
  ConflictRow.tsx                  Single conflict + 4 decision buttons + notes
  ConflictFilters.tsx              Priority / type / decision-status filters
  BulkActionBar.tsx                Bulk decisions + quick-selects
  SourceCitation.tsx               "HubSpot row 47 ↔ QBO row 12"
  Navbar.tsx                       Crossbook brand + Subscriptions link + Clerk sign-in
  ui/                              shadcn primitives (accordion, button, dialog, form, input, label, textarea)
lib/
  csv-parser.ts                    Papa Parse + column detection (30+ header variants)
  normalizers.ts                   Pure field normalizers (name, currency, date, email, diacritics)
  normalize-record.ts              RawRecord + ColumnMap → NormalizedRecord
  conflict-scorer.ts               Weighted fuzzy match (40% name / 30% email / 20% amount / 10% date) + orphans
  pattern-library.ts               9 detector functions (2 deferred) against data/pattern-library.json
  claude.ts                        Anthropic SDK + Zod validation + confidence-fallback + batching/concurrency
  report-builder.ts                Merges pattern + Claude conflicts → BuiltReport
  decisions.ts                     Server action saveDecisionAction
  payments.ts                      createCheckoutSession server action
  stripe.ts                        SDK init (test/live key auto-switch)
  supabase.ts                      Clerk-JWT third-party-auth client
  test-utils/fixtures.ts           Fixture loader for tests
  utils.ts                         cn() helper
data/
  pattern-library.json             10 seeded patterns (the moat seed)
  test-fixtures/                   10 CSV pairs + expected.json (5 EN / 3 PL / 2 multi-currency)
supabase/
  migrations/0001_init.sql         7 tables + RLS policies
scripts/
  eval-fixtures.ts                 Live-Claude eval harness (10/10 pass)
middleware.ts                      clerkMiddleware()
vitest.config.ts                   v8 coverage, 80% threshold, scoped to lib/
.mcp.json                          Supabase + Context7 + GitHub MCP servers
```

Path alias: `@/*` → repo root.

## 6. Architecture / data flow

```
CSV upload (FormData: hubspot_file + quickbooks_file + email)
        │
        ▼
csv-parser.ts ───── column detection (HubSpot dict vs QBO dict, case-insensitive)
        │
        ▼
normalize-record.ts ── per-row → NormalizedRecord
        │              (uses normalizers.ts: legal-suffix strip EN/PL/DE/FR/Nordics,
        │               diacritics for ł/ż/ß, currency US/EU formats, 7 date formats)
        ▼
conflict-scorer.ts ── Fuse.js + weighted score (name 40 / email 30 / amount 20 / date 10)
        │              → MatchPair[] (matches above 0.5 + orphans on both sides)
        ▼
pattern-library.ts ── deterministic rules first (cheap, no API call)
        │              9 active detectors:
        │                amount_ratio (30% partial-payment), orphan_hubspot (closed-won no QBO),
        │                name_normalized_match (legal-suffix only), amount_match_currency_format_diff,
        │                qbo_name_contains (sub-customer), date_score_full_credit (format-only),
        │                status_mismatch, missing_field
        │              Deferred: tax_id_qbo_only, multi_qbo_match_amount_sum
        ▼
claude.ts ─────── only on pairs not covered by patterns, and only when both sides present
        │              model claude-sonnet-4-6, system prompt cached (ephemeral),
        │              batch ≤ 8 pairs/call, parallel ≤ 4 concurrent calls,
        │              Zod-validated JSON, confidence-fallback < 0.65 → MANUAL_REVIEW
        ▼
report-builder.ts ── merge pattern matches + Claude conflicts → BuiltReport
        │              priority-sorted (HIGH→MEDIUM→LOW), amount-at-risk descending
        ▼
Supabase reports row (result_json jsonb, files_purged_at = now + 30 days)
        ▼
/report/[id] ──── SummaryCard + ConflictTable (filters + bulk bar + per-row decisions)
                  Free tier: top 5 rows interactive, rest blurred + upgrade banner
                  Paid: filters + bulk actions unlocked
                  Decisions persist via server action → conflict_decisions table
```

**Four AI-layer invariants** (enforced in code, not only in the system prompt):

1. **Never auto-merge.** Every action is a human click. (DELEGATE-52 mitigation — Microsoft Research paper showing frontier models corrupt 25% of documents over long delegated workflows.)
2. **Always cite source rows.** Every conflict carries `hubspot_row_index` and `quickbooks_row_index`.
3. **Pattern library first.** Known patterns explain via templates with zero API cost.
4. **Confidence-based fallback.** If Claude confidence < 0.65, recommendation downgrades to `MANUAL_REVIEW`.

## 7. Database schema

7 tables in `supabase/migrations/0001_init.sql`:

| Table | Purpose |
|---|---|
| `reports` | Per-upload report + `result_json` + delta linkage (`prior_report_id`, `delta_json`) + 30-day purge timestamp |
| `free_report_usage` | Free-report-per-email gate |
| `conflict_decisions` | User decisions (TRUST_HUBSPOT / TRUST_QUICKBOOKS / MANUAL_REVIEW / IGNORE) + optional notes + `was_bulk` flag |
| `discrepancy_patterns` | The moat — pattern library w/ `times_matched`, `times_user_confirmed`, `times_user_overrode` |
| `subscriptions` | Stripe subscription state per Clerk user |
| `digest_sends` | Monthly delta digest dedupe (unique on user_id + digest_month) |
| `data_deletion_requests` | GDPR Art. 17 audit log |

**RLS:** Service role bypasses; end-user reads gated on `auth.jwt() ->> 'sub' = user_id` for `reports`, `conflict_decisions`, `subscriptions`. `discrepancy_patterns` is public-read. `digest_sends` / `data_deletion_requests` / `free_report_usage` have RLS on with no policies (service-role only).

## 8. API surface

| Route | Method | Notes |
|---|---|---|
| `POST /api/reconcile` | multipart/form-data | Main pipeline. 5 MB / 4000-row caps. Returns `{ id, is_paid, requires_upgrade }`. `maxDuration = 90`. |
| `POST /api/checkout` | redirect | Wraps `createCheckoutSession` → 303 to Stripe Checkout (carries `reportId` in metadata). |
| `POST /api/webhooks/stripe` | Stripe webhook | Signature-verified. Handles `customer.subscription.{created,updated,deleted}` → upsert `subscriptions`; `checkout.session.completed` → flip `reports.is_paid`. |
| `GET /report/[id]` | server component | Reads `reports` + `conflict_decisions`, renders `SummaryCard` + `ConflictTable`, paywall banner if `!is_paid`. |
| `GET /upload` | server component | Drag-drop upload UI. |
| `GET /subscription` | server component | Clerk `<PricingTable />`. |
| `GET /(auth)/sign-in/...` | Clerk catch-all | Custom sign-in. |

**Not yet implemented (from CLAUDE.md spec):**
- `/api/reports` + `/api/reports/[id]/delta` — delta engine endpoints (Phase 4)
- `/api/export/csv` — corrected CSV export (Phase 4)
- `/api/privacy/delete-my-data` — GDPR Art. 17 (Phase 4)
- `/dashboard` — report history + delta summary
- `/privacy`, `/dpa` — legal pages

## 9. Pricing & paywall

- **Free:** 1 report per email. Full summary card visible. First 5 conflicts interactive; the rest are blurred with an upgrade overlay. Filters + bulk actions disabled.
- **$49/month:** Unlimited reports, all conflicts unblurred, filters + bulk actions, monthly delta tracking, corrected CSV export, monthly reminder digest. Cancel anytime. Monthly only — no annual or quarterly.
- **Enforcement:** Server-side — `userHasActiveSubscription()` (Clerk `userId` + `subscriptions.status in ('active','trialing')`) OR `free_report_usage.reports_used = 0`. Client cannot bypass.
- **Conversion path:** Anonymous upload → email gate → report generated → first 5 rows interactive → upgrade banner above blurred rows → POST `/api/checkout` → Stripe Checkout → webhook flips `is_paid=true`.

## 10. What's working today (verified)

- ✅ Upload page with drag-drop, email, 30-day retention notice, file-size/row guards
- ✅ HubSpot + QuickBooks column detection across 30+ header variants
- ✅ Full normalization (EN/PL/DE/FR/Nordics legal suffixes, Polish ł/ż, German ß, US/EU currency formats, 7 date formats, email)
- ✅ Weighted fuzzy match (40/30/20/10) with orphan detection on both sides
- ✅ 10-pattern library seeded in `data/pattern-library.json`; 8 active detectors in code; 2 deferred (tax_id, multi-QBO sum)
- ✅ Live Claude integration with prompt caching, batching, concurrency, Zod validation, confidence-fallback
- ✅ Live-Claude eval harness (`scripts/eval-fixtures.ts`) — 10/10 fixtures pass
- ✅ Report UI: SummaryCard + ConflictTable + ConflictRow + ConflictFilters + BulkActionBar + SourceCitation
- ✅ Paywall blur on rows 6+; bulk + filters disabled on free tier
- ✅ Decision persistence via server action → `conflict_decisions` table
- ✅ Stripe Checkout + webhook (subscription + checkout.completed handlers)
- ✅ Clerk auth + Supabase RLS bridge (third-party JWT auth)
- ✅ 142 tests passing; coverage above 80% threshold

## 11. What's missing (per CLAUDE.md "Definition of Done")

- ☐ Delta engine (`lib/delta-engine.ts`) + `<DeltaSection />` component — **single biggest retention lever**
- ☐ Monthly digest cron (`supabase/functions/monthly-delta-digest/`) + Resend templates
- ☐ Corrected CSV export with Decision + Notes + Conflict Type + Recommended Source columns
- ☐ Privacy Policy + DPA pages (`/privacy`, `/dpa`)
- ☐ Delete-my-data endpoint (`/api/privacy/delete-my-data`) — GDPR Art. 17
- ☐ 30-day file retention sweep (`supabase/functions/file-retention-sweep/`)
- ☐ Landing page with `<InteractiveSample />` working demo
- ☐ `/dashboard` — report history + delta summary
- ☐ Build-in-public posts (Days 14 + 20)
- ☐ ProductHunt soft-launch (Day 21)
- ☐ 10 beta testers onboarded by Day 20
- ☐ Replace SaaS-template copy in `app/page.tsx` (Navbar done in rebrand)

## 12. Known caveats / risks (for an external reviewer)

1. **Placeholder marketing copy.** `app/page.tsx` and `components/Navbar.tsx` still ship the scaffold template. They get naturally replaced as real landing UI lands in Phase 5; no separate cleanup task.
2. **`.env.local` is in the working tree (gitignored).** Contains live tokens (Supabase + GitHub MCP). Per CLAUDE.md note: should be rotated if exposed.
3. **DELEGATE-52 mitigation depends on UX discipline, not just the prompt.** The "never auto-merge" guarantee is enforced because there is no auto-merge code path — every decision flows through a button click + server action. An external reviewer should confirm this invariant when auditing report-builder + decisions.ts.
4. **Pattern library moat compounds slowly.** Until ~50 paying customers, the library is thin. Phase 4 needs the `times_user_confirmed/overrode` counters wired so the moat actually builds.
5. **EU launch blocked until Day 17.** No Privacy Policy, DPA, or GDPR Art. 17 endpoint yet. ~30% of TAM (EU) cannot upload PII-bearing CSVs without these.
6. **Two AI SDKs installed but only one used.** `@anthropic-ai/sdk` powers the pipeline; `ai` (Vercel AI SDK 6) + `@ai-sdk/anthropic` are dependencies but unused — either remove or migrate to AI SDK before Phase 4.
7. **Confidence threshold (0.65) is a guess.** Will need calibration once 20+ paid reports are out and override-rate data exists.
8. **Solo distribution is the real bottleneck.** Build is on track; the GO/NO-GO at Day 24 turns on customer count, not feature completeness.

## 13. Environment variables required

From `.env.example`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   # Clerk
CLERK_SECRET_KEY                    # Clerk
NEXT_PUBLIC_SUPABASE_URL            # Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY       # Supabase
SUPABASE_SERVICE_ROLE_KEY           # Supabase (server only)
ANTHROPIC_API_KEY                   # Claude
STRIPE_SECRET_KEY                   # Stripe (live)
STRIPE_WEBHOOK_SECRET               # Stripe
STRIPE_PRICE_ID_MONTHLY             # $49/mo price ID
RESEND_API_KEY                      # Resend (transactional + digest)
NEXT_PUBLIC_APP_URL                 # https://crossbook.app
DPA_GENERATOR_API_KEY               # Iubenda / Termly / Vanta (Day 17)
# MCP-only:
SUPABASE_ACCESS_TOKEN
GITHUB_PERSONAL_ACCESS_TOKEN
```

`STRIPE_SECRET_KEY_TEST` + `STRIPE_WEBHOOK_SECRET_TEST` are auto-selected when `NODE_ENV !== 'production'` (see `lib/stripe.ts`).

## 14. Commands

```bash
pnpm dev            # Next.js dev (Turbopack)
pnpm build          # Production build
pnpm start          # Run built app
pnpm lint           # ESLint via next lint
pnpm test           # Vitest one-shot (142 tests passing)
pnpm test:watch     # Vitest watch
pnpm test:coverage  # Vitest + v8 coverage; ≥80% threshold scoped to lib/
pnpm eval:fixtures  # Live-Claude fixture eval (requires ANTHROPIC_API_KEY)
```

## 15. Success metric & GO/NO-GO

**Target: 3 paying customers ($49/mo) by day 24.**

| Day 24 result | Decision |
|---|---|
| 3+ paying customers | GO — expand to HubSpot↔Xero, Pipedrive↔QBO |
| 1–2 paying customers | EXTEND 14 days (distribution problem) |
| 0 paying, 20+ free reports generated | EXTEND 14 days (activation problem) |
| 0 paying, <10 free reports | KILL — distribution failed |
| 0 free reports + 0 waitlist + 0 LinkedIn DM replies | HARD KILL — ICP signal |

Path to $5K MRR within 6 months: 100 customers × $49. Path to $10K MRR: 200 customers + a $149 OAuth-tier mix. **The monthly delta retention loop is the bridge** — `month_2_return_rate ≥ 60%` is the health bar.
