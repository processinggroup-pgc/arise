-- Milestone 5 / E5-S1: execution sessions

create table if not exists public.execution_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  sandbox_provider text not null check (sandbox_provider in ('fake')),
  sandbox_session_id text not null default '',
  workspace_path text not null default '',
  state text not null check (
    state in (
      'requested',
      'provisioning',
      'ready',
      'running',
      'validating',
      'completed',
      'failed',
      'cancelled',
      'quarantined'
    )
  ),
  limits_json jsonb not null default '{}'::jsonb,
  branch text not null check (char_length(trim(branch)) > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists execution_sessions_organization_id_idx
  on public.execution_sessions (organization_id);
create index if not exists execution_sessions_work_item_id_idx
  on public.execution_sessions (work_item_id);
create index if not exists execution_sessions_repository_id_idx
  on public.execution_sessions (repository_id);

grant select, insert on public.execution_sessions to arise_app;

alter table public.execution_sessions enable row level security;
alter table public.execution_sessions force row level security;

drop policy if exists execution_sessions_tenant_isolation_select on public.execution_sessions;
create policy execution_sessions_tenant_isolation_select on public.execution_sessions
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists execution_sessions_tenant_isolation_insert on public.execution_sessions;
create policy execution_sessions_tenant_isolation_insert on public.execution_sessions
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
