-- Milestone 4 / E4-S4: tool calls

create table if not exists public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  agent_run_id uuid not null references public.agent_runs (id) on delete restrict,
  tool_name text not null check (char_length(trim(tool_name)) > 0),
  arguments_redacted jsonb not null default '{}'::jsonb,
  idempotency_key text not null check (char_length(trim(idempotency_key)) > 0),
  decision text not null check (decision in ('allowed', 'blocked', 'budget_exhausted')),
  status text not null check (status in ('authorized', 'completed', 'failed', 'blocked')),
  evidence_ref text not null default '',
  created_at timestamptz not null default now(),
  unique (agent_run_id, idempotency_key)
);

create index if not exists tool_calls_organization_id_idx on public.tool_calls (organization_id);
create index if not exists tool_calls_agent_run_id_idx on public.tool_calls (agent_run_id);

grant select, insert on public.tool_calls to arise_app;

alter table public.tool_calls enable row level security;
alter table public.tool_calls force row level security;

drop policy if exists tool_calls_tenant_isolation_select on public.tool_calls;
create policy tool_calls_tenant_isolation_select on public.tool_calls
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists tool_calls_tenant_isolation_insert on public.tool_calls;
create policy tool_calls_tenant_isolation_insert on public.tool_calls
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
