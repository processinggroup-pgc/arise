-- Milestone 4 / E4-S1: registered models and agent runs

create table if not exists public.registered_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  provider text not null check (provider in ('openai', 'anthropic', 'cursor')),
  name text not null check (char_length(trim(name)) > 0),
  version text not null check (char_length(trim(version)) > 0),
  capabilities jsonb not null default '[]'::jsonb,
  status text not null check (status in ('active', 'deprecated')),
  max_tokens_per_run integer check (max_tokens_per_run is null or max_tokens_per_run >= 1),
  max_cost_usd_per_run numeric check (max_cost_usd_per_run is null or max_cost_usd_per_run > 0),
  created_at timestamptz not null default now(),
  unique (organization_id, provider, name, version)
);

create index if not exists registered_models_organization_id_idx
  on public.registered_models (organization_id);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  registered_model_id uuid not null references public.registered_models (id) on delete restrict,
  agent_type text not null check (
    agent_type in (
      'discovery',
      'architecture',
      'coding',
      'database',
      'qa',
      'security',
      'reviewer'
    )
  ),
  model_provider text not null check (model_provider in ('openai', 'anthropic', 'cursor')),
  model_name text not null check (char_length(trim(model_name)) > 0),
  model_version text not null check (char_length(trim(model_version)) > 0),
  status text not null check (
    status in ('pending', 'running', 'completed', 'failed', 'cancelled')
  ),
  token_usage integer not null default 0 check (token_usage >= 0),
  cost_usd numeric not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_organization_id_idx on public.agent_runs (organization_id);
create index if not exists agent_runs_work_item_id_idx on public.agent_runs (work_item_id);
create index if not exists agent_runs_registered_model_id_idx on public.agent_runs (registered_model_id);

create table if not exists public.context_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  agent_run_id uuid not null references public.agent_runs (id) on delete restrict,
  source_type text not null check (char_length(trim(source_type)) > 0),
  source_ref text not null check (char_length(trim(source_ref)) > 0),
  trust_level text not null check (trust_level in ('trusted', 'verified', 'untrusted')),
  content_hash text not null check (char_length(trim(content_hash)) > 0),
  rank integer not null check (rank >= 1),
  created_at timestamptz not null default now()
);

create index if not exists context_items_organization_id_idx on public.context_items (organization_id);
create index if not exists context_items_agent_run_id_idx on public.context_items (agent_run_id);

grant select, insert on public.registered_models to arise_app;
grant select, insert on public.agent_runs to arise_app;
grant select, insert on public.context_items to arise_app;

alter table public.registered_models enable row level security;
alter table public.registered_models force row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_runs force row level security;
alter table public.context_items enable row level security;
alter table public.context_items force row level security;

drop policy if exists registered_models_tenant_isolation_select on public.registered_models;
create policy registered_models_tenant_isolation_select on public.registered_models
  for select
  to arise_app
  using (
    organization_id is null
    or organization_id = public.arise_current_organization_id()
  );

drop policy if exists registered_models_tenant_isolation_insert on public.registered_models;
create policy registered_models_tenant_isolation_insert on public.registered_models
  for insert
  to arise_app
  with check (
    organization_id is null
    or organization_id = public.arise_current_organization_id()
  );

drop policy if exists agent_runs_tenant_isolation_select on public.agent_runs;
create policy agent_runs_tenant_isolation_select on public.agent_runs
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists agent_runs_tenant_isolation_insert on public.agent_runs;
create policy agent_runs_tenant_isolation_insert on public.agent_runs
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists context_items_tenant_isolation_select on public.context_items;
create policy context_items_tenant_isolation_select on public.context_items
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists context_items_tenant_isolation_insert on public.context_items;
create policy context_items_tenant_isolation_insert on public.context_items
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
