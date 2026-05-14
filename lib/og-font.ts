// Loads Instrument Serif Italic as a TTF buffer for next/og ImageResponse.
// Satori (the renderer behind ImageResponse) supports TTF / OTF / WOFF but
// not WOFF2 — Google Fonts only serves TTF when the request looks like an
// older browser, so we spoof a basic User-Agent.

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap";

const UA_FOR_TTF =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A";

let cached: ArrayBuffer | null = null;

export async function loadInstrumentSerifItalic(): Promise<ArrayBuffer | null> {
  if (cached) return cached;
  try {
    const cssRes = await fetch(CSS_URL, { headers: { "User-Agent": UA_FOR_TTF } });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\((https?:[^)]+\.ttf)\)/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    cached = await fontRes.arrayBuffer();
    return cached;
  } catch {
    return null;
  }
}
