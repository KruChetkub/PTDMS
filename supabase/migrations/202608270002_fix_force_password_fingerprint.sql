-- Remove the pgcrypto digest dependency from forced-password credential tracking.

begin;

create or replace function public.set_force_password_change(
  target_user_ids uuid[] default null,
  force_change boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_count integer := 0;
  affected_user_ids uuid[] := array[]::uuid[];
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles caller
    where caller.user_id = auth.uid()
      and caller.role = 'super_admin'
      and caller.status = 'active'
      and caller.force_password_change = false
  ) then
    raise exception 'Only active super administrators can enforce password changes.' using errcode = '42501';
  end if;

  with affected as (
    update public.profiles target
    set
      force_password_change = force_change,
      force_password_change_requested_at = case when force_change then now() else null end,
      force_password_change_requested_by = case when force_change then auth.uid() else null end,
      updated_at = now()
    where target.user_id <> auth.uid()
      and target.status = 'active'
      and (target_user_ids is null or target.user_id = any(target_user_ids))
      and target.force_password_change is distinct from force_change
    returning target.user_id
  )
  select coalesce(array_agg(affected.user_id), array[]::uuid[])
  into affected_user_ids
  from affected;

  affected_count := cardinality(affected_user_ids);

  if force_change and affected_count > 0 then
    insert into private.force_password_change_credentials (
      user_id,
      credential_fingerprint,
      requested_at
    )
    select
      auth_user.id,
      coalesce(auth_user.encrypted_password, ''),
      now()
    from auth.users auth_user
    where auth_user.id = any(affected_user_ids)
    on conflict (user_id) do update
    set
      credential_fingerprint = excluded.credential_fingerprint,
      requested_at = excluded.requested_at;
  elsif not force_change and affected_count > 0 then
    delete from private.force_password_change_credentials credential
    where credential.user_id = any(affected_user_ids);
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    auth.uid(),
    case when force_change then 'force_password_change_enabled' else 'force_password_change_cancelled' end,
    'security',
    case when target_user_ids is null then 'all_active_users' else 'selected_users' end,
    jsonb_build_object(
      'affected_count', affected_count,
      'selection_count', case when target_user_ids is null then null else cardinality(target_user_ids) end,
      'actor_excluded', true
    )
  );

  return affected_count;
end;
$$;

create or replace function public.complete_forced_password_change()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  was_forced boolean;
  credential_changed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profile.force_password_change
  into was_forced
  from public.profiles profile
  where profile.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;

  if was_forced then
    select
      credential.credential_fingerprint
        is distinct from coalesce(auth_user.encrypted_password, '')
    into credential_changed
    from private.force_password_change_credentials credential
    join auth.users auth_user on auth_user.id = credential.user_id
    where credential.user_id = auth.uid();

    if not coalesce(credential_changed, false) then
      raise exception 'Password has not been changed.' using errcode = 'P0001';
    end if;
  end if;

  perform set_config('app.force_password_change_completion', 'allowed', true);

  update public.profiles
  set
    force_password_change = false,
    force_password_change_requested_at = null,
    force_password_change_requested_by = null,
    password_changed_at = now(),
    updated_at = now()
  where user_id = auth.uid();

  delete from private.force_password_change_credentials credential
  where credential.user_id = auth.uid();

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    auth.uid(),
    'password_changed',
    'auth',
    auth.uid()::text,
    jsonb_build_object('forced_change_completed', coalesce(was_forced, false))
  );
end;
$$;

revoke all on function public.set_force_password_change(uuid[], boolean) from public, anon;
revoke all on function public.complete_forced_password_change() from public, anon;

grant execute on function public.set_force_password_change(uuid[], boolean) to authenticated;
grant execute on function public.complete_forced_password_change() to authenticated;

notify pgrst, 'reload schema';

commit;
