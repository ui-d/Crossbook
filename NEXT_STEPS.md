# Next steps — what's blocking and what's not

> **TL;DR for code work:** Nothing is blocking me. Build is green, 199/199 tests pass, all 21-day brief code is shipped. Everything below is operational (deploy / domain / distribution) — your hands, not mine.

---

## Section 1 — Strictly blocking production launch

These are the gates that stop you from taking real $49 charges from real customers. Items are ordered by dependency.

### 1.1 Buy the domain /DONE
- Register `crossbook.app` (or whatever final name you pick).
- If you pick a different name, tell me — I'll update CLAUDE.md, README, page metadata, Stripe product URL, and Resend "from" defaults in one pass.

### 1.2 Point DNS at Vercel /DONE
- Vercel Dashboard → your `crossbook` project → Settings → Domains → Add `crossbook.app`.
- Vercel will tell you which A/AAAA or CNAME records to add at your registrar.
- Wait for DNS to verify (usually <10 min, can be up to 24h).

### 1.3 Set Vercel environment variables /DONE
Vercel Dashboard → Settings → Environment Variables. **Match the scopes exactly** — wrong scope here means the wrong Stripe mode triggers on production.

**Production scope only:**
```
STRIPE_SECRET_KEY=sk_live_*                    (from .env.local line 17)
STRIPE_PRICE_ID_MONTHLY=price_1TWGjvGqs11FZR21tLhU7Mdt  (live, $49/mo, just created)
STRIPE_WEBHOOK_SECRET=whsec_*                  (from step 1.4 below)
NEXT_PUBLIC_APP_URL=https://crossbook.app
```

**Preview + Development scope:**
```
STRIPE_SECRET_KEY_TEST=sk_test_*               (from .env.local line 18)
STRIPE_PRICE_ID_MONTHLY=price_1TVwRuGqs11FZR21NDN7xDY0   (test, $49/mo)
STRIPE_WEBHOOK_SECRET_TEST=whsec_*             (run `stripe listen` locally for this)
NEXT_PUBLIC_APP_URL=https://<preview-branch>.vercel.app
```

**All scopes (Production + Preview + Development):**
```
NEXT_PUBLIC_SUPABASE_URL=https://zrojjvnpeouwguyulthi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT from .env.local>
SUPABASE_SERVICE_ROLE_KEY=<service-role JWT from .env.local>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*    (use pk_live_* eventually)
CLERK_SECRET_KEY=sk_test_*                     (use sk_live_* eventually)
ANTHROPIC_API_KEY=sk-ant-api03-*
RESEND_API_KEY=re_*
CRON_SECRET=<see step 1.5>
DIGEST_FROM_ADDRESS=Crossbook <digest@crossbook.app>   (after step 1.6)
PRIVACY_FROM_ADDRESS=Crossbook <privacy@crossbook.app> (after step 1.6)
```

### 1.4 Register the live Stripe webhook /DONE
- Stripe Dashboard → toggle "Test mode" **OFF** (top-right) → Developers → Webhooks → **Add endpoint**.
- URL: `https://crossbook.app/api/webhooks/stripe`
- Events to subscribe to (exact names):
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
- Copy the **Signing secret** (starts with `whsec_`).
- Paste it into Vercel's **Production**-scope `STRIPE_WEBHOOK_SECRET`.
- Trigger a test event via "Send test webhook" in the dashboard to confirm 2xx response.

### 1.5 Generate CRON_SECRET /DONE
Run locally:
```bash
openssl rand -hex 32
```
Copy the output into Vercel **All scopes** `CRON_SECRET`. This protects `/api/cron/monthly-digest` and `/api/cron/file-retention-sweep` from random hits.

### 1.6 Verify your domain in Resend /DONE
- https://resend.com/domains → Add `crossbook.app`.
- Add the DKIM / SPF / DMARC records Resend gives you at your DNS registrar (same place as 1.2).
- Wait for verification (usually <30 min).
- Once verified, set `DIGEST_FROM_ADDRESS=Crossbook <digest@crossbook.app>` and `PRIVACY_FROM_ADDRESS=Crossbook <privacy@crossbook.app>` in Vercel (already in section 1.3).
- Without this, all emails ship from `onboarding@resend.dev` — they technically work but land in spam after ~5 sends/day.

### 1.7 Smoke-test the live deploy /done
Once 1.1–1.6 are in place, hit `https://crossbook.app/upload` from a fresh browser:
1. Drop a fixture CSV pair (`data/test-fixtures/03_*.csv` is a good test).
2. Confirm you land on `/report/<uuid>`.
3. Click a decision button — confirm a row appears in Supabase `conflict_decisions`.
4. (Optional) Click "Upgrade $49/month" → Stripe Checkout should open against the **live** price.

---

## Section 2 — Rotate the leaked secret /done

You pasted your **live** `sk_live_51H4vi3...` Stripe key into this conversation on May 11. It's also currently sitting in `.env.local`. Rotate when convenient:

- https://dashboard.stripe.com/apikeys → live mode → click the live secret key → **Roll** → confirm.
- Replace the value in:
  - Your local `.env.local`
  - Vercel Production scope `STRIPE_SECRET_KEY`
- Any old key holders (this conversation, any backups) are now revoked.

---

## Section 3 — Distribution (Days 14, 20, 21 of the brief)

Only you can do these — they require your voice, your network, and your accounts:

| Day | Task | Where |
|---|---|---|
| 14 | Build-in-public post #1 | LinkedIn + RevOps Co-op Slack `#questions` |
| 20 | Build-in-public post #2 | LinkedIn + HubSpot Community forum |
| 21 | ProductHunt soft-launch | https://www.producthunt.com/posts/new |
| Ongoing | Cold DMs | LinkedIn — RevOps Manager / Sales Ops Lead titles at SMBs with HubSpot + QBO tech stack |

The brief has the exact DM script and community-post copy in CLAUDE.md (search for "DM script" and "Community-post version").

---

## Section 4 — Optional / nice-to-have

These don't block launch but improve quality:

- **DPA generator API key** (Day 17 finishing touch): **DEFERRED until first paid customer.** Static `/dpa` is GDPR-acceptable for self-serve. Playbook in [`docs/iubenda-setup.md`](./docs/iubenda-setup.md) — Iubenda Advanced plan is €199/yr (API access gated behind it). Trigger: first enterprise prospect asks for a countersigned DPA. Wire-up estimated 45 min.
- **Real beta-cohort fixtures** (Day 10 strengthens further): drop 3–5 real (sanitized) HubSpot + QBO CSV pairs from beta users into `data/test-fixtures/21_*.csv` … `25_*.csv`. The current 20/20 synthetic eval is good but real data exposes edge cases synthetic doesn't.
- **Clerk live keys** (Day 21+): swap `pk_test_*` / `sk_test_*` for `pk_live_*` / `sk_live_*` once you've verified the Clerk app in production mode. Test keys work in production but warn about test mode in the UI.
- **Next.js 16 codemod**: `npx @next/codemod@canary upgrade-to-16` when you have an hour. Currently on 15.5.18 (patched), which is fine.

---

## Section 5 — What I can resume autonomously the moment you give me one signal

| You say… | I do… |
|---|---|
| "Rename to `<name>`" | Sweep CLAUDE.md, README, page metadata, Stripe product URL, Resend defaults — one commit |
| "Wire the DPA generator, key is `XXX`" | Build the generator integration on `/dpa`, write a countersigned-PDF download |
| "Beta CSVs are in `data/test-fixtures/21_*.csv`" | Add `expected.json` for each, re-run eval, push if 17/20+ |
| "Domain is `<x>.app` now" | Update env var defaults, CLAUDE.md, layout title, README |
| "Vercel deploy URL is `<x>.vercel.app`" | Run Playwright smoke against it from the local machine |
| "Build a new page like `/dashboard`" | Build it following the design system in `app/globals.css` |

---

## Section 6 — Why I'm NOT blocked on code right now

After your latest design pass, the codebase is in this state:

- **Build:** ✅ green (`pnpm build`)
- **Tests:** ✅ 199/199 (`pnpm test`)
- **Coverage:** ✅ 97% lines, 81% branches across `lib/`
- **Lint:** ✅ clean (`pnpm lint`)
- **Routes:** 18 routes deployed including the new `/dashboard`, `/how-it-works`, `/pricing` pages you added
- **Cron jobs:** 2 scheduled in `vercel.json`
- **Supabase:** migrations 0001 + 0002 applied; 10 patterns seeded
- **Stripe:** live product `prod_UVHImRNdgd1tGv` + live price `price_1TWGjvGqs11FZR21tLhU7Mdt` created

I can keep iterating on Phase 5 polish (more landing-page sections, dashboard features, additional fixtures) without any new input. The list above is **only** what's strictly needed to go live and start charging $49/month.
