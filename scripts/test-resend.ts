import { config } from "dotenv";
import { Resend } from "resend";

config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY missing from environment");
    process.exit(1);
  }

  const to = process.argv[2] ?? "dawiddeveloper@gmail.com";
  const from = process.env.DIGEST_FROM_ADDRESS ?? "Crossbook <onboarding@resend.dev>";

  console.log(`Sending Resend test email`);
  console.log(`  from: ${from}`);
  console.log(`  to:   ${to}`);

  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from,
    to,
    subject: "Crossbook — Resend connectivity test",
    text: `This is a Resend connectivity test from the Crossbook repo. Sent at ${new Date().toISOString()}.`,
    html: `<p>This is a Resend connectivity test from the Crossbook repo.</p><p>Sent at <code>${new Date().toISOString()}</code>.</p>`,
  });

  if (response.error) {
    console.error("Resend send failed:", response.error);
    process.exit(2);
  }

  console.log("Resend send succeeded:", response.data);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(3);
});
