-- Stores the original CSV text the user uploaded, keyed off the report id.
-- Lives in its own table so the main reports row stays compact for queries.
-- Retention sweep nulls these columns after 30 days; the row itself stays as a
-- shell to indicate "this report had files at one point".

create table public.report_files (
  report_id uuid primary key references public.reports(id) on delete cascade,
  hubspot_csv_text text,
  quickbooks_csv_text text,
  purged_at timestamptz,
  created_at timestamptz default now()
);

alter table public.report_files enable row level security;

-- Server-role only; users never read raw CSV text directly via PostgREST.
-- (No policies defined = service_role-only access.)
