import Link from "next/link";

export const metadata = {
  title: "Data Processing Agreement — Crossbook",
};

const LAST_UPDATED = "May 12, 2026";

export default function DPAPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
      <h1 className="text-3xl font-semibold tracking-tight">Data Processing Agreement</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <p className="text-sm mt-6">
        This DPA forms part of the Terms of Service between Crossbook (Data
        Processor) and the customer (Data Controller). By uploading a CSV to
        Crossbook, you accept the terms below.
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. Subject matter + duration</h2>
      <p className="text-sm">
        Crossbook processes the CSV contents you upload for the sole purpose of
        producing reconciliation reports, monthly delta digests, and the
        corrected CSV export. Processing continues for as long as your account
        is active, or until you trigger deletion via{" "}
        <Link href="/privacy/delete" className="underline">/privacy/delete</Link>.
      </p>

      <h2 className="mt-8 text-xl font-semibold">2. Nature + purpose</h2>
      <p className="text-sm">
        The Processor will:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>Parse and normalize CSV records (Papa Parse, currency.js, date-fns)</li>
        <li>Compute fuzzy matches and surface conflicts (Fuse.js + custom Levenshtein)</li>
        <li>Submit normalized records to Anthropic Claude for plain-English explanations</li>
        <li>Store the resulting report and your decisions in Supabase Postgres (US-East)</li>
        <li>Compute month-over-month deltas and email a digest via Resend</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">3. Types of data + categories of data subjects</h2>
      <p className="text-sm">
        The CSV files typically contain: company names, contact emails, deal
        amounts, invoice amounts, dates, and statuses. Categories of data
        subjects: the Controller&apos;s customers, prospects, and (where present)
        sales/AR contacts.
      </p>

      <h2 className="mt-8 text-xl font-semibold">4. Sub-processors</h2>
      <p className="text-sm">
        See the <Link href="/privacy" className="underline">Privacy Policy</Link>{" "}
        for the current list. We will notify Controllers in advance of any new
        sub-processor.
      </p>

      <h2 className="mt-8 text-xl font-semibold">5. Security</h2>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>All connections are TLS 1.2+.</li>
        <li>Supabase Postgres rows are protected by Row Level Security keyed off the Clerk JWT <code>sub</code> claim.</li>
        <li>Service-role credentials are server-only, never shipped to the browser.</li>
        <li>Raw CSV content is purged 30 days after upload.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">6. Data subject rights</h2>
      <p className="text-sm">
        The Controller can fulfil access, rectification, portability, and
        erasure requests via{" "}
        <Link href="/privacy/delete" className="underline">/privacy/delete</Link>{" "}
        or by emailing{" "}
        <a href="mailto:dawiddeveloper@gmail.com" className="underline">dawiddeveloper@gmail.com</a>.
      </p>

      <h2 className="mt-8 text-xl font-semibold">7. International transfers</h2>
      <p className="text-sm">
        Standard Contractual Clauses (SCCs) apply to transfers outside the EEA,
        as flowed down from the sub-processors listed in the Privacy Policy.
      </p>

      <h2 className="mt-8 text-xl font-semibold">8. Limitation + duration</h2>
      <p className="text-sm">
        This DPA is provided as a baseline. A countersigned long-form DPA is
        available for enterprise customers — request one via{" "}
        <a href="mailto:dawiddeveloper@gmail.com" className="underline">dawiddeveloper@gmail.com</a>.
        Once a generator integration is wired (see{" "}
        <code>DPA_GENERATOR_API_KEY</code>), users will be able to download a
        countersigned PDF automatically.
      </p>
    </main>
  );
}
