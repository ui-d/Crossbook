import type { Metadata } from "next";

export const SITE_URL = "https://crossbook.app";
export const SITE_NAME = "Crossbook";
export const SITE_TWITTER = "@crossbookapp";

export const DEFAULT_TITLE = "Crossbook — HubSpot ↔ QuickBooks reconciliation";
export const DEFAULT_DESCRIPTION =
  "Drop two CSVs. AI explains every conflict in plain English with source-row citations. First report free. $49/month vs. HubSpot Data Hub Professional at $720/seat/month.";

export const DEFAULT_KEYWORDS = [
  "HubSpot QuickBooks reconciliation",
  "CSV reconciliation tool",
  "RevOps data quality",
  "HubSpot Data Hub alternative",
  "month-end reconciliation",
  "CRM accounting reconciliation",
  "Sales Ops tools",
  "deal invoice matching",
  "AI data reconciliation",
  "small business reconciliation",
];

interface BuildMetadataInput {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
  keywords?: readonly string[];
}

export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noIndex = false,
  ogImage,
  keywords,
}: BuildMetadataInput = {}): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  const resolvedTitle = title ?? DEFAULT_TITLE;

  // Default to the root file-based /opengraph-image so per-page metadata that
  // overrides openGraph still surfaces a social card. metadataBase resolves
  // the relative path to an absolute URL.
  const resolvedOgImage = ogImage ?? "/opengraph-image";

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    type: "website",
    url: canonical,
    siteName: SITE_NAME,
    title: resolvedTitle,
    description,
    locale: "en_US",
    images: [{ url: resolvedOgImage, width: 1200, height: 630 }],
  };

  const twitter: NonNullable<Metadata["twitter"]> = {
    card: "summary_large_image",
    title: resolvedTitle,
    description,
    creator: SITE_TWITTER,
    images: [resolvedOgImage],
  };

  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: { canonical },
    openGraph,
    twitter,
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false },
        }
      : undefined,
  };
}
