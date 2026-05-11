-- Reconcile MVP — initial schema
-- Tables: reports, free_report_usage, conflict_decisions, discrepancy_patterns,
--         subscriptions, digest_sends, data_deletion_requests
-- Auth: Clerk-issued JWT consumed via Supabase third-party auth.
--       auth.jwt() ->> 'sub' resolves to the Clerk user ID.

-- ---------- reports ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  session_token text unique,
  email text not null,
  hubspot_filename text,
  quickbooks_filename text,
  total_records_hubspot int,
  total_records_quickbooks int,
  total_conflicts int,
  high_priority_conflicts int,
  total_amount_at_risk_cents bigint,
  status text default 'pending' check (status in ('pending','processing','done','error')),
  result_json jsonb,
  is_paid boolean default false,
  pattern_matches jsonb,
  prior_report_id uuid references public.reports(id),
  delta_json jsonb,
  files_purged_at timestamptz,
  created_at timestamptz default now()
);
create index reports_user_id_idx on public.reports (user_id);
create index reports_email_idx on public.reports (email);
create index reports_created_at_idx on public.reports (created_at desc);

-- ---------- free_report_usage ----------
create table public.free_report_usage (
  email text primary key,
  reports_used int default 1,
  first_used_at timestamptz default now()
);

-- ---------- conflict_decisions ----------
create table public.conflict_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade,
  conflict_id text not null,
  decision text check (decision in ('TRUST_HUBSPOT','TRUST_QUICKBOOKS','MANUAL_REVIEW','IGNORE')),
  notes text,
  was_bulk boolean default false,
  decided_at timestamptz default now()
);
create index conflict_decisions_report_id_idx on public.conflict_decisions (report_id);

-- ---------- discrepancy_patterns ----------
create table public.discrepancy_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_key text unique not null,
  pattern_name text not null,
  detection_signature jsonb not null,
  explanation_template text not null,
  recommended_action text,
  confidence_floor numeric default 0.6,
  times_matched int default 0,
  times_user_confirmed int default 0,
  times_user_overrode int default 0,
  created_at timestamptz default now()
);

-- ---------- subscriptions ----------
create table public.subscriptions (
  user_id text primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- ---------- digest_sends ----------
create table public.digest_sends (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  digest_month date not null,
  sent_at timestamptz default now(),
  unique (user_id, digest_month)
);

-- ---------- data_deletion_requests ----------
create table public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  requested_at timestamptz default now(),
  completed_at timestamptz,
  records_deleted_count int
);
create index data_deletion_requests_email_idx on public.data_deletion_requests (email);

-- ---------- Row Level Security ----------
-- Service-role bypasses RLS; the patterns below define what authenticated end users see.

alter table public.reports enable row level security;
alter table public.conflict_decisions enable row level security;
alter table public.discrepancy_patterns enable row level security;
alter table public.subscriptions enable row level security;
alter table public.digest_sends enable row level security;
alter table public.data_deletion_requests enable row level security;
alter table public.free_report_usage enable row level security;

-- reports: users can read their own rows; writes go through service role only.
create policy "reports_owner_select" on public.reports
  for select
  using (auth.jwt() ->> 'sub' = user_id);

-- conflict_decisions: read/write only when the parent report belongs to the user.
create policy "conflict_decisions_owner_select" on public.conflict_decisions
  for select
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "conflict_decisions_owner_insert" on public.conflict_decisions
  for insert
  with check (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.jwt() ->> 'sub'
    )
  );

-- subscriptions: users can read their own row.
create policy "subscriptions_owner_select" on public.subscriptions
  for select
  using (auth.jwt() ->> 'sub' = user_id);

-- discrepancy_patterns: public read; writes via service role only.
create policy "discrepancy_patterns_public_read" on public.discrepancy_patterns
  for select
  using (true);

-- digest_sends, data_deletion_requests, free_report_usage:
-- no user-facing policies (server / cron only). RLS enabled with no policies =
-- denied for non-service-role.
