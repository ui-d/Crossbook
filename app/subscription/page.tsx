import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";

import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Subscription — Crossbook",
};

export default function SubscriptionPage() {
  return (
    <AppShell
      title="Subscription"
      subtitle="Pick the plan that matches your reconciliation volume. Cancel anytime — your reports stay accessible until the end of the period."
      actions={
        <Link href="/pricing">
          <Button variant="outline" size="sm">Full plan comparison</Button>
        </Link>
      }
    >
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-ambient">
        <PricingTable />
      </div>
    </AppShell>
  );
}
