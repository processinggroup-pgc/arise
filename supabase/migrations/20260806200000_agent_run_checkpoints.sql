-- Milestone 4 / E4-S5: agent run checkpoints

create table if not exists public.agent_run_checkpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  agent_run_id uuid not null references public.agent_runs (id) on delete restrict,
  phase text not null check (char_length(trim(phase)) > 0),
  budget_usage jsonb not null default '{}'::jsonb,
  completed_steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_run_checkpoints_organization_id_idx
  on public.agent_run_checkpoints (organization_id);
create index if not exists agent_run_checkpoints_agent_run_id_idx
  on public.agent_run_checkpoints (agent_run_id);

grant select, insert on public.agent_run_checkpoints to arise_app;

alter table public.agent_run_checkpoints enable row level security;
alter table public.agent_run_checkpoints force row level security;

drop policy if exists agent_run_checkpoints_tenant_isolation_select on public.agent_run_checkpoints;
create policy agent_run_checkpoints_tenant_isolation_select on public.agent_run_checkpoints
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists agent_run_checkpoints_tenant_isolation_insert on public.agent_run_checkpoints;
create policy agent_run_checkpoints_tenant_isolation_insert on public.agent_run_checkpoints
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
