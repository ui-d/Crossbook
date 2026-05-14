import SiteFooter from "@/components/SiteFooter";
import PlanCards from "@/components/PlanCards";
import { auth } from "@clerk/nextjs/server";

import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Pricing",
  description:
    "Free for the first report. $49/month for unlimited reports, monthly delta tracking, and corrected CSV export. 93% cheaper than HubSpot Data Hub Pro.",
  path: "/pricing",
});

const FAQS = [
  {
    q: "How is this different from HubSpot Data Hub Professional?",
    a: "Data Hub starts at $720/seat/month and is bundled with live sync, automation, and enrichment. Crossbook is $49 flat for CSV-in / plain-English-out reconciliation. If you already pay for Data Hub, you don't need us. If you reconcile in Excel at month-end, you do.",
  },
  {
    q: "What about Insycle, Synder, or Bookkeep?",
    a: "Insycle is HubSpot-internal dedupe ($79–$299/mo). Synder and Bookkeep sync Stripe → QuickBooks. We're the only tool we know of that takes a HubSpot Deals CSV and a QuickBooks Customers/Invoices CSV and tells you exactly which records disagree, in plain English.",
  },
  {
    q: "Is my data safe?",
    a: "CSV files are deleted automatically after 30 days. Reports (summary stats + decisions) are retained while your account is active. We're GDPR-compliant and provide a DPA. You can delete all your data at any time via the in-app endpoint.",
  },
  {
    q: "Do you offer annual or quarterly billing?",
    a: "Monthly only. No annual lock-in, no quarterly trickery. Cancel anytime — your existing reports stay accessible until the end of the period.",
  },
  {
    q: "What happens if Claude makes a mistake?",
    a: "Every claim cites the exact source row in both files, so you can verify in seconds. We never auto-merge. Confidence below 0.65 is automatically downgraded to MANUAL_REVIEW with a warning badge. Microsoft Research found frontier models corrupt 25% of documents over long workflows; our entire UX is designed around that.",
  },
];

export default async function PricingPage() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  return (
    <>
      <main className="flex-1 w-full">
        <section className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col items-center text-center gap-4">
          <span className="text-label-caps text-primary">Pricing</span>
          <h1 className="font-display text-[36px] md:text-[44px] font-bold tracking-tight text-on-surface max-w-2xl leading-tight">
            Transparent pricing for accurate books
          </h1>
          <p className="text-[16px] text-on-surface-variant max-w-xl">
            Choose the plan that fits your reconciliation volume. No hidden fees, cancel anytime.
          </p>
        </section>

        <section className="max-w-[900px] mx-auto px-6 pb-12">
          <PlanCards
            proAction={{
              kind: "link",
              href: isSignedIn ? "/subscription" : "/upload",
              label: isSignedIn ? "Upgrade to Pro" : "Start free → upgrade later",
            }}
          />

          <p className="text-center text-[13px] text-on-surface-variant mt-6">
            HubSpot Data Hub Professional starts at{" "}
            <span className="text-outline line-through">$720 / seat / month</span>. Crossbook is $49 flat — 93% cheaper.
          </p>
        </section>

        <section className="bg-surface-container-low border-y border-outline-variant py-12">
          <div className="max-w-[800px] mx-auto px-6 flex flex-col gap-6">
            <div className="text-center flex flex-col gap-2">
              <span className="text-label-caps text-on-surface-variant">FAQ</span>
              <h2 className="font-display text-[28px] font-bold tracking-tight text-on-surface">
                Common questions
              </h2>
            </div>
            <dl className="flex flex-col gap-4">
              {FAQS.map((faq) => (
                <div
                  key={faq.q}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6"
                >
                  <dt className="font-display text-[16px] font-semibold text-on-surface mb-1">
                    {faq.q}
                  </dt>
                  <dd className="text-[14px] text-on-surface-variant leading-relaxed">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
