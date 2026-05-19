# Crossbook — Next Steps (launch run)

Single source of truth for the launch. Updated 2026-05-15 after analyzing the
6-phase / 14-prompt plan against the live codebase.

**Read this first:**

- **Phase A (pre-launch fixes) is 100% done and shipped.** All five fixes are
  in `main` and verified in code — don't redo them.
- **The app is live and taking traffic** at `crossbook.app`. Phase B is now
  *verify*, not *deploy*.
- **Phase D2 (incident readiness) is done** — built in this pass: `/api/healthcheck`,
  Sentry wiring, `lib/feature-flags.ts` (`DISABLE_AI_FALLBACK`), `docs/INCIDENT_PLAYBOOK.md`.
- Everything else is either **your hands** (your voice, your accounts, your
  network) or **Claude drafts on request** (you then edit voice + post).

The split, in one table:

| Phase | Claude can do | You must do |
|---|---|---|
| Meta — recruitment triage | — | **Today.** Decide + send 4 messages (§0) |
| A — pre-launch fixes | ✅ Done & shipped | Nothing — already reviewed/merged |
| B — verify live deploy | Smoke-test checklist + env/webhook/DNS reference (§3) | Run the smoke test; confirm Stripe live webhook + Resend domain; rotate the leaked Stripe key |
| C — audience warm-up | Draft all LinkedIn/community posts + DM template + Apify target query | Edit voice, confirm community access, post 1/day, engage ≤90 min, 5 DMs/day |
| D1 — interview script | Draft the 15-min Mom-Test script | Calendly, book 5+, record w/ permission, tag $-quotes |
| D2 — incident readiness | ✅ Done (this pass) | UptimeRobot → `/api/healthcheck`; Sentry signup → `SENTRY_DSN` in Vercel |
| E1 — ProductHunt package | Draft full PH package | Be online 6h launch day; pre-warm network; reply ≤15 min |
| F1 — GO/NO-GO refresh | Rewrite `APP_SUMMARY.md §16` + Day-38 decision template | Run the matrix Day 38; write the decision longhand first |

---

## §0 — Meta-task: recruitment triage (YOU ONLY, today)

Claude cannot do this and it gates every hour below. Before any launch work:
decide which **2** recruitment processes you keep warm and which **4** go to
"in progress, no new commitments for 14 days." Crossbook launch and serious
interview prep cannot share the same two weeks.

Don't decide in the abstract — **write and send the four "I'm in another active
process, can we revisit in two weeks?" messages right now.** This is the single
highest-leverage 30 minutes this week.

---

## §1 — Status snapshot

- **Build:** ✅ green (`pnpm build`)
- **Tests:** ✅ green (`pnpm test`) incl. new `lib/feature-flags.test.ts`
- **Lint:** ✅ clean (`pnpm lint`)
- **Phase A shipped** (commits on `main`):
  - `fix: replace round demo numbers with asymmetric values in InteractiveSample`
  - `feat: add PostHog product analytics`
  - `fix: reject disposable + invalid emails on free reports`
  - `chore: remove unused ai-sdk packages (dead deps)`
  - `feat: add support inbox + reorder GDPR consent above upload dropzone`
- **Phase D2 added this pass:** `app/api/healthcheck/route.ts`,
  `instrumentation.ts` + `sentry.{server,edge}.config.ts`,
  `lib/feature-flags.ts` + test, `docs/INCIDENT_PLAYBOOK.md`. `.env.example`
  gained `SENTRY_DSN` and `DISABLE_AI_FALLBACK` (both optional, both no-op when unset).
- **App is live** at `crossbook.app`. Supabase migrations 0001+0002 applied;
  10 patterns seeded; Stripe live product/price created; cron jobs in `vercel.json`.

---

## §2 — The 6-phase plan at a glance

| Item | What | Owner | Gate | Status |
|---|---|---|---|---|
| Meta | Recruitment triage | You | none | ⬜ Do today |
| A1–A5 | Pre-launch fixes | Claude | — | ✅ Shipped |
| B1 | Verify live deploy + smoke test | Both | — | ⬜ You run §3 |
| B2 | Stripe live webhook + Resend verify | You | B1 | ⬜ Verify §3 |
| C1 | 5-post LinkedIn build-in-public | Claude→You | **B done** | ⬜ On request |
| C2 | RevOps cold-DM template + Apify plan | Claude→You | B done | ⬜ On request |
| C3 | Community launch posts | Claude→You | B done | ⬜ On request |
| D1 | Customer interview script | Claude→You | first free users | ⬜ On request |
| D2 | Healthcheck / Sentry / flags / playbook | Claude | — | ✅ Done |
| E1 | ProductHunt package | Claude→You | ~Day 31 | ⬜ On request |
| F1 | GO/NO-GO matrix refresh (Day 38) | Claude→You | post-PH | ⬜ On request |

"Claude→You" = Claude produces the draft; you edit it into your own voice and
post/run it. Drafts are intentionally **not** generated yet (see §4) — they go
stale and read as AI if produced before you're ready to post.

---

## §3 — Phase B: verify the live deploy (mostly YOU)

The app is live, so this is a verification pass, not a deploy. Work top-down.

### 3.1 Rotate the leaked Stripe secret (do first)

A **live** `sk_live_*` key was pasted into a prior conversation + sits in
`.env.local`. Roll it: https://dashboard.stripe.com/apikeys → live mode →
the live secret key → **Roll**. Then replace it in local `.env.local` **and**
Vercel Production `STRIPE_SECRET_KEY`. Old holders are revoked on roll.

### 3.2 Confirm Vercel env vars (scopes matter)

Wrong scope = wrong Stripe mode in production. Cross-check Vercel → Settings →
Environment Variables against `.env.example`:

- **Production only:** `STRIPE_SECRET_KEY` (`sk_live_*`), `STRIPE_WEBHOOK_SECRET`
  (`whsec_*` live), `STRIPE_PRICE_ID_MONTHLY` (live price),
  `NEXT_PUBLIC_APP_URL=https://crossbook.app`
- **Preview/Dev:** `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST`,
  preview `NEXT_PUBLIC_APP_URL`
- **All scopes:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`,
  `DIGEST_FROM_ADDRESS`, `PRIVACY_FROM_ADDRESS`
- **New, optional (server-only, leave unset until you sign up):** `SENTRY_DSN`,
  `DISABLE_AI_FALLBACK`
- `NEXT_PUBLIC_*` are client-exposed by design; everything else is server-only —
  never prefix a secret with `NEXT_PUBLIC_`.

Cron note: Vercel cron requires a **Pro** plan. On Hobby the two jobs in
`vercel.json` won't fire — confirm the plan tier.

### 3.3 Confirm the Stripe live webhook

Stripe Dashboard (Test mode **OFF**) → Developers → Webhooks → endpoint
`https://crossbook.app/api/webhooks/stripe`. It must subscribe to exactly:
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `checkout.session.completed`. "Send test
webhook" → expect a 2xx. The live signing secret must match Vercel Production
`STRIPE_WEBHOOK_SECRET` with **no trailing whitespace** (the classic failure).
Local dry-run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### 3.4 Confirm Resend domain verification

https://resend.com/domains → `crossbook.app` shows **Verified** (SPF + DKIM +
DMARC at your registrar). Unverified ⇒ mail ships from `onboarding@resend.dev`
and lands in spam after ~5/day. Smoke test: `pnpm tsx scripts/test-resend.ts`.

### 3.5 Smoke-test checklist (run on the live URL, fresh browser)

| # | Step | Expected result |
|---|---|---|
| 1 | Open `https://crossbook.app/` | Landing renders, `<InteractiveSample>` animates, no console errors |
| 2 | Sign in (Google) | Clerk completes, returns authenticated |
| 3 | Go to `/upload`, drop `data/test-fixtures/03_*` pair + email | Accepts both CSVs, no client error |
| 4 | Submit | Lands on `/report/<uuid>`; summary card populated within ~90s |
| 5 | Inspect a free report | First 5 conflicts interactive; rows 6+ blurred; upgrade banner present |
| 6 | Re-upload from the **same email** (no sub) | Free gate triggers — report saved but `is_paid=false`, redirect/upsell |
| 7 | Click a decision button | Row strikes through; `conflict_decisions` row appears in Supabase |
| 8 | Open `/privacy` and `/dpa` | Both render fully |
| 9 | `curl https://crossbook.app/api/healthcheck` | `200` `{"status":"ok",...}` (supabase+stripe ok) |
| 10 | (Optional) Click upgrade → Stripe Checkout | Opens against the **live** $49 price; test card completes; webhook flips `is_paid` |

Paste any failing step back to Claude with the error and it's fixable immediately.

---

## §4 — Phases C / D1 / E / F: Claude drafts on request

These are **not** generated yet — on purpose. Posts written too early go stale
and read as AI. Trigger each when you're ready; Claude returns copy-pasteable
drafts you then edit into your voice before posting.

### C1 — LinkedIn build-in-public (5 posts / 7 days) — gate: Phase B verified
Claude drafts 5 posts (pain → CSV-vs-integration → technical bet → delta-engine
moat → launch), 150–220 words each, no growth-bro tropes. **You:** edit voice
(they read as AI verbatim), post 1/day, reply to comments within 90 min.
**Trigger:** "draft the C1 LinkedIn sequence".

### C2 — RevOps cold-DM + 25-target Apify plan — gate: Phase B verified
Claude drafts 3 DM variants, profile qualifying signals, and exact Apify
LinkedIn HarvestAPI search params (title/company-size/location filters).
**You:** 5 DMs/day max, track replies. **Trigger:** "draft C2 DM + target plan".

### C3 — Community launch posts — gate: Phase B verified
Claude drafts norm-matched posts for HubSpot Community Ideas, RevOps Co-op,
r/RevOps, Pavilion, IndieHackers — plus per-community "what NOT to do".
**You:** confirm access first, one community/day. **Trigger:** "draft C3".

### D1 — Customer interview script — gate: first free users in
Claude drafts a hard-15-min Mom-Test script with timing markers + a "what NOT
to do" list. **You:** Calendly, book 5+, record w/ permission, tag every
$-amount + pricing-willingness quote. **Trigger:** "draft the D1 interview script".

### E1 — ProductHunt package — gate: ~Day 31 (NOT Day 21; launch slipped)
Claude drafts name/tagline/description variants, pinned maker comment, gallery
checklist, Days 28–30 pre-launch sequence, launch-day hour-by-hour, Day-32
follow-up. **You:** be online 6h launch day, pre-warm (don't beg upvotes),
reply ≤15 min. **Trigger:** "draft the E1 ProductHunt package".

### F1 — GO/NO-GO refresh — gate: ~Day 38 (7 days post-PH)
Claude rewrites `docs/APP_SUMMARY.md §16` to a funnel-based matrix (separates
KILL from PIVOT, adds a Day-65 month-2-retention gate + sunk-cost tripwire) and
produces a one-page Day-38 decision-document template. **You:** Day 38, write
your honest read longhand *before* reading the matrix (avoids framing bias).
**Trigger:** "do the F1 GO/NO-GO refresh".

---

## §5 — What Claude can resume autonomously (one signal each)

| You say… | Claude does… |
|---|---|
| "draft C1 / C2 / C3 / D1 / E1" | Returns that phase's copy-pasteable drafts (see §4) |
| "do the F1 GO/NO-GO refresh" | Rewrites `APP_SUMMARY.md §16` + Day-38 template |
| Smoke step N failed: `<error>` | Diagnoses + fixes the failing path, pushes |
| "Rename to `<name>`" | Sweeps CLAUDE.md, README, metadata, Stripe URL, Resend defaults |
| "Wire the DPA generator, key is `XXX`" | Builds the Iubenda integration on `/dpa` |
| "Beta CSVs are in `data/test-fixtures/21_*`" | Adds `expected.json`, re-runs eval, pushes if 17/20+ |
| "Build a page like `/dashboard`" | Builds it on the existing design system |

---

## §6 — Open discrepancies / risks

1. **Timeline slipped; the GO/NO-GO doc hasn't caught up.** `CLAUDE.md` and
   `docs/APP_SUMMARY.md §16` still encode the **Day-24** matrix. The plan's real
   read is **Day 38** (7 days post-PH, PH ≈ Day 31). F1 is the fix — deliberately
   deferred until post-launch data exists (PostHog funnel + 5 interviews + one
   digest cycle). Until F1 runs, treat §16 as outdated.
2. **`README.md` is stale beyond the D2 layout entries** — it still says
   "Phase 1 complete / Phase 2 in progress / 85 tests". `docs/APP_SUMMARY.md` is
   the accurate state doc. Worth a one-pass README refresh; say "refresh the
   README" if you want it.
3. **`.env.local` holds live tokens (gitignored).** Covered by §3.1 rotation.
4. **Sentry + UptimeRobot need your signup** before D2's safety net is fully
   armed in production — the code is no-op until `SENTRY_DSN` is set and
   UptimeRobot is pointed at `/api/healthcheck`.
5. **Distribution is the bottleneck, not the build.** Code is ahead of the
   brief; Day-38 turns on customer count, not features.
