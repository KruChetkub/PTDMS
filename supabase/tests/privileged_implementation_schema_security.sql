-- Security contract for
-- 202609070012_move_remaining_privileged_implementations_private.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  signature text;
  function_oid oid;
  runtime_helpers constant text[] := array[
    'public.calculate_generation_from_birth_date(date)',
    'public.smartdsp_survey_is_open(public.smartdsp_surveys)'
  ];
  legacy_wrappers constant text[] := array[
    'public.submit_smartdsp_survey(uuid,jsonb)',
    'public.submit_smartdsp_survey_with_context(uuid,jsonb,jsonb)'
  ];
begin
  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
  ) then
    raise exception 'A SECURITY DEFINER implementation remains in public';
  end if;

  if exists (
    select 1
    from pg_trigger trigger_definition
    join pg_proc procedure on procedure.oid = trigger_definition.tgfoid
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where not trigger_definition.tgisinternal
      and namespace.nspname = 'public'
  ) then
    raise exception 'A trigger function remains in the exposed public schema';
  end if;

  foreach signature in array runtime_helpers
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null then
      raise exception 'Expected runtime helper wrapper is missing: %', signature;
    end if;

    if exists (
      select 1 from pg_proc procedure
      where procedure.oid = function_oid
        and procedure.prosecdef
    ) or has_function_privilege('anon', function_oid, 'EXECUTE')
      or not has_function_privilege('authenticated', function_oid, 'EXECUTE')
      or not has_function_privilege('service_role', function_oid, 'EXECUTE')
    then
      raise exception 'Runtime helper wrapper is not safely configured: %',
        signature;
    end if;
  end loop;

  foreach signature in array legacy_wrappers
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null then
      raise exception 'Expected internal survey wrapper is missing: %', signature;
    end if;

    if exists (
      select 1 from pg_proc procedure
      where procedure.oid = function_oid
        and procedure.prosecdef
    ) or has_function_privilege('anon', function_oid, 'EXECUTE')
      or has_function_privilege('authenticated', function_oid, 'EXECUTE')
    then
      raise exception 'Internal survey wrapper is client-callable or definer: %',
        signature;
    end if;
  end loop;

  if to_regprocedure('private.calculate_generation_from_birth_date_impl(date)') is null
    or to_regprocedure('private.smartdsp_survey_is_open_impl(public.smartdsp_surveys)') is null
    or to_regprocedure('private.submit_smartdsp_survey_impl(uuid,jsonb)') is null
    or to_regprocedure('private.submit_smartdsp_survey_with_context_legacy_impl(uuid,jsonb,jsonb)') is null
  then
    raise exception 'One or more private implementations are missing';
  end if;
end;
$block$;

select
  'PASS' as result,
  'privileged implementations are outside the exposed public schema' as check_name;
