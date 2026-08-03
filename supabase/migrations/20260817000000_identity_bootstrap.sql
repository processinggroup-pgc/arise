-- Identity bootstrap: user-scoped reads and registration writes for arise_app

grant insert, update on public.organizations to arise_app;
grant insert, update on public.organization_memberships to arise_app;
grant insert, update on public.user_profiles to arise_app;

create or replace function public.arise_find_organization_by_slug(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  plan text,
  data_region text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select o.id, o.name, o.slug, o.plan, o.data_region, o.created_at
  from public.organizations o
  where o.slug = p_slug;
$$;

grant execute on function public.arise_find_organization_by_slug(text) to arise_app;

drop policy if exists organization_memberships_user_bootstrap_select on public.organization_memberships;
create policy organization_memberships_user_bootstrap_select on public.organization_memberships
  for select
  to arise_app
  using (user_id = public.arise_current_user_id());

drop policy if exists organizations_user_bootstrap_select on public.organizations;
create policy organizations_user_bootstrap_select on public.organizations
  for select
  to arise_app
  using (
    exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = organizations.id
        and om.user_id = public.arise_current_user_id()
        and om.status = 'active'
    )
  );

drop policy if exists organizations_bootstrap_insert on public.organizations;
create policy organizations_bootstrap_insert on public.organizations
  for insert
  to arise_app
  with check (true);

drop policy if exists organization_memberships_bootstrap_insert on public.organization_memberships;
create policy organization_memberships_bootstrap_insert on public.organization_memberships
  for insert
  to arise_app
  with check (user_id = public.arise_current_user_id());

drop policy if exists organization_memberships_bootstrap_update on public.organization_memberships;
create policy organization_memberships_bootstrap_update on public.organization_memberships
  for update
  to arise_app
  using (user_id = public.arise_current_user_id())
  with check (user_id = public.arise_current_user_id());

drop policy if exists user_profiles_bootstrap_insert on public.user_profiles;
create policy user_profiles_bootstrap_insert on public.user_profiles
  for insert
  to arise_app
  with check (id = public.arise_current_user_id());

drop policy if exists organizations_bootstrap_update on public.organizations;
create policy organizations_bootstrap_update on public.organizations
  for update
  to arise_app
  using (
    exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = organizations.id
        and om.user_id = public.arise_current_user_id()
        and om.role = 'owner'
        and om.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = organizations.id
        and om.user_id = public.arise_current_user_id()
        and om.role = 'owner'
        and om.status = 'active'
    )
  );
