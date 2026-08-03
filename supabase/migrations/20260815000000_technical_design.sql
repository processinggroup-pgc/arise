-- E11 Step 4: technical design and gap analysis artifacts

create table if not exists public.technical_design_bundles (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null unique references public.initiatives (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bundle jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists technical_design_bundles_organization_id_idx
  on public.technical_design_bundles (organization_id);

alter table public.technical_design_bundles enable row level security;

grant select, insert, update on public.technical_design_bundles to arise_app;

alter table public.technical_design_bundles force row level security;

drop policy if exists technical_design_bundles_tenant_isolation_select on public.technical_design_bundles;
create policy technical_design_bundles_tenant_isolation_select on public.technical_design_bundles
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists technical_design_bundles_tenant_isolation_insert on public.technical_design_bundles;
create policy technical_design_bundles_tenant_isolation_insert on public.technical_design_bundles
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists technical_design_bundles_tenant_isolation_update on public.technical_design_bundles;
create policy technical_design_bundles_tenant_isolation_update on public.technical_design_bundles
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
