import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { cascadeDeleteByEmail, verifyDeletionToken } from "@/lib/privacy";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "delete confirm requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function htmlResponse(status: number, title: string, body: string): Response {
  const html = `<!doctype html>
<html><head><title>${title}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 64px auto; padding: 24px; color: #111;">
  <h1>${title}</h1>
  <p>${body}</p>
  <p style="margin-top: 24px;"><a href="/">← Back to Crossbook</a></p>
</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return htmlResponse(
      400,
      "Invalid request",
      "Missing email or token parameter.",
    );
  }

  const verification = verifyDeletionToken(email, token);
  if (!verification.valid) {
    return htmlResponse(
      401,
      "Link is no longer valid",
      `Reason: ${verification.reason}. Request a new deletion email if you still want to proceed.`,
    );
  }

  try {
    const supabase = adminClient();
    const outcome = await cascadeDeleteByEmail(supabase, email);
    return htmlResponse(
      200,
      "Your data has been deleted",
      `We deleted <strong>${outcome.records_deleted}</strong> records associated with <strong>${email}</strong> across ${outcome.tables_touched.length} tables. An audit row was written to <code>data_deletion_requests</code>. Stripe customer data is retained per GDPR Art. 17(3)(b) for financial recordkeeping.`,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "deletion failed";
    return htmlResponse(500, "Something went wrong", message);
  }
}
