-- Run after 202609070003_harden_accept_survey_pdpa_rpc.sql.
-- Both catalog queries must return the expected single row shown by each WHERE.

select
  namespace.nspname as schema_name,
  procedure.proname as function_name,
  procedure.prosecdef as is_security_definer,
  has_function_privilege(
    'authenticated',
    'public.accept_smartdsp_survey_pdpa(uuid,jsonb)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'anon',
    'public.accept_smartdsp_survey_pdpa(uuid,jsonb)',
    'EXECUTE'
  ) as anon_can_execute
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
where procedure.oid = 'public.accept_smartdsp_survey_pdpa(uuid,jsonb)'::regprocedure;

select
  namespace.nspname as schema_name,
  procedure.proname as function_name,
  procedure.prosecdef as is_security_definer,
  procedure.proconfig as function_config,
  has_function_privilege(
    'authenticated',
    'private.accept_smartdsp_survey_pdpa_impl(uuid,jsonb)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'anon',
    'private.accept_smartdsp_survey_pdpa_impl(uuid,jsonb)',
    'EXECUTE'
  ) as anon_can_execute
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
where procedure.oid = 'private.accept_smartdsp_survey_pdpa_impl(uuid,jsonb)'::regprocedure;

-- The public wrapper must remain callable through PostgREST with the same
-- parameters and return type. This block rolls back the consent write.
begin;

update public.smartdsp_surveys
set status = 'active', is_enabled = true
where code = 'smartdsp-satisfaction'
  and version = 1;

select set_config(
  'request.jwt.claim.sub',
  (
    select user_id::text
    from public.profiles
    where status = 'active'
    order by created_at
    limit 1
  ),
  true
);

set local role authenticated;

select public.accept_smartdsp_survey_pdpa(
  (
    select id
    from public.smartdsp_surveys
    where code = 'smartdsp-satisfaction'
      and version = 1
      and status = 'active'
      and is_enabled is true
  ),
  jsonb_build_object('acknowledged', true, 'consented', true)
);

rollback;
