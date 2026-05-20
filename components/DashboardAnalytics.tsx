"use client";

import { useEffect, useRef } from "react";

import { bucketReportCount, track } from "@/lib/analytics";

interface DashboardAnalyticsProps {
  reportCount: number;
}

export function DashboardAnalytics({ reportCount }: DashboardAnalyticsProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("dashboard_viewed", {
      report_count_bucket: bucketReportCount(reportCount),
    });
  }, [reportCount]);

  return null;
}
