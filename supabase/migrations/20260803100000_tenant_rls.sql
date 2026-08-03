-- Milestone 1 / E1-S3: tenant RLS isolation

create or replace function public.arise_current_organization_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_organization_id', true), '')::uuid
$$;

create or replace function public.arise_current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'arise_app') then
    create role arise_app nologin noinherit;
  end if;
end
$$;

grant usage on schema public to arise_app;
grant select on public.organizations to arise_app;
grant select on public.organization_memberships to arise_app;
grant select on public.user_profiles to arise_app;

do $$
begin
  if exists (select from pg_roles where rolname = 'postgres') then
    grant arise_app to postgres;
  end if;
end
$$;

alter table public.organizations force row level security;
alter table public.organization_memberships force row level security;
alter table public.user_profiles force row level security;

drop policy if exists organizations_tenant_isolation_select on public.organizations;
create policy organizations_tenant_isolation_select on public.organizations
  for select
  to arise_app
  using (id = public.arise_current_organization_id());

drop policy if exists organization_memberships_tenant_isolation_select on public.organization_memberships;
create policy organization_memberships_tenant_isolation_select on public.organization_memberships
  for select
  to arise_app
  using (organization_id = public.arise_current_organization_id());

drop policy if exists user_profiles_tenant_isolation_select on public.user_profiles;
create policy user_profiles_tenant_isolation_select on public.user_profiles
  for select
  to arise_app
  using (
    id = public.arise_current_user_id()
    or exists (
      select 1
      from public.organization_memberships om
      where om.user_id = user_profiles.id
        and om.organization_id = public.arise_current_organization_id()
        and om.status = 'active'
    )
  );
