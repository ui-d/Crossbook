import Link from "next/link";

import { InteractiveSample } from "@/components/InteractiveSample";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Crossbook — HubSpot ↔ QuickBooks reconciliation, $49/mo",
  description:
    "Drop two CSVs. AI explains every conflict in plain English with source-row citations. First report free. $49/month vs. HubSpot Data Hub Professional at $720/seat/month.",
};

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-16">
      <Hero />
      <TrustSignals />
      <SampleSection />
      <HowItWorks />
      <AntiPositioning />
      <Pricing />
      <Privacy />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="text-center space-y-4">
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl mx-auto">
        HubSpot ↔ QuickBooks reconciliation that doesn&apos;t cost $720/seat/month
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Drop two CSVs. AI explains every conflict in plain English with
        source-row citations. First report free. $49/month for unlimited +
        monthly delta tracking.
      </p>
      <div className="pt-4">
        <Button asChild size="lg">
          <Link href="/upload">
            Drop your CSVs → see conflicts in 60 seconds
          </Link>
        </Button>
      </div>
    </section>
  );
}

function TrustSignals() {
  const items = [
    {
      title: "Every claim cites the exact row",
      body: "Never auto-merges, never invents data. Microsoft Research found frontier models corrupt 25% of documents over long workflows. We surface conflicts. You decide.",
    },
    {
      title: "93% cheaper than Data Hub Pro",
      body: "HubSpot Data Hub Professional starts at $720/seat/month. We're $49 flat.",
    },
    {
      title: "Built for the CSV workflow",
      body: "If you export at month-end and reconcile in Excel, you're our buyer. Teams with native sync don't need us.",
    },
  ];
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-lg border bg-card p-5 space-y-2"
        >
          <h3 className="font-semibold text-sm">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </section>
  );
}

function SampleSection() {
  return (
    <section className="space-y-4">
      <header className="text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight">
          Here&apos;s what a real report looks like
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Click any decision button. Filter by priority or type. Bulk-select
          and apply. Everything below is live and interactive.
        </p>
      </header>
      <InteractiveSample />
      <div className="text-center pt-4">
        <Button asChild size="lg">
          <Link href="/upload">Try this with YOUR real CSVs →</Link>
        </Button>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "Upload",
      body: "HubSpot Deals CSV + QuickBooks Customers/Invoices CSV. 5 MB / 4,000 rows per file on the free tier.",
    },
    {
      step: "2",
      title: "Analyze",
      body: "Pattern library + Claude surface every conflict in 30-60 seconds, with the exact row index from both files.",
    },
    {
      step: "3",
      title: "Decide + export",
      body: "Trust HubSpot, trust QuickBooks, flag, or ignore. Export a corrected CSV with your decisions appended.",
    },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-center">
        How it works
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.step} className="rounded-lg border bg-card p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Step {s.step}
            </div>
            <h3 className="font-semibold mt-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AntiPositioning() {
  const items = [
    {
      title: "Not Insycle",
      body: "Insycle is $79–$299/month for HubSpot dedupe within HubSpot. We cross-check HubSpot against QuickBooks.",
    },
    {
      title: "Not Synder / Bookkeep",
      body: "Those sync Stripe → QuickBooks. We do CRM → accounting reconciliation.",
    },
    {
      title: "Not Data Hub Pro",
      body: "We don't replace the $720/seat/month tier. We're for teams that will never pay it.",
    },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-center">
        What we&apos;re not
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border bg-muted/30 p-5 space-y-2"
          >
            <h3 className="font-semibold text-sm">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-center">
        Pricing
      </h2>
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h3 className="font-semibold">Free</h3>
          <p className="text-3xl font-semibold">$0</p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>1 report per email</li>
            <li>Full summary card</li>
            <li>First 5 conflicts with full decisions</li>
          </ul>
        </div>
        <div className="rounded-lg border-2 border-primary bg-primary/5 p-6 space-y-3">
          <h3 className="font-semibold">$49/month</h3>
          <p className="text-3xl font-semibold">$49</p>
          <ul className="text-sm space-y-1.5">
            <li>Unlimited reports</li>
            <li>All conflicts unblurred</li>
            <li>Bulk actions + filters</li>
            <li>Monthly delta tracking</li>
            <li>Corrected CSV export</li>
            <li>Monthly reminder digest</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Cancel anytime. Monthly only. No annual.
          </p>
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  return (
    <section className="rounded-lg border bg-muted/30 p-6 text-sm text-center space-y-2 max-w-3xl mx-auto">
      <p>
        🔒 Your CSV files are deleted after 30 days. GDPR-compliant. DPA
        available.
      </p>
      <p className="text-xs text-muted-foreground">
        <Link href="/privacy" className="underline">Privacy Policy</Link>
        {" · "}
        <Link href="/dpa" className="underline">Data Processing Agreement</Link>
        {" · "}
        <Link href="/privacy/delete" className="underline">Delete my data</Link>
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="text-center text-xs text-muted-foreground pt-8 border-t">
      Built solo by{" "}
      <a className="underline" href="mailto:dawiddeveloper@gmail.com">
        Dawid Nawrocki
      </a>
      . 10+ years in PLG / RevOps engineering.
    </footer>
  );
}
