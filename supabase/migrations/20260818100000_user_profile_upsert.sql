-- Organization bootstrap: make owner profile preparation idempotent for retries

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
  if p_user_id is distinct from public.arise_current_user_id() then
    raise exception 'User id mismatch'
      using errcode = '42501';
  end if;

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
  values (
    p_user_id,
    p_email,
    coalesce(nullif(trim(p_display_name), ''), 'Workspace owner')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name;
end;
$$;

grant execute on function public.arise_prepare_user_profile(uuid, text, text) to arise_app;
