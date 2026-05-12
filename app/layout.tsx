import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import Navbar from "@/components/Navbar";
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
  title: "Crossbook — HubSpot ↔ QuickBooks reconciliation",
  description:
    "Drop two CSVs. AI explains every conflict in plain English with source-row citations. $49/mo vs. HubSpot Data Hub Pro at $720/seat/mo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen flex flex-col bg-bg text-fg antialiased`}
        >
          <Navbar />
          <div className="flex-1 flex flex-col">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
