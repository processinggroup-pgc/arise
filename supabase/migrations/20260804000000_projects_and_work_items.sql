-- Milestone 2 / E2-S1: projects and versioned work items

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  status text not null check (status in ('active', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_organization_id_idx on public.projects (organization_id);

create table if not exists public.arise_work_items (
  id uuid primary key default gen_random_uuid(),
  lineage_id uuid not null,
  version integer not null check (version >= 1),
  project_id uuid not null references public.projects (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text not null check (char_length(trim(title)) >= 3),
  type text not null check (type in ('feature', 'bug', 'improvement', 'spike')),
  state text not null check (state in ('draft')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  owner_id text not null check (char_length(trim(owner_id)) > 0),
  problem_statement text not null check (char_length(trim(problem_statement)) >= 10),
  target_user text not null check (char_length(trim(target_user)) >= 2),
  desired_behavior text not null check (char_length(trim(desired_behavior)) >= 10),
  data_classification text not null check (
    data_classification in (
      'public',
      'internal',
      'confidential',
      'personal',
      'financial',
      'health',
      'authentication',
      'trade_secret'
    )
  ),
  constraints jsonb not null default '[]'::jsonb,
  non_goals jsonb not null default '[]'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (lineage_id, version)
);

create index if not exists arise_work_items_project_id_idx on public.arise_work_items (project_id);
create index if not exists arise_work_items_organization_id_idx on public.arise_work_items (organization_id);
create index if not exists arise_work_items_lineage_id_version_idx
  on public.arise_work_items (lineage_id, version desc);

grant select, insert on public.projects to arise_app;
grant select, insert on public.arise_work_items to arise_app;

alter table public.projects enable row level security;
alter table public.projects force row level security;
alter table public.arise_work_items enable row level security;
alter table public.arise_work_items force row level security;

drop policy if exists projects_tenant_isolation_select on public.projects;
create policy projects_tenant_isolation_select on public.projects
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists projects_tenant_isolation_insert on public.projects;
create policy projects_tenant_isolation_insert on public.projects
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists arise_work_items_tenant_isolation_select on public.arise_work_items;
create policy arise_work_items_tenant_isolation_select on public.arise_work_items
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists arise_work_items_tenant_isolation_insert on public.arise_work_items;
create policy arise_work_items_tenant_isolation_insert on public.arise_work_items
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
