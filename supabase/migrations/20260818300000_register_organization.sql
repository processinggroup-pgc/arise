-- Organization registration: atomic security-definer transaction bypassing bootstrap RLS fragility

do $$
declare
  r record;
begin
  for r in
    select rolname
    from pg_roles
    where rolname in ('postgres', 'service_role', 'authenticator')
  loop
    execute format('grant arise_app to %I', r.rolname);
  end loop;
end
$$;

grant insert, update on public.organizations to arise_app;
grant insert, update on public.organization_memberships to arise_app;
grant insert, update on public.user_profiles to arise_app;

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

drop policy if exists user_profiles_bootstrap_insert on public.user_profiles;
create policy user_profiles_bootstrap_insert on public.user_profiles
  for insert
  to arise_app
  with check (id = public.arise_current_user_id());

create or replace function public.arise_register_organization(
  p_user_id uuid,
  p_org_id uuid,
  p_name text,
  p_slug text,
  p_plan text,
  p_data_region text,
  p_created_at timestamptz,
  p_membership_id uuid,
  p_owner_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_org_id uuid;
  v_existing_membership record;
  v_has_active_membership boolean;
  v_email text;
begin
  if p_user_id is distinct from public.arise_current_user_id() then
    raise exception 'User id mismatch'
      using errcode = '42501';
  end if;

  v_email := coalesce(nullif(trim(p_owner_email), ''), p_user_id::text || '@users.arise.studio');
  perform public.arise_prepare_user_profile(p_user_id, v_email, 'Workspace owner');

  select o.id
  into v_existing_org_id
  from public.organizations o
  where o.slug = p_slug;

  if v_existing_org_id is not null then
    select om.id, om.organization_id, om.user_id, om.role, om.status, om.created_at
    into v_existing_membership
    from public.organization_memberships om
    where om.organization_id = v_existing_org_id
      and om.user_id = p_user_id;

    if v_existing_membership.id is not null and v_existing_membership.status = 'active' then
      return jsonb_build_object(
        'organization',
        (
          select jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'slug', o.slug,
            'plan', o.plan,
            'dataRegion', o.data_region,
            'createdAt', o.created_at
          )
          from public.organizations o
          where o.id = v_existing_org_id
        ),
        'membership',
        jsonb_build_object(
          'id', v_existing_membership.id,
          'organizationId', v_existing_membership.organization_id,
          'userId', v_existing_membership.user_id,
          'role', v_existing_membership.role,
          'status', v_existing_membership.status,
          'createdAt', v_existing_membership.created_at
        )
      );
    end if;

    select exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = v_existing_org_id
        and om.status = 'active'
    )
    into v_has_active_membership;

    if not v_has_active_membership then
      insert into public.organization_memberships (
        id,
        organization_id,
        user_id,
        role,
        status,
        created_at
      )
      values (
        p_membership_id,
        v_existing_org_id,
        p_user_id,
        'owner',
        'active',
        p_created_at
      )
      on conflict (organization_id, user_id) do update
      set
        role = excluded.role,
        status = excluded.status;

      return jsonb_build_object(
        'organization',
        (
          select jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'slug', o.slug,
            'plan', o.plan,
            'dataRegion', o.data_region,
            'createdAt', o.created_at
          )
          from public.organizations o
          where o.id = v_existing_org_id
        ),
        'membership',
        (
          select jsonb_build_object(
            'id', om.id,
            'organizationId', om.organization_id,
            'userId', om.user_id,
            'role', om.role,
            'status', om.status,
            'createdAt', om.created_at
          )
          from public.organization_memberships om
          where om.organization_id = v_existing_org_id
            and om.user_id = p_user_id
        )
      );
    end if;

    raise exception 'Organization slug is already in use';
  end if;

  insert into public.organizations (id, name, slug, plan, data_region, created_at)
  values (p_org_id, p_name, p_slug, p_plan, p_data_region, p_created_at);

  insert into public.organization_memberships (
    id,
    organization_id,
    user_id,
    role,
    status,
    created_at
  )
  values (
    p_membership_id,
    p_org_id,
    p_user_id,
    'owner',
    'active',
    p_created_at
  );

  return jsonb_build_object(
    'organization',
    jsonb_build_object(
      'id', p_org_id,
      'name', p_name,
      'slug', p_slug,
      'plan', p_plan,
      'dataRegion', p_data_region,
      'createdAt', p_created_at
    ),
    'membership',
    jsonb_build_object(
      'id', p_membership_id,
      'organizationId', p_org_id,
      'userId', p_user_id,
      'role', 'owner',
      'status', 'active',
      'createdAt', p_created_at
    )
  );
end;
$$;

grant execute on function public.arise_register_organization(uuid, uuid, text, text, text, text, timestamptz, uuid, text) to arise_app;
