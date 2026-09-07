-- Security Hardening Plan 1.8.
-- Keep privileged implementations outside the Data API exposed schema.

begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

-- Runtime helpers retain public SECURITY INVOKER wrappers because existing
-- trigger functions and RLS policies refer to their public signatures.
alter function public.calculate_generation_from_birth_date(date)
set schema private;
alter function private.calculate_generation_from_birth_date(date)
rename to calculate_generation_from_birth_date_impl;

alter function public.smartdsp_survey_is_open(public.smartdsp_surveys)
set schema private;
alter function private.smartdsp_survey_is_open(public.smartdsp_surveys)
rename to smartdsp_survey_is_open_impl;

-- These legacy survey functions are still used by the current four-argument
-- survey implementation. Preserve their public names as non-callable wrappers.
alter function public.submit_smartdsp_survey(uuid, jsonb)
set schema private;
alter function private.submit_smartdsp_survey(uuid, jsonb)
rename to submit_smartdsp_survey_impl;

alter function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb)
set schema private;
alter function private.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb)
rename to submit_smartdsp_survey_with_context_legacy_impl;

-- Trigger dependencies reference functions by OID. Moving them preserves the
-- trigger attachment while removing the functions from the exposed schema.
do $block$
declare
  routine_record record;
begin
  for routine_record in
    select distinct
      procedure.oid,
      format(
        '%I.%I(%s)',
        namespace.nspname,
        procedure.proname,
        pg_get_function_identity_arguments(procedure.oid)
      ) as signature
    from pg_trigger trigger_definition
    join pg_proc procedure on procedure.oid = trigger_definition.tgfoid
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where not trigger_definition.tgisinternal
      and namespace.nspname = 'public'
  loop
    if exists (
      select 1
      from pg_proc private_procedure
      join pg_namespace private_namespace
        on private_namespace.oid = private_procedure.pronamespace
      where private_namespace.nspname = 'private'
        and private_procedure.proname = (
          select source_procedure.proname
          from pg_proc source_procedure
          where source_procedure.oid = routine_record.oid
        )
        and private_procedure.proargtypes = (
          select source_procedure.proargtypes
          from pg_proc source_procedure
          where source_procedure.oid = routine_record.oid
        )
    ) then
      raise exception 'Private trigger function already exists for %',
        routine_record.signature;
    end if;

    execute format(
      'alter function %s set schema private',
      routine_record.signature
    );
  end loop;
end;
$block$;

revoke all on function private.calculate_generation_from_birth_date_impl(date)
from public, anon, authenticated, service_role;
grant execute on function private.calculate_generation_from_birth_date_impl(date)
to authenticated, service_role;

revoke all on function private.smartdsp_survey_is_open_impl(public.smartdsp_surveys)
from public, anon, authenticated, service_role;
grant execute on function private.smartdsp_survey_is_open_impl(public.smartdsp_surveys)
to authenticated, service_role;

revoke all on function private.submit_smartdsp_survey_impl(uuid, jsonb)
from public, anon, authenticated, service_role;
revoke all on function private.submit_smartdsp_survey_with_context_legacy_impl(uuid, jsonb, jsonb)
from public, anon, authenticated, service_role;

create function public.calculate_generation_from_birth_date(p_birth_date date)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select private.calculate_generation_from_birth_date_impl(p_birth_date);
$$;

create function public.smartdsp_survey_is_open(
  target_survey public.smartdsp_surveys
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.smartdsp_survey_is_open_impl(target_survey);
$$;

create function public.submit_smartdsp_survey(
  target_survey_id uuid,
  submitted_answers jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_smartdsp_survey_impl(
    target_survey_id,
    submitted_answers
  );
$$;

create function public.submit_smartdsp_survey_with_context(
  target_survey_id uuid,
  submitted_answers jsonb,
  respondent_context jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_smartdsp_survey_with_context_legacy_impl(
    target_survey_id,
    submitted_answers,
    respondent_context
  );
$$;

revoke all on function public.calculate_generation_from_birth_date(date)
from public, anon, authenticated;
grant execute on function public.calculate_generation_from_birth_date(date)
to authenticated, service_role;

revoke all on function public.smartdsp_survey_is_open(public.smartdsp_surveys)
from public, anon, authenticated;
grant execute on function public.smartdsp_survey_is_open(public.smartdsp_surveys)
to authenticated, service_role;

revoke all on function public.submit_smartdsp_survey(uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb)
from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
