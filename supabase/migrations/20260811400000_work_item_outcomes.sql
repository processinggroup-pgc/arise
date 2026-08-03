-- Milestone 8 / E8-S5: work item outcomes

create table if not exists public.work_item_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  work_item_version integer not null check (work_item_version >= 1),
  evaluation_window_closed_at timestamptz not null,
  release_successful boolean not null,
  total_cost_usd numeric not null check (total_cost_usd >= 0),
  model_cost_usd numeric not null check (model_cost_usd >= 0),
  build_cost_usd numeric not null check (build_cost_usd >= 0),
  sandbox_cost_usd numeric not null check (sandbox_cost_usd >= 0),
  incident_count integer not null check (incident_count >= 0),
  open_technical_debt_count integer not null check (open_technical_debt_count >= 0),
  lessons jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  complete boolean not null,
  blockers jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default now()
);

create index if not exists work_item_outcomes_organization_id_idx
  on public.work_item_outcomes (organization_id);
create index if not exists work_item_outcomes_work_item_id_idx
  on public.work_item_outcomes (work_item_id);

grant select, insert on public.work_item_outcomes to arise_app;

alter table public.work_item_outcomes enable row level security;
alter table public.work_item_outcomes force row level security;

drop policy if exists work_item_outcomes_tenant_isolation_select on public.work_item_outcomes;
create policy work_item_outcomes_tenant_isolation_select on public.work_item_outcomes
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists work_item_outcomes_tenant_isolation_insert on public.work_item_outcomes;
create policy work_item_outcomes_tenant_isolation_insert on public.work_item_outcomes
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
