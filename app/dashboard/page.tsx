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
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard — Crossbook",
};

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

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/dashboard");
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

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

  const list = reports ?? [];
  const totalReports = list.length;
  const totalConflicts = list.reduce((sum, r) => sum + (r.total_conflicts ?? 0), 0);
  const highPriorityTotal = list.reduce((sum, r) => sum + (r.high_priority_conflicts ?? 0), 0);
  const totalAtRiskCents = list.reduce((sum, r) => sum + (r.total_amount_at_risk_cents ?? 0), 0);

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        email ? `Signed in as ${email} — every report you've run, with month-over-month deltas.` : undefined
      }
      actions={
        <Link href="/upload">
          <Button variant="cta" size="lg" className="gap-2">
            <FileUp className="size-4" /> New report
          </Button>
        </Link>
      }
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
        />
        <MetricCard
          label="Amount at risk"
          value={formatCents(totalAtRiskCents)}
          icon={<Wallet className="size-5" />}
          accent="default"
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-[20px] font-semibold text-on-surface">Recent reports</h2>
            <p className="text-[13px] text-on-surface-variant">
              Latest 50 reports. Click any row to open the full reconciliation.
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-6 py-2 border-b border-outline-variant bg-surface-container-low">
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
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-surface-container-low transition-colors"
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
                    <span className="text-data-mono text-error md:text-right">
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
}

function MetricCard({ label, value, icon, accent }: MetricCardProps) {
  return (
    <div
      className={
        accent === "primary"
          ? "bg-primary-fixed border border-primary-container/30 rounded-xl p-4 flex flex-col gap-2 shadow-ambient"
          : "bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 shadow-ambient"
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-on-surface-variant">{label}</span>
        <span className={accent === "primary" ? "text-primary" : "text-on-surface-variant"}>{icon}</span>
      </div>
      <div className="font-display text-[28px] font-bold text-on-surface tabular-nums">{value}</div>
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
