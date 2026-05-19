# Crossbook

CSV-in / plain-English-out **HubSpot ↔ QuickBooks reconciliation** for SMB RevOps teams. Drop two CSV exports — Claude finds conflicts, duplicates, missing invoices, and amount mismatches, cites the exact row in both files, and never auto-merges. $49/month vs. HubSpot Data Hub Professional at $720/seat/month.

> **Status:** Phase 1 complete (foundation + normalization). Phase 2 (AI layer) in progress. See [`CLAUDE.md`](./CLAUDE.md) for the full 21-day build brief, GO/NO-GO criteria, and product positioning.

---

## What's here today

| Surface | State |
|---|---|
| CSV upload UI (`/upload`) | ✅ Drag-drop, email, 30-day retention notice, 5 MB / 4000-row guards |
| HubSpot + QuickBooks column detection (`lib/csv-parser.ts`) | ✅ Case-insensitive lookup across 30+ known header variants |
| Field normalizers (`lib/normalizers.ts`) | ✅ Company name (EN/PL/DE/FR/Nordics legal suffixes), diacritics (Polish ł, German ß), currency (US/EU formats + ISO codes), 7 date formats, email |
| Fuzzy match scorer (`lib/conflict-scorer.ts`) | ✅ Weighted 40% name / 30% email / 20% amount / 10% date, orphan detection, 0.5 threshold |
| Test fixtures (`data/test-fixtures/`) | ✅ 10 hand-labeled CSV pairs — 5 EN, 3 Polish, 2 multi-currency |
| Supabase schema (`supabase/migrations/0001_init.sql`) | ✅ 7 tables, RLS keyed off Clerk JWT, 10 seeded `discrepancy_patterns` |
| Stripe checkout + webhook | ✅ `$49/mo` price live, webhook handler with signature verification, test/live key auto-switch by `NODE_ENV` |
| Clerk + Supabase JWT bridge (`lib/supabase.ts`) | ✅ Third-party-auth pattern |
| Claude-driven conflict analysis | 🚧 Phase 2, Day 8 |
| Report UI (conflict table, bulk actions, filters) | 🚧 Phase 3 |
| Monthly delta retention loop | 🚧 Phase 4 |
| Privacy / GDPR endpoints | 🚧 Phase 4, Day 17 |

**Tests:** 85/85 passing — `pnpm test:coverage` at 97.35% lines, 85.52% branches across `lib/`.

---

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack) + React 19 + TypeScript strict
- **Auth:** Clerk (Google OAuth in v1); `middleware.ts` wraps every route
- **Data:** Supabase Postgres with RLS keyed off `auth.jwt() ->> 'sub'` (Clerk-issued)
- **Payments:** Stripe (`$49/month` subscription, monthly only); test/live keys auto-resolved
- **AI:** `@anthropic-ai/sdk` with `claude-sonnet-4-6` + `cache_control: ephemeral` on system prompt
- **CSV / matching:** Papa Parse + Fuse.js + custom Levenshtein layer; currency.js + date-fns for parsing
- **UI:** shadcn/ui (new-york / neutral) + Tailwind v4 + lucide-react
- **Email:** Resend (transactional + monthly digest cron)
- **Tests:** Vitest 4 + v8 coverage (≥80% threshold)
- **Deployment:** Vercel

**Package manager:** pnpm only. `package-lock.json` is intentionally absent.

---

## Quick start

### 1. Install

```bash
pnpm install
```

### 2. Environment variables

Copy `.env.example` → `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required keys (in roughly this order):

| Key | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | https://dashboard.clerk.com |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `STRIPE_SECRET_KEY` / `STRIPE_SECRET_KEY_TEST` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID_MONTHLY` | Stripe dashboard + `stripe listen` |
| `RESEND_API_KEY` | https://resend.com |

`.env*` is gitignored.

### 3. Supabase

Run the migration once against a fresh Supabase project:

```bash
# via supabase CLI
supabase db push

# or via the Supabase MCP server in your editor:
mcp__supabase__apply_migration --name 0001_init --query "$(cat supabase/migrations/0001_init.sql)"
```

Seed the pattern library:

```bash
# 10 patterns are baked into data/pattern-library.json; insert via psql or MCP execute_sql
```

### 4. Stripe (local webhook testing)

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed whsec_... into STRIPE_WEBHOOK_SECRET_TEST in .env.local
```

### 5. Run

```bash
pnpm dev          # Next.js + Turbopack
pnpm test         # Vitest one-shot
pnpm test:watch   # Vitest watch
pnpm test:coverage # Vitest + v8 coverage report (HTML in coverage/)
pnpm build        # Production build
pnpm lint         # ESLint
```

App runs at http://localhost:3000. Upload page at `/upload`.

---

## Project layout

```
app/
  (auth)/sign-in/[[...sign-in]]/   Clerk custom sign-in
  api/
    webhooks/stripe/route.ts       Subscription webhook (signature-verified)
    healthcheck/route.ts           Public probe — 200/503 on Supabase + Stripe
  subscription/page.tsx            Clerk PricingTable
  upload/page.tsx                  Canonical CSV upload entry
  layout.tsx                       ClerkProvider wrapper
  page.tsx                         Marketing landing (real copy lands Phase 5)
components/
  UploadZone.tsx                   Drag-drop, email, retention notice
  ui/                              shadcn/ui primitives
lib/
  supabase.ts                      Clerk-JWT third-party-auth client
  stripe.ts                        Stripe SDK init (test/live key auto-switch)
  payments.ts                      createCheckoutSession() server action
  csv-parser.ts                    Papa Parse + column detection
  normalizers.ts                   Field-level normalizers (pure)
  normalize-record.ts              Composes RawRecord + ColumnMap -> NormalizedRecord
  conflict-scorer.ts               Weighted fuzzy match + orphan detection
  feature-flags.ts                 Env-driven flags (DISABLE_AI_FALLBACK kill-switch)
  test-utils/fixtures.ts           Fixture loader for tests
  utils.ts                         cn() helper
data/
  pattern-library.json             10 seeded discrepancy patterns (the moat)
  test-fixtures/                   10 CSV pairs + expected.json (5 EN / 3 PL / 2 multi-curr)
supabase/
  migrations/0001_init.sql         Schema + RLS
middleware.ts                      clerkMiddleware()
instrumentation.ts                 Sentry register()/onRequestError (no-op w/o SENTRY_DSN)
docs/INCIDENT_PLAYBOOK.md          Severity levels + rollback / webhook-replay runbooks
vitest.config.ts                   v8 coverage, 80% threshold, scoped to lib/
```

Path alias: `@/*` resolves to the repo root.

---

## Architecture

The Crossbook pipeline runs as:

```
CSV upload
   ↓
csv-parser.ts          column detection (HubSpot vs QuickBooks dictionaries)
   ↓
normalize-record.ts    raw row -> NormalizedRecord (uses normalizers.ts)
   ↓
conflict-scorer.ts     weighted fuzzy match → MatchPair[] (matches + orphans)
   ↓
pattern-library        deterministic rules first (cheap, no Claude call)
   ↓
claude (Phase 2)       only for pairs that miss every pattern
   ↓
result_json (Supabase)
   ↓
delta-engine (Phase 4) diff against prior_report_id for the monthly digest
```

The four core rules of the AI layer (governed in code, not in the system prompt alone):

1. **Never auto-merge.** Every action requires a human click. (DELEGATE-52 mitigation.)
2. **Always cite source rows.** Every claim includes `source_row_index` from both CSVs.
3. **Pattern library first.** Known patterns explain via template, no API call.
4. **Confidence-based fallback.** If Claude's confidence < 0.65, downgrade to `MANUAL_REVIEW`.

See [`CLAUDE.md`](./CLAUDE.md) for the full spec: paywall mechanics, monthly delta retention loop, privacy/GDPR posture, landing-page copy, distribution channels, and 21-day build order.

---

## MCP servers

`.mcp.json` configures Supabase, Context7, and GitHub MCP servers. Tokens (`SUPABASE_ACCESS_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`) are read from `.env.local` — no secrets are committed.

Used during build to apply migrations, seed the pattern library, and create Stripe products/prices.

---

## License

Private — no license granted.
