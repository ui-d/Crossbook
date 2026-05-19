# Incident Playbook — Crossbook

Solo-operator runbook. When something breaks, follow the matching severity row
top-to-bottom. Don't improvise comms; use the templates here.

Health signal: `https://crossbook.app/api/healthcheck` returns `200` when
Supabase + Stripe are reachable, `503` otherwise (Anthropic is informational —
see [Feature flags](#disable_ai_fallback-kill-switch)). Wire UptimeRobot to
this endpoint (5-min interval).

---

## Severity levels

| Sev | Definition | Examples |
|---|---|---|
| **S0** | App down for everyone | Site 5xx/blank, `/api/healthcheck` 503 sustained, build broken in prod |
| **S1** | Core pipeline broken for >50% of uploads | `/api/reconcile` failing/timeouts, Claude hard-down with no degrade, Stripe checkout broken |
| **S2** | Broken for some users / one feature | One CSV shape fails, digest cron missed, export button errors, paywall not unlocking for some |
| **S3** | Cosmetic / no money or data impact | Copy typo, layout glitch, slow-but-working page |

## Response SLOs (solo, realistic)

| Sev | Acknowledge | Mitigation target | During off-hours |
|---|---|---|---|
| **S0** | 15 min | Roll back within 30 min | Drop everything |
| **S1** | 1 hour | Mitigate or flag-down AI within 2 hours | Same day |
| **S2** | Same day | Fix within 48 hours | Next working block |
| **S3** | When convenient | Batch into next deploy | — |

"Mitigation" = users unblocked (rollback / kill-switch / status note), **not**
necessarily root-caused. Root cause can follow once the bleeding stops.

---

## Comms procedure

- **S0/S1:** within the SLO, post a short status note where customers will look —
  the landing page banner (if reachable) and a one-line LinkedIn comment/post if
  the outage is visible. Keep it factual: what's affected, that you're on it, no ETA promises.
- **Paying customers:** email affected paid users (subject: "Crossbook —
  brief service issue") only for S0, or S1 lasting >2h, or any data-integrity
  doubt. Send from `SUPPORT_FROM_ADDRESS`. Say what happened, whether their
  data/reports were affected, and what you did. Never email "all clear" until
  `/api/healthcheck` has been green for 15 min.
- **S2/S3:** no proactive comms; reply if asked.
- Log every S0/S1 in a running `docs/incidents/<date>.md` (one paragraph:
  trigger, impact, fix, follow-up). The post-mortem habit is the asset.

---

## Runbooks

### Vercel rollback (S0 / bad deploy)

1. Vercel Dashboard → project → **Deployments**.
2. Find the last known-good deployment (green, pre-incident).
3. **⋯ → Promote to Production** (or `vercel rollback <deployment-url>` from CLI).
4. Confirm `https://crossbook.app/api/healthcheck` → `200`.
5. Only then investigate the bad commit on a branch — never debug forward in prod.

### `DISABLE_AI_FALLBACK` kill-switch (S1 — Claude down/rate-limited)

`/api/reconcile` already degrades automatically if the Claude call throws (every
conflict → `MANUAL_REVIEW`, upload still succeeds). Use the manual switch when
Anthropic is flapping and you want to stop hitting it entirely:

1. Vercel → Settings → Environment Variables → set `DISABLE_AI_FALLBACK=1`
   (Production scope).
2. Redeploy (env changes need a redeploy to take effect) — or trigger a
   no-op redeploy from the Deployments tab.
3. Reports still generate from pattern + structural matches; all recommendations
   show `MANUAL_REVIEW`. Healthcheck `anthropic` check will read unconfigured/ok
   but overall status stays `200` (Anthropic is non-fatal).
4. Remove the var (or set to `0`) + redeploy once Anthropic recovers.

### Stripe webhook replay (subscription desync)

Symptom: customer paid but `is_paid` / `subscriptions` not updated, or a
cancel/upgrade didn't reflect. The handler at `app/api/webhooks/stripe/route.ts`
processes `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`.

1. Stripe Dashboard (correct mode — **live** for real customers) → Developers →
   **Webhooks** → the `crossbook.app/api/webhooks/stripe` endpoint.
2. **Event deliveries** → find the failed/missing event(s) → **Resend**.
3. Verify in Supabase: `subscriptions` row upserted and the report's
   `is_paid` flipped. If checkout completed but report still locked, resend the
   `checkout.session.completed` event specifically.
4. If signature-verification is the failure: confirm Vercel Production
   `STRIPE_WEBHOOK_SECRET` matches the live endpoint's signing secret exactly
   (no trailing whitespace/newline — the classic cause).
5. Last resort (single customer, webhook unrecoverable): manually upsert the
   `subscriptions` row + set `reports.is_paid = true` for that user, then note
   it in the incident log.

### Healthcheck 503 triage

- `checks.supabase.ok = false` → Supabase project status; service-role key
  valid; project not paused. This is S0/S1.
- `checks.stripe.ok = false` → Stripe API status; `STRIPE_SECRET_KEY` valid for
  the active mode. Checkout likely broken → S1.
- `checks.anthropic.ok = false` → informational only. Confirm reconcile still
  works (it should, via the degrade path). If it doesn't, set the kill-switch.

---

## Post-incident

For every S0/S1, within 7 days write a short post-mortem: trigger, blast radius
(users + dollars), time-to-mitigate, root cause, the one change that prevents
recurrence. These compound into the most valuable artifact of the project.
