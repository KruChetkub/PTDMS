-- Create a single RPC entrypoint for adding training records.
-- This avoids client-side multi-step writes and table RLS policy stalls.

create or replace function public.create_training_record_with_details(
  p_user_id uuid,
  p_course text,
  p_category text,
  p_subcategory text,
  p_organizer text,
  p_date date,
  p_year int,
  p_certificate_name text,
  p_certificate_link text,
  p_development_area text,
  p_skill_group text,
  p_target_direction text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.user_role;
  v_training_id uuid := gen_random_uuid();
  v_month int := extract(month from p_date)::int;
  v_certificate_name text := nullif(btrim(coalesce(p_certificate_name, '')), '');
  v_certificate_link text := nullif(btrim(coalesce(p_certificate_link, '')), '');
  v_development_area text := nullif(btrim(coalesce(p_development_area, '')), '');
  v_skill_group text := nullif(btrim(coalesce(p_skill_group, '')), '');
  v_target_direction text := nullif(btrim(coalesce(p_target_direction, '')), '');
begin
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select role
  into v_actor_role
  from public.profiles
  where user_id = v_actor_id
    and status = 'active'
  limit 1;

  if v_actor_role is null then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '28000';
  end if;

  if p_user_id <> v_actor_id and v_actor_role not in ('super_admin', 'admin', 'hr') then
    raise exception 'UNAUTHORIZED_TARGET_USER' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'TARGET_PROFILE_NOT_FOUND' using errcode = '23503';
  end if;

  if v_month < 1 or v_month > 12 then
    raise exception 'INVALID_TRAINING_DATE' using errcode = '22007';
  end if;

  insert into public.training_records (
    id,
    user_id,
    course,
    category,
    subcategory,
    organizer,
    date,
    month,
    year,
    created_by
  )
  values (
    v_training_id,
    p_user_id,
    btrim(p_course),
    btrim(p_category),
    nullif(btrim(coalesce(p_subcategory, '')), ''),
    btrim(p_organizer),
    p_date,
    v_month,
    p_year,
    v_actor_id
  );

  if v_certificate_name is not null or v_certificate_link is not null then
    insert into public.certificates (
      training_id,
      certificate_name,
      certificate_link
    )
    values (
      v_training_id,
      v_certificate_name,
      v_certificate_link
    );
  end if;

  if v_development_area is not null or v_skill_group is not null or v_target_direction is not null then
    insert into public.development_analysis (
      training_id,
      user_id,
      development_area,
      skill_group,
      target_direction
    )
    values (
      v_training_id,
      p_user_id,
      v_development_area,
      v_skill_group,
      v_target_direction
    );
  end if;

  return v_training_id;
exception
  when unique_violation then
    raise exception 'DUPLICATE_TRAINING_RECORD' using errcode = '23505';
end;
$$;

grant execute on function public.create_training_record_with_details(
  uuid,
  text,
  text,
  text,
  text,
  date,
  int,
  text,
  text,
  text,
  text,
  text
) to authenticated;
