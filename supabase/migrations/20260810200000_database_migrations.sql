-- Milestone 7 / E7-S3: database migrations and Supabase preview branches

create table if not exists public.supabase_preview_branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  external_id text not null check (char_length(trim(external_id)) > 0),
  branch_name text not null check (char_length(trim(branch_name)) > 0),
  project_ref text not null check (char_length(trim(project_ref)) > 0),
  status text not null check (status in ('provisioning', 'ready', 'error', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_id)
);

create table if not exists public.database_migrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  preview_branch_id uuid references public.supabase_preview_branches (id) on delete set null,
  file_path text not null check (char_length(trim(file_path)) > 0),
  checksum text not null check (char_length(trim(checksum)) > 0),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'destructive')),
  forward_status text not null check (
    forward_status in ('pending', 'passed', 'failed', 'not_required')
  ),
  rollback_status text not null check (
    rollback_status in ('pending', 'passed', 'failed', 'not_required')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supabase_preview_branches_organization_id_idx
  on public.supabase_preview_branches (organization_id);
create index if not exists supabase_preview_branches_work_item_id_idx
  on public.supabase_preview_branches (work_item_id);
create index if not exists database_migrations_organization_id_idx
  on public.database_migrations (organization_id);
create index if not exists database_migrations_work_item_id_idx
  on public.database_migrations (work_item_id);

grant select, insert, update on public.supabase_preview_branches to arise_app;
grant select, insert, update on public.database_migrations to arise_app;

alter table public.supabase_preview_branches enable row level security;
alter table public.supabase_preview_branches force row level security;
alter table public.database_migrations enable row level security;
alter table public.database_migrations force row level security;

drop policy if exists supabase_preview_branches_tenant_isolation_select on public.supabase_preview_branches;
create policy supabase_preview_branches_tenant_isolation_select on public.supabase_preview_branches
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists supabase_preview_branches_tenant_isolation_insert on public.supabase_preview_branches;
create policy supabase_preview_branches_tenant_isolation_insert on public.supabase_preview_branches
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists supabase_preview_branches_tenant_isolation_update on public.supabase_preview_branches;
create policy supabase_preview_branches_tenant_isolation_update on public.supabase_preview_branches
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists database_migrations_tenant_isolation_select on public.database_migrations;
create policy database_migrations_tenant_isolation_select on public.database_migrations
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists database_migrations_tenant_isolation_insert on public.database_migrations;
create policy database_migrations_tenant_isolation_insert on public.database_migrations
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists database_migrations_tenant_isolation_update on public.database_migrations;
create policy database_migrations_tenant_isolation_update on public.database_migrations
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
