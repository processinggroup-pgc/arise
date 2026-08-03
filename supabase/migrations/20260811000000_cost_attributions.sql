-- Milestone 8 / E8-S1: cost attributions

create table if not exists public.cost_attributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  total_cost_usd numeric not null check (total_cost_usd >= 0),
  model_cost_usd numeric not null check (model_cost_usd >= 0),
  build_cost_usd numeric not null check (build_cost_usd >= 0),
  sandbox_cost_usd numeric not null check (sandbox_cost_usd >= 0),
  line_items jsonb not null default '[]'::jsonb,
  attributed_at timestamptz not null default now()
);

create index if not exists cost_attributions_organization_id_idx
  on public.cost_attributions (organization_id);
create index if not exists cost_attributions_work_item_id_idx
  on public.cost_attributions (work_item_id);

grant select, insert on public.cost_attributions to arise_app;

alter table public.cost_attributions enable row level security;
alter table public.cost_attributions force row level security;

drop policy if exists cost_attributions_tenant_isolation_select on public.cost_attributions;
create policy cost_attributions_tenant_isolation_select on public.cost_attributions
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists cost_attributions_tenant_isolation_insert on public.cost_attributions;
create policy cost_attributions_tenant_isolation_insert on public.cost_attributions
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
