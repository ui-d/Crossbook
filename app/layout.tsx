import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import Navbar from "@/components/Navbar";
import { PostHogProvider } from "@/components/PostHogProvider";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_TWITTER,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Dawid Nawrocki" }],
  creator: "Dawid Nawrocki",
  publisher: SITE_NAME,
  keywords: [...DEFAULT_KEYWORDS],
  category: "business",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    creator: SITE_TWITTER,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Add tokens here once Google Search Console / Bing Webmaster are wired.
  // verification: { google: "...", other: { "msvalidate.01": "..." } },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
  description: DEFAULT_DESCRIPTION,
  founder: { "@type": "Person", name: "Dawid Nawrocki" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <PostHogProvider>
        <html lang="en">
          <body
            className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen flex flex-col bg-bg text-fg antialiased`}
          >
            <Navbar />
            <div className="flex-1 flex flex-col">{children}</div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
          </body>
        </html>
      </PostHogProvider>
    </ClerkProvider>
  );
}
