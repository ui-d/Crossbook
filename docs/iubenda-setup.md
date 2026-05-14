# Iubenda setup for Crossbook

Step-by-step walkthrough to wire iubenda.com as Crossbook's Privacy Policy + DPA generator. Total time: ~30 minutes. **Cost: at least one site on the Advanced plan — API access is gated behind it.** Pricing below.

When you've finished steps 1–7 and have an API key, drop the API key into Vercel as `DPA_GENERATOR_API_KEY` (all scopes) and tell me. I'll wire the integration in `/dpa` + add a "Sign + download" flow.

---

## Step 1 — Account + project

1. Go to <https://www.iubenda.com> → "Sign up" (top right).
2. Email = `dawiddeveloper@gmail.com`, pick a strong password.
3. Verify your email (Iubenda sends a confirmation link).
4. After login, click **"+ Create a privacy policy"** in the dashboard.

---

## Step 2 — Pick the right plan (before you fill anything out)

Iubenda's tiering as of 2026 (per-site pricing, EUR):

| Plan | Price | DPA generator | **API access** | Notes |
|---|---|---|---|---|
| Free | €0/yr | ❌ | ❌ | Cookie + privacy policy only |
| Essentials | €27/yr | ❌ | ❌ | Privacy policy + cookie banner |
| Pro | €69/yr | ✅ | ❌ | DPA generator, but NO API |
| **Advanced** | **€199/yr** | ✅ | ✅ | DPA + **API** + Consent Database + Terms & Conditions |
| Ultra | €549/yr | ✅ | ✅ | All of above + DPO Solutions + audit-trail features |

**You need Advanced at minimum** to use the API. The Pro plan generates the DPA in the dashboard but won't let you programmatically fetch it.

Cost path:
- **Spend €199/yr now** → I integrate the API in 45 min, customers can sign + download a countersigned DPA PDF from `/dpa`.
- **Spend €0 now (stay on static markdown)** → `/dpa` keeps rendering the current handwritten DPA. Fully GDPR-acceptable for EU buyers. You can upgrade to Iubenda Advanced anytime later.
- **Spend €27/yr (Essentials)** → improves only the Privacy Policy auto-update story; doesn't touch the DPA. Probably not worth the in-between price point for this project.

**Honest recommendation for MVP-stage Crossbook:** keep the static markdown until your first paying enterprise customer asks for a signed DPA. €199/yr to unlock the API is real money pre-revenue. The static `/dpa` page meets the regulatory bar; signed-PDF generation is a nice-to-have that solves a problem you don't have yet.

If you're going ahead with Advanced anyway, continue to Step 3.

---

## Step 3 — Create the privacy policy via questionnaire

Click "Generate" / "Create a new policy". Iubenda walks you through a long form. Use these exact answers for Crossbook:

### Basic info
- **Website / app name:** `Crossbook`
- **URL:** `https://crossbook.app`
- **Country / law:** `Poland (EU)` — gives you GDPR-first policy
- **Languages:** `English` (add Polish later if needed)

### Personal data we collect (check ALL of these)
- Email address
- First name, last name (from Clerk JWT)
- Payment data (handled by Stripe, but we still log the relationship)
- Usage data — number of reports, conflict decisions
- Tracker data — Vercel Analytics (basic web vitals only, no Mixpanel-style behavioral tracking)
- **Custom field:** add "CSV file contents (deal data, invoice data, company names, emails)"

### Purposes of processing
- Provide and maintain the service
- Manage payments (Stripe)
- Authentication (Clerk)
- Contact users by email (Resend — for monthly digest)
- Hosting + backend infrastructure (Vercel)
- AI-powered data analysis (Anthropic Claude)

### Subprocessors (Iubenda calls these "Services used")
Add each:
- **Stripe** — Payment processing — US-based, SCCs in place
- **Clerk** — Authentication — US-based, SCCs
- **Supabase** — Database hosting — US-East
- **Anthropic** — AI inference — US-based
- **Resend** — Transactional email — US-based
- **Vercel** — Hosting + edge — US-based

### Place of processing
- Primary: USA (most subprocessors)
- EU SCCs: yes — confirm in Iubenda

### Data retention
- CSV file content: **30 days** (we have a cron that enforces this — `app/api/cron/file-retention-sweep`)
- Reports + conflict decisions: while account is active
- Account closure: delete within 30 days
- Stripe records: retained per legal obligation (financial recordkeeping)

### User rights enabled (check all)
- Access
- Rectification
- Erasure (we have `/api/privacy/delete-my-data` — HMAC-signed email-verified flow)
- Restriction of processing
- Data portability
- Object to processing
- Lodge complaint with supervisory authority

### Contact email
`dawiddeveloper@gmail.com`

### Save the policy.

---

## Step 4 — Generate the DPA (requires Advanced plan for API embed; Pro is fine if you only use the dashboard)

Once the privacy policy is live:

1. Dashboard → your Crossbook project → **"Legal Manager"** sidebar.
2. Click **"+ Create Document"** → select **"Data Processing Agreement"**.
3. Choose **"DPA as Data Processor"** (this is what we are — our customers are Data Controllers, we process on their behalf).
4. Pre-filled from your privacy policy. Review the subprocessors list carries over.
5. Customize key fields:
   - **Subject matter:** "Reconciliation of HubSpot Deal data against QuickBooks Customer/Invoice data, on behalf of the Controller, for the purpose of producing reports and corrected CSV exports."
   - **Duration:** "Until account closure or contractual termination."
   - **Categories of data subjects:** "The Controller's customers, prospects, and (where present) sales and accounts-receivable contacts."
   - **Security measures:** "TLS 1.2+ in transit; AES-256 at rest in Supabase; Row Level Security keyed off Clerk JWT `sub` claim; service-role credentials server-only; raw CSV content purged 30 days after upload."
6. Save and publish.

---

## Step 5 — Get your API key + identifiers

1. Dashboard → top-right → **"Account settings"** → **"API"** tab.
2. You'll see two things you need:
   - **API key** (long alphanumeric string starting with `iub_` or similar)
   - **Site ID** (numeric, e.g. `12345678`) — appears in your project's URL too
3. You'll also need the **policy slugs / public links** for embed mode:
   - Privacy Policy: `https://www.iubenda.com/privacy-policy/<SITE_ID>`
   - DPA: `https://www.iubenda.com/privacy-policy/<SITE_ID>/dpa`

**Copy both** — API key + Site ID.

---

## Step 6 — Add to Vercel env vars

Vercel Dashboard → Settings → Environment Variables → **All scopes**:

```
DPA_GENERATOR_API_KEY=<your iubenda API key>
IUBENDA_SITE_ID=<your numeric site ID>
```

Also add to your local `.env.local` so dev mode can hit the API too:

```
DPA_GENERATOR_API_KEY=...
IUBENDA_SITE_ID=...
```

---

## Step 7 — Tell me, I integrate

Once you've done steps 1–6, reply here with:

- ✅ Site ID set in Vercel + .env.local
- ✅ API key set in Vercel + .env.local
- (Optional) The two public-link URLs from step 5

I'll then:

1. Replace the static `/dpa` page with a server-fetched version that pulls live DPA content from Iubenda's API on each request (`GET https://www.iubenda.com/api/privacy-policy/<SITE_ID>/no-markup` with the API key in headers).
2. Add a "Download signed PDF" button that hits Iubenda's `/dpa/sign` endpoint — captures customer name + email, returns a countersigned PDF stored in Iubenda's archive (your customers can re-download anytime via a link in their email).
3. Update `/privacy` to pull from the same Iubenda API so a single source of truth.
4. Wire a fallback: if Iubenda is down, render the current static markdown so /dpa never 500s.

Estimated integration time: 30–45 min once you give me the keys.

---

## Step 8 — Cookie banner (separate, do later)

Iubenda also generates a Cookie Solution banner. Since Crossbook only uses functional cookies (Clerk session, Stripe checkout, Vercel analytics), the banner is required in EU only after you add analytics that profile users. Skip until you wire something like PostHog or Mixpanel.

When you're ready: Iubenda will give you a `<script>` tag to drop in `app/layout.tsx`. Tell me when you have it.

---

## Alternatives to Iubenda (if you change your mind)

| Provider | Price for API + DPA | DPA + signed PDF | Notes |
|---|---|---|---|
| **DIY static markdown** | €0 | Manual | Where you are today. Meets EU regulatory bar. |
| Termly | $30/mo (~€330/yr) Pro | ✅ generator + API | Slightly pricier than Iubenda Advanced. |
| **Iubenda Advanced** | €199/yr | ✅ generator + API + signed PDFs | Cheapest "real" option with API. |
| Vanta | $1,500+/mo | ✅ + SOC 2 + ISO 27001 monitoring | Enterprise; defer until $10K MRR. |
| OneTrust | $$$$ | ✅ | Enterprise-only. |

For a pre-revenue MVP, **DIY static is the right call** until a buyer specifically asks for a countersigned DPA. The current `/dpa` page already covers it for self-service signups.

---

## Failure modes

- **"My DPA tab is grayed out"** — you're on Essentials, not Pro. Upgrade in Account settings → Billing.
- **"API returns 401"** — API key is project-scoped, not account-scoped. Make sure you're using the key from THIS project, not another Iubenda site you might own.
- **"My customers can't download the signed DPA"** — Iubenda emails it to them after they sign. Check their spam folder. The signed PDF link expires after 90 days but they can re-request via the privacy policy page.
- **"Iubenda's UI feels overwhelming"** — that's the experience. The Pro plan has a chat-support button (lower-right corner) that responds in <2 hours during EU business hours.
