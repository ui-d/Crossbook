"use client";

import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics";

export function SubscriptionAnalytics() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("subscription_viewed", {});
  }, []);

  return null;
}
