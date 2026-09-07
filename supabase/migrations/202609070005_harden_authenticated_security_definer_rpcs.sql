-- Harden the SECURITY DEFINER functions reported by CSV v2.
--
-- Privileged implementations are kept outside the Data API's exposed public
-- schema. Public entrypoints retain their existing names and argument contracts,
-- but execute as SECURITY INVOKER wrappers. Authorization checks inside each
-- implementation remain unchanged.

begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

-- Move the existing implementations. ALTER FUNCTION preserves dependencies by
-- object identity, including RLS policies that reference helper functions.

alter function public.clear_smartdsp_survey_round_data(uuid) set schema private;
alter function private.clear_smartdsp_survey_round_data(uuid)
  rename to clear_smartdsp_survey_round_data_impl;

alter function public.clone_smartdsp_survey(uuid) set schema private;
alter function private.clone_smartdsp_survey(uuid)
  rename to clone_smartdsp_survey_impl;

alter function public.complete_forced_password_change() set schema private;
alter function private.complete_forced_password_change()
  rename to complete_forced_password_change_impl;

alter function public.complete_smartdsp_survey_respondent_context(uuid, jsonb)
  set schema private;
alter function private.complete_smartdsp_survey_respondent_context(uuid, jsonb)
  rename to complete_smartdsp_survey_respondent_context_impl;

alter function public.create_training_record_with_details(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) set schema private;
alter function private.create_training_record_with_details(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) rename to create_training_record_with_details_impl;

alter function public.current_user_role() set schema private;
alter function private.current_user_role() rename to current_user_role_impl;

alter function public.delete_smartdsp_survey_response(uuid) set schema private;
alter function private.delete_smartdsp_survey_response(uuid)
  rename to delete_smartdsp_survey_response_impl;

alter function public.delete_user(uuid) set schema private;
alter function private.delete_user(uuid) rename to delete_user_impl;

alter function public.generate_spd_service_ticket_no(text, date) set schema private;
alter function private.generate_spd_service_ticket_no(text, date)
  rename to generate_spd_service_ticket_no_impl;

alter function public.get_spd_assistant_page_context(text) set schema private;
alter function private.get_spd_assistant_page_context(text)
  rename to get_spd_assistant_page_context_impl;

alter function public.get_spd_service_ai_chatgpt_booking_calendar(date, date)
  set schema private;
alter function private.get_spd_service_ai_chatgpt_booking_calendar(date, date)
  rename to get_spd_service_ai_chatgpt_booking_calendar_impl;

alter function public.has_permission(text) set schema private;
alter function private.has_permission(text) rename to has_permission_impl;

alter function public.increment_audit_log_retry_count(uuid[]) set schema private;
alter function private.increment_audit_log_retry_count(uuid[])
  rename to increment_audit_log_retry_count_impl;

alter function public.is_privileged_role(public.user_role[]) set schema private;
alter function private.is_privileged_role(public.user_role[])
  rename to is_privileged_role_impl;

alter function public.list_force_password_change_users() set schema private;
alter function private.list_force_password_change_users()
  rename to list_force_password_change_users_impl;

alter function public.list_my_permissions() set schema private;
alter function private.list_my_permissions() rename to list_my_permissions_impl;

alter function public.list_user_management_profiles() set schema private;
alter function private.list_user_management_profiles()
  rename to list_user_management_profiles_impl;

alter function public.list_user_permission_assignments(text) set schema private;
alter function private.list_user_permission_assignments(text)
  rename to list_user_permission_assignments_impl;

alter function public.save_smartdsp_survey_questions(uuid, jsonb)
  set schema private;
alter function private.save_smartdsp_survey_questions(uuid, jsonb)
  rename to save_smartdsp_survey_questions_impl;

alter function public.search_spd_assistant_knowledge(text, text, text, integer)
  set schema private;
alter function private.search_spd_assistant_knowledge(text, text, text, integer)
  rename to search_spd_assistant_knowledge_impl;

alter function public.set_force_password_change(uuid[], boolean) set schema private;
alter function private.set_force_password_change(uuid[], boolean)
  rename to set_force_password_change_impl;

alter function public.set_user_permission(uuid, text, boolean) set schema private;
alter function private.set_user_permission(uuid, text, boolean)
  rename to set_user_permission_impl;

alter function public.spd_assistant_match_role(public.user_role[])
  set schema private;
alter function private.spd_assistant_match_role(public.user_role[])
  rename to spd_assistant_match_role_impl;

alter function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb, uuid)
  set schema private;
alter function private.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb, uuid)
  rename to submit_smartdsp_survey_with_context_impl;

alter function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, text
) set schema private;
alter function private.update_own_profile_details(
  text, text, text, text, text, text, text, date, text
) rename to update_own_profile_details_impl;

alter function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, date, text
) set schema private;
alter function private.update_own_profile_details(
  text, text, text, text, text, text, text, date, date, text
) rename to update_own_profile_details_impl;

alter function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, text
) set schema private;
alter function private.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, text
) rename to update_user_profile_details_impl;

alter function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, date, text
) set schema private;
alter function private.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, date, text
) rename to update_user_profile_details_impl;

-- Revoke direct access to privileged implementations. The authenticated role
-- receives only the access required for the invoker wrappers to call them.

do $block$
declare
  implementation regprocedure;
begin
  for implementation in
    select proc.oid::regprocedure
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'private'
      and proc.proname = any (array[
        'clear_smartdsp_survey_round_data_impl',
        'clone_smartdsp_survey_impl',
        'complete_forced_password_change_impl',
        'complete_smartdsp_survey_respondent_context_impl',
        'create_training_record_with_details_impl',
        'current_user_role_impl',
        'delete_smartdsp_survey_response_impl',
        'delete_user_impl',
        'generate_spd_service_ticket_no_impl',
        'get_spd_assistant_page_context_impl',
        'get_spd_service_ai_chatgpt_booking_calendar_impl',
        'has_permission_impl',
        'increment_audit_log_retry_count_impl',
        'is_privileged_role_impl',
        'list_force_password_change_users_impl',
        'list_my_permissions_impl',
        'list_user_management_profiles_impl',
        'list_user_permission_assignments_impl',
        'save_smartdsp_survey_questions_impl',
        'search_spd_assistant_knowledge_impl',
        'set_force_password_change_impl',
        'set_user_permission_impl',
        'spd_assistant_match_role_impl',
        'submit_smartdsp_survey_with_context_impl',
        'update_own_profile_details_impl',
        'update_user_profile_details_impl'
      ])
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated, service_role',
      implementation
    );
  end loop;
end;
$block$;

grant execute on function private.clear_smartdsp_survey_round_data_impl(uuid) to authenticated;
grant execute on function private.clone_smartdsp_survey_impl(uuid) to authenticated;
grant execute on function private.complete_forced_password_change_impl() to authenticated;
grant execute on function private.complete_smartdsp_survey_respondent_context_impl(uuid, jsonb) to authenticated;
grant execute on function private.create_training_record_with_details_impl(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) to authenticated;
grant execute on function private.current_user_role_impl() to authenticated;
grant execute on function private.delete_smartdsp_survey_response_impl(uuid) to authenticated;
grant execute on function private.delete_user_impl(uuid) to authenticated;
grant execute on function private.generate_spd_service_ticket_no_impl(text, date) to authenticated;
grant execute on function private.get_spd_assistant_page_context_impl(text) to authenticated;
grant execute on function private.get_spd_service_ai_chatgpt_booking_calendar_impl(date, date) to authenticated;
grant execute on function private.has_permission_impl(text) to authenticated;
grant execute on function private.increment_audit_log_retry_count_impl(uuid[]) to authenticated, service_role;
grant execute on function private.is_privileged_role_impl(public.user_role[]) to authenticated;
grant execute on function private.list_force_password_change_users_impl() to authenticated;
grant execute on function private.list_my_permissions_impl() to authenticated;
grant execute on function private.list_user_management_profiles_impl() to authenticated;
grant execute on function private.list_user_permission_assignments_impl(text) to authenticated;
grant execute on function private.save_smartdsp_survey_questions_impl(uuid, jsonb) to authenticated;
grant execute on function private.search_spd_assistant_knowledge_impl(text, text, text, integer) to authenticated;
grant execute on function private.set_force_password_change_impl(uuid[], boolean) to authenticated;
grant execute on function private.set_user_permission_impl(uuid, text, boolean) to authenticated;
grant execute on function private.spd_assistant_match_role_impl(public.user_role[]) to authenticated;
grant execute on function private.submit_smartdsp_survey_with_context_impl(uuid, jsonb, jsonb, uuid) to authenticated;
grant execute on function private.update_own_profile_details_impl(
  text, text, text, text, text, text, text, date, text
) to authenticated;
grant execute on function private.update_own_profile_details_impl(
  text, text, text, text, text, text, text, date, date, text
) to authenticated;
grant execute on function private.update_user_profile_details_impl(
  uuid, text, text, text, text, text, text, text, date, text
) to authenticated;
grant execute on function private.update_user_profile_details_impl(
  uuid, text, text, text, text, text, text, text, date, date, text
) to authenticated;

-- Public SECURITY INVOKER entrypoints. Keep parameter names because PostgREST
-- uses them as the JSON keys of each RPC contract.

create function public.clear_smartdsp_survey_round_data(target_survey_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.clear_smartdsp_survey_round_data_impl(target_survey_id);
$$;

create function public.clone_smartdsp_survey(source_survey_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.clone_smartdsp_survey_impl(source_survey_id);
$$;

create function public.complete_forced_password_change()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_forced_password_change_impl();
$$;

create function public.complete_smartdsp_survey_respondent_context(
  target_response_id uuid,
  respondent_context jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_smartdsp_survey_respondent_context_impl(
    target_response_id,
    respondent_context
  );
$$;

create function public.create_training_record_with_details(
  p_user_id uuid,
  p_course text,
  p_category text,
  p_subcategory text,
  p_organizer text,
  p_date date,
  p_year integer,
  p_certificate_name text,
  p_certificate_link text,
  p_development_area text,
  p_skill_group text,
  p_target_direction text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_training_record_with_details_impl(
    p_user_id,
    p_course,
    p_category,
    p_subcategory,
    p_organizer,
    p_date,
    p_year,
    p_certificate_name,
    p_certificate_link,
    p_development_area,
    p_skill_group,
    p_target_direction
  );
$$;

create function public.current_user_role()
returns public.user_role
language sql
stable
security invoker
set search_path = ''
as $$
  select private.current_user_role_impl();
$$;

create function public.delete_smartdsp_survey_response(target_response_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_smartdsp_survey_response_impl(target_response_id);
$$;

-- delete_user was created outside the checked-in migration history. Preserve
-- its live return type instead of guessing it.
do $block$
declare
  result_clause text;
  returns_set boolean;
  call_sql text;
begin
  select pg_get_function_result(proc.oid), proc.proretset
  into result_clause, returns_set
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'private'
    and proc.proname = 'delete_user_impl'
    and pg_get_function_identity_arguments(proc.oid) = 'target_user_id uuid';

  if result_clause is null then
    raise exception 'private.delete_user_impl(uuid) was not found';
  end if;

  call_sql := case
    when returns_set or result_clause like 'TABLE(%'
      then 'select * from private.delete_user_impl(target_user_id);'
    else 'select private.delete_user_impl(target_user_id);'
  end;

  execute format(
    'create function public.delete_user(target_user_id uuid) returns %s language sql security invoker set search_path = '''' as $wrapper$ %s $wrapper$',
    result_clause,
    call_sql
  );
end;
$block$;

create function public.generate_spd_service_ticket_no(
  category_label text,
  created_on date default current_date
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.generate_spd_service_ticket_no_impl(category_label, created_on);
$$;

create function public.get_spd_assistant_page_context(p_route text)
returns table (
  route text,
  page_name_th text,
  module_name_th text,
  description_th text,
  help_text_th text,
  available_actions_th text[],
  common_questions_th text[],
  related_roles public.user_role[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_spd_assistant_page_context_impl(p_route);
$$;

create function public.get_spd_service_ai_chatgpt_booking_calendar(
  p_start_date date,
  p_end_date date
)
returns table (
  id uuid,
  requester_name text,
  requester_department text,
  subject text,
  requested_service_date date,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.get_spd_service_ai_chatgpt_booking_calendar_impl(
    p_start_date,
    p_end_date
  );
$$;

create function public.has_permission(p_permission_key text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_permission_impl(p_permission_key);
$$;

create function public.increment_audit_log_retry_count(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.increment_audit_log_retry_count_impl(p_ids);
$$;

create function public.is_privileged_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_privileged_role_impl(allowed_roles);
$$;

create function public.list_force_password_change_users()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.user_role,
  status public.profile_status,
  force_password_change boolean,
  force_password_change_requested_at timestamptz,
  force_password_change_requested_by uuid,
  password_changed_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.list_force_password_change_users_impl();
$$;

create function public.list_my_permissions()
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select private.list_my_permissions_impl();
$$;

create function public.list_user_management_profiles()
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
language sql
security invoker
set search_path = ''
as $$
  select * from private.list_user_management_profiles_impl();
$$;

create function public.list_user_permission_assignments(p_permission_key text)
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select private.list_user_permission_assignments_impl(p_permission_key);
$$;

create function public.save_smartdsp_survey_questions(
  target_survey_id uuid,
  submitted_questions jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.save_smartdsp_survey_questions_impl(
    target_survey_id,
    submitted_questions
  );
$$;

create function public.search_spd_assistant_knowledge(
  p_query text,
  p_route text default null,
  p_module text default null,
  p_limit integer default 5
)
returns table (
  id uuid,
  title text,
  module text,
  route text,
  question text,
  answer text,
  keywords text[],
  related_roles public.user_role[],
  score numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.search_spd_assistant_knowledge_impl(
    p_query,
    p_route,
    p_module,
    p_limit
  );
$$;

create function public.set_force_password_change(
  target_user_ids uuid[] default null,
  force_change boolean default true
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.set_force_password_change_impl(target_user_ids, force_change);
$$;

create function public.set_user_permission(
  p_target_user_id uuid,
  p_permission_key text,
  p_enabled boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_user_permission_impl(
    p_target_user_id,
    p_permission_key,
    p_enabled
  );
$$;

create function public.spd_assistant_match_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.spd_assistant_match_role_impl(allowed_roles);
$$;

create function public.submit_smartdsp_survey_with_context(
  target_survey_id uuid,
  submitted_answers jsonb,
  respondent_context jsonb,
  consent_record_id uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_smartdsp_survey_with_context_impl(
    target_survey_id,
    submitted_answers,
    respondent_context,
    consent_record_id
  );
$$;

create function public.update_own_profile_details(
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
language sql
security invoker
set search_path = ''
as $$
  select private.update_own_profile_details_impl(
    p_employee_code,
    p_full_name,
    p_position,
    p_department,
    p_work_group,
    p_gender,
    p_education,
    p_birth_date,
    p_employment_type
  );
$$;

create function public.update_own_profile_details(
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
language sql
security invoker
set search_path = ''
as $$
  select private.update_own_profile_details_impl(
    p_employee_code,
    p_full_name,
    p_position,
    p_department,
    p_work_group,
    p_gender,
    p_education,
    p_birth_date,
    p_start_work_date,
    p_employment_type
  );
$$;

create function public.update_user_profile_details(
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
language sql
security invoker
set search_path = ''
as $$
  select private.update_user_profile_details_impl(
    p_user_id,
    p_employee_code,
    p_full_name,
    p_position,
    p_department,
    p_work_group,
    p_gender,
    p_education,
    p_birth_date,
    p_employment_type
  );
$$;

create function public.update_user_profile_details(
  p_user_id uuid,
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
language sql
security invoker
set search_path = ''
as $$
  select private.update_user_profile_details_impl(
    p_user_id,
    p_employee_code,
    p_full_name,
    p_position,
    p_department,
    p_work_group,
    p_gender,
    p_education,
    p_birth_date,
    p_start_work_date,
    p_employment_type
  );
$$;

-- Restrict public entrypoints to the roles that used them before this migration.

revoke all on function public.clear_smartdsp_survey_round_data(uuid) from public, anon, authenticated;
revoke all on function public.clone_smartdsp_survey(uuid) from public, anon, authenticated;
revoke all on function public.complete_forced_password_change() from public, anon, authenticated;
revoke all on function public.complete_smartdsp_survey_respondent_context(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.create_training_record_with_details(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.delete_smartdsp_survey_response(uuid) from public, anon, authenticated;
revoke all on function public.delete_user(uuid) from public, anon, authenticated;
revoke all on function public.generate_spd_service_ticket_no(text, date) from public, anon, authenticated;
revoke all on function public.get_spd_assistant_page_context(text) from public, anon, authenticated;
revoke all on function public.get_spd_service_ai_chatgpt_booking_calendar(date, date) from public, anon, authenticated;
revoke all on function public.has_permission(text) from public, anon, authenticated;
revoke all on function public.increment_audit_log_retry_count(uuid[]) from public, anon, authenticated;
revoke all on function public.is_privileged_role(public.user_role[]) from public, anon, authenticated;
revoke all on function public.list_force_password_change_users() from public, anon, authenticated;
revoke all on function public.list_my_permissions() from public, anon, authenticated;
revoke all on function public.list_user_management_profiles() from public, anon, authenticated;
revoke all on function public.list_user_permission_assignments(text) from public, anon, authenticated;
revoke all on function public.save_smartdsp_survey_questions(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.search_spd_assistant_knowledge(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.set_force_password_change(uuid[], boolean) from public, anon, authenticated;
revoke all on function public.set_user_permission(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.spd_assistant_match_role(public.user_role[]) from public, anon, authenticated;
revoke all on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, text
) from public, anon, authenticated;
revoke all on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, date, text
) from public, anon, authenticated;
revoke all on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, text
) from public, anon, authenticated;
revoke all on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, date, text
) from public, anon, authenticated;

grant execute on function public.clear_smartdsp_survey_round_data(uuid) to authenticated;
grant execute on function public.clone_smartdsp_survey(uuid) to authenticated;
grant execute on function public.complete_forced_password_change() to authenticated;
grant execute on function public.complete_smartdsp_survey_respondent_context(uuid, jsonb) to authenticated;
grant execute on function public.create_training_record_with_details(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.delete_smartdsp_survey_response(uuid) to authenticated;
grant execute on function public.delete_user(uuid) to authenticated;
grant execute on function public.generate_spd_service_ticket_no(text, date) to authenticated;
grant execute on function public.get_spd_assistant_page_context(text) to authenticated;
grant execute on function public.get_spd_service_ai_chatgpt_booking_calendar(date, date) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.increment_audit_log_retry_count(uuid[]) to authenticated, service_role;
grant execute on function public.is_privileged_role(public.user_role[]) to authenticated;
grant execute on function public.list_force_password_change_users() to authenticated;
grant execute on function public.list_my_permissions() to authenticated;
grant execute on function public.list_user_management_profiles() to authenticated;
grant execute on function public.list_user_permission_assignments(text) to authenticated;
grant execute on function public.save_smartdsp_survey_questions(uuid, jsonb) to authenticated;
grant execute on function public.search_spd_assistant_knowledge(text, text, text, integer) to authenticated;
grant execute on function public.set_force_password_change(uuid[], boolean) to authenticated;
grant execute on function public.set_user_permission(uuid, text, boolean) to authenticated;
grant execute on function public.spd_assistant_match_role(public.user_role[]) to authenticated;
grant execute on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, text
) to authenticated;
grant execute on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, date, text
) to authenticated;
grant execute on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, text
) to authenticated;
grant execute on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, date, text
) to authenticated;

notify pgrst, 'reload schema';

commit;
