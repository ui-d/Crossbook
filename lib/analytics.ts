"use client";

import posthog, { type PostHog } from "posthog-js";

// === Event taxonomy ===
//
// Every event is captured at 100% at MVP scale (target: 3 paying customers by
// day 24). Reintroduce per-class sampling via EVENT_SAMPLING + SAMPLE_RATE once
// monthly volume exceeds ~50k events.
//
// Server-emitted events bypass this layer entirely — `checkout_completed` is
// captured from the Stripe webhook via `lib/analytics-server.ts`.
//
// Strict invariant: NEVER include email, customer names, raw CSV cells, or any
// other PII in event properties. Row counts go through bucketed thresholds.

export type AnalyticsEventName =
  // PostHog reserved — keep the `$` prefix so the platform recognises it.
  | "$pageview"
  // Acquisition
  | "landing_view"
  | "auth_completed"
  // Activation
  | "file_selected"
  | "upload_started"
  | "upload_completed"
  | "report_generated"
  // Monetization
  | "paywall_viewed"
  | "upgrade_banner_viewed"
  | "checkout_started"
  // Engagement
  | "decision_saved"
  | "filter_applied"
  | "export_csv_clicked"
  | "dashboard_viewed"
  | "subscription_viewed"
  // Health / errors
  | "error_shown"
  | "delete_data_requested";

type EventSamplingClass = "conversion" | "view";

const EVENT_SAMPLING: Record<AnalyticsEventName, EventSamplingClass> = {
  $pageview: "view",
  landing_view: "view",
  auth_completed: "conversion",
  file_selected: "view",
  upload_started: "conversion",
  upload_completed: "conversion",
  report_generated: "conversion",
  paywall_viewed: "view",
  upgrade_banner_viewed: "view",
  checkout_started: "conversion",
  decision_saved: "conversion",
  filter_applied: "view",
  export_csv_clicked: "conversion",
  dashboard_viewed: "view",
  subscription_viewed: "view",
  error_shown: "conversion",
  delete_data_requested: "conversion",
};

const SAMPLE_RATE: Record<EventSamplingClass, number> = {
  conversion: 1,
  view: 1,
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
    // We fire $pageview manually from PostHogProvider so SPA route changes
    // are captured; autocapture stays off to avoid leaking button text / link
    // URLs into events. capture_pageleave is on so session-duration metrics
    // work in PostHog's default dashboards.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
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
  // PostHog auto-fills $current_url, $pathname, $referrer from window; we pass
  // the pathname explicitly so route changes are unambiguous in the dashboard.
  $pageview: { $pathname: string };
  landing_view: { section: string };
  auth_completed: { method: "clerk" };
  file_selected: { side: "hubspot" | "quickbooks"; size_bucket: FileSizeBucket };
  upload_started: Record<string, never>;
  upload_completed: { row_count_bucket: RowCountBucket };
  report_generated: {
    is_paid: boolean;
    conflict_count_bucket: ConflictCountBucket;
  };
  paywall_viewed: { conflict_count_bucket: ConflictCountBucket };
  upgrade_banner_viewed: Record<string, never>;
  checkout_started: Record<string, never>;
  decision_saved: {
    decision_type: "TRUST_HUBSPOT" | "TRUST_QUICKBOOKS" | "MANUAL_REVIEW" | "IGNORE";
    was_bulk: boolean;
  };
  filter_applied: {
    filter_type: "priority" | "conflict_type" | "company_query" | "decision_status" | "clear_all";
  };
  export_csv_clicked: { side: "hubspot" | "quickbooks" | "summary" };
  dashboard_viewed: { report_count_bucket: ReportCountBucket };
  subscription_viewed: Record<string, never>;
  error_shown: {
    error_kind:
      | "upload_validation"
      | "upload_server"
      | "report_load"
      | "decision_save"
      | "csv_parse";
  };
  delete_data_requested: Record<string, never>;
}

export type RowCountBucket = "<100" | "100-1000" | "1000+";
export type ConflictCountBucket = "0" | "1-10" | "11-50" | "50+";
export type FileSizeBucket = "<100KB" | "100KB-1MB" | "1-5MB" | "5MB+";
export type ReportCountBucket = "0" | "1" | "2-5" | "6+";

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

export function bucketFileSize(bytes: number): FileSizeBucket {
  if (bytes < 100 * 1024) return "<100KB";
  if (bytes < 1024 * 1024) return "100KB-1MB";
  if (bytes < 5 * 1024 * 1024) return "1-5MB";
  return "5MB+";
}

export function bucketReportCount(n: number): ReportCountBucket {
  if (n === 0) return "0";
  if (n === 1) return "1";
  if (n <= 5) return "2-5";
  return "6+";
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
