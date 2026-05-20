// Server-side PostHog capture for events emitted from API routes / webhooks.
//
// Uses the PostHog /capture/ HTTP endpoint directly so we avoid pulling in the
// posthog-node package. Conversion events are always sent (no sampling). Failures
// are swallowed — analytics must never break a webhook handler.
//
// Strict invariant: NEVER include email, customer names, raw CSV cells, or any
// other PII in event properties.

type ServerEventName = "checkout_completed";

interface ServerEventPropsByName {
  checkout_completed: { stripe_subscription_id: string };
}

interface CaptureInput<K extends ServerEventName> {
  event: K;
  distinct_id: string;
  properties?: ServerEventPropsByName[K];
}

export async function captureServerEvent<K extends ServerEventName>(
  input: CaptureInput<K>,
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  // Server-side capture bypasses the Next.js /ingest reverse proxy (it's a
  // browser-only concern). POSTHOG_SERVER_HOST lets ops point at a different
  // region if needed; the EU host is the default.
  const apiHost =
    process.env.POSTHOG_SERVER_HOST ?? "https://eu.i.posthog.com";
  if (!apiKey) return;
  if (!input.distinct_id) return;

  try {
    await fetch(`${apiHost.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: input.event,
        distinct_id: input.distinct_id,
        properties: {
          ...(input.properties ?? {}),
          $lib: "crossbook-server",
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // analytics best-effort; never throw out of a webhook
  }
}
