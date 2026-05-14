import { ImageResponse } from "next/og";

import { loadInstrumentSerifItalic } from "@/lib/og-font";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const font = await loadInstrumentSerifItalic();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: font ? "Instrument Serif" : "serif",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        C
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
