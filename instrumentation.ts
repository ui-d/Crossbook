import * as Sentry from "@sentry/nextjs";

// Sentry is opt-in: with no SENTRY_DSN we never import the config files and
// never call Sentry.init, so there is zero runtime cost in local/CI/preview.
// captureRequestError is a documented no-op when the SDK was never initialised,
// so it is safe to export unconditionally.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures unhandled exceptions from API routes, Server Components, and
// middleware. Requires @sentry/nextjs >= 8.28.0 + Next.js 15 (we have both).
export const onRequestError = Sentry.captureRequestError;
