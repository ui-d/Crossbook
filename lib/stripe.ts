import Stripe from "stripe";

const isProduction = process.env.NODE_ENV === "production";
const secretKey = isProduction
  ? process.env.STRIPE_SECRET_KEY
  : (process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY);

if (!secretKey) {
  throw new Error(
    "Stripe secret key is not configured. Set STRIPE_SECRET_KEY (production) or STRIPE_SECRET_KEY_TEST (development) in .env.local.",
  );
}

export const stripe = new Stripe(secretKey, {
  appInfo: { name: "reconcile", url: "https://reconcile.app" },
});

export const STRIPE_PRICE_ID_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY ?? "";

export const STRIPE_WEBHOOK_SECRET = isProduction
  ? (process.env.STRIPE_WEBHOOK_SECRET ?? "")
  : (process.env.STRIPE_WEBHOOK_SECRET_TEST ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      "");
