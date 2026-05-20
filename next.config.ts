import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "img.clerk.com" }],
  },
  // First-party reverse proxy for PostHog. Browsers behind ad blockers
  // (uBlock Origin, Brave Shields, AdGuard, Ghostery) drop direct posthog.com
  // requests with ERR_BLOCKED_BY_CLIENT. Routing capture through /ingest/*
  // restores ~all events because first-party paths are not on block lists.
  //
  // Server-side capture (lib/analytics-server.ts) keeps using the direct EU
  // host — proxies are a browser-only concern.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },
  // Required so /ingest/ requests don't get 308'd, which would break the proxy.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
