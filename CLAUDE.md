# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server with Turbopack
npm run build    # Production build
npm run start    # Run built app
npm run lint     # ESLint via next lint
```

There is no configured test script yet, even though `vitest` and `@vitest/coverage-v8` are installed. When adding tests, wire up `test` / `test:coverage` scripts in `package.json` before invoking Vitest.

Both `package-lock.json` and `pnpm-lock.yaml` are checked in — pick one before installing new dependencies to avoid divergent lockfiles.

## Project state

The `package.json` name is `saas-mini-course` and the home page / Navbar still reference a "Recipe Emporium" SaaS template. The repository is named `reconcile` and the intended feature surface lives under `app/api/reconcile/` (currently empty) plus `data/test-fixtures/` and `supabase/migrations/` (also empty). Treat the recipe/cookbook copy in `app/page.tsx` and `components/Navbar.tsx` as placeholder scaffolding to be replaced — not as load-bearing product code.

## Architecture

**Next.js 15 App Router + React 19 + TypeScript (strict).** Path alias `@/*` resolves to the repo root (see `tsconfig.json`). Tailwind v4 is configured via `@tailwindcss/postcss` with global styles in `app/globals.css`.

**Auth: Clerk.** `middleware.ts` wraps the entire app in `clerkMiddleware()` (matcher excludes static assets and `_next`, always runs for `/api` and `/trpc`). `app/layout.tsx` wraps the tree in `<ClerkProvider>`. The custom sign-in page lives at `app/(auth)/sign-in/[[...sign-in]]` (route group keeps the URL as `/sign-in`). Clerk's `<PricingTable />` is used directly for billing on `app/subscription/page.tsx`.

**Data: Supabase via Clerk-issued JWTs.** `lib/supabase.ts` exposes `createSupabaseClient()` which constructs a `@supabase/supabase-js` client whose `accessToken` callback returns `(await auth()).getToken()` from `@clerk/nextjs/server`. This is the **Clerk third-party auth integration** pattern — Supabase RLS policies should be authored against the Clerk JWT claims rather than Supabase's native auth. Always call this factory inside a server context (route handlers, server components, server actions); it relies on Clerk's request-scoped `auth()` helper. Migrations live in `supabase/migrations/`.

**UI: shadcn/ui (new-york style, neutral base, CSS variables, lucide icons).** Configuration in `components.json`. Generated primitives go in `components/ui/`; app-level components go in `components/`. Use the `cn()` helper from `lib/utils.ts` (clsx + tailwind-merge) for class composition. When adding new shadcn components, use the CLI so the aliases (`@/components/ui`, `@/lib`, etc.) stay consistent.

**Other key dependencies wired but not yet integrated:** `ai` + `@ai-sdk/anthropic` (LLM calls), `stripe` (in addition to Clerk billing), `resend` (transactional email), `papaparse` + `fuse.js` (likely the reconcile feature: CSV ingestion + fuzzy matching), `react-hook-form` + `zod` + `@hookform/resolvers` (forms with schema validation).

## MCP servers

`.mcp.json` configures Supabase, Context7, and GitHub MCP servers. They expect `SUPABASE_ACCESS_TOKEN` and `GITHUB_PERSONAL_ACCESS_TOKEN` in the environment. **`.env.local` is currently checked into the working tree (not committed — `.gitignore` excludes `.env*`) and contains live token values; rotate them if they have been exposed.**

## Environment variables

Required at runtime (consumed in code):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `lib/supabase.ts`
- Clerk publishable/secret keys — picked up automatically by `@clerk/nextjs`

The `next.config.ts` allows remote images from `img.clerk.com` (Clerk-hosted user avatars) — add new hostnames there if you reference external images.
