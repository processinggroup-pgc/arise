-- Milestone 5 / E5-S5: execution evidence

create table if not exists public.execution_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  execution_session_id uuid not null references public.execution_sessions (id) on delete restrict,
  agent_run_id uuid not null references public.agent_runs (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  branch_name text not null check (char_length(trim(branch_name)) > 0),
  commit_id text not null check (char_length(trim(commit_id)) > 0),
  changed_paths_json jsonb not null default '[]'::jsonb,
  diffs_json jsonb not null default '[]'::jsonb,
  tool_call_evidence_refs_json jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists execution_evidence_organization_id_idx
  on public.execution_evidence (organization_id);
create index if not exists execution_evidence_execution_session_id_idx
  on public.execution_evidence (execution_session_id);
create index if not exists execution_evidence_agent_run_id_idx
  on public.execution_evidence (agent_run_id);
create index if not exists execution_evidence_work_item_id_idx
  on public.execution_evidence (work_item_id);

grant select, insert on public.execution_evidence to arise_app;

alter table public.execution_evidence enable row level security;
alter table public.execution_evidence force row level security;

drop policy if exists execution_evidence_tenant_isolation_select on public.execution_evidence;
create policy execution_evidence_tenant_isolation_select on public.execution_evidence
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists execution_evidence_tenant_isolation_insert on public.execution_evidence;
create policy execution_evidence_tenant_isolation_insert on public.execution_evidence
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
