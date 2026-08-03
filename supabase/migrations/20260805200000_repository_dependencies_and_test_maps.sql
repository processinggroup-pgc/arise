-- Milestone 3 / E3-S3: repository dependency and test maps

create table if not exists public.repository_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  source_file_id uuid not null references public.repository_files (id) on delete cascade,
  target text not null check (char_length(trim(target)) > 0),
  kind text not null check (kind in ('relative_import', 'package_import')),
  line integer not null check (line >= 1),
  indexed_at timestamptz not null default now()
);

create index if not exists repository_dependencies_repository_id_idx
  on public.repository_dependencies (repository_id);

create index if not exists repository_dependencies_source_file_id_idx
  on public.repository_dependencies (source_file_id);

create index if not exists repository_dependencies_organization_id_idx
  on public.repository_dependencies (organization_id);

create table if not exists public.repository_test_maps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  test_file_id uuid not null references public.repository_files (id) on delete cascade,
  tested_file_path text not null check (char_length(trim(tested_file_path)) > 0),
  indexed_at timestamptz not null default now(),
  unique (repository_id, test_file_id, tested_file_path)
);

create index if not exists repository_test_maps_repository_id_idx
  on public.repository_test_maps (repository_id);

create index if not exists repository_test_maps_test_file_id_idx
  on public.repository_test_maps (test_file_id);

create index if not exists repository_test_maps_organization_id_idx
  on public.repository_test_maps (organization_id);

grant select, insert, delete on public.repository_dependencies to arise_app;
grant select, insert, delete on public.repository_test_maps to arise_app;

alter table public.repository_dependencies enable row level security;
alter table public.repository_dependencies force row level security;
alter table public.repository_test_maps enable row level security;
alter table public.repository_test_maps force row level security;

drop policy if exists repository_dependencies_tenant_isolation_select on public.repository_dependencies;
create policy repository_dependencies_tenant_isolation_select on public.repository_dependencies
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repository_dependencies_tenant_isolation_insert on public.repository_dependencies;
create policy repository_dependencies_tenant_isolation_insert on public.repository_dependencies
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists repository_dependencies_tenant_isolation_delete on public.repository_dependencies;
create policy repository_dependencies_tenant_isolation_delete on public.repository_dependencies
  for delete
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repository_test_maps_tenant_isolation_select on public.repository_test_maps;
create policy repository_test_maps_tenant_isolation_select on public.repository_test_maps
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repository_test_maps_tenant_isolation_insert on public.repository_test_maps;
create policy repository_test_maps_tenant_isolation_insert on public.repository_test_maps
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists repository_test_maps_tenant_isolation_delete on public.repository_test_maps;
create policy repository_test_maps_tenant_isolation_delete on public.repository_test_maps
  for delete
  to arise_app
  using (organization_id = public.arise_current_organization_id());
