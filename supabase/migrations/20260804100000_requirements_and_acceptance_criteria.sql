-- Milestone 2 / E2-S2: requirements and GWT acceptance criteria

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  work_item_lineage_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  kind text not null check (kind in ('functional', 'non_functional', 'constraint', 'security')),
  statement text not null check (char_length(trim(statement)) >= 10),
  priority text not null check (priority in ('must', 'should', 'could')),
  source text not null check (source in ('stakeholder', 'discovery', 'policy', 'assessment')),
  status text not null check (status in ('draft', 'active', 'superseded')),
  created_at timestamptz not null default now()
);

create index if not exists requirements_work_item_lineage_id_idx
  on public.requirements (work_item_lineage_id);

create index if not exists requirements_organization_id_idx
  on public.requirements (organization_id);

create table if not exists public.acceptance_criteria (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  given_text text not null check (char_length(trim(given_text)) > 0),
  when_text text not null check (char_length(trim(when_text)) > 0),
  then_text text not null check (char_length(trim(then_text)) > 0),
  automated_test_ref text not null check (char_length(trim(automated_test_ref)) >= 3),
  created_at timestamptz not null default now(),
  unique (organization_id, automated_test_ref)
);

create index if not exists acceptance_criteria_requirement_id_idx
  on public.acceptance_criteria (requirement_id);

grant select, insert on public.requirements to arise_app;
grant select, insert on public.acceptance_criteria to arise_app;

alter table public.requirements enable row level security;
alter table public.requirements force row level security;
alter table public.acceptance_criteria enable row level security;
alter table public.acceptance_criteria force row level security;

drop policy if exists requirements_tenant_isolation_select on public.requirements;
create policy requirements_tenant_isolation_select on public.requirements
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists requirements_tenant_isolation_insert on public.requirements;
create policy requirements_tenant_isolation_insert on public.requirements
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists acceptance_criteria_tenant_isolation_select on public.acceptance_criteria;
create policy acceptance_criteria_tenant_isolation_select on public.acceptance_criteria
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists acceptance_criteria_tenant_isolation_insert on public.acceptance_criteria;
create policy acceptance_criteria_tenant_isolation_insert on public.acceptance_criteria
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
