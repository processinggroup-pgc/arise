-- Allow any active member to bootstrap a default project during workspace activation

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
      and om.status = 'active'
  ) then
    raise exception 'Active organization membership is required';
  end if;

  insert into public.projects (id, organization_id, name, description, status, created_at)
  values (p_project_id, p_organization_id, p_name, p_description, 'active', p_created_at)
  on conflict (id) do nothing;

  return p_project_id;
end;
$$;

grant execute on function public.arise_create_default_project(uuid, uuid, text, text, timestamptz) to arise_app;
