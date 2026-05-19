import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  FileUp,
  AlertCircle,
  TrendingUp,
  Wallet,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: "Your report history and monthly delta summary.",
  path: "/dashboard",
  noIndex: true,
});

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Dashboard requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

interface ReportListRow {
  id: string;
  hubspot_filename: string | null;
  quickbooks_filename: string | null;
  total_conflicts: number | null;
  high_priority_conflicts: number | null;
  total_amount_at_risk_cents: number | null;
  is_paid: boolean | null;
  status: string | null;
  created_at: string;
}

function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function StatusBadge({ status }: { status: string | null }) {
  const tone =
    status === "done"
      ? "bg-primary-fixed text-primary"
      : status === "error"
        ? "bg-error-container text-on-error-container"
        : "bg-surface-container-high text-on-surface-variant";
  const label = (status ?? "pending").toUpperCase();
  return (
    <span className={`text-label-caps px-2 py-1 rounded ${tone}`}>{label}</span>
  );
}

interface DashboardSearchParams {
  filter?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/dashboard");
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const { filter } = await searchParams;
  const highOnly = filter === "high";

  const supabase = adminClient();

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id,hubspot_filename,quickbooks_filename,total_conflicts,high_priority_conflicts,total_amount_at_risk_cents,is_paid,status,created_at",
    )
    .or(`user_id.eq.${userId},email.eq.${email}`)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ReportListRow[]>();

  const allReports = reports ?? [];
  const totalReports = allReports.length;
  const totalConflicts = allReports.reduce((sum, r) => sum + (r.total_conflicts ?? 0), 0);
  const highPriorityTotal = allReports.reduce(
    (sum, r) => sum + (r.high_priority_conflicts ?? 0),
    0,
  );
  const totalAtRiskCents = allReports.reduce(
    (sum, r) => sum + (r.total_amount_at_risk_cents ?? 0),
    0,
  );
  const list = highOnly
    ? allReports.filter((r) => (r.high_priority_conflicts ?? 0) > 0)
    : allReports;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Every reconciliation you've run. Click a row to reopen."
    >
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Reports"
          value={String(totalReports)}
          icon={<FileUp className="size-5" />}
          accent="default"
        />
        <MetricCard
          label="Open conflicts"
          value={String(totalConflicts)}
          icon={<AlertCircle className="size-5" />}
          accent="default"
        />
        <MetricCard
          label="High priority"
          value={String(highPriorityTotal)}
          icon={<TrendingUp className="size-5" />}
          accent="primary"
          href={highOnly ? "/dashboard" : "/dashboard?filter=high"}
          active={highOnly}
        />
        <MetricCard
          label="Amount at risk"
          value={formatCents(totalAtRiskCents)}
          icon={<Wallet className="size-5" />}
          accent="default"
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-[20px] font-semibold text-on-surface">Recent reports</h2>
            <p className="text-[13px] text-on-surface-variant">
              {highOnly
                ? `Filtered to reports with high-priority conflicts (${list.length} of ${totalReports}).`
                : `Showing ${totalReports} most recent. Click any row to open the full reconciliation.`}
            </p>
          </div>
          {highOnly && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="size-4" /> Clear filter
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          highOnly ? (
            <NoMatchesState />
          ) : (
            <EmptyState />
          )
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_5rem_4rem_7rem_7rem_7rem] gap-4 items-center px-6 py-2 border-b border-outline-variant bg-surface-container-low">
              <span className="text-label-caps text-on-surface-variant">Files</span>
              <span className="text-label-caps text-on-surface-variant text-right">Conflicts</span>
              <span className="text-label-caps text-on-surface-variant text-right">High</span>
              <span className="text-label-caps text-on-surface-variant text-right">At risk</span>
              <span className="text-label-caps text-on-surface-variant">Status</span>
              <span className="text-label-caps text-on-surface-variant">Date</span>
            </div>
            <ul className="divide-y divide-outline-variant">
              {list.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/report/${r.id}`}
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_5rem_4rem_7rem_7rem_7rem] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-mono text-[13px] text-on-surface truncate">
                        {r.hubspot_filename ?? "hubspot.csv"}
                      </span>
                      <span className="font-mono text-[13px] text-on-surface-variant truncate">
                        ↔ {r.quickbooks_filename ?? "quickbooks.csv"}
                      </span>
                    </div>
                    <span className="text-data-mono text-on-surface md:text-right">
                      {r.total_conflicts ?? 0}
                    </span>
                    <span
                      className={`text-data-mono md:text-right ${
                        (r.high_priority_conflicts ?? 0) > 0
                          ? "text-error"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {r.high_priority_conflicts ?? 0}
                    </span>
                    <span className="text-data-mono text-on-surface md:text-right">
                      {formatCents(r.total_amount_at_risk_cents)}
                    </span>
                    <StatusBadge status={r.status} />
                    <span className="text-[13px] text-on-surface-variant inline-flex items-center gap-2">
                      {new Date(r.created_at).toLocaleDateString()}
                      <ChevronRight className="size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </AppShell>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "default" | "primary";
  href?: string;
  active?: boolean;
}

function MetricCard({ label, value, icon, accent, href, active }: MetricCardProps) {
  const base =
    accent === "primary"
      ? "bg-primary-fixed border border-primary-container/30 rounded-xl p-4 flex flex-col gap-2 shadow-ambient"
      : "bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 shadow-ambient";
  const interactive = href
    ? "transition-all hover:shadow-md hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    : "";
  const activeRing = active ? "ring-2 ring-primary ring-offset-2 ring-offset-bg" : "";
  const className = [base, interactive, activeRing].filter(Boolean).join(" ");

  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-on-surface-variant">{label}</span>
        <span className={accent === "primary" ? "text-primary" : "text-on-surface-variant"}>{icon}</span>
      </div>
      <div className="font-display text-[28px] font-bold text-on-surface tabular-nums">{value}</div>
      {href && (
        <span className="text-[12px] text-on-surface-variant">
          {active ? "Showing only these" : "Click to filter"}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-pressed={active ? "true" : "false"}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

function NoMatchesState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl px-6 py-12 text-center flex flex-col items-center gap-3">
      <p className="text-[14px] text-on-surface">No reports with high-priority conflicts.</p>
      <Link
        href="/dashboard"
        className="text-[13px] text-primary hover:underline inline-flex items-center gap-1"
      >
        <X className="size-3.5" /> Clear filter
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl px-6 py-12 text-center flex flex-col items-center gap-4">
      <div className="size-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
        <FileUp className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[18px] font-semibold text-on-surface">No reports yet</h3>
        <p className="text-[14px] text-on-surface-variant max-w-md">
          Upload your first HubSpot Deals + QuickBooks Customers/Invoices export and we&apos;ll surface every
          conflict in 60 seconds.
        </p>
      </div>
      <Link href="/upload">
        <Button variant="cta" size="lg" className="gap-2">
          Upload your first CSVs <ArrowRight className="size-4" />
        </Button>
      </Link>
    </div>
  );
}
