# Reconcile

A Next.js 15 SaaS scaffold for CSV reconciliation — ingest two data sources, fuzzy-match records, and surface mismatches with an LLM-assisted review flow.

> **Status:** Early scaffolding. Auth, billing, data, and UI primitives are wired; the reconcile pipeline under `app/api/reconcile/` is the next surface to build out. The home page and Navbar still carry placeholder "Recipe Emporium" copy from the starter template.

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack) + React 19 + TypeScript (strict)
- **Auth:** [Clerk](https://clerk.com) — `clerkMiddleware()` wraps the entire app; custom sign-in at `/sign-in`
- **Database:** [Supabase](https://supabase.com) via Clerk-issued JWTs (third-party auth integration)
- **Billing:** Clerk `<PricingTable />` on `/subscription` (Stripe SDK also installed)
- **UI:** [shadcn/ui](https://ui.shadcn.com) (new-york style, neutral base) + Tailwind CSS v4 + lucide-react
- **AI:** Vercel AI SDK + `@ai-sdk/anthropic`
- **Forms:** react-hook-form + zod
- **CSV / matching:** papaparse + fuse.js
- **Email:** Resend
- **Tests:** Vitest + @vitest/coverage-v8 *(scripts not yet wired)*

## Getting started

### Prerequisites

- Node.js 20+
- A Clerk application (publishable + secret keys)
- A Supabase project (URL + anon key)
- Optional: Stripe, Resend, Anthropic API keys for downstream features

### Install

Pick **one** package manager — both `package-lock.json` and `pnpm-lock.yaml` are checked in. Delete the lockfile you are not using before installing.

```bash
npm install
# or
pnpm install
```

### Environment variables

Create `.env.local` at the repo root:

```bash
# Supabase (consumed in lib/supabase.ts)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Clerk (auto-detected by @clerk/nextjs)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional integrations
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
RESEND_API_KEY=

# MCP servers (.mcp.json — only needed if using MCP tooling)
SUPABASE_ACCESS_TOKEN=
GITHUB_PERSONAL_ACCESS_TOKEN=
```

`.env*` is gitignored.

### Run

```bash
npm run dev      # Next.js dev server with Turbopack
npm run build    # Production build
npm run start    # Run built app
npm run lint     # ESLint via next lint
```

App runs on http://localhost:3000.

## Project layout

```
app/
  (auth)/sign-in/[[...sign-in]]/    # Clerk custom sign-in (route group)
  api/reconcile/                    # Reconcile API routes (planned)
  subscription/                     # Clerk PricingTable
  layout.tsx                        # ClerkProvider wrapper
  page.tsx                          # Home (placeholder copy)
components/
  Navbar.tsx                        # App-level components
  ui/                               # shadcn/ui primitives
lib/
  supabase.ts                       # createSupabaseClient() — Clerk JWT integration
  utils.ts                          # cn() — clsx + tailwind-merge
supabase/migrations/                # SQL migrations (empty)
data/test-fixtures/                 # CSV fixtures for the reconcile feature (empty)
middleware.ts                       # clerkMiddleware()
```

Path alias `@/*` resolves to the repo root.

## Architecture notes

- **Clerk + Supabase:** `lib/supabase.ts` constructs a Supabase client whose `accessToken` callback returns a Clerk-issued JWT via `(await auth()).getToken()`. Always call the factory inside a server context (route handlers, server components, server actions). RLS policies should be authored against Clerk JWT claims, not Supabase's native auth.
- **shadcn/ui:** Use the CLI to add components so the aliases (`@/components/ui`, `@/lib`) stay consistent with `components.json`. Compose classes with `cn()` from `lib/utils.ts`.
- **Remote images:** `next.config.ts` allows `img.clerk.com`. Add new hostnames there if referencing other external images.

## MCP servers

`.mcp.json` configures Supabase, Context7, and GitHub MCP servers. Tokens are read from environment variables — no secrets are committed.

## License

Private — no license granted.
