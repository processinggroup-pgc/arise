-- Organization bootstrap: owner profile helper and default project provisioning

create or replace function public.arise_prepare_user_profile(
  p_user_id uuid,
  p_email text,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.user_profiles up
    where up.email = p_email
      and up.id <> p_user_id
  ) then
    raise exception 'This email is already associated with another account'
      using errcode = '23505', constraint = 'user_profiles_email_key';
  end if;

  insert into public.user_profiles (id, email, display_name)
  values (p_user_id, p_email, p_display_name)
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.arise_prepare_user_profile(uuid, text, text) to arise_app;

create or replace function public.arise_create_default_project(
  p_organization_id uuid,
  p_project_id uuid,
  p_name text,
  p_description text,
  p_created_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.user_id = public.arise_current_user_id()
      and om.role = 'owner'
      and om.status = 'active'
  ) then
    raise exception 'Organization owner membership is required';
  end if;

  insert into public.projects (id, organization_id, name, description, status, created_at)
  values (p_project_id, p_organization_id, p_name, p_description, 'active', p_created_at);

  return p_project_id;
end;
$$;

grant execute on function public.arise_create_default_project(uuid, uuid, text, text, timestamptz) to arise_app;

grant select, insert on public.projects to arise_app;
