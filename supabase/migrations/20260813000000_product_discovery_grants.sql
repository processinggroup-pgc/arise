-- Product discovery tables: tenant-scoped access for arise_app bootstrap queries

grant select, insert, update on public.initiatives to arise_app;
grant select, insert, update on public.problem_briefs to arise_app;
grant select, insert, update on public.market_research_dossiers to arise_app;
grant select, insert, update on public.problem_alignments to arise_app;

alter table public.initiatives force row level security;
alter table public.problem_briefs force row level security;
alter table public.market_research_dossiers force row level security;
alter table public.problem_alignments force row level security;

drop policy if exists initiatives_tenant_isolation_select on public.initiatives;
create policy initiatives_tenant_isolation_select on public.initiatives
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists initiatives_tenant_isolation_insert on public.initiatives;
create policy initiatives_tenant_isolation_insert on public.initiatives
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists initiatives_tenant_isolation_update on public.initiatives;
create policy initiatives_tenant_isolation_update on public.initiatives
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists problem_briefs_tenant_isolation_select on public.problem_briefs;
create policy problem_briefs_tenant_isolation_select on public.problem_briefs
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists problem_briefs_tenant_isolation_insert on public.problem_briefs;
create policy problem_briefs_tenant_isolation_insert on public.problem_briefs
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists problem_briefs_tenant_isolation_update on public.problem_briefs;
create policy problem_briefs_tenant_isolation_update on public.problem_briefs
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists market_research_dossiers_tenant_isolation_select on public.market_research_dossiers;
create policy market_research_dossiers_tenant_isolation_select on public.market_research_dossiers
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists market_research_dossiers_tenant_isolation_insert on public.market_research_dossiers;
create policy market_research_dossiers_tenant_isolation_insert on public.market_research_dossiers
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists market_research_dossiers_tenant_isolation_update on public.market_research_dossiers;
create policy market_research_dossiers_tenant_isolation_update on public.market_research_dossiers
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists problem_alignments_tenant_isolation_select on public.problem_alignments;
create policy problem_alignments_tenant_isolation_select on public.problem_alignments
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists problem_alignments_tenant_isolation_insert on public.problem_alignments;
create policy problem_alignments_tenant_isolation_insert on public.problem_alignments
  for insert
  to arise_app
  with check (organization_id = public.arise_current_organization_id());

drop policy if exists problem_alignments_tenant_isolation_update on public.problem_alignments;
create policy problem_alignments_tenant_isolation_update on public.problem_alignments
  for update
  to arise_app
  using (organization_id = public.arise_current_organization_id())
  with check (organization_id = public.arise_current_organization_id());
