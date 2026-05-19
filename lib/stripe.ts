import Stripe from "stripe";

const isProduction = process.env.NODE_ENV === "production";

function resolveSecretKey(): string {
  const secretKey = isProduction
    ? process.env.STRIPE_SECRET_KEY
    : (process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new Error(
      "Stripe secret key is not configured. Set STRIPE_SECRET_KEY (production) or STRIPE_SECRET_KEY_TEST (development) in .env.local.",
    );
  }
  return secretKey;
}

let cachedClient: Stripe | null = null;

/**
 * Lazily construct the Stripe client. The secret-key check runs here — at
 * first use (request time), NOT at module import. `next build` collects page
 * data by importing every route module; a top-level throw here failed the
 * whole build whenever the build environment had no Stripe keys (e.g. Vercel
 * Preview), even though the code path never runs at build time. Deferring to
 * first use keeps the build green while still surfacing a clear error at
 * runtime — every call site already wraps Stripe usage in try/catch.
 */
export function getStripe(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(resolveSecretKey(), {
      appInfo: { name: "crossbook", url: "https://crossbook.app" },
    });
  }
  return cachedClient;
}

/**
 * Back-compat lazy handle. Existing call sites use `stripe.x.y(...)`; this
 * proxy defers construction (and the env-var check) to the first property
 * access so importing this module is side-effect-free.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe() as unknown as Record<
      string | symbol,
      unknown
    >;
    const value = client[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
}) as Stripe;

export const STRIPE_PRICE_ID_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY ?? "";

export const STRIPE_WEBHOOK_SECRET = isProduction
  ? (process.env.STRIPE_WEBHOOK_SECRET ?? "")
  : (process.env.STRIPE_WEBHOOK_SECRET_TEST ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      "");
