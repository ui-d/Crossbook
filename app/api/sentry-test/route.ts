// Diagnostic endpoint. Lets you prove the deployed Next runtime is wired to
// Sentry without waiting for a real production error.
//
// Gated by a header secret so it isn't trivially abusable: set
// SENTRY_TEST_TOKEN in Vercel env, then hit:
//   curl -H "x-sentry-test-token: <token>" https://<app>/api/sentry-test?mode=capture
//   curl -H "x-sentry-test-token: <token>" https://<app>/api/sentry-test?mode=throw
//
// mode=capture  -> explicit Sentry.captureMessage (works even if onRequestError isn't wired)
// mode=throw    -> route throws; Next's onRequestError forwards to Sentry
//
// Remove this file once you've confirmed events flow.

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = process.env.SENTRY_TEST_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "SENTRY_TEST_TOKEN not configured on the server" },
      { status: 503 },
    );
  }
  if (req.headers.get("x-sentry-test-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "capture";

  const dsnConfigured = Boolean(process.env.SENTRY_DSN);
  const publicDsnConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  if (mode === "capture") {
    const id = Sentry.captureMessage(
      `__sentry-test capture @ ${new Date().toISOString()}`,
    );
    const flushed = await Sentry.flush(5000);
    return NextResponse.json({
      mode,
      eventId: id ?? null,
      flushed,
      dsnConfigured,
      publicDsnConfigured,
      note: id
        ? "If this id is non-null AND flushed=true but you don't see it in the dashboard, the DSN points to the wrong project."
        : "eventId is null → Sentry was never initialised. SENTRY_DSN missing at process boot.",
    });
  }

  if (mode === "throw") {
    throw new Error(
      `__sentry-test synthetic throw @ ${new Date().toISOString()}`,
    );
  }

  return NextResponse.json({ error: "unknown mode" }, { status: 400 });
}
