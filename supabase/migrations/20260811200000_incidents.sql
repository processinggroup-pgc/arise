-- Milestone 8 / E8-S3: incidents

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid references public.arise_work_items (id) on delete restrict,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null check (status in ('declared', 'containing', 'contained', 'resolved')),
  summary text not null check (char_length(trim(summary)) > 0),
  timeline_json jsonb not null default '[]'::jsonb,
  containment_json jsonb not null default '[]'::jsonb,
  suspended_execution_session_ids jsonb not null default '[]'::jsonb,
  revoked_credential_refs jsonb not null default '[]'::jsonb,
  declared_at timestamptz not null default now(),
  contained_at timestamptz
);

create index if not exists incidents_organization_id_idx on public.incidents (organization_id);
create index if not exists incidents_work_item_id_idx on public.incidents (work_item_id);

grant select, insert, update on public.incidents to arise_app;

alter table public.incidents enable row level security;
alter table public.incidents force row level security;

drop policy if exists incidents_tenant_isolation_select on public.incidents;
create policy incidents_tenant_isolation_select on public.incidents
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists incidents_tenant_isolation_insert on public.incidents;
create policy incidents_tenant_isolation_insert on public.incidents
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists incidents_tenant_isolation_update on public.incidents;
create policy incidents_tenant_isolation_update on public.incidents
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
