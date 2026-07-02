-- User management export/list helper with auth email.
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
  email text
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
    u.email::text
  from public.profiles p
  left join auth.users u on u.id = p.user_id
  where caller_role = 'super_admin'
    or p.role <> 'super_admin'
  order by p.full_name;
end;
$$;

grant execute on function public.list_user_management_profiles() to authenticated;
