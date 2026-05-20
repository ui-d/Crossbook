"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import {
  identifyAnalyticsUser,
  initAnalytics,
  isAnalyticsReady,
  track,
} from "@/lib/analytics";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest";
  const { isLoaded, isSignedIn, userId } = useAuth();
  const previouslySignedIn = useRef(false);

  useEffect(() => {
    if (!apiKey) return;
    initAnalytics({ apiKey, apiHost });
  }, [apiKey, apiHost]);

  useEffect(() => {
    if (!apiKey) return;
    if (!isLoaded) return;
    const nowSignedIn = Boolean(isSignedIn && userId);
    identifyAnalyticsUser(nowSignedIn ? userId ?? null : null);
    if (nowSignedIn && !previouslySignedIn.current) {
      track("auth_completed", { method: "clerk" });
    }
    previouslySignedIn.current = nowSignedIn;
  }, [apiKey, isLoaded, isSignedIn, userId]);

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}

// SPA route changes are invisible to PostHog's `capture_pageview` flag because
// the App Router never triggers a full document load. Watching pathname here
// fires `$pageview` exactly once per client-side navigation. Suspense-wrapped
// because reading from next/navigation hooks would otherwise opt the whole
// tree into client rendering on Next 15.
function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isAnalyticsReady()) return;
    if (!pathname) return;
    track("$pageview", { $pathname: pathname });
  }, [pathname]);

  return null;
}
