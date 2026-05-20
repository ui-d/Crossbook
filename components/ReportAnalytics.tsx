"use client";

import { useEffect, useRef } from "react";

import {
  bucketConflictCount,
  type ConflictCountBucket,
  track,
} from "@/lib/analytics";

interface ReportAnalyticsProps {
  isPaid: boolean;
  conflictCount: number;
}

export function ReportAnalytics({ isPaid, conflictCount }: ReportAnalyticsProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const bucket: ConflictCountBucket = bucketConflictCount(conflictCount);
    track("report_generated", {
      is_paid: isPaid,
      conflict_count_bucket: bucket,
    });
    // Surface the paywall hit as its own event so the free→paid funnel in
    // PostHog doesn't need to derive it from report_generated + is_paid=false.
    if (!isPaid) {
      track("paywall_viewed", { conflict_count_bucket: bucket });
    }
  }, [isPaid, conflictCount]);

  return null;
}
