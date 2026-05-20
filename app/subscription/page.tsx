import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CheckCircle2 } from "lucide-react";

import AppShell from "@/components/AppShell";
import PlanCards from "@/components/PlanCards";
import { SubscriptionAnalytics } from "@/components/SubscriptionAnalytics";
import { createSupabaseClient } from "@/lib/supabase";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Subscription",
  description: "Manage your Crossbook subscription.",
  path: "/subscription",
  noIndex: true,
});

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function SubscriptionPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/subscription");
  }

  const supabase = createSupabaseClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const isActive = subscription
    ? ACTIVE_STATUSES.has(subscription.status ?? "")
    : false;
  const nextBilling = isActive ? formatDate(subscription?.current_period_end ?? null) : null;

  return (
    <AppShell
      title="Subscription"
      subtitle={
        isActive
          ? "You're on Pro. Cancel anytime — your reports stay accessible until the end of the period."
          : "Pick the plan that matches your reconciliation volume. Cancel anytime — your reports stay accessible until the end of the period."
      }
    >
      <SubscriptionAnalytics />
      {isActive ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-ambient flex flex-col gap-3 max-w-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="size-6 text-primary-container shrink-0"
              fill="currentColor"
              stroke="white"
            />
            <h2 className="font-display text-[22px] font-semibold text-on-surface">
              You&apos;re on Pro
            </h2>
          </div>
          <p className="text-[14px] text-on-surface-variant">
            $49 / month, billed monthly.
          </p>
          {nextBilling && (
            <p className="text-[14px] text-on-surface">
              <span className="text-on-surface-variant">Next billing date: </span>
              <span className="font-medium">{nextBilling}</span>
            </p>
          )}
          <p className="text-[13px] text-on-surface-variant mt-2">
            Need to update your card or cancel? Email{" "}
            <a className="underline" href="mailto:support@crossbook.app">
              support@crossbook.app
            </a>{" "}
            and we&apos;ll handle it the same day.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <PlanCards
            proAction={{
              kind: "form",
              formAction: "/api/checkout",
              label: "Upgrade to Pro",
            }}
          />
          <p className="text-center text-[13px] text-on-surface-variant">
            $49 flat — 93% cheaper than HubSpot Data Hub Professional ($720 / seat / month).
          </p>
        </div>
      )}
    </AppShell>
  );
}
