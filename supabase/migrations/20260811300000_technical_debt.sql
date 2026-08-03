-- Milestone 8 / E8-S4: technical debt

create table if not exists public.technical_debt (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  source_work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  description text not null check (char_length(trim(description)) > 0),
  risk text not null check (risk in ('low', 'medium', 'high')),
  owner_id text not null check (char_length(trim(owner_id)) > 0),
  support_owner_id text check (support_owner_id is null or char_length(trim(support_owner_id)) > 0),
  due_date timestamptz not null,
  status text not null check (status in ('open', 'in_progress', 'resolved', 'waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists technical_debt_organization_id_idx
  on public.technical_debt (organization_id);
create index if not exists technical_debt_project_id_idx on public.technical_debt (project_id);
create index if not exists technical_debt_source_work_item_id_idx
  on public.technical_debt (source_work_item_id);

grant select, insert, update on public.technical_debt to arise_app;

alter table public.technical_debt enable row level security;
alter table public.technical_debt force row level security;

drop policy if exists technical_debt_tenant_isolation_select on public.technical_debt;
create policy technical_debt_tenant_isolation_select on public.technical_debt
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists technical_debt_tenant_isolation_insert on public.technical_debt;
create policy technical_debt_tenant_isolation_insert on public.technical_debt
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists technical_debt_tenant_isolation_update on public.technical_debt;
create policy technical_debt_tenant_isolation_update on public.technical_debt
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
