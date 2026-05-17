import { ImageResponse } from "next/og";

import { loadInstrumentSerifItalic } from "@/lib/og-font";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const font = await loadInstrumentSerifItalic();

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
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
          fontSize: 150,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        C
        <div
          style={{
            position: "absolute",
            height: 14,
            width: 108,
            background: "#0a0a0a",
            borderRadius: 7,
            left: "50%",
            top: "50%",
            transform: "translate(-54%, -50%)",
          }}
        />
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
