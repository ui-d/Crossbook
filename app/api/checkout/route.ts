import { NextResponse, type NextRequest } from "next/server";

import { createCheckoutSession } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const reportId = url.searchParams.get("reportId") ?? undefined;
  try {
    const result = await createCheckoutSession({ reportId });
    return NextResponse.redirect(result.url, { status: 303 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
