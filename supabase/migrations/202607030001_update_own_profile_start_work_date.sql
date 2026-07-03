-- Allow active users to update their own start work date in account settings.
create or replace function public.update_own_profile_details(
  p_employee_code text,
  p_full_name text,
  p_position text,
  p_department text,
  p_work_group text,
  p_gender text,
  p_education text,
  p_birth_date date,
  p_start_work_date date,
  p_employment_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'permission denied';
  end if;

  update public.profiles
  set
    employee_code = nullif(trim(p_employee_code), ''),
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    position = nullif(trim(p_position), ''),
    department = nullif(trim(p_department), ''),
    work_group = nullif(trim(p_work_group), ''),
    gender = p_gender,
    education = nullif(trim(p_education), ''),
    birth_date = p_birth_date,
    start_work_date = p_start_work_date,
    employment_type = p_employment_type,
    updated_at = now()
  where user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'active profile not found';
  end if;
end;
$$;

grant execute on function public.update_own_profile_details(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  date,
  text
) to authenticated;

notify pgrst, 'reload schema';