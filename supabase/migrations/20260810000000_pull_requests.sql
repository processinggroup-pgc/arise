-- Milestone 7 / E7-S1: pull requests

create table if not exists public.pull_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  external_id text not null check (char_length(trim(external_id)) > 0),
  number integer not null check (number > 0),
  url_ref text not null check (char_length(trim(url_ref)) > 0),
  status text not null check (status in ('open', 'closed', 'merged')),
  head_branch text not null check (char_length(trim(head_branch)) > 0),
  base_branch text not null check (char_length(trim(base_branch)) > 0),
  created_at timestamptz not null default now(),
  unique (organization_id, external_id)
);

create index if not exists pull_requests_organization_id_idx on public.pull_requests (organization_id);
create index if not exists pull_requests_work_item_id_idx on public.pull_requests (work_item_id);
create index if not exists pull_requests_repository_id_idx on public.pull_requests (repository_id);

grant select, insert, update on public.pull_requests to arise_app;

alter table public.pull_requests enable row level security;
alter table public.pull_requests force row level security;

drop policy if exists pull_requests_tenant_isolation_select on public.pull_requests;
create policy pull_requests_tenant_isolation_select on public.pull_requests
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists pull_requests_tenant_isolation_insert on public.pull_requests;
create policy pull_requests_tenant_isolation_insert on public.pull_requests
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists pull_requests_tenant_isolation_update on public.pull_requests;
create policy pull_requests_tenant_isolation_update on public.pull_requests
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
