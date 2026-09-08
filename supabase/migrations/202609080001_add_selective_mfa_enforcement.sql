-- Security Hardening Plan 3: selective MFA enforcement managed by super_admin.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter table public.profiles
  add column if not exists mfa_required boolean not null default false,
  add column if not exists mfa_required_at timestamptz,
  add column if not exists mfa_required_by uuid
    references public.profiles(user_id) on delete set null;

create index if not exists idx_profiles_mfa_required
on public.profiles (role, mfa_required)
where status = 'active';

create or replace function public.protect_mfa_requirement_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.mfa_required is not distinct from old.mfa_required
    and new.mfa_required_at is not distinct from old.mfa_required_at
    and new.mfa_required_by is not distinct from old.mfa_required_by
  then
    return new;
  end if;

  if current_setting('app.mfa_requirement_management', true) = 'allowed' then
    return new;
  end if;

  raise exception using
    errcode = '42501',
    message = 'MFA requirement fields can only be changed through the management RPC';
end;
$$;

revoke all on function public.protect_mfa_requirement_fields()
from public, anon, authenticated;

drop trigger if exists protect_mfa_requirement_fields on public.profiles;
create trigger protect_mfa_requirement_fields
before update of mfa_required, mfa_required_at, mfa_required_by
on public.profiles
for each row execute function public.protect_mfa_requirement_fields();

create or replace function private.list_mfa_enforcement_users_impl()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.user_role,
  status public.profile_status,
  mfa_required boolean,
  mfa_required_at timestamptz,
  mfa_required_by uuid,
  mfa_enabled boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.user_role;
begin
  select profile.role
  into v_caller_role
  from public.profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'active';

  if v_caller_role is distinct from 'super_admin'::public.user_role then
    raise exception using errcode = '42501', message = 'super_admin required';
  end if;

  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception using errcode = '42501', message = 'aal2 required';
  end if;

  return query
  select
    profile.user_id,
    profile.full_name,
    auth_user.email::text,
    profile.role,
    profile.status,
    profile.mfa_required,
    profile.mfa_required_at,
    profile.mfa_required_by,
    exists (
      select 1
      from auth.mfa_factors factor
      where factor.user_id = profile.user_id
        and factor.status = 'verified'
    ) as mfa_enabled
  from public.profiles profile
  left join auth.users auth_user on auth_user.id = profile.user_id
  where profile.role in (
    'admin'::public.user_role,
    'executive'::public.user_role,
    'hr'::public.user_role,
    'personnel'::public.user_role
  )
  order by profile.role, profile.full_name;
end;
$$;

create or replace function private.set_mfa_requirement_impl(
  target_user_ids uuid[],
  required boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role public.user_role;
  v_updated_count integer := 0;
begin
  if target_user_ids is null
    or cardinality(target_user_ids) = 0
    or cardinality(target_user_ids) > 500
  then
    raise exception using errcode = '22023', message = '1 to 500 target users required';
  end if;

  select profile.role
  into v_caller_role
  from public.profiles profile
  where profile.user_id = v_caller_id
    and profile.status = 'active';

  if v_caller_role is distinct from 'super_admin'::public.user_role then
    raise exception using errcode = '42501', message = 'super_admin required';
  end if;

  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception using errcode = '42501', message = 'aal2 required';
  end if;

  perform set_config('app.mfa_requirement_management', 'allowed', true);

  update public.profiles profile
  set
    mfa_required = required,
    mfa_required_at = case when required then now() else null end,
    mfa_required_by = case when required then v_caller_id else null end,
    updated_at = now()
  where profile.user_id = any(target_user_ids)
    and profile.user_id <> v_caller_id
    and profile.role in (
      'admin'::public.user_role,
      'executive'::public.user_role,
      'hr'::public.user_role,
      'personnel'::public.user_role
    )
    and profile.mfa_required is distinct from required;

  get diagnostics v_updated_count = row_count;

  insert into public.audit_logs (
    actor_id,
    actor_user_id,
    actor_role,
    module,
    action,
    resource_type,
    target_type,
    status,
    metadata,
    export_status
  )
  values (
    v_caller_id,
    v_caller_id,
    v_caller_role::text,
    'security',
    case when required then 'mfa_requirement_enabled' else 'mfa_requirement_cancelled' end,
    'profiles',
    'mfa_requirement',
    'success',
    jsonb_build_object(
      'target_count', v_updated_count,
      'target_user_ids', target_user_ids
    ),
    'pending'
  );

  return v_updated_count;
end;
$$;

revoke all on function private.list_mfa_enforcement_users_impl()
from public, anon, authenticated;
revoke all on function private.set_mfa_requirement_impl(uuid[], boolean)
from public, anon, authenticated;
grant execute on function private.list_mfa_enforcement_users_impl()
to authenticated;
grant execute on function private.set_mfa_requirement_impl(uuid[], boolean)
to authenticated;

create or replace function public.list_mfa_enforcement_users()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.user_role,
  status public.profile_status,
  mfa_required boolean,
  mfa_required_at timestamptz,
  mfa_required_by uuid,
  mfa_enabled boolean
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.list_mfa_enforcement_users_impl();
$$;

create or replace function public.set_mfa_requirement(
  target_user_ids uuid[],
  required boolean
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.set_mfa_requirement_impl(target_user_ids, required);
$$;

revoke all on function public.list_mfa_enforcement_users()
from public, anon, authenticated;
revoke all on function public.set_mfa_requirement(uuid[], boolean)
from public, anon, authenticated;
grant execute on function public.list_mfa_enforcement_users()
to authenticated;
grant execute on function public.set_mfa_requirement(uuid[], boolean)
to authenticated;

notify pgrst, 'reload schema';
