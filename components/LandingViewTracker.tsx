"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

export function LandingViewTracker() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const fired = new Set<string>();
    const elements = document.querySelectorAll<HTMLElement>("[data-landing-section]");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = entry.target.getAttribute("data-landing-section");
          if (!section || fired.has(section)) continue;
          fired.add(section);
          track("landing_view", { section });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.35 },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return null;
}
