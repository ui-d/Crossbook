import Link from "next/link";

import LegalShell from "@/components/LegalShell";

export const metadata = {
  title: "Data Processing Agreement — Crossbook",
};

const LAST_UPDATED = "May 12, 2026";

// TODO(post-first-paid-customer): wire iubenda.com Advanced (€199/yr) for
// live-fetched DPA + signed-PDF download. Setup playbook in
// docs/iubenda-setup.md. Current static content is GDPR-acceptable for
// MVP self-serve; upgrade when an enterprise prospect requests a
// countersigned PDF.

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[20px] font-semibold text-on-surface mt-4">{children}</h2>
  );
}

export default function DPAPage() {
  return (
    <LegalShell title="Data Processing Agreement" lastUpdated={LAST_UPDATED}>
      <p>
        This DPA forms part of the Terms of Service between Crossbook (Data Processor) and the customer
        (Data Controller). By uploading a CSV to Crossbook, you accept the terms below.
      </p>

      <section className="flex flex-col gap-2">
        <H2>1. Subject matter + duration</H2>
        <p>
          Crossbook processes the CSV contents you upload for the sole purpose of producing reconciliation
          reports, monthly delta digests, and the corrected CSV export. Processing continues for as long as
          your account is active, or until you trigger deletion via{" "}
          <Link href="/privacy/delete" className="text-primary hover:underline">/privacy/delete</Link>.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>2. Nature + purpose</H2>
        <p>The Processor will:</p>
        <ul className="list-disc pl-6 space-y-2 marker:text-outline">
          <li>Parse and normalize CSV records (Papa Parse, currency.js, date-fns)</li>
          <li>Compute fuzzy matches and surface conflicts (Fuse.js + custom Levenshtein)</li>
          <li>Submit normalized records to Anthropic Claude for plain-English explanations</li>
          <li>Store the resulting report and your decisions in Supabase Postgres (US-East)</li>
          <li>Compute month-over-month deltas and email a digest via Resend</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <H2>3. Types of data + categories of data subjects</H2>
        <p>
          The CSV files typically contain: company names, contact emails, deal amounts, invoice amounts,
          dates, and statuses. Categories of data subjects: the Controller&apos;s customers, prospects, and
          (where present) sales/AR contacts.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>4. Sub-processors</H2>
        <p>
          See the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for
          the current list. We will notify Controllers in advance of any new sub-processor.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>5. Security</H2>
        <ul className="list-disc pl-6 space-y-2 marker:text-outline">
          <li>All connections are TLS 1.2+.</li>
          <li>
            Supabase Postgres rows are protected by Row Level Security keyed off the Clerk JWT{" "}
            <code className="font-mono text-[13px] text-on-surface bg-surface-container px-1 rounded">sub</code>{" "}
            claim.
          </li>
          <li>Service-role credentials are server-only, never shipped to the browser.</li>
          <li>Raw CSV content is purged 30 days after upload.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <H2>6. Data subject rights</H2>
        <p>
          The Controller can fulfil access, rectification, portability, and erasure requests via{" "}
          <Link href="/privacy/delete" className="text-primary hover:underline">/privacy/delete</Link> or by
          emailing{" "}
          <a href="mailto:dawiddeveloper@gmail.com" className="text-primary hover:underline">
            dawiddeveloper@gmail.com
          </a>.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>7. International transfers</H2>
        <p>
          Standard Contractual Clauses (SCCs) apply to transfers outside the EEA, as flowed down from the
          sub-processors listed in the Privacy Policy.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <H2>8. Limitation + duration</H2>
        <p>
          This DPA is provided as a baseline. A countersigned long-form DPA is available for enterprise
          customers — request one via{" "}
          <a href="mailto:dawiddeveloper@gmail.com" className="text-primary hover:underline">
            dawiddeveloper@gmail.com
          </a>
          . Once a generator integration is wired (see{" "}
          <code className="font-mono text-[13px] text-on-surface bg-surface-container px-1 rounded">
            DPA_GENERATOR_API_KEY
          </code>
          ), users will be able to download a countersigned PDF automatically.
        </p>
      </section>
    </LegalShell>
  );
}
