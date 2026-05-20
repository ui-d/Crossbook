// Standalone DSN verifier: bypasses Next/instrumentation and sends one event
// straight from the Sentry Node SDK. If THIS reaches the dashboard but the
// app doesn't, the bug is in the runtime wiring (env not set at the right
// stage, NEXT_PUBLIC_* not rebuilt, etc.), not in Sentry itself.
//
// Usage:
//   pnpm dotenv -e .env.local -- pnpm exec tsx scripts/sentry-ping.mts
// or just:
//   SENTRY_DSN=https://...@sentry.io/... pnpm exec tsx scripts/sentry-ping.mts

import * as SentryNs from "@sentry/nextjs";
const Sentry: any = (SentryNs as any).default ?? SentryNs;

const dsn = process.env.SENTRY_DSN;
if (!dsn) {
  console.error("SENTRY_DSN is not set. Aborting.");
  process.exit(1);
}

console.log("DSN host:", new URL(dsn).host);
console.log("DSN project id:", new URL(dsn).pathname.replace(/^\//, ""));

Sentry.init({
  dsn,
  debug: true, // prints every transport call so you see whether the request was made + the response status
  tracesSampleRate: 0, // errors only
});

const id1 = Sentry.captureMessage("sentry-ping: captureMessage from scripts/sentry-ping.mts");
const id2 = Sentry.captureException(new Error("sentry-ping: synthetic exception"));
console.log("captureMessage eventId:", id1);
console.log("captureException eventId:", id2);

const flushed = await Sentry.flush(5000);
console.log("flush() returned:", flushed, "(true = all events sent)");
if (!flushed) process.exit(2);
