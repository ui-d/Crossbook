import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { InteractiveSample } from "@/components/InteractiveSample";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/SectionShell";
import { EyebrowTag } from "@/components/EyebrowTag";
import { HeroHeadline } from "@/components/HeroHeadline";
import { Hero } from "@/components/landing/Hero";
import { FaqAccordion } from "@/components/landing/FaqAccordion";

export const metadata = {
  title: "Crossbook — HubSpot ↔ QuickBooks reconciliation, $49/mo",
  description:
    "Drop two CSVs. AI explains every conflict in plain English with source-row citations. First report free. $49/month vs. HubSpot Data Hub Professional at $720/seat/month.",
};

export default function Home() {
  return (
    <>
      <main className="flex-1 flex flex-col">
        <Hero />
        <LiveWorkspace />
        <HowItWorks />
        <WhatsInside />
        <AntiPositioning />
        <PricingTeaser />
        <TrustStrip />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

function LiveWorkspace() {
  return (
    <SectionShell tint inner="!pt-12 md:!pt-16 !pb-20 md:!pb-24">
      <div className="flex flex-col items-center text-center gap-3 mb-10">
        <EyebrowTag>Live workspace</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="A workspace that"
          italic="actually reflects reality."
          className="max-w-[700px]"
        />
        <p className="text-fg-muted max-w-[560px] text-[15px] leading-relaxed">
          Watch the demo run itself, or hover and drive it. Decisions and filters are local-only —
          nothing reaches a server until you upload your own CSVs.
        </p>
      </div>
      <InteractiveSample />
    </SectionShell>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Drop two CSVs",
      body: "HubSpot Deals export + QuickBooks Customers/Invoices export. Drag in, no schema setup.",
    },
    {
      n: "02",
      title: "Read the report",
      body: "Pattern library + Claude surface every conflict in 30–60 seconds, citing the exact row index in both files.",
    },
    {
      n: "03",
      title: "Decide. Export.",
      body: "Trust HubSpot, trust QBO, flag, or ignore — single rows or in bulk. Download a corrected CSV with your decisions appended.",
    },
  ];

  return (
    <SectionShell>
      <div className="flex flex-col items-center text-center gap-3 mb-14">
        <EyebrowTag>How it works</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="From CSV to corrected export,"
          italic="in three steps."
          className="max-w-[680px]"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-px bg-hairline rounded-[14px] overflow-hidden border border-hairline">
        {steps.map((step) => (
          <div
            key={step.n}
            className="bg-bg p-8 flex flex-col gap-3 transition-colors hover:bg-bg-tint/60"
          >
            <span className="font-mono text-[12px] text-fg-muted tracking-wider">{step.n}</span>
            <h3 className="font-serif text-[24px] text-fg leading-tight">{step.title}</h3>
            <p className="text-[14px] text-fg-muted leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function WhatsInside() {
  const features = [
    {
      title: "Source-cited every time",
      body: "Every claim links back to a row index in both files. No \"the model said so.\" You can audit the trail in seconds.",
    },
    {
      title: "Pattern library moat",
      body: "Common discrepancies (partial payments, currency-format mismatches, legal-suffix dupes) match instantly — no LLM call, no latency, no API cost.",
    },
    {
      title: "Monthly delta digest",
      body: "After your second upload, every report shows what changed since last month. New, resolved, persistent — a data-quality trend you actually keep.",
    },
    {
      title: "Bulk decisions + filters",
      body: "One click to ignore every currency-format mismatch. Filters by priority, conflict type, amount, and company.",
    },
  ];

  return (
    <SectionShell tint>
      <div className="flex flex-col items-center text-center gap-3 mb-14">
        <EyebrowTag>What’s inside</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="Everything you need,"
          italic="nothing you don’t."
          className="max-w-[680px]"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-bg border border-hairline rounded-[14px] p-7 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lifted"
          >
            <h3 className="font-serif text-[22px] text-fg leading-tight">{f.title}</h3>
            <p className="text-[14px] text-fg-muted leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function AntiPositioning() {
  const items = [
    {
      title: "Not Insycle",
      body: "Insycle is $79–$299/month for dedupe inside HubSpot. We cross-check HubSpot against QuickBooks.",
    },
    {
      title: "Not Synder / Bookkeep",
      body: "Those sync Stripe → QuickBooks. We do CRM → accounting reconciliation.",
    },
    {
      title: "Not Data Hub Pro",
      body: "We don’t replace the $720/seat/month tier. We're for teams that will never pay it.",
    },
  ];

  return (
    <SectionShell>
      <div className="flex flex-col items-center text-center gap-3 mb-14">
        <EyebrowTag>Positioning</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="What we’re"
          italic="not."
          className="max-w-[680px]"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="bg-bg border border-hairline rounded-[14px] p-7 flex flex-col gap-2"
          >
            <h3 className="font-sans text-[15px] font-medium text-fg">{item.title}</h3>
            <p className="text-[14px] text-fg-muted leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function PricingTeaser() {
  return (
    <SectionShell tint>
      <div className="flex flex-col items-center text-center gap-3 mb-14">
        <EyebrowTag>Pricing</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="$49 a month, flat."
          italic="Cancel anytime."
          className="max-w-[700px]"
        />
        <p className="text-fg-muted text-[15px] max-w-[520px]">
          First report free per email. No annual lock-in. No seats. No volume tiers.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 max-w-3xl mx-auto w-full">
        <div className="bg-bg border border-hairline rounded-[14px] p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow">Free</span>
            <p className="font-serif text-[44px] text-fg leading-none">$0</p>
            <span className="text-[13px] text-fg-muted">First report, forever</span>
          </div>
          <ul className="space-y-2 text-[14px] text-fg-muted flex-1">
            <li>· 1 report per email</li>
            <li>· Full summary card</li>
            <li>· First 5 conflicts unblurred</li>
          </ul>
          <Link href="/upload"><Button variant="outline" className="w-full">Try it free</Button></Link>
        </div>

        <div className="bg-bg border border-fg rounded-[14px] p-8 flex flex-col gap-5 relative shadow-lifted">
          <span className="absolute -top-2.5 right-6 bg-fg text-bg text-eyebrow px-2.5 py-1 rounded-full">
            Recommended
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow">Pro</span>
            <p className="font-serif text-[44px] text-fg leading-none">
              $49<span className="text-[16px] text-fg-muted"> /month</span>
            </p>
            <span className="text-[13px] text-fg-muted">Everything below, unlimited.</span>
          </div>
          <ul className="space-y-2 text-[14px] text-fg flex-1">
            <li>· Unlimited reports</li>
            <li>· All conflicts unblurred</li>
            <li>· Bulk actions + filters</li>
            <li>· Monthly delta digest</li>
            <li>· Corrected CSV export</li>
          </ul>
          <Link href="/pricing"><Button variant="default" className="w-full">See full pricing</Button></Link>
        </div>
      </div>
    </SectionShell>
  );
}

function TrustStrip() {
  const items = [
    {
      title: "Read-only by default",
      body: "We never write back to HubSpot or QuickBooks. Decisions live in the report, not your CRM.",
    },
    {
      title: "Your data, your retention",
      body: "CSV files are purged after 30 days. Delete-my-data endpoint clears everything within 24 hours.",
    },
    {
      title: "Never trains the model",
      body: "Anthropic processes the data with zero-retention enabled. Your CSV does not become anyone's training set.",
    },
  ];

  return (
    <SectionShell>
      <div className="flex flex-col items-center text-center gap-3 mb-14">
        <EyebrowTag>Trust</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="Built for the data"
          italic="you can’t afford to leak."
          className="max-w-[700px]"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-px bg-hairline rounded-[14px] overflow-hidden border border-hairline">
        {items.map((it) => (
          <div key={it.title} className="bg-bg p-7 flex flex-col gap-2">
            <h3 className="font-sans text-[15px] font-medium text-fg">{it.title}</h3>
            <p className="text-[14px] text-fg-muted leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-[13px] text-fg-muted">
        <Link href="/privacy" className="underline underline-offset-4 decoration-hairline hover:decoration-fg">Privacy Policy</Link>
        {" · "}
        <Link href="/dpa" className="underline underline-offset-4 decoration-hairline hover:decoration-fg">DPA</Link>
        {" · "}
        <Link href="/privacy/delete" className="underline underline-offset-4 decoration-hairline hover:decoration-fg">Delete my data</Link>
      </p>
    </SectionShell>
  );
}

function Faq() {
  const items = [
    {
      q: "What CSVs does Crossbook accept?",
      a: "Any HubSpot Deals export and any QuickBooks Customers / Invoices export — locale, currency, and column-name agnostic. Column detection handles the 30+ naming variants HubSpot and QBO produce across hubs, regions, and export types.",
    },
    {
      q: "Does the AI ever auto-merge or change my data?",
      a: "No. Every action requires a human click. Crossbook surfaces conflicts and recommends, but you decide. Microsoft Research's DELEGATE-52 paper found frontier models corrupt 25% of documents over long autonomous workflows — auto-merge is exactly what we don’t do.",
    },
    {
      q: "Where does my data live?",
      a: "Your CSVs are parsed in a serverless function, never written to disk, and the raw row content is purged 30 days after upload. Decisions, summaries, and conflict signatures are retained for delta comparison against future reports.",
    },
    {
      q: "Why $49 flat instead of seats?",
      a: "Because RevOps reconciliation is a single-operator job at month-end. Charging per seat would punish you for adding a teammate who only reviews one report a quarter. Flat keeps it simple.",
    },
    {
      q: "How is this different from HubSpot Data Hub?",
      a: "Data Hub Professional ($720/seat/month) does dedupe and enrichment inside HubSpot. It does not reconcile against QuickBooks. We focus on the gap that Data Hub leaves and Excel currently fills.",
    },
  ];
  return (
    <SectionShell tint>
      <div className="flex flex-col items-center text-center gap-3 mb-12">
        <EyebrowTag>FAQ</EyebrowTag>
        <HeroHeadline
          as="h2"
          roman="Questions worth"
          italic="asking first."
          className="max-w-[600px]"
        />
      </div>
      <div className="max-w-[760px] mx-auto">
        <FaqAccordion items={items} />
      </div>
    </SectionShell>
  );
}

function FinalCta() {
  return (
    <SectionShell inner="!py-24 md:!py-32">
      <div className="flex flex-col items-center text-center gap-6">
        <HeroHeadline
          as="h2"
          roman="Stop reconciling"
          italic="in Excel."
          className="max-w-[640px]"
        />
        <p className="text-fg-muted text-[16px] max-w-[460px]">
          First report free. 60 seconds. No card.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <Link href="/upload">
            <Button variant="default" size="lg" className="gap-2">
              Try free <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="ghost" size="lg" className="gap-1.5">
              See how it works <ArrowUpRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
