"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

interface UpgradeBannerProps {
  reportId: string;
}

export function UpgradeBanner({ reportId }: UpgradeBannerProps) {
  const ref = useRef<HTMLElement | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true;
            track("upgrade_banner_viewed", {});
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="border border-primary-container/40 bg-primary-fixed rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4 shadow-ambient"
    >
      <div className="size-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
        <Sparkles className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-display text-[16px] font-semibold text-on-surface">
          Free tier: first 5 conflicts unblurred
        </p>
        <p className="text-[13px] text-on-surface-variant mt-1">
          Upgrade to $49/month for unlimited reports, bulk actions, filters, monthly delta tracking, and
          corrected CSV export. 93% less than HubSpot Data Hub Professional ($720/seat/month).
        </p>
      </div>
      <form
        action={`/api/checkout?reportId=${reportId}`}
        method="post"
        onSubmit={() => track("checkout_started", {})}
      >
        <Button type="submit" variant="cta">Upgrade to $49/month</Button>
      </form>
    </section>
  );
}
