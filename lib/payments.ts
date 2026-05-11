"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { STRIPE_PRICE_ID_MONTHLY, stripe } from "@/lib/stripe";

interface CheckoutResult {
  url: string;
}

interface CheckoutInput {
  email?: string;
  reportId?: string;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  if (!STRIPE_PRICE_ID_MONTHLY) {
    throw new Error(
      "STRIPE_PRICE_ID_MONTHLY is not configured. Run the Stripe MCP product+price seeder or set it in .env.local.",
    );
  }

  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const customerEmail =
    user?.emailAddresses[0]?.emailAddress ?? input.email ?? undefined;

  const successPath = input.reportId
    ? `/report/${input.reportId}?welcome=true`
    : "/dashboard?welcome=true";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
    success_url: `${APP_URL}${successPath}`,
    cancel_url: `${APP_URL}/upload?checkout=cancelled`,
    customer_email: customerEmail,
    client_reference_id: userId ?? input.reportId ?? undefined,
    metadata: {
      clerk_user_id: userId ?? "",
      report_id: input.reportId ?? "",
    },
    subscription_data: {
      metadata: {
        clerk_user_id: userId ?? "",
        report_id: input.reportId ?? "",
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return { url: session.url };
}
