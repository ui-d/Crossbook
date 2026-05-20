"use client";

import posthog, { type PostHog } from "posthog-js";

// === Event taxonomy ===
//
// Conversion events are sampled at 100% (every event sent).
// View events are sampled at 10% (one in ten sent client-side; the rest are dropped).
// Server-emitted events bypass sampling — `checkout_completed` is captured from
// the Stripe webhook via `lib/analytics-server.ts`.
//
// Strict invariant: NEVER include email, customer names, raw CSV cells, or any
// other PII in event properties. Row counts go through bucketed thresholds.

export type AnalyticsEventName =
  | "landing_view"
  | "upload_started"
  | "upload_completed"
  | "report_generated"
  | "upgrade_banner_viewed"
  | "checkout_started"
  | "decision_saved"
  | "export_csv_clicked";

type EventSamplingClass = "conversion" | "view";

const EVENT_SAMPLING: Record<AnalyticsEventName, EventSamplingClass> = {
  landing_view: "view",
  upload_started: "conversion",
  upload_completed: "conversion",
  report_generated: "conversion",
  upgrade_banner_viewed: "view",
  checkout_started: "conversion",
  decision_saved: "conversion",
  export_csv_clicked: "conversion",
};

const SAMPLE_RATE: Record<EventSamplingClass, number> = {
  conversion: 1,
  view: 0.1,
};

let initialized = false;
let posthogClient: PostHog | null = null;

interface InitOptions {
  apiKey: string;
  apiHost: string;
}

export function initAnalytics({ apiKey, apiHost }: InitOptions): PostHog | null {
  if (initialized) return posthogClient;
  if (typeof window === "undefined") return null;
  if (!apiKey) return null;

  posthog.init(apiKey, {
    // Browser events flow through the Next.js reverse proxy (see next.config.ts)
    // so ad blockers don't kill them with ERR_BLOCKED_BY_CLIENT. `ui_host` keeps
    // PostHog-generated dashboard links pointing at the real EU UI.
    api_host: apiHost || "/ingest",
    ui_host: "https://eu.posthog.com",
    // Avoid capturing PII from URLs or DOM
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_performance: false,
    disable_session_recording: true,
    // Strip query strings + hashes from referrer / current URL.
    sanitize_properties: (properties: Record<string, unknown>): Record<string, unknown> => {
      const cleaned = { ...properties };
      for (const key of Object.keys(cleaned)) {
        const value = cleaned[key];
        if (typeof value === "string" && value.includes("?")) {
          cleaned[key] = value.split("?")[0];
        }
      }
      // Drop any property whose key smells like PII.
      const PII_KEYS = ["email", "name", "company", "customer_name", "phone"];
      for (const piiKey of PII_KEYS) {
        if (piiKey in cleaned) delete cleaned[piiKey];
      }
      return cleaned;
    },
    persistence: "localStorage+cookie",
    loaded: (instance): void => {
      // PostHog's `loaded` callback types its arg as PostHogInterface; the
      // module export and the resolved instance are functionally identical here.
      posthogClient = instance as unknown as PostHog;
    },
  });
  initialized = true;
  posthogClient = posthog;
  return posthog;
}

export function identifyAnalyticsUser(userId: string | null | undefined): void {
  if (!initialized || !posthogClient) return;
  if (!userId) {
    posthogClient.reset();
    return;
  }
  posthogClient.identify(userId);
}

export function isAnalyticsReady(): boolean {
  return initialized && posthogClient !== null;
}

type EventPropsBase = Record<string, string | number | boolean | null>;

interface EventPropsByName {
  landing_view: { section: string };
  upload_started: Record<string, never>;
  upload_completed: { row_count_bucket: RowCountBucket };
  report_generated: {
    is_paid: boolean;
    conflict_count_bucket: ConflictCountBucket;
  };
  upgrade_banner_viewed: Record<string, never>;
  checkout_started: Record<string, never>;
  decision_saved: {
    decision_type: "TRUST_HUBSPOT" | "TRUST_QUICKBOOKS" | "MANUAL_REVIEW" | "IGNORE";
    was_bulk: boolean;
  };
  export_csv_clicked: { side: "hubspot" | "quickbooks" | "summary" };
}

export type RowCountBucket = "<100" | "100-1000" | "1000+";
export type ConflictCountBucket = "0" | "1-10" | "11-50" | "50+";

export function bucketRowCount(n: number): RowCountBucket {
  if (n < 100) return "<100";
  if (n < 1000) return "100-1000";
  return "1000+";
}

export function bucketConflictCount(n: number): ConflictCountBucket {
  if (n === 0) return "0";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  return "50+";
}

function shouldSample(name: AnalyticsEventName): boolean {
  const klass = EVENT_SAMPLING[name];
  const rate = SAMPLE_RATE[klass];
  if (rate >= 1) return true;
  return Math.random() < rate;
}

export function track<K extends AnalyticsEventName>(
  name: K,
  properties: EventPropsByName[K] = {} as EventPropsByName[K],
): void {
  if (!isAnalyticsReady() || !posthogClient) return;
  if (!shouldSample(name)) return;
  // Cast through unknown — PostHog accepts any plain-object property bag,
  // but our compile-time types are strict.
  posthogClient.capture(name, properties as unknown as EventPropsBase);
}
