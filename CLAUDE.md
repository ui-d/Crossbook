# CLAUDE.md — HubSpot ↔ QuickBooks Reconciliation MVP (v4 — post-review, build-ready)

This file is the source-of-truth project doc for **Crossbook**. Claude Code (claude.ai/code) should treat it as the canonical brief when working in this repo.

> **Name:** Crossbook (domain: crossbook.app)
>
> **Status:** Build-ready brief. Ship in 21 days, GO/NO-GO at day 24.
>
> **Changes in v4 (post external review, May 9, 2026):**
> 1. **NEW:** Dedicated normalization module (`/lib/normalizers.ts`) — explicit specs for company-name, diacritic, currency, date normalization. Closes the biggest source of pattern-matching false negatives.
> 2. **NEW:** Monthly delta retention loop — recurring value mechanism. 25th-of-month reminder + auto-compare against prior report. Reframes product from *"monthly transactional tool"* to *"ongoing data quality monitor"*. Single biggest retention lever.
> 3. **NEW:** Bulk actions + filters in conflict table — "Trust HubSpot for all currency-format mismatches" as one click. Removes 47-clicks-per-report friction.
> 4. **NEW:** Privacy/GDPR/retention section — Privacy Policy, DPA, 30-day "delete my data" endpoint. Launch blocker for EU customers.
> 5. **NEW:** Live interactive sample on landing page (hardcoded fixture, working buttons). Converts 3–5× better than static screenshot.
> 6. **REJECTED:** Polish landing page (QBO has near-zero PL TAM — Comarch/iFirma/Fakturownia dominate). Polish edge cases stay as test fixtures only.
> 7. **REJECTED:** r/QuickBooks, r/smallbusiness, polish FB groups (wrong personas — accountants, not RevOps).
> 8. **REJECTED:** Quarterly plan as churn fix (delta retention loop is the right answer; pricing-only fix doesn't address the cause).
> 9. **HONEST timeline shift:** 18 → 21 days build, GO/NO-GO at day 24 (was day 21).

## What we're building

A tool that takes two CSV exports — HubSpot Deals and QuickBooks Customers/Invoices — and uses Claude to find conflicts, duplicates, missing invoices, and amount mismatches. Output is a clear, source-cited report with one-click decisions per conflict. After the second upload by the same user, every report includes a "what's changed since last month" delta. No OAuth, no live integrations, minimal database.

**Why this exists:** SMB RevOps teams reconcile HubSpot and QuickBooks at month-end in Excel. HubSpot's Data Hub Professional (the only first-party tool that even tries) starts at $720/seat/month annual. Insycle covers HubSpot dedupe internally but not against QuickBooks. Synder/Bookkeep/Webgility are e-commerce → accounting, not CRM ↔ accounting. There is a real, unfilled position for "CSV-in / plain-English-out reconciliation with month-over-month delta tracking" at $49/month.

**Verified market facts (revalidated May 9, 2026):**
- HubSpot Operations Hub was rebranded to **Data Hub** at INBOUND 2025 (use this name in copy)
- HubSpot Data Hub Professional: $720/seat/month annual, $800/seat/month monthly
- HubSpot Data Hub Enterprise: $2,000+/seat/month
- HubSpot's native QuickBooks Online integration is free in the App Marketplace, but documented to fail on duplicate Display Names, multi-invoice payments, custom transaction numbers, currency mismatches, and revenue-recognition incompatibility
- Insycle (closest HubSpot data-quality competitor): $79–$299/month for record management, no QBO comparison
- Microsoft DELEGATE-52 paper (April 17, 2026, arXiv 2604.15597) confirms even frontier models corrupt 25% of document content over long delegated workflows. **This is why we never auto-merge — every action requires a human click.**

**Core ICP:** SMBs (50–200 employees) using HubSpot CRM Starter ($20/mo) or Sales Hub Professional ($100/mo) but **not** paying for Data Hub Professional ($720+/seat/mo). Buyer is a RevOps Manager, Sales Operations Lead, or Finance Operations Lead doing month-end reconciliation manually.

**Pricing wedge:** $49/month vs. Data Hub Pro $720/seat/month = 93% cheaper. We don't replace Data Hub; we replace Excel + 4 hours of an analyst's life every month-end — and we make the *next* month's reconciliation shorter via delta tracking.

**Why CSV-only is a feature, not a limitation:** Companies with Data Hub already have native sync. Our buyer is the company that exports CSVs at month-end and reconciles in Excel. CSV upload matches their actual workflow.

**Business model:** First report free per email, then $49/month unlimited reports + monthly delta digest. Stripe from day one. Monthly only — no annual or quarterly upsell in MVP. The retention loop (delta digest) earns the recurring billing.

---

## Tech stack

- **Framework:** Next.js 15 App Router + TypeScript (strict) + React 19
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) via Anthropic SDK; use `cache_control: { type: 'ephemeral' }` on the system prompt
- **Database:** Supabase (Postgres + RLS)
- **Auth:** Clerk (Google OAuth only for v1 — RevOps personas use Google Workspace overwhelmingly). Supabase reads Clerk-issued JWTs as third-party auth (see `lib/supabase.ts`).
- **Payments:** Stripe (subscription $49/mo, monthly only)
- **CSV parsing:** Papa Parse
- **Fuzzy matching:** Fuse.js (with custom pre-tokenization layer)
- **Date parsing:** date-fns + date-fns-tz
- **Currency parsing:** currency.js
- **Diacritic stripping:** Custom (lightweight; Unicode NFD + combining-mark filter)
- **Cron:** Supabase Edge Functions (monthly delta digest)
- **Email:** Resend (transactional + digest)
- **Deployment:** Vercel

**Lockfile:** **pnpm is canonical.** `package-lock.json` is being deleted in Day 1; do not reintroduce it. Use `pnpm add` / `pnpm install` only.

**MCP servers:** `.mcp.json` configures Supabase, Context7, and GitHub MCP servers. They expect `SUPABASE_ACCESS_TOKEN` and `GITHUB_PERSONAL_ACCESS_TOKEN` in the environment. **`.env.local` is currently checked into the working tree (not committed — `.gitignore` excludes `.env*`) and contains live token values; rotate them if they have been exposed.**

## Current scaffold state (May 9, 2026)

What's already wired (do not duplicate in Day 1–2):
- Next.js 15.4.1 + React 19 + Tailwind v4 (`@tailwindcss/postcss`) + strict TS, path alias `@/*` → repo root
- Clerk: `middleware.ts` runs `clerkMiddleware()`; `app/layout.tsx` wraps in `<ClerkProvider>`; custom sign-in at `app/(auth)/sign-in/[[...sign-in]]/page.tsx`; Clerk `<PricingTable />` on `app/subscription/page.tsx`
- Supabase third-party auth via Clerk JWT: `lib/supabase.ts` exports `createSupabaseClient()` whose `accessToken` callback returns `(await auth()).getToken()` — call only inside server contexts (route handlers, server components, server actions)
- shadcn/ui (new-york / neutral / lucide): `components/ui/` has accordion, button, dialog, form, input, label, textarea. `components.json` is configured. `lib/utils.ts` exports `cn()` (clsx + tailwind-merge).
- All v4 deps installed except `currency.js`, `date-fns`, `date-fns-tz` (Day 3 installs these). vitest 4.1.5 + @vitest/coverage-v8 installed; **no `vitest.config.ts` and no `test` script yet** (Day 4 wires both).
- Empty surfaces ready for population: `app/api/reconcile/`, `data/test-fixtures/`, `supabase/migrations/`, `supabase/functions/`.
- Placeholder copy still in `app/page.tsx` (SaaS template). Replaced naturally when landing page lands in Day 19. Navbar was rebranded to Crossbook + recipe links stripped.

## Project structure

```
/app
  /page.tsx                        # Landing page with LIVE INTERACTIVE SAMPLE
  /upload/page.tsx                 # Canonical upload entry (Day 3)
  /report/[id]/page.tsx            # Report results (paywalled blur)
  /dashboard/page.tsx              # Report history + delta summary (paid users)
  /privacy/page.tsx                # Privacy Policy (markdown-rendered)
  /dpa/page.tsx                    # Data Processing Agreement
  /api
    /reconcile/route.ts            # Core: parse CSVs + Claude analysis
    /reports/route.ts              # Save/fetch report history
    /reports/[id]/delta/route.ts   # Compute delta vs prior report
    /export/csv/route.ts           # Corrected CSV export
    /webhooks/stripe/route.ts      # Stripe webhook
    /privacy/delete-my-data/route.ts # GDPR Article 17 endpoint
/components
  /UploadZone.tsx                  # Drag & drop + email + retention notice
  /ConflictTable.tsx               # Main results table
  /ConflictRow.tsx                 # Single conflict with decision buttons
  /BulkActionBar.tsx               # Bulk decisions + filters
  /ConflictFilters.tsx             # Priority, type, amount, company filters
  /SummaryCard.tsx                 # Conflicts + amount-at-risk + delta vs prior
  /DeltaSection.tsx                # "What's changed since last report"
  /BlurredRow.tsx                  # Paywall blur
  /SourceCitation.tsx              # "Row 47, Column 'Amount'" link
  /InteractiveSample.tsx           # Landing-page live demo widget
/lib
  /claude.ts                       # Anthropic SDK + prompt + caching
  /csv-parser.ts                   # Papa Parse + column detection
  /normalizers.ts                  # Company name, diacritic, currency, date
  /conflict-scorer.ts              # Fuse.js fuzzy matching (post-normalization)
  /pattern-library.ts              # Common discrepancy patterns (THE MOAT)
  /delta-engine.ts                 # Report-vs-report comparison
  /privacy.ts                      # Data retention + deletion utilities
  /supabase.ts
  /stripe.ts
  /payments.ts
/data
  /test-fixtures/                  # 20+ real HubSpot/QBO CSV pairs
  /pattern-library.json            # Seeded patterns
  /sample-report.json              # Hardcoded fixture for landing-page sample
/supabase
  /migrations/
  /functions
    /monthly-delta-digest/         # 25th-of-month reminder cron
    /file-retention-sweep/         # 30-day CSV deletion cron
```

---

## Database schema

```sql
-- User reports history
create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  session_token text unique,
  email text not null,
  hubspot_filename text,
  quickbooks_filename text,
  total_records_hubspot int,
  total_records_quickbooks int,
  total_conflicts int,
  high_priority_conflicts int,
  total_amount_at_risk_cents bigint,
  status text default 'pending' check (status in ('pending','processing','done','error')),
  result_json jsonb,                    -- full Claude response with row-level citations
  is_paid boolean default false,
  pattern_matches jsonb,
  prior_report_id uuid references reports(id),       -- for delta comparison
  delta_json jsonb,                                  -- what changed vs prior_report_id
  files_purged_at timestamptz,                       -- 30-day retention enforcement
  created_at timestamptz default now()
);

-- Free-report-per-email enforcement
create table free_report_usage (
  email text primary key,
  reports_used int default 1,
  first_used_at timestamptz default now()
);

-- User decisions (drives corrected CSV export AND pattern library learning)
create table conflict_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  conflict_id text not null,
  decision text check (decision in ('TRUST_HUBSPOT','TRUST_QUICKBOOKS','MANUAL_REVIEW','IGNORE')),
  notes text,                          -- optional user note (exported in corrected CSV)
  was_bulk boolean default false,      -- track bulk vs individual decisions
  decided_at timestamptz default now()
);

-- Pattern library — THE MOAT
create table discrepancy_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_key text unique not null,
  pattern_name text not null,
  detection_signature jsonb not null,
  explanation_template text not null,
  recommended_action text,
  confidence_floor numeric default 0.6,
  times_matched int default 0,
  times_user_confirmed int default 0,
  times_user_overrode int default 0,    -- track when users disagree (signal for prompt iteration)
  created_at timestamptz default now()
);

-- Subscriptions
create table subscriptions (
  user_id text primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Monthly delta digest tracking (avoid sending duplicate reminders)
create table digest_sends (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  digest_month date not null,           -- e.g. '2026-05-01' for the May reminder
  sent_at timestamptz default now(),
  unique (user_id, digest_month)
);

-- GDPR audit log
create table data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  requested_at timestamptz default now(),
  completed_at timestamptz,
  records_deleted_count int
);

-- RLS: users can only read their own reports + decisions
alter table reports enable row level security;
alter table conflict_decisions enable row level security;
-- (full policies in supabase/migrations/0001_init.sql)
```

---

## Core logic

### 1. CSV column detection (`/lib/csv-parser.ts`)

HubSpot and QuickBooks exports have wildly inconsistent column names depending on export type, locale, and HubSpot Hub tier. Detect intelligently — never assume.

```typescript
const HUBSPOT_COMPANY_COLS = ['Company Name','Associated Company','company_name','Company','Primary Company']
const HUBSPOT_AMOUNT_COLS  = ['Amount','Deal Amount','amount','Total Contract Value','TCV']
const HUBSPOT_STAGE_COLS   = ['Deal Stage','stage','dealstage']
const HUBSPOT_EMAIL_COLS   = ['Contact Email','email','Email','Primary Contact Email']
const HUBSPOT_OWNER_COLS   = ['Deal Owner','owner','HubSpot Owner']
const HUBSPOT_CLOSE_DATE   = ['Close Date','closedate','Closed Date']
const HUBSPOT_CURRENCY     = ['Currency','deal_currency_code','Deal Currency']

const QB_COMPANY_COLS  = ['Customer','Customer Name','Display Name','Company','Customer Full Name']
const QB_AMOUNT_COLS   = ['Balance','Open Balance','Amount','Total','Invoice Total','Amount Due']
const QB_EMAIL_COLS    = ['Email','Primary Email Address','email','Customer Email']
const QB_STATUS_COLS   = ['Status','Active','account_status']
const QB_INVOICE_DATE  = ['Invoice Date','Date','Created','Txn Date']
const QB_INVOICE_NUM   = ['Invoice #','Invoice Number','Num','Document Number']

interface NormalizedRecord {
  source: 'HUBSPOT' | 'QUICKBOOKS'
  source_row_index: number
  company_name_raw: string                    // as appeared in CSV
  company_name_normalized: string             // post-normalizers.ts
  amount_cents: number | null                 // always store as integer cents
  currency: string                            // 'USD','EUR','PLN','GBP' — ISO codes only
  email: string | null                        // lowercased + trimmed
  status: string | null
  date: Date | null                           // UTC, parsed from any locale format
  raw: Record<string, string>                 // original row preserved for citations
}
```

### 1.5. Normalization module (`/lib/normalizers.ts`)

This is the layer that prevents 80% of false negatives in fuzzy matching. Without it, "Żółw sp. z o.o." and "Zolw Sp. z o.o." score as different entities. With it, they score 0.96+ identical.

```typescript
import { parse, parseISO } from 'date-fns'
import currency from 'currency.js'

// === Company name normalization ===
const LEGAL_SUFFIXES = [
  // English
  /\s+(inc\.?|incorporated|corp\.?|corporation|llc|l\.l\.c\.|ltd\.?|limited|gmbh|ag|s\.?a\.?|plc|co\.?)$/i,
  // Polish
  /\s+(sp\.?\s*z\s*o\.?\s*o\.?|spółka z o\.?o\.?|s\.?a\.?|sp\.?\s*j\.?|sp\.?\s*k\.?)$/i,
  // German/EU
  /\s+(gmbh|ag|kg|ohg|gbr|ug)$/i,
  // French/Italian/Spanish/Nordics
  /\s+(sarl|sas|sa|spa|srl|sl|ab|oy)$/i,
]

export function normalizeCompanyName(raw: string): string {
  let s = raw.trim()
  s = removeDiacritics(s)
  s = s.toLowerCase()
  // Strip legal suffixes iteratively (some companies stack them: "Acme Corp Ltd")
  let prev: string
  do {
    prev = s
    for (const re of LEGAL_SUFFIXES) s = s.replace(re, '')
    s = s.trim().replace(/[,.\-–—]+$/, '').trim()
  } while (s !== prev)
  // Collapse whitespace and punctuation
  s = s.replace(/[^\p{L}\p{N}\s&]/gu, ' ').replace(/\s+/g, ' ').trim()
  return s
}

// === Diacritic stripping (Polish, German, French, Spanish, Czech, etc.) ===
export function removeDiacritics(s: string): string {
  // NFD decomposes "ż" → "z" + combining mark; combining marks are U+0300–U+036F
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    // Polish ł / Ł have no canonical decomposition; handle manually
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    // German ß → ss
    .replace(/ß/g, 'ss')
}

// === Currency normalization ===
const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  '$': 'USD', 'US$': 'USD', 'USD': 'USD',
  '€': 'EUR', 'EUR': 'EUR',
  '£': 'GBP', 'GBP': 'GBP',
  'zł': 'PLN', 'PLN': 'PLN',
  '¥': 'JPY', 'JPY': 'JPY',
}

export function normalizeCurrency(raw: string | null): { amount_cents: number | null, currency: string } {
  if (!raw) return { amount_cents: null, currency: 'UNKNOWN' }
  const trimmed = raw.trim()
  let detected = 'UNKNOWN'
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOL_MAP)) {
    if (trimmed.includes(sym)) { detected = code; break }
  }
  // currency.js handles thousands separators (both "1,234.56" and "1.234,56")
  const useEuropeanFormat = /,\d{2}(?:\D|$)/.test(trimmed) && !/\.\d{2}(?:\D|$)/.test(trimmed)
  const parsed = currency(trimmed, {
    symbol: '', separator: useEuropeanFormat ? '.' : ',',
    decimal: useEuropeanFormat ? ',' : '.',
  })
  return { amount_cents: Math.round(parsed.value * 100), currency: detected }
}

// === Date normalization (handle US, EU, ISO, Polish, written-out months) ===
const DATE_FORMATS = [
  'yyyy-MM-dd',           // ISO
  'MM/dd/yyyy',           // US (HubSpot default)
  'dd/MM/yyyy',           // EU
  'dd.MM.yyyy',           // Polish/German
  'd MMM yyyy',           // "5 Jan 2026"
  'MMM d, yyyy',          // "Jan 5, 2026"
  'd MMMM yyyy',          // "5 January 2026"
]

export function normalizeDate(raw: string | null): Date | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Try ISO first (fast path)
  const iso = parseISO(trimmed)
  if (!isNaN(iso.getTime())) return iso
  // Try each format
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date())
    if (!isNaN(parsed.getTime())) return parsed
  }
  return null
}

// === Email normalization ===
export function normalizeEmail(raw: string | null): string | null {
  if (!raw) return null
  return raw.trim().toLowerCase()
}
```

**Test coverage required:** unit tests for each normalizer with at minimum:
- 10 company name variants (English + Polish + German + French legal suffixes, with/without diacritics)
- 8 currency formats (US, EU, Polish PLN with comma decimals)
- 7 date formats (including "5.01.2026" Polish-with-dots)
- Edge cases: empty strings, whitespace-only, mixed-case inputs

### 2. Pre-Claude fuzzy matching (`/lib/conflict-scorer.ts`)

Operates on **normalized** records only — never raw strings. This is the layer that drops Claude API costs ~70%.

```typescript
import Fuse from 'fuse.js'

// Match HubSpot records to QuickBooks records using NORMALIZED fields.
// Combined score 0–1 weighted:
//   - company_name_normalized similarity (40%) — Levenshtein + token-set ratio
//   - email exact match (30%) — domain match alone counts 0.5
//   - amount_cents proximity (20%) — log-normalized
//   - date proximity (10%) — within 90 days = full credit, beyond = decay
// Send pairs with combined score > 0.5 to Claude.
// Also send: HubSpot records with no QBO match (potential billing miss).
// Also send: QBO records with no HubSpot match (potential direct-sale or churn).

interface MatchPair {
  hubspot_record: NormalizedRecord | null
  quickbooks_record: NormalizedRecord | null
  match_confidence: number
  match_signals: { name_score: number, email_score: number, amount_score: number, date_score: number }
}
```

### 3. Claude conflict analysis (`/lib/claude.ts`)

**Four rules govern this layer:**

**Rule 1: NEVER auto-merge or auto-decide.** Every action requires a human click. (DELEGATE-52 mitigation. Also a copy hook: "We surface conflicts. You decide.")

**Rule 2: ALWAYS cite source rows.** Every claim must include `source_row_index` from both files.

**Rule 3: Pattern library first, Claude second.** Run pattern matching before calling Claude. Known patterns generate explanations from templates without an API call. Claude only handles novel pairs.

**Rule 4: Confidence-based fallback.** If Claude's `confidence` < 0.65 on entity match → automatically downgrade to `MANUAL_REVIEW` and add warning badge. Never let a low-confidence Claude judgment drive a `TRUST_*` recommendation.

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a financial data reconciliation expert helping SMB RevOps teams.
You receive pairs of records from HubSpot CRM (deals) and QuickBooks (customers/invoices)
that appear to represent the same company, after pre-processing has normalized company names,
currencies, and dates.

Your job:
1. Confirm whether they represent the same entity, or are a false match.
2. Identify all conflicts between the two records.
3. Explain each conflict in plain English (1–2 sentences max, no jargon).
4. Recommend an action with reasoning, BUT NEVER take the action — only recommend.
5. Cite source row indices for every claim.

Strict rules:
- NEVER fabricate values. If a field is missing, say "missing" — never invent.
- ALWAYS cite source_row_index from both records when making a claim.
- Use plain English. No "discrepancy" — say "different". No "reconcile" — say "match up".
- Be precise about money. "$12,400 in HubSpot vs $10,200 in QuickBooks" — not "amounts differ".
- If confidence < 0.7 that records represent the same entity, mark as POSSIBLE_FALSE_MATCH.

Respond in valid JSON only. No markdown, no preamble, no code fences.`

interface ConflictAnalysisInput {
  hubspot_record: NormalizedRecord | null
  quickbooks_record: NormalizedRecord | null
  match_confidence: number
}

interface Conflict {
  field: string
  hubspot_value: string | null
  hubspot_row_index: number | null
  quickbooks_value: string | null
  quickbooks_row_index: number | null
  explanation: string
  recommended_action: 'TRUST_HUBSPOT'|'TRUST_QUICKBOOKS'|'MANUAL_REVIEW'|'IGNORE'
  priority: 'HIGH'|'MEDIUM'|'LOW'
  amount_at_risk_cents: number | null
  confidence: number
  pattern_matched: string | null
  conflict_type: 'AMOUNT'|'STATUS'|'MISSING'|'DUPLICATE'|'DATE'|'CURRENCY'|'EMAIL'  // enables filtering
}

// Batch up to 8 pairs per Claude call. Use prompt caching for system prompt.
async function analyzeConflicts(pairs: ConflictAnalysisInput[]): Promise<ReportResult[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: JSON.stringify(pairs) }]
  })
  return parseAndValidate(response.content[0].text)
}
```

### 4. API route — core reconciliation (`/api/reconcile/route.ts`)

```typescript
// POST /api/reconcile
// Body: FormData with hubspot_file (CSV) + quickbooks_file (CSV) + email

// Flow:
// 1. Validate files: max 5MB each, max 4,000 rows each (cap; show upgrade message above)
// 2. Parse with Papa Parse + column detection
// 3. NORMALIZE every record via /lib/normalizers.ts
// 4. Run fuzzy matching → candidate pairs
// 5. Pattern library first; only call Claude on misses
// 6. Batch unmatched pairs to Claude (8 per call, parallel up to 4 concurrent)
// 7. Save to Supabase with `prior_report_id` if user has prior report (for paid users)
// 8. If prior_report_id set: compute delta via /lib/delta-engine.ts
// 9. Return report ID + signed access token
// 10. Schedule files_purged_at = now() + 30 days

// Paywall logic (server-side, never trust client):
// - Anonymous: check free_report_usage; 0 used → allow + increment.
// - Anonymous with 1+ used → save report but is_paid=false; redirect to Stripe.
// - Authenticated with active subscription → always allow.
```

### 5. Report UI (`/components/ConflictTable.tsx` + `/components/BulkActionBar.tsx` + `/components/ConflictFilters.tsx`)

**Summary card (always visible, free + paid):**
- "47 conflicts across 312 records"
- "$43,200 in amount mismatches"
- "12 HIGH priority"
- "8 deals likely missing QuickBooks invoices"
- **Delta line for paid users with prior report:** "Since your April report: 5 new conflicts, 12 resolved, $8,400 newly at risk"

**Filters (visible above table):**
- Priority: HIGH / MEDIUM / LOW (multi-select)
- Conflict type: Amount / Status / Missing / Duplicate / Date / Currency / Email (multi-select)
- Amount at risk: slider with min/max
- Company name: text search
- Decision status: Pending / Decided / Ignored (multi-select)

**Bulk action bar (appears when 2+ rows selected via checkbox):**
- "Trust HubSpot for selected (12)"
- "Trust QuickBooks for selected (12)"
- "Flag for review (12)"
- "Ignore (12)"
- Quick-select shortcuts:
  - "Select all HIGH priority" (1 click)
  - "Select all currency-format mismatches" (1 click — these are usually safe to bulk-ignore)
  - "Select all from same conflict type"

**Conflict table columns:**
- Checkbox (for bulk selection)
- Company (HubSpot name → QuickBooks name, with row indices)
- Conflict type badge
- Priority (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW)
- Plain-English explanation
- Source citation ("HubSpot row 47, QBO row 12") — clicking expands raw row
- Actions: 3 buttons + optional notes field

**On action click:**
- Save decision (single or bulk) to `conflict_decisions` with `was_bulk` flag
- Visual checkmark + strikethrough on row
- After all HIGH priority resolved: "Export corrected CSV" button activates
- Decisions feed back into `discrepancy_patterns.times_user_confirmed` (or `times_user_overrode` if user disagrees with pattern recommendation)

**Corrected CSV export contents:**
- Original HubSpot CSV columns + appended:
  - `Reconciliation_Decision` (TRUST_HUBSPOT / TRUST_QUICKBOOKS / MANUAL_REVIEW / IGNORE)
  - `Reconciliation_Notes` (user's optional comment)
  - `Conflict_Type`
  - `Recommended_Source_Of_Truth` (when decision was made)
  - `Decided_At` (timestamp)
- Same for QuickBooks CSV
- A `_summary.csv` with: total decisions, breakdown by type, total $-impact

---

## Monthly delta retention loop (the recurring-value mechanism)

This is the single biggest product change in v4. It reframes the product from a *monthly transactional tool* (high churn risk) to an *ongoing data quality monitor* (recurring value).

**The mechanism:**
1. When a paid user uploads a new pair of CSVs, system finds their most recent prior report (matching same workspace/email).
2. `/lib/delta-engine.ts` computes:
   - **New conflicts:** present in current report, absent in prior
   - **Resolved conflicts:** present in prior report, absent in current (likely fixed)
   - **Persistent conflicts:** present in both — possibly chronic data hygiene issues
   - **Decision overrides:** items the user previously decided TRUST_HUBSPOT but now show different — flagged
3. Delta JSON saved to `reports.delta_json`
4. New `<DeltaSection />` component shown at top of report:
   ```
   📊 What's changed since your April report (11 days ago):
   • 5 new conflicts ($8,400 newly at risk) ← these are new
   • 12 conflicts resolved ($24,200 cleared) ← good progress!
   • 8 persistent conflicts ($15,600 still unresolved) ← these need attention
   • 2 items where you previously trusted HubSpot but data has now changed ← review
   ```

**The reminder cron (`/supabase/functions/monthly-delta-digest/`):**
Runs daily. For each paid user where `last_report.created_at < (now - 25 days)` AND no digest sent for current month:
- Send Resend email: subject "Time for your monthly reconciliation? Your last report was 26 days ago."
- Body: "Drop your latest HubSpot + QuickBooks exports — we'll show you exactly what's changed since [last report date]. Should take 60 seconds."
- Insert row into `digest_sends` to prevent duplicates.

**Why this beats a quarterly plan:**
- Quarterly plan ($129/3mo = $43/mo equivalent) leaves money on the table and doesn't address the cause of churn (lack of recurring value within the month).
- Delta digest creates a re-engagement event 11–13 times per year instead of 4. Each re-engagement reinforces "this tool watches our data hygiene over time."
- The compounding effect: by month 4, the user has 3 historical reports and gets richer trend data ("Persistent conflicts trending down 30%"). That's a switching cost no competitor can replicate without months of historical data.

**Engagement metrics to track from day 1:**
- `month_2_return_rate` — % of paid users who upload a 2nd report within 35 days. Healthy = >60%. <40% = churn problem.
- `digest_open_rate` — % of monthly digest emails opened. Healthy = >35%.
- `digest_click_rate` — % that click "upload new CSVs" CTA. Healthy = >15%.

---

## Paywall mechanic (the conversion engine)

```
Anonymous user uploads two CSVs → enters email
    ↓
Report generates (Claude API call, ~30–60 seconds with streaming progress)
    ↓
Free tier shows:
  - FULL summary card (total conflicts, $-at-risk, missing invoices)
  - First 5 conflicts with full details + actions enabled, bulk actions disabled
  - Remaining conflicts: company names visible, explanations + actions BLURRED
    ↓
Banner above blurred rows:
  "42 more conflicts to resolve, including $38,200 in amount mismatches.
   Upgrade $49/mo for unlimited reports + monthly delta tracking + corrected CSV export.
   That's 93% less than HubSpot Data Hub Professional ($720/seat/mo)."
    ↓
Stripe Checkout (subscription, $49/mo monthly)
    ↓
After payment:
  - Webhook → set is_paid=true → unlock blur, enable filters + bulk actions
  - Clerk account auto-created (passwordless magic-link)
  - Redirect to /dashboard?welcome=true
  - Schedule first monthly digest reminder for day 25 of next billing cycle
```

---

## Pattern library — THE MOAT (start day 1)

Every paid report's user decisions feed back into `discrepancy_patterns` via both `times_user_confirmed` (agreed with recommendation) and `times_user_overrode` (disagreed). The override signal is gold — it tells you which patterns need prompt-engineering refinement.

**Seed patterns (write before launch):**
```json
[
  {
    "pattern_key": "qbo_invoice_70pct_of_hubspot_deal",
    "name": "Likely 30% partial payment scenario",
    "detection": "qbo_amount / hubspot_amount in [0.65, 0.75]",
    "template": "HubSpot shows deal closed at {hubspot_amount} but QuickBooks invoice is {qbo_amount} ({pct}% of deal). This usually indicates a 30% deposit or partial payment recorded.",
    "action": "MANUAL_REVIEW"
  },
  {
    "pattern_key": "closed_won_no_qbo_invoice",
    "name": "Closed-Won deal with no QuickBooks invoice",
    "detection": "hubspot.stage = 'Closed Won' AND no qbo_match",
    "template": "Deal '{deal_name}' closed in HubSpot on {close_date} for {amount} but no matching QuickBooks invoice was found. Common billing miss pattern.",
    "action": "MANUAL_REVIEW",
    "priority": "HIGH"
  },
  {
    "pattern_key": "name_legal_suffix_only",
    "name": "Same entity, different legal suffix",
    "detection": "normalized_name_match > 0.95 AND email_match",
    "template": "'{hubspot_name}' and '{qbo_name}' appear to be the same company — only the legal-entity suffix differs.",
    "action": "TRUST_HUBSPOT"
  },
  {
    "pattern_key": "currency_symbol_vs_code_mismatch",
    "name": "Currency format inconsistency",
    "detection": "amount_match > 0.99 AND currency_format_differs",
    "template": "Amounts match but currency is recorded differently: '{hubspot_currency}' vs '{qbo_currency}'. No actual conflict — formatting only.",
    "action": "IGNORE"
  },
  {
    "pattern_key": "polish_nip_in_qbo_missing_in_hubspot",
    "name": "Polish NIP in QBO, missing in HubSpot",
    "detection": "qbo.tax_id matches /^PL?\\d{10}$/ AND hubspot.tax_id IS NULL",
    "template": "QuickBooks has a Polish NIP ({nip}) for this customer; HubSpot does not. Adding the NIP to HubSpot will improve future EU invoice matching.",
    "action": "TRUST_QUICKBOOKS"
  }
]
```

Add 5–10 more before launch covering: multi-invoice payments, sub-customer notation ("Acme:Subsidiary"), date-format-only mismatch, status-vs-closed mismatches, contact-without-company in HubSpot.

---

## Privacy, data retention, GDPR (launch blocker)

CSV uploads contain customer PII (names, emails, sometimes Polish NIP, deal amounts). Without a clean privacy posture, EU buyers will not upload — and 30%+ of the addressable RevOps audience is EU.

**Required before launch:**

**1. Privacy Policy (`/app/privacy/page.tsx`)**
Markdown-rendered. Cover at minimum:
- What we collect (CSV file contents, email, decisions, payment info via Stripe)
- Lawful basis (Art. 6(1)(b) GDPR — performance of contract)
- Subprocessors (list each: Anthropic for inference, Supabase for DB, Stripe for payments, Clerk for auth, Resend for email, Vercel for hosting)
- Retention: CSV files deleted after 30 days. Reports retained while account active. Deleted within 30 days of account closure.
- User rights (access, deletion, portability) + email contact
- International transfers (Anthropic/Stripe in US — note SCCs)

**2. Data Processing Agreement (`/app/dpa/page.tsx`)**
Standard DPA template (use Iubenda, Termly, or Vanta DPA generator — $20–50/mo). Auto-accepted at signup; user can download signed copy. Critical for B2B SaaS in EU — RevOps buyers will ask.

**3. File retention sweep (`/supabase/functions/file-retention-sweep/`)**
Daily cron. For every report where `created_at < now() - interval '30 days'`:
- Strip `result_json.raw` and `result_json.original_csv_text` from row
- Keep summary stats, conflict counts, decisions (these are not PII at this granularity)
- Set `files_purged_at = now()`
- Delta engine still works because it operates on conflict signatures, not raw CSV

**4. Delete-my-data endpoint (`/app/api/privacy/delete-my-data/route.ts`)**
GDPR Article 17 (Right to Erasure). Email-verified flow:
- POST `/api/privacy/delete-my-data` with email
- Send verification link (Resend) — 1-hour expiry
- On click: cascade delete `reports`, `conflict_decisions`, `subscriptions`, `free_report_usage` for that email
- Insert audit row in `data_deletion_requests` with `records_deleted_count`
- Send confirmation email
- Stripe customer not deleted (financial records retained per legal obligation, GDPR Art. 17(3)(b))

**5. UI prominence**
On upload screen, below the dropzone, a single line:
> "🔒 Your CSV files are deleted after 30 days. Reports are kept while your account is active. [Privacy Policy]"

Don't bury this. Putting it visibly *increases* upload conversion in EU because it preempts the question.

**Cost: ~$30–80/mo for DPA generator + ~1.5 days of build time.** Non-negotiable for EU launch.

**SOC 2 / ISO 27001:** Defer to $10K MRR. At MVP scale, SOC 2 is a $15–30K + 6-month effort and most SMB RevOps buyers don't ask. Vanta or Drata can run continuous monitoring from day one for ~$300/mo if you want pre-readiness.

---

## Landing page copy (with live interactive sample)

```
Headline: HubSpot ↔ QuickBooks reconciliation that doesn't cost $720/seat/month

Subhead: Drop two CSVs. AI explains every conflict in plain English with source-row citations. First report free. $49/month for unlimited + monthly delta tracking.

Three trust signals (above the fold):
- "Every claim cites the exact row — never auto-merges, never invents data"
   (subtext: "Microsoft Research found frontier models corrupt 25% of documents
    over long workflows. We surface conflicts. You decide.")
- "HubSpot Data Hub Pro starts at $720/seat/month. We're $49 flat."
- "Built for teams who export CSVs at month-end — not enterprises with native syncs."

[ HERO CTA: "Drop your CSVs → see conflicts in 60 seconds" — free, no signup ]

↓ scroll ↓

[ LIVE INTERACTIVE SAMPLE ]
Section title: "Here's what a real report looks like"
Component: <InteractiveSample /> — uses /data/sample-report.json
- Shows full summary card with realistic numbers ($43,200 at risk, 47 conflicts, etc.)
- Top 8 conflicts visible, fully explained with source citations
- All 3 decision buttons WORK (saves to local state — never to backend)
- Bulk action bar functional
- Filters functional (Priority + Conflict Type)
- "Export corrected CSV" works → downloads sample CSV
- Bottom CTA: "Try this with YOUR real CSVs →"

Section: How it works (3-step)
1. Upload HubSpot Deals CSV + QuickBooks Customers/Invoices CSV
2. AI compares them, surfaces every conflict with plain-English explanations
3. You decide. Export corrected CSV. Get monthly digest of what's changed.

Section: What we're not (anti-positioning)
- "Not Insycle" (Insycle is $79–299/mo for HubSpot dedupe — we cross-check against QBO)
- "Not Synder/Bookkeep" (those are Stripe → QBO; we're CRM → QBO)
- "Not Data Hub Pro" (we don't replace it — we cover the reconciliation gap for teams who'll never pay $720/seat)

Section: Pricing
- Free: 1 report per email, full summary, first 5 conflicts unblurred
- $49/month: Unlimited reports, all conflicts unblurred, bulk actions, filters,
  monthly delta tracking, corrected CSV export, monthly reminder digest
- Cancel anytime. No annual. Monthly only.

Section: Privacy + trust
- "🔒 Your CSV files deleted after 30 days. GDPR-compliant. DPA available."
- Subprocessor list link
- "Built solo by Dawid Nawrocki. 10+ years in PLG / RevOps engineering."

Footer: Privacy / DPA / Terms / Contact
```

---

## Environment variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=          # $49/month
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=https://crossbook.app
DPA_GENERATOR_API_KEY=            # Iubenda/Termly/Vanta DPA generator
```

---

## Build order (21 days, solo, ~10–15 hrs/week realistic)

**Phase 1: Foundation + normalization (days 1–6)**
- Day 1: Supabase schema + RLS + seed pattern library JSON
- Day 2: Stripe wiring + env-var inventory (Clerk/Supabase already scaffolded)
- Day 3: CSV upload UI + Papa Parse + column detection
- Day 4: `/lib/normalizers.ts` with full unit test coverage (company name with PL/DE/FR suffixes, currency, date, diacritics, email)
- Day 5: Test fixture pipeline — 10 synthetic CSV pairs hand-labeled (5 EN, 3 PL, 2 multi-currency)
- Day 6: Fuzzy matching with Fuse.js operating on normalized fields

**Phase 2: Core AI layer (days 7–10)**
- Day 7: Pattern library matching (no Claude yet — pattern-only path)
- Day 8: Claude integration + system prompt + Zod validation + confidence-fallback rule
- Day 9: Prompt iteration with 10 fixtures; quality bar = 7/10 correct
- Day 10: Add 10 more fixtures (5 real from beta cohort, 5 synthetic edge cases); quality bar = 17/20

**Phase 3: UX + paywall + bulk actions (days 11–14)**
- Day 11: Report display UI — conflict table + summary card + source citations
- Day 12: Bulk action bar + filters component
- Day 13: Paywall blur mechanic + Stripe Checkout integration
- Day 14: **Build-in-public post #1** (LinkedIn + RevOps Co-op Slack #questions) → start collecting beta cohort

**Phase 4: Delta loop + privacy (days 15–18)**
- Day 15: Delta engine (`/lib/delta-engine.ts`) + `<DeltaSection />` component
- Day 16: Monthly digest cron (`/supabase/functions/monthly-delta-digest/`) + Resend templates
- Day 17: Privacy Policy + DPA pages + delete-my-data endpoint + 30-day file retention sweep
- Day 18: Decision tracking + corrected CSV export with notes column

**Phase 5: Landing + distribution (days 19–21)**
- Day 19: Landing page with `<InteractiveSample />` component (working demo with hardcoded fixture)
- Day 20: **Build-in-public post #2** with real findings screenshots + **HubSpot Community post**
- Day 21: Deploy to Vercel + custom domain + **ProductHunt soft-launch**

**Phase 6: GO/NO-GO (days 22–24)**
- Day 22–23: First paid users onboard. Watch Stripe dashboard + activation metrics.
- Day 24: GO/NO-GO checkpoint.

---

## GO/NO-GO criteria — day 24

| Result | Action |
|---|---|
| **3+ paying customers** | GO — proceed to expansion (HubSpot↔Xero, Pipedrive↔QBO) |
| **1–2 paying customers** | EXTEND 14 days — distribution problem, not product |
| **0 paying customers, 20+ free reports generated** | EXTEND 14 days — activation problem; investigate free→paid conversion gap |
| **0 paying customers, <10 free reports generated** | KILL — distribution failed; ICP doesn't trust the tool or doesn't see the pain |

**Hard kill (no extension):** zero free reports + zero waitlist signups + zero LinkedIn DM replies after 21 days. ICP signal, not product/distribution signal.

**Day 60 health check (post-launch):** if `month_2_return_rate` < 40%, the delta retention loop is failing — diagnose: is the digest landing in spam? Is the delta surface invisible? Are users getting clean reports and not coming back because there's nothing to fix?

---

## Distribution channels

**Primary (warm, high-intent):**
- LinkedIn build-in-public series (Dawid's existing audience + Senior Growth Engineer positioning)
- RevOps Co-op Slack #questions (15K members, application-gated)
- HubSpot Community forum
- HubSpot User Group monthly meetups

**Secondary (cold, scaled):**
- LinkedIn DM outreach to RevOps Manager / Sales Ops Lead at companies with HubSpot + QBO tech-stack signals (BuiltWith, JobsForData)
- Modern Sales Pros forum (paid; access via Pavilion)
- Wizards of Ops Slack (RevOps tactical community)

**Tertiary (one-shot):**
- ProductHunt soft-launch (target: 50 upvotes from network → 100 visitors → 5–10 free reports)
- Indie Hackers post-mortem after first paying customer

**Explicitly REJECTED in v4:**
- ~~r/QuickBooks~~ — accountants asking how-to questions, not RevOps buyers
- ~~r/smallbusiness~~ — owners not ops; wrong functional persona
- ~~Polish FB groups "HubSpot Polska"~~ — QBO has near-zero PL TAM (Comarch/iFirma/Fakturownia dominate)
- ~~r/sysadmin, r/SaaS~~ — wrong audience for end-user RevOps tooling

---

## Expansion roadmap (only after $1K MRR)

Same codebase, new revenue surfaces. Each is ~3–5 days of work.

1. **HubSpot ↔ Xero** — same logic, swap QBO column detection for Xero's. EU/UK market expansion.
2. **Pipedrive ↔ QuickBooks** — Pipedrive matches HubSpot's structure ~80%.
3. **Salesforce → QuickBooks** — bigger TAM but harder ICP. Defer until $5K MRR.
4. **OAuth-based monthly auto-reconcile** — $149/mo upsell. Build only when 3+ paying customers explicitly ask.
5. **Custom field mapping** — "Map Custom_Discount_% → QBO_Memo_Field". Self-serve UI.
6. **Webhook + Zapier integration** — "After report generated, send summary to Slack." Lowest priority.

---

## What NOT to build in this MVP

- HubSpot OAuth API integration (CSV only — keeps the wedge)
- QuickBooks OAuth integration
- Continuous sync ("set and forget") — premature; defer to $5K MRR
- Pipedrive / Xero / Salesforce support (v2)
- Multi-currency conversion (flag and skip; never auto-convert)
- Bulk processing > 4,000 rows per file (cap; show upgrade message above)
- Team collaboration / shared workspaces
- AI-powered auto-merge (DELEGATE-52: this is exactly what we don't do)
- SOC 2 / ISO 27001 compliance features (defer to $10K MRR)
- Slack/Zapier integrations (post-$1K MRR per item)
- Localized landing page (PL/DE/FR) — defer until 5+ customers from a single region
- Quarterly billing plan (delta loop solves the underlying retention problem instead)

---

## Definition of done

- ☐ User uploads two CSVs and receives report in <90 seconds (streaming progress visible)
- ☐ Normalizers handle EN + PL + DE + FR company names, 7+ date formats, US/EU currency formats
- ☐ Claude correctly identifies + explains 17/20 fixture cases at HIGH/MEDIUM priority
- ☐ Confidence-fallback rule fires correctly (sub-0.65 confidence → MANUAL_REVIEW + warning)
- ☐ Every claim in the report cites source row indices in both files
- ☐ Pattern library has 10+ seeded patterns; library hits >40% of conflicts
- ☐ Bulk action bar + filters work; quick-select shortcuts functional
- ☐ Paywall blurs rows 6+ for free tier; Stripe checkout completes; webhook unlocks report
- ☐ Corrected CSV export includes Decision + Notes + Conflict Type + Recommended Source columns
- ☐ Delta engine surfaces new/resolved/persistent conflicts on second upload
- ☐ Monthly digest cron sends 25th-of-month reminder; deduplicates per `digest_sends` table
- ☐ Privacy Policy + DPA pages live; subprocessor list current
- ☐ 30-day file retention sweep cron runs daily and purges raw CSV content
- ☐ Delete-my-data endpoint email-verified and audit-logged
- ☐ Landing page with **working live interactive sample** (filters, bulk actions, decisions all functional client-side)
- ☐ 10 beta testers onboarded by day 20
- ☐ ProductHunt soft-launch posted; LinkedIn build-in-public series running

## Success metric

**3 paying customers ($49/mo) by day 24.** Path to $5K MRR within 6 months: 100 customers × $49. Path to $10K MRR: 200 customers + $149 OAuth tier mix. Delta retention loop is the bridge.

## DM script (for cold outreach to RevOps managers on LinkedIn)

> "Hi [name] — saw your post about [specific RevOps thing]. Quick question: how do
> you currently reconcile HubSpot deals against QuickBooks invoices at month-end?
> If it's still Excel and 2+ hours of your life, I built a tool that does it in
> 60 seconds — AI explains every conflict in plain English, with source-row citations
> so you trust the output. First report free, $49/mo unlimited (with monthly delta
> tracking so next month is 5 minutes instead of 60). Worth 5 minutes of seeing
> what it finds in your real data?"

## Community-post version (RevOps Co-op #questions, HubSpot Community)

> "Anyone else hate the month-end HubSpot ↔ QuickBooks reconciliation hell? Building
> a CSV-in / plain-English-out reconciler so I never have to do this in Excel again.
> Looking for 5 RevOps folks who'd test it on real data this week — 3 months free
> for honest feedback + a recorded 20-min reaction. Drop a comment or DM."

---

## Risks the brief openly acknowledges (v4-updated)

1. **HubSpot may keep adding native data-quality features through 2026.** Breeze Data Agent already does AI-powered enrichment at the $720/mo tier. Mitigation: stay the cheaper, simpler, CSV-first option for the segment that won't pay $720/seat regardless.
2. **The pattern library moat takes 50+ paying customers to compound meaningfully.** Until then, defensibility is thin. Move fast on customer count.
3. **DELEGATE-52 risk applies to us too.** Source citations + 17/20 fixture quality bar + confidence-fallback rule are mitigations. Watch for hallucination reports in the first 20 paid reports.
4. **Solo distribution capacity is the bottleneck, not the build.** If days 14–20 build-in-public posts get <10 reactions combined, the build doesn't matter.
5. **Delta retention loop is unproven.** It's the right shape on paper, but `month_2_return_rate` could land at 30% instead of 60%. Track from day 1; if low, iterate on digest copy and delta UX before pivoting pricing model.
6. **GDPR/Privacy is a launch blocker for ~30% of TAM (EU).** Day 17 is non-negotiable; can't ship without it for EU buyers.
7. **`<InteractiveSample />` could backfire if the fixture data feels too clean.** Use realistic messy data — include 2 false-positive matches, 1 ambiguous currency case. Make the sample teach the trust story, not just demo features.

---

## Commands

```bash
pnpm dev           # Next.js dev server with Turbopack
pnpm build         # Production build
pnpm start         # Run built app
pnpm lint          # ESLint via next lint
pnpm test          # Vitest run (wired in Day 4)
pnpm test:watch    # Vitest watch
pnpm test:coverage # Vitest with v8 coverage; threshold 80%
```
