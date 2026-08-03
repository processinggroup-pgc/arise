-- Milestone 8 / E8-S2: budget pauses and budget approval type

alter table public.approvals drop constraint if exists approvals_approval_type_check;
alter table public.approvals add constraint approvals_approval_type_check check (
  approval_type in (
    'plan_approval',
    'release_approval',
    'security_approval',
    'production_promotion',
    'budget_approval'
  )
);

create table if not exists public.budget_pauses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  execution_session_id uuid references public.execution_sessions (id) on delete restrict,
  threshold_usd numeric not null check (threshold_usd >= 0),
  attributed_cost_usd numeric not null check (attributed_cost_usd >= 0),
  requested_cost_usd numeric not null check (requested_cost_usd >= 0),
  status text not null check (status in ('active', 'released')),
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create index if not exists budget_pauses_organization_id_idx
  on public.budget_pauses (organization_id);
create index if not exists budget_pauses_work_item_id_idx
  on public.budget_pauses (work_item_id);

grant select, insert, update on public.budget_pauses to arise_app;

alter table public.budget_pauses enable row level security;
alter table public.budget_pauses force row level security;

drop policy if exists budget_pauses_tenant_isolation_select on public.budget_pauses;
create policy budget_pauses_tenant_isolation_select on public.budget_pauses
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists budget_pauses_tenant_isolation_insert on public.budget_pauses;
create policy budget_pauses_tenant_isolation_insert on public.budget_pauses
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists budget_pauses_tenant_isolation_update on public.budget_pauses;
create policy budget_pauses_tenant_isolation_update on public.budget_pauses
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
