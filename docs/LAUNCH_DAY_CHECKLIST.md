# Crossbook — Launch Day Checklist

The last gate before you announce. Run this **on the live URL, in a fresh
browser** (no logged-in session, no extensions) right before posting anywhere.

> This is the single source of truth for the launch-day smoke. It mirrors
> `NEXT_STEPS.md` §3.5 verbatim — if you change one, change both.

## Step 0 — automated pre-check (run first)

```bash
./scripts/pre-launch-smoke.sh
```

Runs three gates and aborts on the first failure: live `/api/healthcheck`
(200 + `status:"ok"`), `pnpm test`, and the Resend connectivity send. Override
the target with `BASE_URL=…` and the email recipient with `SMOKE_EMAIL_TO=…`.
Green on all three → proceed to the manual checklist below.

## Step 1 — manual smoke-test checklist (run on the live URL, fresh browser)

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

## If a step fails

Paste the failing step number and the exact error back to Claude — it
diagnoses and fixes the failing path immediately (per `NEXT_STEPS.md` §5).
Do not announce until every step is green.
