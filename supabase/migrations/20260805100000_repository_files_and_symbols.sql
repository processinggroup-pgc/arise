-- Milestone 3 / E3-S2: repository file and symbol indexes

create table if not exists public.repository_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  path text not null check (char_length(trim(path)) > 0),
  language text not null check (
    language in ('typescript', 'javascript', 'json', 'markdown', 'sql', 'unknown')
  ),
  content_hash text not null check (char_length(trim(content_hash)) > 0),
  indexed_at timestamptz not null default now(),
  unique (repository_id, path)
);

create index if not exists repository_files_repository_id_idx
  on public.repository_files (repository_id);

create index if not exists repository_files_organization_id_idx
  on public.repository_files (organization_id);

create table if not exists public.repository_symbols (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  file_id uuid not null references public.repository_files (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  kind text not null check (kind in ('function', 'class', 'interface', 'type', 'variable')),
  line integer not null check (line >= 1),
  indexed_at timestamptz not null default now()
);

create index if not exists repository_symbols_repository_id_idx
  on public.repository_symbols (repository_id);

create index if not exists repository_symbols_file_id_idx
  on public.repository_symbols (file_id);

create index if not exists repository_symbols_organization_id_idx
  on public.repository_symbols (organization_id);

grant select, insert, delete on public.repository_files to arise_app;
grant select, insert, delete on public.repository_symbols to arise_app;

alter table public.repository_files enable row level security;
alter table public.repository_files force row level security;
alter table public.repository_symbols enable row level security;
alter table public.repository_symbols force row level security;

drop policy if exists repository_files_tenant_isolation_select on public.repository_files;
create policy repository_files_tenant_isolation_select on public.repository_files
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repository_files_tenant_isolation_insert on public.repository_files;
create policy repository_files_tenant_isolation_insert on public.repository_files
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists repository_files_tenant_isolation_delete on public.repository_files;
create policy repository_files_tenant_isolation_delete on public.repository_files
  for delete
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repository_symbols_tenant_isolation_select on public.repository_symbols;
create policy repository_symbols_tenant_isolation_select on public.repository_symbols
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists repository_symbols_tenant_isolation_insert on public.repository_symbols;
create policy repository_symbols_tenant_isolation_insert on public.repository_symbols
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists repository_symbols_tenant_isolation_delete on public.repository_symbols;
create policy repository_symbols_tenant_isolation_delete on public.repository_symbols
  for delete
  to arise_app
  using (organization_id = public.arise_current_organization_id());
