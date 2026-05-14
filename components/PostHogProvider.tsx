"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { identifyAnalyticsUser, initAnalytics } from "@/lib/analytics";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!apiKey) return;
    initAnalytics({ apiKey, apiHost });
  }, [apiKey, apiHost]);

  useEffect(() => {
    if (!apiKey) return;
    if (!isLoaded) return;
    identifyAnalyticsUser(isSignedIn && userId ? userId : null);
  }, [apiKey, isLoaded, isSignedIn, userId]);

  return <>{children}</>;
}
