-- E11 Step 5-6: platform connections and MVP build bundle

create table if not exists public.build_bundles (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null unique references public.initiatives (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bundle jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists build_bundles_organization_id_idx
  on public.build_bundles (organization_id);

alter table public.build_bundles enable row level security;

grant select, insert, update on public.build_bundles to arise_app;

alter table public.build_bundles force row level security;

drop policy if exists build_bundles_tenant_isolation_select on public.build_bundles;
create policy build_bundles_tenant_isolation_select on public.build_bundles
  for select to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists build_bundles_tenant_isolation_insert on public.build_bundles;
create policy build_bundles_tenant_isolation_insert on public.build_bundles
  for insert to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists build_bundles_tenant_isolation_update on public.build_bundles;
create policy build_bundles_tenant_isolation_update on public.build_bundles
  for update to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
