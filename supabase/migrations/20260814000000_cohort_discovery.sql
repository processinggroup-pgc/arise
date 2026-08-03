-- E11 cohort weeks 1-3: rich ICP fields and discovery bundle storage

alter table public.problem_briefs
  add column if not exists icp_role text not null default '',
  add column if not exists icp_income_level text not null default '',
  add column if not exists icp_daily_workflow text not null default '',
  add column if not exists icp_tools_used text[] not null default '{}',
  add column if not exists icp_online_hangouts text[] not null default '{}',
  add column if not exists icp_budget_range text not null default '';

create table if not exists public.cohort_discovery_bundles (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null unique references public.initiatives (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bundle jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cohort_discovery_bundles_organization_id_idx
  on public.cohort_discovery_bundles (organization_id);

alter table public.cohort_discovery_bundles enable row level security;

grant select, insert, update on public.cohort_discovery_bundles to arise_app;

alter table public.cohort_discovery_bundles force row level security;

drop policy if exists cohort_discovery_bundles_tenant_isolation_select on public.cohort_discovery_bundles;
create policy cohort_discovery_bundles_tenant_isolation_select on public.cohort_discovery_bundles
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists cohort_discovery_bundles_tenant_isolation_insert on public.cohort_discovery_bundles;
create policy cohort_discovery_bundles_tenant_isolation_insert on public.cohort_discovery_bundles
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists cohort_discovery_bundles_tenant_isolation_update on public.cohort_discovery_bundles;
create policy cohort_discovery_bundles_tenant_isolation_update on public.cohort_discovery_bundles
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
