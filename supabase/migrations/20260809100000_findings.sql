-- Milestone 6 / E6-S2: findings

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_id uuid not null references public.arise_work_items (id) on delete restrict,
  category text not null check (
    category in ('security', 'quality', 'architecture', 'test', 'policy')
  ),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null check (char_length(trim(title)) > 0),
  evidence text not null check (char_length(trim(evidence)) > 0),
  remediation text not null check (char_length(trim(remediation)) > 0),
  status text not null check (
    status in ('open', 'in_remediation', 'resolved', 'waived', 'false_positive')
  ),
  raised_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists findings_organization_id_idx on public.findings (organization_id);
create index if not exists findings_work_item_id_idx on public.findings (work_item_id);
create index if not exists findings_status_idx on public.findings (organization_id, status);

grant select, insert, update on public.findings to arise_app;

alter table public.findings enable row level security;
alter table public.findings force row level security;

drop policy if exists findings_tenant_isolation_select on public.findings;
create policy findings_tenant_isolation_select on public.findings
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists findings_tenant_isolation_insert on public.findings;
create policy findings_tenant_isolation_insert on public.findings
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists findings_tenant_isolation_update on public.findings;
create policy findings_tenant_isolation_update on public.findings
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
