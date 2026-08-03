-- Milestone 2 / E2-S6: traceability links

create table if not exists public.traceability_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  work_item_lineage_id uuid not null,
  source_type text not null check (
    source_type in (
      'work_item',
      'requirement',
      'acceptance_criterion',
      'automated_test',
      'code_artifact',
      'evidence'
    )
  ),
  source_id text not null check (char_length(trim(source_id)) > 0),
  target_type text not null check (
    target_type in (
      'work_item',
      'requirement',
      'acceptance_criterion',
      'automated_test',
      'code_artifact',
      'evidence'
    )
  ),
  target_id text not null check (char_length(trim(target_id)) > 0),
  relationship text not null check (relationship in ('implements', 'evidences', 'validates')),
  created_at timestamptz not null default now(),
  check (source_type <> target_type or source_id <> target_id)
);

create index if not exists traceability_links_organization_id_idx
  on public.traceability_links (organization_id);

create index if not exists traceability_links_work_item_lineage_id_idx
  on public.traceability_links (organization_id, work_item_lineage_id);

grant select, insert on public.traceability_links to arise_app;

alter table public.traceability_links enable row level security;
alter table public.traceability_links force row level security;

drop policy if exists traceability_links_tenant_isolation_select on public.traceability_links;
create policy traceability_links_tenant_isolation_select on public.traceability_links
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists traceability_links_tenant_isolation_insert on public.traceability_links;
create policy traceability_links_tenant_isolation_insert on public.traceability_links
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());
