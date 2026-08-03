-- Milestone 3 / E3-S1: connected repositories

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  provider text not null check (provider in ('github')),
  external_id text not null check (char_length(trim(external_id)) > 0),
  full_name text not null check (char_length(trim(full_name)) > 0),
  default_branch text not null check (char_length(trim(default_branch)) > 0),
  installation_id text not null check (char_length(trim(installation_id)) > 0),
  status text not null check (status in ('pending', 'connected', 'disconnected', 'error')),
  created_at timestamptz not null default now(),
  unique (organization_id, provider, external_id)
);

create index if not exists repositories_organization_id_idx on public.repositories (organization_id);
create index if not exists repositories_project_id_idx on public.repositories (project_id);

grant select, insert on public.repositories to arise_app;

alter table public.repositories enable row level security;
alter table public.repositories force row level security;

drop policy if exists repositories_tenant_isolation_select on public.repositories;
create policy repositories_tenant_isolation_select on public.repositories
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repositories_tenant_isolation_insert on public.repositories;
create policy repositories_tenant_isolation_insert on public.repositories
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
