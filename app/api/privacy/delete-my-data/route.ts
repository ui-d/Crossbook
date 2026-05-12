import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { createDeletionToken } from "@/lib/privacy";

export const runtime = "nodejs";

const FROM_ADDRESS =
  process.env.PRIVACY_FROM_ADDRESS ?? "Crossbook <onboarding@resend.dev>";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a valid email address." },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase().trim();
  const { token, expiresAt } = createDeletionToken(email);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://crossbook.app";
  const confirmUrl = `${appUrl}/api/privacy/confirm-delete?email=${encodeURIComponent(
    email,
  )}&token=${encodeURIComponent(token)}`;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        ok: true,
        sent: false,
        note: "RESEND_API_KEY not configured; deletion email would have been sent.",
        debug_url: process.env.NODE_ENV !== "production" ? confirmUrl : undefined,
      },
      { status: 200 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const expiresLabel = new Date(expiresAt).toUTCString();

  try {
    const response = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Confirm deletion of your Crossbook data",
      text: `Click the link below within 1 hour to permanently delete every report, decision, and free-tier record associated with ${email}:

${confirmUrl}

This link expires at ${expiresLabel}. If you didn't request this, ignore the email and nothing happens.

— Crossbook`,
      html: `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h2>Confirm deletion of your Crossbook data</h2>
  <p>Click the button below within 1 hour to permanently delete every report, decision, and free-tier record associated with <strong>${email}</strong>:</p>
  <p style="margin: 24px 0;">
    <a href="${confirmUrl}" style="display: inline-block; background: #b91c1c; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Delete my data</a>
  </p>
  <p style="color: #71717a; font-size: 13px;">This link expires at ${expiresLabel}. If you didn't request this, ignore the email and nothing happens.</p>
  <p style="color: #71717a; font-size: 13px;">— Crossbook</p>
</body></html>`,
    });
    if (response.error) {
      return NextResponse.json(
        { error: response.error.message },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
