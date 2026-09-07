-- Verify CSV #37 after 202609070001_restrict_anon_security_definer_functions.sql.
-- The query must return zero rows.

with checks as (
  select
    coalesce(
      (
        select procedure.prosecdef
        from pg_proc procedure
        where procedure.oid = to_regprocedure(
          'public.capture_public_performance_result_history()'
        )
      ),
      false
    ) as is_security_definer,
    has_function_privilege(
      'anon',
      'public.capture_public_performance_result_history()',
      'EXECUTE'
    ) as anon_can_execute,
    has_function_privilege(
      'authenticated',
      'public.capture_public_performance_result_history()',
      'EXECUTE'
    ) as authenticated_can_execute,
    exists (
      select 1
      from pg_trigger trigger_definition
      where trigger_definition.tgrelid =
        'public.public_performance_results'::regclass
        and trigger_definition.tgfoid =
          'public.capture_public_performance_result_history()'::regprocedure
        and trigger_definition.tgname =
          'capture_public_performance_result_history'
        and trigger_definition.tgenabled <> 'D'
        and trigger_definition.tgisinternal is false
    ) as trigger_is_enabled
)
select *
from checks
where is_security_definer is not true
   or anon_can_execute is not false
   or authenticated_can_execute is not false
   or trigger_is_enabled is not true;
