-- Migration to allow super_admin and admin to view MFA status and reset user MFA factors
begin;

-- Drop existing functions to allow return type modification
drop function if exists public.list_user_management_profiles();
drop function if exists private.list_user_management_profiles_impl();

create or replace function private.list_user_management_profiles_impl()
returns table (
  user_id uuid,
  employee_code text,
  full_name text,
  "position" text,
  department text,
  work_group text,
  gender text,
  education text,
  birth_date date,
  start_work_date date,
  generation text,
  employment_type text,
  role public.user_role,
  status public.profile_status,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  mfa_enabled boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role public.user_role;
begin
  select p.role
  into caller_role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  if caller_role is null or caller_role not in ('super_admin', 'admin', 'hr') then
    raise exception 'permission denied';
  end if;

  return query
  select
    p.user_id,
    p.employee_code,
    p.full_name,
    p.position,
    p.department,
    p.work_group,
    p.gender,
    p.education,
    p.birth_date,
    p.start_work_date,
    p.generation,
    p.employment_type,
    p.role,
    p.status,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    u.email::text,
    exists (
      select 1
      from auth.mfa_factors mf
      where mf.user_id = p.user_id
        and mf.status = 'verified'
    ) as mfa_enabled
  from public.profiles p
  left join auth.users u on u.id = p.user_id
  where caller_role = 'super_admin'
    or p.role <> 'super_admin'
  order by p.full_name;
end;
$$;

revoke all on function private.list_user_management_profiles_impl() from public, anon, authenticated;
grant execute on function private.list_user_management_profiles_impl() to authenticated;

create or replace function public.list_user_management_profiles()
returns table (
  user_id uuid,
  employee_code text,
  full_name text,
  "position" text,
  department text,
  work_group text,
  gender text,
  education text,
  birth_date date,
  start_work_date date,
  generation text,
  employment_type text,
  role public.user_role,
  status public.profile_status,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  mfa_enabled boolean
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.list_user_management_profiles_impl();
$$;

revoke all on function public.list_user_management_profiles() from public, anon, authenticated;
grant execute on function public.list_user_management_profiles() to authenticated;

-- Function to reset user MFA factors
create or replace function private.admin_reset_user_mfa_impl(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role public.user_role;
  target_role public.user_role;
  caller_uid uuid := auth.uid();
begin
  select p.role
  into caller_role
  from public.profiles p
  where p.user_id = caller_uid
    and p.status = 'active'
  limit 1;

  if caller_role is null or caller_role not in ('super_admin', 'admin') then
    raise exception 'permission denied: only super_admin or admin can reset MFA';
  end if;

  select p.role
  into target_role
  from public.profiles p
  where p.user_id = target_user_id;

  -- Admin cannot reset super_admin's MFA
  if caller_role = 'admin' and target_role = 'super_admin' then
    raise exception 'permission denied: admin cannot reset super_admin MFA';
  end if;

  -- Delete all MFA factors for the target user
  delete from auth.mfa_factors
  where user_id = target_user_id;

  -- Record audit log if audit_logs table exists
  begin
    insert into public.audit_logs (
      user_id,
      module,
      action,
      target_type,
      target_id,
      meta,
      created_at
    ) values (
      caller_uid,
      'admin',
      'admin_reset_user_mfa',
      'user',
      target_user_id::text,
      jsonb_build_object('reset_by_role', caller_role),
      now()
    );
  exception when others then
    null;
  end;
end;
$$;

revoke all on function private.admin_reset_user_mfa_impl(uuid) from public, anon, authenticated;
grant execute on function private.admin_reset_user_mfa_impl(uuid) to authenticated;

create or replace function public.admin_reset_user_mfa(target_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_reset_user_mfa_impl(target_user_id);
$$;

revoke all on function public.admin_reset_user_mfa(uuid) from public, anon, authenticated;
grant execute on function public.admin_reset_user_mfa(uuid) to authenticated;

commit;
