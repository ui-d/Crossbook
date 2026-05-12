import Link from "next/link";

import LegalShell from "@/components/LegalShell";

export const metadata = {
  title: "Privacy Policy — Crossbook",
};

const LAST_UPDATED = "May 12, 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[20px] font-semibold text-on-surface mt-4">{children}</h2>
  );
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <section className="flex flex-col gap-2">
        <H2>What we collect</H2>
        <ul className="list-disc pl-6 space-y-2 marker:text-outline">
          <li>The contents of CSV files you upload (HubSpot Deals and QuickBooks Customers/Invoices)</li>
          <li>Your email address — required to deliver the report and the monthly digest</li>
          <li>Decisions you make on each surfaced conflict, exported in the corrected CSV</li>
          <li>Payment information via Stripe (we never see card numbers)</li>
          <li>Authentication state via Clerk (we receive a JWT, not your password)</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <H2>Lawful basis</H2>
        <p>
          Article 6(1)(b) GDPR — processing is necessary for the performance of the contract you enter into
          when you upload a CSV to Crossbook.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>Subprocessors</H2>
        <p>
          These third parties process your data on our behalf. Their privacy and security practices are
          governed by their own DPAs:
        </p>
        <ul className="list-disc pl-6 space-y-2 marker:text-outline">
          <li><strong className="text-on-surface">Anthropic</strong> — Claude inference on the CSV records we send for analysis (US-hosted)</li>
          <li><strong className="text-on-surface">Supabase</strong> — Postgres storage of reports + decisions (US-East)</li>
          <li><strong className="text-on-surface">Stripe</strong> — payments + subscription billing (US-hosted)</li>
          <li><strong className="text-on-surface">Clerk</strong> — authentication + user management (US-hosted)</li>
          <li><strong className="text-on-surface">Resend</strong> — transactional + monthly digest email delivery</li>
          <li><strong className="text-on-surface">Vercel</strong> — application hosting + edge cache</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <H2>Retention</H2>
        <ul className="list-disc pl-6 space-y-2 marker:text-outline">
          <li>Raw CSV file content is deleted from your report record after 30 days. Aggregate counts and the corrected-CSV-ready summary remain so the monthly delta still works.</li>
          <li>Reports themselves are retained while your account is active.</li>
          <li>Deletion requests (see below) are processed within 30 days of confirmation.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <H2>Your rights</H2>
        <p>
          Under GDPR (and equivalent laws elsewhere) you have the right to access, rectify, port, and erase
          your data. To exercise these rights, use the{" "}
          <Link href="/privacy/delete" className="text-primary hover:underline">delete-my-data</Link>{" "}
          flow or email{" "}
          <a href="mailto:dawiddeveloper@gmail.com" className="text-primary hover:underline">dawiddeveloper@gmail.com</a>.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>International transfers</H2>
        <p>
          Anthropic, Stripe, Clerk, Resend, and Vercel are US-based. Cross-border transfers are covered by
          Standard Contractual Clauses (SCCs) in their respective DPAs.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>Contact</H2>
        <p>
          Questions or complaints:{" "}
          <a href="mailto:dawiddeveloper@gmail.com" className="text-primary hover:underline">
            dawiddeveloper@gmail.com
          </a>
          . You can also lodge a complaint with your local Data Protection Authority.
        </p>
      </section>

      <p className="mt-6 text-[13px] text-on-surface-variant">
        See also: <Link href="/dpa" className="text-primary hover:underline">Data Processing Agreement</Link>
      </p>
    </LegalShell>
  );
}
