# Crossbook — App Summary & Current State

> Snapshot for external analysis. Generated 2026-05-14.
> Source of truth for the project brief is [`CLAUDE.md`](../CLAUDE.md).
> Operational launch checklist (deploy / DNS / Stripe / Resend) lives in [`../NEXT_STEPS.md`](../NEXT_STEPS.md).

---

## 1. One-liner

CSV-in / plain-English-out **HubSpot ↔ QuickBooks reconciliation** for SMB RevOps teams. Drop two CSV exports (HubSpot Deals + QuickBooks Customers/Invoices); Claude finds conflicts, duplicates, missing invoices, and amount mismatches; every claim cites the exact row in both files; no auto-merge — every action is a human click. $49/month flat, vs. HubSpot Data Hub Professional at $720/seat/month.

## 2. Product positioning

- **ICP:** SMBs (50–200 employees) on HubSpot CRM Starter / Sales Hub Pro who do NOT pay for Data Hub Professional. Buyer = RevOps Manager / Sales Ops Lead / Finance Ops Lead doing month-end reconciliation in Excel.
- **Wedge:** $49/mo vs. Data Hub Pro $720/seat/mo (93% cheaper). Doesn't replace Data Hub — replaces Excel + 4 hrs of an analyst's month-end.
- **Moat:** Pattern library (`discrepancy_patterns` table) that compounds with each paid report's user decisions (`times_user_confirmed` / `times_user_overrode`). 13/20 fixtures (65%) are now resolved by patterns alone — well above the 40% brief threshold.
- **Retention mechanism:** Monthly delta digest — second upload by the same user computes "what's changed since your last report" (new/resolved/persistent conflicts). Reframes the product from a monthly transactional tool to an ongoing data-quality monitor. Both the engine and the cron are live.
- **Business model:** 1 free report per email → $49/month subscription, monthly only (no annual, no quarterly).

## 3. Build status (vs. 21-day plan in CLAUDE.md)

| Phase | Days | Status |
|---|---|---|
| Phase 1 — Foundation + normalization | 1–6 | ✅ Complete |
| Phase 2 — Core AI layer (pattern library + Claude) | 7–10 | ✅ Complete (20/20 fixture pass on live Claude eval, ~110s, ~$0.15) |
| Phase 3 — UX + paywall + bulk actions | 11–14 | ✅ Code complete (Day 14 build-in-public post is operational, not code) |
| Phase 4 — Delta loop + privacy + decisions export | 15–18 | ✅ Complete |
| Phase 5 — Landing page + distribution | 19–21 | 🟨 Day 19 complete (landing + `<InteractiveSample />`); Days 20–21 (build-in-public post #2, ProductHunt soft-launch) are operational |
| Phase 6 — GO/NO-GO | 22–24 | 🚧 Pending live customers |

**Latest commit:** `fce1eb4 chore: defer Iubenda DPA integration until first paid customer` on `main` (working tree clean).

**Test suite:** **199 tests across 10 files, all passing** (Vitest 4.1.5 + `@vitest/coverage-v8`, ≥80% threshold scoped to `lib/`). Live-Claude fixture eval: 20/20 fixtures pass.

**Nothing in the 21-day code spec is outstanding.** What remains is operational: domain DNS verification, Vercel env-var setup, live Stripe webhook registration, Resend domain verification, distribution. See [`NEXT_STEPS.md`](../NEXT_STEPS.md).

## 4. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js **15.5.18** (App Router, Turbopack) + React 19 + TypeScript strict — bumped from 15.4.1 to patch CVE-2025-66478 |
| Auth | Clerk (`@clerk/nextjs` 6.20.0), Google OAuth only for v1 |
| DB | Supabase Postgres (`@supabase/supabase-js` 2.49), RLS keyed off `auth.jwt() ->> 'sub'` (Clerk-issued, third-party-auth bridge) |
| Payments | Stripe 22.1 — $49/mo subscription, signature-verified webhook, test/live key auto-switch by `NODE_ENV` |
| AI | `@anthropic-ai/sdk` 0.95 — model `claude-sonnet-4-6`, prompt caching via `cache_control: ephemeral` on the system prompt; AI SDK 6 (`ai` 6.0.177 + `@ai-sdk/anthropic` 3.0.76) installed but **not used in the pipeline** |
| CSV | Papa Parse 5.5 |
| Fuzzy matching | Fuse.js 7.3 + custom Levenshtein layer in `lib/conflict-scorer.ts` |
| Date / currency | `date-fns` 4.1, `date-fns-tz` 3.2, `currency.js` 2.0 |
| Validation | `zod` 3.25 + `react-hook-form` 7.56 + `@hookform/resolvers` |
| UI | shadcn/ui (new-york / neutral) primitives + Tailwind v4 (`@tailwindcss/postcss`) + `motion` 12.38 + `tw-animate-css` 1.3 + lucide-react |
| Typography | next/font/google: **Geist Sans + Geist Mono + Instrument Serif** (editorial pairing — replaced earlier Inter/Plus Jakarta combo during the May 12 redesign) |
| Email | Resend 6.12 — wired into the digest cron + GDPR delete-confirm flow |
| Analytics | **PostHog** (`posthog-js` 1.x) — initialized only when `NEXT_PUBLIC_POSTHOG_KEY` is set (graceful no-op otherwise). Identifies on Clerk `user_id`; never email or PII. Conversion events sampled at 100%, view events at 10%. `checkout_completed` is captured server-side from the Stripe webhook via `lib/analytics-server.ts` (direct `fetch` to PostHog `/capture/`). |
| Cron | **Vercel cron (`vercel.json`)** — daily 14:00 UTC for `/api/cron/monthly-digest`, daily 03:00 UTC for `/api/cron/file-retention-sweep`. (Brief originally specified Supabase Edge Functions; Vercel cron chosen for proximity to the Next.js handlers and shared env-var scope.) |
| Testing | Vitest 4.1 + `@vitest/coverage-v8` (≥80% threshold scoped to `lib/`) |
| Tooling | `tsx` for eval scripts + Resend smoke test, ESLint 9, `supabase` CLI |
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
    webhooks/stripe/route.ts       Subscription + checkout.completed webhook
    cron/monthly-digest/route.ts   Vercel cron — monthly delta reminder
    cron/file-retention-sweep/route.ts  Vercel cron — 30-day CSV purge
    export/[reportId]/route.ts     Corrected CSV export (decisions appended)
    privacy/delete-my-data/route.ts     GDPR Art. 17 — request deletion
    privacy/confirm-delete/route.ts     GDPR Art. 17 — email-confirm + cascade
  dashboard/page.tsx               Report history + delta trend (paid users)
  dpa/page.tsx                     Static DPA + TODO marker for Iubenda upgrade
  how-it-works/page.tsx            Marketing — pipeline + invariants
  pricing/page.tsx                 Marketing — Free vs. $49 (uses PlanCards)
  privacy/page.tsx                 Privacy Policy
  privacy/delete/page.tsx          GDPR delete-request UI
  report/[id]/page.tsx             Report results (paywalled blur)
  subscription/page.tsx            Clerk <PricingTable /> + Stripe Checkout via PlanCards
  upload/page.tsx                  Canonical CSV upload entry
  layout.tsx                       ClerkProvider + Geist/Instrument fonts + AppShell
  page.tsx                         Landing — 9 sections, live <InteractiveSample />
  globals.css                      Editorial-minimal token system + legacy MD3 aliases

components/
  Navbar.tsx                       Crossbook brand + nav + Clerk sign-in
  SiteFooter.tsx                   Footer with privacy/dpa/contact
  AppShell.tsx                     Top-level page chrome
  LegalShell.tsx                   Wrapper for /privacy, /dpa, /privacy/delete

  UploadZone.tsx                   Drag-drop + email + 30-day retention notice
  SummaryCard.tsx                  Top-of-report counters + amount-at-risk
  ConflictTable.tsx                Filters + bulk bar + paginated rows
  ConflictRow.tsx                  Single conflict + 4 decision buttons + notes
  ConflictFilters.tsx              Priority / type / decision-status filters
  BulkActionBar.tsx                Bulk decisions + quick-selects
  SourceCitation.tsx               "HubSpot row 47 ↔ QBO row 12"
  DeltaSection.tsx                 "What's changed since your last report"
  ExportButtons.tsx                Corrected-CSV download triggers

  PlanCards.tsx                    Reusable Free/$49 pricing cards (link OR form-action)
  InteractiveSample.tsx            Auto-looping 6-stage product demo (landing page)
  landing/Hero.tsx                 Hero block
  landing/FaqAccordion.tsx         Landing FAQ
  HeroHeadline.tsx                 Display headline w/ serif accent
  EyebrowTag.tsx                   Section eyebrow primitive
  SectionShell.tsx                 Alternating-tint section wrapper
  AnimatedNumber.tsx               Counter that ticks for InteractiveSample

  ui/                              shadcn primitives: accordion, button, dialog,
                                   form, input, label, textarea (all refit to
                                   editorial tokens during the redesign)

lib/
  csv-parser.ts                    Papa Parse + column detection (30+ headers)
  normalizers.ts                   Pure field normalizers (incl. "spolka akcyjna")
  normalize-record.ts              RawRecord + ColumnMap → NormalizedRecord
  conflict-scorer.ts               Weighted fuzzy match (40/30/20/10) + orphans
  pattern-library.ts               9 active detectors against data/pattern-library.json
  claude.ts                        Anthropic SDK + Zod + confidence-fallback + batching
  report-builder.ts                Merges pattern + Claude conflicts → BuiltReport
  delta-engine.ts                  New / resolved / persistent / overridden
  digest.ts                        Monthly digest selection + Resend send
  privacy.ts                       Email-verified delete flow + cascade helpers
  csv-exporter.ts                  Corrected CSV (HubSpot + QBO + summary)
  decisions.ts                     saveDecisionAction server action
  payments.ts                      createCheckoutSession server action
  stripe.ts                        SDK init (test/live key auto-switch)
  supabase.ts                      Clerk-JWT third-party-auth client
  test-utils/                      Fixture loader for tests
  utils.ts                         cn() helper

data/
  pattern-library.json             10 seeded patterns (the moat seed)
  test-fixtures/                   20 CSV pairs + expected.json
                                     1–10  baseline (5 EN, 3 PL, 2 multi-currency)
                                     11–20 adversarial synthetic stress cases

supabase/
  migrations/0001_init.sql         7 tables + RLS policies
  migrations/0002_report_files.sql Raw CSV text in dedicated table for retention sweep

scripts/
  eval-fixtures.ts                 Live-Claude eval harness (20/20 pass)
  test-resend.ts                   Resend domain-verification smoke test

docs/
  APP_SUMMARY.md                   This file
  iubenda-setup.md                 Day-of-first-enterprise-prospect playbook

NEXT_STEPS.md                      Operational launch checklist (DNS, Stripe, env)
middleware.ts                      clerkMiddleware()
vercel.json                        Vercel cron schedule
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
        │              (uses normalizers.ts: legal-suffix strip EN/PL/DE/FR/Nordics
        │               incl. "spolka akcyjna", diacritics for ł/ż/ß,
        │               currency US/EU formats, 7 date formats)
        ▼
conflict-scorer.ts ── Fuse.js + weighted score (name 40 / email 30 / amount 20 / date 10)
        │              → MatchPair[] (matches above 0.5 + orphans on both sides)
        ▼
pattern-library.ts ── deterministic rules first (cheap, no API call)
        │              9 active detectors: amount_ratio, orphan_hubspot,
        │              name_normalized_match, amount_match_currency_format_diff,
        │              qbo_name_contains, date_score_full_credit,
        │              status_mismatch, missing_field, qb_subcustomer_notation
        │              Pattern hit rate: 13/20 fixtures = 65%
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
        +
        report_files row (raw hubspot/qbo CSV text, purged_at on retention sweep)
        ▼
delta-engine.ts ── if user has prior_report_id → compute new/resolved/persistent
                   /overridden → write delta_json to current report
        ▼
/report/[id] ──── SummaryCard + DeltaSection + ConflictTable
                  (filters + bulk bar + per-row decisions)
                  Free tier: top 5 rows interactive, rest blurred + upgrade banner
                  Paid: filters + bulk actions unlocked + DeltaSection visible
                  Decisions persist via server action → conflict_decisions table
                  Paid: ExportButtons → /api/export/[reportId] returns corrected CSV

Daily Vercel crons:
  03:00 UTC  /api/cron/file-retention-sweep
             → for reports.created_at < now() - 30 days, NULL out
               report_files.{hubspot_csv_text, quickbooks_csv_text}
               and stamp purged_at
  14:00 UTC  /api/cron/monthly-digest
             → for paid users where last_report > 25 days ago AND no digest sent
               for current month → Resend email + insert digest_sends row
```

**Four AI-layer invariants** (enforced in code, not only in the system prompt):

1. **Never auto-merge.** Every action is a human click — there is no auto-merge code path. (DELEGATE-52 mitigation.)
2. **Always cite source rows.** Every conflict carries `hubspot_row_index` and `quickbooks_row_index`.
3. **Pattern library first.** Known patterns explain via templates with zero API cost (65% hit rate at current fixture set).
4. **Confidence-based fallback.** If Claude confidence < 0.65, recommendation downgrades to `MANUAL_REVIEW`.

## 7. Database schema

8 tables across two migrations:

| Table | Migration | Purpose |
|---|---|---|
| `reports` | 0001 | Per-upload report + `result_json` + delta linkage (`prior_report_id`, `delta_json`) + `files_purged_at` |
| `free_report_usage` | 0001 | Free-report-per-email gate |
| `conflict_decisions` | 0001 | User decisions (TRUST_HUBSPOT / TRUST_QUICKBOOKS / MANUAL_REVIEW / IGNORE) + optional notes + `was_bulk` flag |
| `discrepancy_patterns` | 0001 | The moat — pattern library w/ `times_matched`, `times_user_confirmed`, `times_user_overrode` |
| `subscriptions` | 0001 | Stripe subscription state per Clerk user |
| `digest_sends` | 0001 | Monthly delta digest dedupe (unique on user_id + digest_month) |
| `data_deletion_requests` | 0001 | GDPR Art. 17 audit log |
| `report_files` | 0002 | Raw CSV text in a dedicated table so `reports` rows stay compact and the retention sweep can null only the heavy columns |

**RLS:** Service role bypasses; end-user reads gated on `auth.jwt() ->> 'sub' = user_id` for `reports`, `conflict_decisions`, `subscriptions`. `discrepancy_patterns` is public-read. `digest_sends` / `data_deletion_requests` / `free_report_usage` / `report_files` have RLS on with no policies (service-role only).

## 8. API surface

| Route | Method | Notes |
|---|---|---|
| `POST /api/reconcile` | multipart/form-data | Main pipeline. 5 MB / 4000-row caps. Returns `{ id, is_paid, requires_upgrade }`. `maxDuration = 90`. |
| `POST /api/checkout` | redirect | Wraps `createCheckoutSession` → 303 to Stripe Checkout (carries `reportId` in metadata). |
| `POST /api/webhooks/stripe` | Stripe webhook | Signature-verified. Handles `customer.subscription.{created,updated,deleted}` → upsert `subscriptions`; `checkout.session.completed` → flip `reports.is_paid`. |
| `GET /api/export/[reportId]` | corrected CSV | Paid + owner only. Streams HubSpot + QBO + summary CSVs with appended Decision / Notes / Conflict_Type / Recommended_Source / Decided_At columns. |
| `POST /api/privacy/delete-my-data` | GDPR Art. 17 (request) | Email-verified flow. Sends Resend confirm link, 1-hour expiry. |
| `GET /api/privacy/confirm-delete` | GDPR Art. 17 (cascade) | Token-verified. Cascades delete across reports / decisions / subscriptions / free_report_usage. Inserts audit row. |
| `GET /api/cron/monthly-digest` | Vercel cron (CRON_SECRET) | Daily 14:00 UTC. Selects paid users with stale latest report, sends Resend digest, dedupes via `digest_sends`. |
| `GET /api/cron/file-retention-sweep` | Vercel cron (CRON_SECRET) | Daily 03:00 UTC. Purges raw CSV text from `report_files` after 30 days. |
| `GET /report/[id]` | server component | Reads `reports` + `conflict_decisions`, renders `SummaryCard` + `DeltaSection` (paid) + `ConflictTable`, paywall banner if `!is_paid`. |
| `GET /upload` | server component | Drag-drop upload UI. |
| `GET /dashboard` | server component | Report history + delta trend scaffold (paid users). |
| `GET /subscription` | server component | Clerk `<PricingTable />` side-by-side with `<PlanCards />` (Stripe Checkout). |
| `GET /pricing`, `/how-it-works`, `/privacy`, `/privacy/delete`, `/dpa` | static marketing/legal | Editorial-minimal redesign. |
| `GET /(auth)/sign-in/...` | Clerk catch-all | Custom sign-in. |

## 9. Pricing & paywall

- **Free:** 1 report per email. Full summary card visible. First 5 conflicts interactive; the rest are blurred with an upgrade overlay. Filters + bulk actions disabled. No DeltaSection.
- **$49/month:** Unlimited reports, all conflicts unblurred, filters + bulk actions, monthly delta tracking, corrected CSV export, monthly reminder digest. Cancel anytime. Monthly only — no annual or quarterly.
- **Enforcement:** Server-side — `userHasActiveSubscription()` (Clerk `userId` + `subscriptions.status in ('active','trialing')`) OR `free_report_usage.reports_used = 0`. Client cannot bypass.
- **Conversion path:** Anonymous upload → email gate → report generated → first 5 rows interactive → upgrade banner above blurred rows → POST `/api/checkout` → Stripe Checkout → webhook flips `is_paid=true`.
- **Live Stripe price (created):** `price_1TWGjvGqs11FZR21tLhU7Mdt` (live, $49/mo). Test price: `price_1TVwRuGqs11FZR21NDN7xDY0`.

## 10. What's working today (verified)

- ✅ Upload page with drag-drop, email, 30-day retention notice, file-size/row guards
- ✅ HubSpot + QuickBooks column detection across 30+ header variants
- ✅ Full normalization (EN/PL/DE/FR/Nordics legal suffixes — incl. "spolka akcyjna" — Polish ł/ż, German ß, US/EU currency formats, 7 date formats, email)
- ✅ Weighted fuzzy match (40/30/20/10) with orphan detection on both sides
- ✅ 10-pattern library seeded in `data/pattern-library.json`; 9 active detectors in code
- ✅ Live Claude integration with prompt caching, batching, concurrency, Zod validation, confidence-fallback
- ✅ Live-Claude eval harness (`scripts/eval-fixtures.ts`) — **20/20 fixtures pass, ~110s, ~$0.15/run**
- ✅ Pattern hit rate 13/20 (65%) — exceeds 40% brief threshold
- ✅ Report UI: SummaryCard + DeltaSection + ConflictTable + ConflictRow + ConflictFilters + BulkActionBar + SourceCitation
- ✅ Paywall blur on rows 6+; bulk + filters disabled on free tier
- ✅ Decision persistence via server action → `conflict_decisions` table
- ✅ Stripe Checkout + webhook (subscription + checkout.completed handlers)
- ✅ Clerk auth + Supabase RLS bridge (third-party JWT auth)
- ✅ Delta engine — new / resolved / persistent / overridden, `delta_json` written on second upload
- ✅ Monthly digest cron + Resend templates, dedupe via `digest_sends`, CRON_SECRET-gated
- ✅ 30-day file retention sweep cron — purges `report_files.{hubspot,quickbooks}_csv_text`
- ✅ Privacy Policy + DPA pages live; subprocessor list current
- ✅ Delete-my-data endpoint — email-verified, cascade delete, audit-logged
- ✅ Corrected CSV export — Decision + Notes + Conflict_Type + Recommended_Source + Decided_At columns
- ✅ Landing page with **working `<InteractiveSample />`** — auto-looping 6-stage demo with functional filters, bulk actions, decisions, and counter ticks (47→46, $43,200→$41,800)
- ✅ Editorial-minimal visual system — Geist + Instrument Serif, hairline borders, `motion`-driven entrance + scroll-reveal (respects `prefers-reduced-motion`)
- ✅ `/dashboard` scaffold for paid users (history + delta-trend summary)
- ✅ `<PlanCards />` reused across `/pricing` and `/subscription`
- ✅ Vercel cron schedule wired in `vercel.json`
- ✅ **199 / 199 tests passing** across 10 files, coverage above 80% threshold

## 11. What's missing (per CLAUDE.md "Definition of Done")

**Code:** Nothing. All bullets in the brief's Definition-of-Done are shipped.

**Operational (per [`NEXT_STEPS.md`](../NEXT_STEPS.md)):**
- ☐ Vercel preview deploy → smoke test on staging
- ☐ Build-in-public posts (Days 14 + 20) — distribution
- ☐ ProductHunt soft-launch (Day 21)
- ☐ 10 beta testers onboarded by Day 20
- ☐ HubSpot Community / RevOps Co-op posts

## 12. Notable decisions / deltas vs. the original brief

1. **Cron runner: Vercel cron, not Supabase Edge Functions.** Both crons (`monthly-digest`, `file-retention-sweep`) run as Next.js route handlers under `/api/cron/*`, scheduled in `vercel.json` and gated by `CRON_SECRET`. Same env-var scope as the rest of the app; no Deno/edge-function porting overhead.
2. **Iubenda DPA deferred.** Iubenda's only API-enabled tier is €199/yr (Advanced). Pre-revenue spend is premature. The static `/dpa` page is GDPR-acceptable for self-serve MVP. `docs/iubenda-setup.md` is the ready-to-execute upgrade playbook for the day an enterprise prospect asks for a countersigned DPA. A TODO comment in `app/dpa/page.tsx` keeps the upgrade path visible.
3. **Two AI SDKs installed, only one used.** `@anthropic-ai/sdk` powers the pipeline. `ai` 6.0.177 + `@ai-sdk/anthropic` 3.0.76 are dependencies but unused — harmless, kept for the eventual streaming-progress UX migration.
4. **Raw CSV moved out of `reports` row.** Migration `0002_report_files.sql` extracts the heavy `hubspot_csv_text`/`quickbooks_csv_text` columns into a sibling `report_files` table so listing queries don't hit the bloat, and so the retention sweep nulls only the relevant columns.
5. **Visual system rebuilt.** Editorial minimal, pipeview-inspired: Geist Sans + Instrument Serif, hairline borders, motion-driven entrance/reveal. Landing page is a 9-section composition with a fully functional `<InteractiveSample />` (rather than a static screenshot, per the v4 brief mandate).
6. **Fixture set 10 → 20.** Phase 2 Day 10 added 10 adversarial synthetic stress cases (sub-customer notation, tax-included, closed-lost-but-invoiced, whitespace/casing only, full Polish-stack normalization, 10× amount mismatch, date-drift within tolerance, 3 orphan closed-wons, QBO-only direct sale, multi-conflict stress). Real beta-cohort data not on hand yet — the 5+5 split was replaced by 0+10 synthetic.
7. **Next.js bumped 15.4.1 → 15.5.18** to patch CVE-2025-66478. No app-level changes required.

## 13. Known caveats / risks (for an external reviewer)

1. **`.env.local` is in the working tree (gitignored).** Contains live tokens (Supabase + GitHub MCP, Stripe live + test, Anthropic, Clerk, Resend). Per CLAUDE.md note: rotate if exposed.
2. **DELEGATE-52 mitigation depends on UX discipline, not just the prompt.** The "never auto-merge" guarantee is enforced because there is no auto-merge code path — every decision flows through a button click + server action. An external reviewer should confirm this invariant when auditing `report-builder.ts` and `decisions.ts`.
3. **Pattern library moat compounds slowly.** Until ~50 paying customers, the library is thin. The `times_user_confirmed` / `times_user_overrode` counters are now wired into `decisions.ts`, so the moat will start building from the first paid decision.
4. **Confidence threshold (0.65) is a guess.** Will need calibration once 20+ paid reports are out and override-rate data exists.
5. **Static DPA, not generated.** Acceptable for self-serve MVP; not acceptable if an enterprise prospect requests a signed/countersigned DPA. `docs/iubenda-setup.md` has the upgrade path.
6. **Brand/marketing copy redesigned but unaudited by external eyes.** Landing claims (e.g. "$43,200 in amount mismatches" in `<InteractiveSample />`) are illustrative; verify they read as plausibly real, not too-clean.
7. **Solo distribution is the real bottleneck.** Code is on track and ahead of the brief on visual polish; the GO/NO-GO at Day 24 turns on customer count, not feature completeness.
8. **CRON_SECRET-gated endpoints rely on Vercel injecting the header.** If the deployment moves off Vercel cron (e.g. self-hosted or GitHub Actions), the auth check needs revisiting.

## 14. Environment variables required

From `.env.example` + `NEXT_STEPS.md`:

```
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

# Database
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI
ANTHROPIC_API_KEY

# Payments
STRIPE_SECRET_KEY                 # live; auto-fallback to STRIPE_SECRET_KEY_TEST when NODE_ENV !== 'production'
STRIPE_SECRET_KEY_TEST
STRIPE_WEBHOOK_SECRET             # live
STRIPE_WEBHOOK_SECRET_TEST
STRIPE_PRICE_ID_MONTHLY           # $49/mo (live: price_1TWGjvGqs11FZR21tLhU7Mdt)

# Email
RESEND_API_KEY
DIGEST_FROM_ADDRESS               # e.g. "Crossbook <digest@crossbook.app>"
PRIVACY_FROM_ADDRESS              # e.g. "Crossbook <privacy@crossbook.app>"

# Cron protection
CRON_SECRET                       # openssl rand -hex 32; required for /api/cron/*

# App
NEXT_PUBLIC_APP_URL               # https://crossbook.app

# MCP-only (local dev)
SUPABASE_ACCESS_TOKEN
GITHUB_PERSONAL_ACCESS_TOKEN
```

## 15. Commands

```bash
pnpm dev            # Next.js dev (Turbopack)
pnpm build          # Production build
pnpm start          # Run built app
pnpm lint           # ESLint via next lint
pnpm test           # Vitest one-shot (199 tests passing)
pnpm test:watch     # Vitest watch
pnpm test:coverage  # Vitest + v8 coverage; ≥80% threshold scoped to lib/
pnpm eval:fixtures  # Live-Claude fixture eval — 20/20 pass (requires ANTHROPIC_API_KEY)
```

## 16. Success metric & GO/NO-GO

**Target: 3 paying customers ($49/mo) by day 24.**

| Day 24 result | Decision |
|---|---|
| 3+ paying customers | GO — expand to HubSpot↔Xero, Pipedrive↔QBO |
| 1–2 paying customers | EXTEND 14 days (distribution problem) |
| 0 paying, 20+ free reports generated | EXTEND 14 days (activation problem) |
| 0 paying, <10 free reports | KILL — distribution failed |
| 0 free reports + 0 waitlist + 0 LinkedIn DM replies | HARD KILL — ICP signal |

Path to $5K MRR within 6 months: 100 customers × $49. Path to $10K MRR: 200 customers + a $149 OAuth-tier mix. **The monthly delta retention loop is the bridge** — `month_2_return_rate ≥ 60%` is the health bar to track from the first paid customer.
