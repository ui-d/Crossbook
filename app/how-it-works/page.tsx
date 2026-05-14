import Link from "next/link";
import {
  FileSpreadsheet,
  Sparkles,
  Download,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
} from "lucide-react";

import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { StaggerChildren, StaggerItem } from "@/components/landing/SectionStagger";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "How it works",
  description:
    "Drop two CSVs. Crossbook normalizes, fuzzy-matches, runs the pattern library, then calls Claude for novel conflicts. Output is a clear plain-English report you can act on.",
  path: "/how-it-works",
});

const STEPS = [
  {
    icon: FileSpreadsheet,
    label: "Step 1",
    title: "Upload",
    body: "Drop your HubSpot Deals export and your QuickBooks Customers/Invoices export. We auto-detect column names across HubSpot Hub tiers and QuickBooks Online formats — no mapping wizard.",
    detail: "Up to 5 MB / 4,000 rows per file on the free tier. Files are deleted after 30 days.",
  },
  {
    icon: Sparkles,
    label: "Step 2",
    title: "Analyze",
    body: "We normalize company names across legal-suffix and diacritic variations, run fuzzy matching, then a pattern library catches known discrepancy shapes. Only novel pairs hit Claude.",
    detail: "Source-row citations on every claim. Confidence < 0.65 auto-downgrades to manual review.",
  },
  {
    icon: Download,
    label: "Step 3",
    title: "Decide + export",
    body: "Click through each conflict — trust HubSpot, trust QuickBooks, flag for review, or ignore. Use bulk actions to clear obvious patterns in one click. Export a corrected CSV with your decisions appended.",
    detail: "Decisions feed the pattern library so future reports get smarter — for everyone.",
  },
];

const ANTI = [
  {
    title: "Not Insycle",
    body: "Insycle is $79–$299/mo for HubSpot-internal dedupe. We cross-check HubSpot against QuickBooks, which Insycle does not.",
  },
  {
    title: "Not Synder / Bookkeep",
    body: "Those tools sync Stripe → QuickBooks for e-commerce. We do CRM → accounting reconciliation for B2B RevOps.",
  },
  {
    title: "Not Data Hub Pro",
    body: "HubSpot's $720/seat/mo tier covers this with native sync. We're for teams that will never pay that — same wedge, 93% less.",
  },
];

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Never auto-merges",
    body: "DELEGATE-52 (Microsoft Research, 2026) found frontier models corrupt 25% of documents over long workflows. Every action requires your click.",
  },
  {
    icon: Zap,
    title: "Pattern library first",
    body: "Known discrepancy shapes (partial payment, currency-format-only, missing legal suffix) resolve from templates — no LLM call. Cheap, fast, predictable.",
  },
  {
    icon: TrendingUp,
    title: "Delta tracking compounds",
    body: "Every paid report compares against your prior one. New conflicts, resolved conflicts, persistent issues — visible at a glance from month 2 onward.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <main className="flex-1 w-full">
        <section className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col items-center text-center gap-4">
          <span className="text-label-caps text-primary">How it works</span>
          <h1 className="font-display text-[36px] md:text-[44px] font-bold tracking-tight text-on-surface max-w-3xl leading-tight">
            From two CSVs to a corrected export in three steps
          </h1>
          <p className="text-[16px] text-on-surface-variant max-w-xl">
            No OAuth. No mapping wizard. No 60-day implementation. Just the workflow your RevOps team is already
            doing in Excel — but with Claude doing the explaining.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-6 pb-12">
          <div className="relative">
            <div className="hidden md:block absolute top-[68px] left-[14%] right-[14%] h-px bg-outline-variant" aria-hidden="true" />
            <StaggerChildren className="grid md:grid-cols-3 gap-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <StaggerItem
                    key={step.title}
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-2 shadow-ambient"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-display font-bold text-[18px]">
                        {i + 1}
                      </div>
                      <Icon className="size-5 text-on-surface-variant" />
                    </div>
                    <span className="text-label-caps text-primary">{step.label}</span>
                    <h3 className="font-display text-[20px] font-semibold text-on-surface">{step.title}</h3>
                    <p className="text-[14px] text-on-surface-variant">{step.body}</p>
                    <p className="text-[13px] text-on-surface-variant/80 mt-auto pt-2 border-t border-outline-variant">
                      {step.detail}
                    </p>
                  </StaggerItem>
                );
              })}
            </StaggerChildren>
          </div>
        </section>

        <section className="bg-surface-container-low border-y border-outline-variant py-12">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-6">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
              <span className="text-label-caps text-on-surface-variant">Trust model</span>
              <h2 className="font-display text-[28px] md:text-[32px] font-bold tracking-tight text-on-surface">
                Built so you never have to second-guess it
              </h2>
            </div>
            <StaggerChildren className="grid md:grid-cols-3 gap-4">
              {TRUST.map((t) => {
                const Icon = t.icon;
                return (
                  <StaggerItem key={t.title} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-2">
                    <Icon className="size-6 text-primary" />
                    <h3 className="font-display text-[16px] font-semibold text-on-surface">{t.title}</h3>
                    <p className="text-[14px] text-on-surface-variant">{t.body}</p>
                  </StaggerItem>
                );
              })}
            </StaggerChildren>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col gap-6">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <span className="text-label-caps text-on-surface-variant">Positioning</span>
            <h2 className="font-display text-[28px] md:text-[32px] font-bold tracking-tight text-on-surface">
              What we&apos;re not
            </h2>
          </div>
          <StaggerChildren className="grid md:grid-cols-3 gap-4">
            {ANTI.map((item) => (
              <StaggerItem key={item.title} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-1">
                <h3 className="font-display text-[16px] font-semibold text-on-surface">{item.title}</h3>
                <p className="text-[14px] text-on-surface-variant">{item.body}</p>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        <section className="max-w-[1200px] mx-auto px-6 pb-12">
          <div className="bg-primary-container rounded-2xl p-8 md:p-12 text-center flex flex-col items-center gap-4 shadow-ambient">
            <h2 className="font-display text-[28px] md:text-[32px] font-bold text-on-primary max-w-2xl leading-tight">
              First report free. No credit card. Sixty seconds.
            </h2>
            <p className="text-[14px] text-on-primary/85 max-w-xl">
              Drop two CSVs and see exactly what&apos;s out of sync between HubSpot and QuickBooks.
            </p>
            <Link href="/upload">
              <Button variant="secondary" size="lg" className="gap-2">
                Try it free <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
