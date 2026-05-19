// Browser-side Sentry init (Next.js 15 convention: instrumentation-client.ts
// supersedes sentry.client.config.ts). Sentry is opt-in: with no
// NEXT_PUBLIC_SENTRY_DSN we never call Sentry.init, so there is zero runtime
// cost in local/CI/preview — mirrors the server/edge restraint.
//
// Exception capture only. Deliberately no tracesSampleRate (performance), no
// Replay, no profiling, no feedback widget — matches sentry.server.config.ts.
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}
