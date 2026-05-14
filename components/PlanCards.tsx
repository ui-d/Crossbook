import Link from "next/link";
import { CheckCircle2, Check, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const FREE_FEATURES = [
  "1 report per email",
  "Full summary card",
  "First 5 conflicts with full details",
  "Source-row citations on every claim",
];

const PRO_FEATURES = [
  "Unlimited reports",
  "All conflicts unblurred",
  "Bulk actions + filters",
  "Monthly delta tracking",
  "Corrected CSV export with decision history",
  "Monthly reminder digest (25th of each month)",
  "Priority email support",
];

type ProAction =
  | { kind: "link"; href: string; label: string }
  | { kind: "form"; formAction: string; label: string };

type FreeAction = { href: string; label: string };

interface PlanCardsProps {
  proAction: ProAction;
  freeAction?: FreeAction;
}

const DEFAULT_FREE_ACTION: FreeAction = {
  href: "/upload",
  label: "Start free",
};

export default function PlanCards({
  proAction,
  freeAction = DEFAULT_FREE_ACTION,
}: PlanCardsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6 items-stretch">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col h-full">
        <div className="mb-6">
          <h2 className="font-display text-[24px] font-semibold text-on-surface">Free</h2>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display text-[40px] font-bold text-on-surface">$0</span>
            <span className="text-[14px] text-on-surface-variant">/ forever</span>
          </div>
          <p className="text-[13px] text-on-surface-variant mt-2">
            Perfect for low-volume testing and a single month-end pass.
          </p>
        </div>

        <ul className="space-y-4 flex-1 mb-8">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="size-5 text-outline shrink-0 mt-px" />
              <span className="text-[14px] text-on-surface">{f}</span>
            </li>
          ))}
        </ul>

        <Link href={freeAction.href} className="mt-auto">
          <Button variant="outline" size="lg" className="w-full">
            {freeAction.label}
          </Button>
        </Link>
      </div>

      <div className="bg-surface-container-lowest border-2 border-primary-container rounded-xl p-8 flex flex-col h-full shadow-ambient relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container" />
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-display text-[24px] font-semibold text-primary">Pro</h2>
            <span className="bg-primary-container text-on-primary text-label-caps px-2 py-1 rounded-full">
              Recommended
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display text-[40px] font-bold text-on-surface">$49</span>
            <span className="text-[14px] text-on-surface-variant">/ month</span>
          </div>
          <p className="text-[13px] text-on-surface-variant mt-2">
            Complete visibility and tools for rigorous financial accuracy.
          </p>
        </div>

        <ul className="space-y-4 flex-1 mb-8">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2
                className="size-5 text-primary-container shrink-0 mt-px"
                fill="currentColor"
                stroke="white"
              />
              <span className="text-[14px] text-on-surface">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          {proAction.kind === "link" ? (
            <Link href={proAction.href}>
              <Button variant="cta" size="lg" className="w-full gap-2">
                {proAction.label}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <form action={proAction.formAction} method="POST">
              <Button type="submit" variant="cta" size="lg" className="w-full gap-2">
                {proAction.label}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
