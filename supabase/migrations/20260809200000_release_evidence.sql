-- Milestone 6 / E6-S5: release evidence

create table if not exists public.release_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  work_item_version integer not null check (work_item_version > 0),
  status text not null check (status in ('draft', 'complete', 'blocked', 'approved')),
  complete boolean not null default false,
  requirement_coverage jsonb not null,
  tests_json jsonb not null,
  policies_json jsonb not null,
  findings_json jsonb not null,
  approvals_json jsonb not null,
  blockers jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists release_evidence_organization_id_idx
  on public.release_evidence (organization_id);

create index if not exists release_evidence_work_item_id_idx
  on public.release_evidence (work_item_id);

grant select, insert, update on public.release_evidence to arise_app;

alter table public.release_evidence enable row level security;
alter table public.release_evidence force row level security;

drop policy if exists release_evidence_tenant_isolation_select on public.release_evidence;
create policy release_evidence_tenant_isolation_select on public.release_evidence
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists release_evidence_tenant_isolation_insert on public.release_evidence;
create policy release_evidence_tenant_isolation_insert on public.release_evidence
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists release_evidence_tenant_isolation_update on public.release_evidence;
create policy release_evidence_tenant_isolation_update on public.release_evidence
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
