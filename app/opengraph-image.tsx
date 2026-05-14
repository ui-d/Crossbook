import { ImageResponse } from "next/og";

import { loadInstrumentSerifItalic } from "@/lib/og-font";

export const alt = "Crossbook — HubSpot ↔ QuickBooks reconciliation, $49/mo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await loadInstrumentSerifItalic();
  const serifFamily = font ? "Instrument Serif" : "serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top row: brand mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ebebeb",
              borderRadius: 10,
              fontFamily: serifFamily,
              fontStyle: "italic",
              fontSize: 32,
              lineHeight: 1,
              paddingBottom: 4,
            }}
          >
            C
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>
            Crossbook
          </div>
        </div>

        {/* Headline block — pushed toward visual center */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 64,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span style={{ fontWeight: 500 }}>HubSpot ↔ QuickBooks</span>
            <span
              style={{
                fontFamily: serifFamily,
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              reconciliation.
            </span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              lineHeight: 1.35,
              color: "#6b6b6b",
              maxWidth: 880,
            }}
          >
            Drop two CSVs. AI explains every conflict in plain English with
            source-row citations.
          </div>
        </div>

        {/* Bottom row: pricing wedge + domain */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #ebebeb",
            paddingTop: 24,
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 500 }}>$49/month</span>
            <span style={{ color: "#6b6b6b" }}>
              vs. HubSpot Data Hub Pro at $720/seat/month
            </span>
          </div>
          <div style={{ color: "#6b6b6b", fontVariantNumeric: "tabular-nums" }}>
            crossbook.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Instrument Serif", data: font, weight: 400, style: "italic" }]
        : undefined,
    },
  );
}
