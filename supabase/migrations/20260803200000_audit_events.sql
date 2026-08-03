-- Milestone 1 / E1-S4: append-only audit events

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  actor_type text not null check (actor_type in ('user', 'system', 'service')),
  actor_id text not null check (char_length(trim(actor_id)) > 0),
  event_type text not null check (char_length(trim(event_type)) > 0),
  subject text not null check (char_length(trim(subject)) > 0),
  correlation_id text not null check (char_length(trim(correlation_id)) > 0),
  payload_redacted text not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_events_organization_id_created_at_idx
  on public.audit_events (organization_id, created_at desc);

create or replace function public.arise_prevent_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events are append-only';
end;
$$;

drop trigger if exists audit_events_prevent_update on public.audit_events;
create trigger audit_events_prevent_update
  before update on public.audit_events
  for each row
  execute function public.arise_prevent_audit_event_mutation();

drop trigger if exists audit_events_prevent_delete on public.audit_events;
create trigger audit_events_prevent_delete
  before delete on public.audit_events
  for each row
  execute function public.arise_prevent_audit_event_mutation();

grant select, insert on public.audit_events to arise_app;

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

drop policy if exists audit_events_tenant_isolation_select on public.audit_events;
create policy audit_events_tenant_isolation_select on public.audit_events
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists audit_events_tenant_isolation_insert on public.audit_events;
create policy audit_events_tenant_isolation_insert on public.audit_events
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
