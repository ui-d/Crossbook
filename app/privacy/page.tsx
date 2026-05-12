import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Crossbook",
};

const LAST_UPDATED = "May 12, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <h2 className="mt-8 text-xl font-semibold">What we collect</h2>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>The contents of CSV files you upload (HubSpot Deals and QuickBooks Customers/Invoices)</li>
        <li>Your email address — required to deliver the report and the monthly digest</li>
        <li>Decisions you make on each surfaced conflict, exported in the corrected CSV</li>
        <li>Payment information via Stripe (we never see card numbers)</li>
        <li>Authentication state via Clerk (we receive a JWT, not your password)</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Lawful basis</h2>
      <p className="text-sm">
        Article 6(1)(b) GDPR — processing is necessary for the performance of the
        contract you enter into when you upload a CSV to Crossbook.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Subprocessors</h2>
      <p className="text-sm">
        These third parties process your data on our behalf. Their privacy and
        security practices are governed by their own DPAs:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li><strong>Anthropic</strong> — Claude inference on the CSV records we send for analysis (US-hosted)</li>
        <li><strong>Supabase</strong> — Postgres storage of reports + decisions (US-East)</li>
        <li><strong>Stripe</strong> — payments + subscription billing (US-hosted)</li>
        <li><strong>Clerk</strong> — authentication + user management (US-hosted)</li>
        <li><strong>Resend</strong> — transactional + monthly digest email delivery</li>
        <li><strong>Vercel</strong> — application hosting + edge cache</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Retention</h2>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>Raw CSV file content is deleted from your report record after 30 days. Aggregate counts and the corrected-CSV-ready summary remain so the monthly delta still works.</li>
        <li>Reports themselves are retained while your account is active.</li>
        <li>Deletion requests (see below) are processed within 30 days of confirmation.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Your rights</h2>
      <p className="text-sm">
        Under GDPR (and equivalent laws elsewhere) you have the right to access,
        rectify, port, and erase your data. To exercise these rights, use the
        <Link href="/privacy/delete" className="underline px-1">delete-my-data</Link>
        flow or email <a href="mailto:dawiddeveloper@gmail.com" className="underline">dawiddeveloper@gmail.com</a>.
      </p>

      <h2 className="mt-8 text-xl font-semibold">International transfers</h2>
      <p className="text-sm">
        Anthropic, Stripe, Clerk, Resend, and Vercel are US-based. Cross-border
        transfers are covered by Standard Contractual Clauses (SCCs) in their
        respective DPAs.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Contact</h2>
      <p className="text-sm">
        Questions or complaints: <a href="mailto:dawiddeveloper@gmail.com" className="underline">dawiddeveloper@gmail.com</a>.
        You can also lodge a complaint with your local Data Protection Authority.
      </p>

      <p className="mt-12 text-xs text-muted-foreground">
        See also: <Link href="/dpa" className="underline">Data Processing Agreement</Link>
      </p>
    </main>
  );
}
