-- Milestone 7 / E7-S2: deployments

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  pull_request_id uuid references public.pull_requests (id) on delete set null,
  provider text not null check (provider in ('vercel')),
  external_id text not null check (char_length(trim(external_id)) > 0),
  environment text not null check (environment in ('preview', 'production')),
  preview_ref text not null check (char_length(trim(preview_ref)) > 0),
  status text not null check (status in ('queued', 'building', 'ready', 'error', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_id)
);

create index if not exists deployments_organization_id_idx on public.deployments (organization_id);
create index if not exists deployments_work_item_id_idx on public.deployments (work_item_id);
create index if not exists deployments_pull_request_id_idx on public.deployments (pull_request_id);

grant select, insert, update on public.deployments to arise_app;

alter table public.deployments enable row level security;
alter table public.deployments force row level security;

drop policy if exists deployments_tenant_isolation_select on public.deployments;
create policy deployments_tenant_isolation_select on public.deployments
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists deployments_tenant_isolation_insert on public.deployments;
create policy deployments_tenant_isolation_insert on public.deployments
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists deployments_tenant_isolation_update on public.deployments;
create policy deployments_tenant_isolation_update on public.deployments
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
