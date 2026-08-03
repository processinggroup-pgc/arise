-- Milestone 2 / E2-S5: approvals and policy decisions

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  subject_type text not null check (char_length(trim(subject_type)) > 0),
  subject_id text not null check (char_length(trim(subject_id)) > 0),
  approval_type text not null check (
    approval_type in (
      'plan_approval',
      'release_approval',
      'security_approval',
      'production_promotion'
    )
  ),
  requested_from text not null check (char_length(trim(requested_from)) > 0),
  status text not null check (status in ('pending', 'approved', 'rejected', 'expired', 'revoked')),
  expires_at timestamptz,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists approvals_organization_id_idx on public.approvals (organization_id);
create index if not exists approvals_subject_idx on public.approvals (organization_id, subject_type, subject_id);

grant select, insert, update on public.approvals to arise_app;

alter table public.approvals enable row level security;
alter table public.approvals force row level security;

drop policy if exists approvals_tenant_isolation_select on public.approvals;
create policy approvals_tenant_isolation_select on public.approvals
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists approvals_tenant_isolation_insert on public.approvals;
create policy approvals_tenant_isolation_insert on public.approvals
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists approvals_tenant_isolation_update on public.approvals;
create policy approvals_tenant_isolation_update on public.approvals
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
