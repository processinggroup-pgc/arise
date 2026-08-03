-- Milestone 6 / E6-S1: test runs

create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  execution_session_id uuid not null references public.execution_sessions (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  category text not null check (
    category in (
      'unit',
      'component',
      'integration',
      'contract',
      'migration',
      'security',
      'architecture',
      'acceptance'
    )
  ),
  command text not null check (char_length(trim(command)) > 0),
  status text not null check (status in ('pending', 'running', 'passed', 'failed', 'skipped')),
  counts_json jsonb not null default '{}'::jsonb,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  artifact_ref text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists test_runs_organization_id_idx on public.test_runs (organization_id);
create index if not exists test_runs_execution_session_id_idx on public.test_runs (execution_session_id);
create index if not exists test_runs_work_item_id_idx on public.test_runs (work_item_id);

grant select, insert on public.test_runs to arise_app;

alter table public.test_runs enable row level security;
alter table public.test_runs force row level security;

drop policy if exists test_runs_tenant_isolation_select on public.test_runs;
create policy test_runs_tenant_isolation_select on public.test_runs
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists test_runs_tenant_isolation_insert on public.test_runs;
create policy test_runs_tenant_isolation_insert on public.test_runs
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
