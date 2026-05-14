import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { captureServerEvent } from "@/lib/analytics-server";
import { STRIPE_WEBHOOK_SECRET, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const SUBSCRIPTION_EVENT_TYPES = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const CHECKOUT_EVENT_TYPES = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
]);

function supabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId =
    (subscription.metadata?.clerk_user_id ?? "").trim() || null;
  if (!userId) return;

  const periodEnd = (subscription as unknown as { current_period_end?: number })
    .current_period_end;

  const admin = supabaseAdmin();
  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id" },
  );
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const reportId = session.metadata?.report_id?.trim();
  if (reportId) {
    const admin = supabaseAdmin();
    await admin
      .from("reports")
      .update({ is_paid: true })
      .eq("id", reportId);
  }

  const distinctId =
    (session.metadata?.clerk_user_id ?? session.client_reference_id ?? "").trim();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? "";
  if (distinctId) {
    await captureServerEvent({
      event: "checkout_completed",
      distinct_id: distinctId,
      properties: { stripe_subscription_id: subscriptionId },
    });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
    } else if (CHECKOUT_EVENT_TYPES.has(event.type)) {
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
