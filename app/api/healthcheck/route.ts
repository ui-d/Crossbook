import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { stripe, STRIPE_PRICE_ID_MONTHLY } from "@/lib/stripe";

// Public, unauthenticated liveness/readiness probe for UptimeRobot et al.
// Never spends Anthropic tokens; never leaks secret values.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROBE_TIMEOUT_MS = 5000;

type CheckResult = { ok: boolean; detail?: string };

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 200);
  return "unreachable";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function checkSupabase(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, detail: "Supabase env not configured" };
  }
  try {
    // Service-role client (no Clerk session needed in this context).
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { error } = await withTimeout(
      Promise.resolve(
        supabase
          .from("discrepancy_patterns")
          .select("id", { count: "exact", head: true }),
      ),
      PROBE_TIMEOUT_MS,
    );
    if (error) return { ok: false, detail: error.message.slice(0, 200) };
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: errorDetail(error) };
  }
}

async function checkStripe(): Promise<CheckResult> {
  try {
    if (STRIPE_PRICE_ID_MONTHLY) {
      await withTimeout(
        stripe.prices.retrieve(STRIPE_PRICE_ID_MONTHLY),
        PROBE_TIMEOUT_MS,
      );
    } else {
      await withTimeout(stripe.balance.retrieve(), PROBE_TIMEOUT_MS);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: errorDetail(error) };
  }
}

// Informational only — Anthropic being absent does not fail the app, since
// /api/reconcile degrades to MANUAL_REVIEW via DISABLE_AI_FALLBACK. We only
// confirm the key is configured; calling the API would add latency and a
// rate-limit surface to a public endpoint for no health benefit.
function checkAnthropic(): CheckResult {
  return process.env.ANTHROPIC_API_KEY
    ? { ok: true }
    : { ok: false, detail: "ANTHROPIC_API_KEY not configured" };
}

export async function GET() {
  const [supabase, stripeCheck] = await Promise.all([
    checkSupabase(),
    checkStripe(),
  ]);
  const anthropic = checkAnthropic();

  // Supabase + Stripe are fatal (DB / payments). Anthropic is informational.
  const healthy = supabase.ok && stripeCheck.ok;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "unhealthy",
      checks: { supabase, stripe: stripeCheck, anthropic },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
