-- Extend profiles for user demographics and employment details
-- Run in Supabase SQL Editor

alter table public.profiles
  add column if not exists gender text,
  add column if not exists education text,
  add column if not exists birth_date date,
  add column if not exists generation text,
  add column if not exists employment_type text;

alter table public.profiles
  drop constraint if exists profiles_gender_check,
  add constraint profiles_gender_check
    check (gender is null or gender in ('male', 'female'));

alter table public.profiles
  drop constraint if exists profiles_generation_check,
  add constraint profiles_generation_check
    check (generation is null or generation in ('Gen B', 'Gen X', 'Gen Y', 'Gen Z'));

-- Drop old constraints first to allow data normalization/migration safely.
alter table public.profiles
  drop constraint if exists profiles_education_check;

alter table public.profiles
  drop constraint if exists profiles_employment_type_check;

create index if not exists idx_profiles_birth_date on public.profiles(birth_date);
create index if not exists idx_profiles_generation on public.profiles(generation);
create index if not exists idx_profiles_employment_type on public.profiles(employment_type);

create or replace function public.calculate_generation_from_birth_date(p_birth_date date)
returns text
language plpgsql
immutable
as $$
declare
  birth_year int;
begin
  if p_birth_date is null then
    return null;
  end if;

  birth_year := extract(year from p_birth_date);

  if birth_year between 1965 and 1980 then
    return 'Gen X';
  elsif birth_year between 1981 and 1995 then
    return 'Gen Y';
  elsif birth_year between 1996 and 2011 then
    return 'Gen Z';
  else
    return null;
  end if;
end;
$$;

create or replace function public.sync_generation_from_birth_date()
returns trigger
language plpgsql
as $$
begin
  new.generation := public.calculate_generation_from_birth_date(new.birth_date);
  return new;
end;
$$;

drop trigger if exists set_profiles_generation_from_birth_date on public.profiles;
create trigger set_profiles_generation_from_birth_date
before insert or update of birth_date
on public.profiles
for each row
execute function public.sync_generation_from_birth_date();

update public.profiles
set generation = public.calculate_generation_from_birth_date(birth_date)
where birth_date is not null;

update public.profiles
set employment_type = case employment_type
  when 'civil_servant' then 'ข้าราชการ'
  when 'government_employee' then 'พนักงานราชการ'
  when 'moph_employee' then 'พนักงานกระทรวงสาธารณสุข'
  when 'temporary_employee' then 'ลูกจ้างชั่วคราว'
  else employment_type
end
where employment_type in ('civil_servant', 'government_employee', 'moph_employee', 'temporary_employee');

update public.profiles
set education = case trim(coalesce(education, ''))
  when '' then null
  when 'ต่ำกว่าปริญญาตรี' then 'ต่ำกว่าปริญญาตรี'
  when 'ปริญญาตรี' then 'ปริญญาตรี'
  when 'ปริญญาโท' then 'ปริญญาโท'
  when 'ปริญญาเอก' then 'ปริญญาเอก'
  else null
end;

update public.profiles
set employment_type = null
where employment_type is not null
  and employment_type not in ('ข้าราชการ', 'พนักงานราชการ', 'พนักงานกระทรวงสาธารณสุข', 'ลูกจ้างชั่วคราว', 'จ้างเหมาบริการฯ (พขร.)');

alter table public.profiles
  drop constraint if exists profiles_education_check,
  add constraint profiles_education_check
    check (education is null or education in ('ต่ำกว่าปริญญาตรี', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก'));

alter table public.profiles
  drop constraint if exists profiles_employment_type_check,
  add constraint profiles_employment_type_check
    check (
      employment_type is null
      or employment_type in ('ข้าราชการ', 'พนักงานราชการ', 'พนักงานกระทรวงสาธารณสุข', 'ลูกจ้างชั่วคราว', 'จ้างเหมาบริการฯ (พขร.)')
    );

create or replace function public.update_user_profile_details(
  p_user_id uuid,
  p_employee_code text,
  p_full_name text,
  p_position text,
  p_department text,
  p_work_group text,
  p_gender text,
  p_education text,
  p_birth_date date,
  p_employment_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role
  into caller_role
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if caller_role is null or caller_role not in ('super_admin', 'admin', 'hr') then
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
    employment_type = p_employment_type,
    updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'target user not found';
  end if;
end;
$$;

grant execute on function public.update_user_profile_details(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  text
) to authenticated;
