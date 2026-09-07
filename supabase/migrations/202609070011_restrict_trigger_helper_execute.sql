-- Security Hardening Plan 1.7.
-- Trigger functions and database-only helpers are not client RPCs. Remove
-- direct Data API execution while preserving internal trigger/policy calls.

begin;

do $block$
declare
  routine_record record;
  signature text;
  function_oid oid;
  restricted_helpers constant text[] := array[
    'public.current_user_role()',
    'public.has_permission(text)',
    'public.increment_audit_log_retry_count(uuid[])',
    'public.is_privileged_role(public.user_role[])',
    'public.spd_assistant_match_role(public.user_role[])',
    'public.spd_assistant_normalize_route(text)'
  ];
begin
  -- Revoke client execution from every function currently attached to a
  -- non-internal trigger in the public schema.
  for routine_record in
    select distinct format(
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
    execute format(
      'revoke all privileges on function %s from public, anon, authenticated',
      routine_record.signature
    );
  end loop;

  foreach signature in array restricted_helpers
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null then
      raise exception 'Expected database-only helper is missing: %', signature;
    end if;

    execute format(
      'revoke all privileges on function %s from public, anon, authenticated',
      signature
    );
  end loop;
end;
$block$;

-- These helpers still execute under the authenticated caller inside an
-- invoker trigger or RLS policy. Keep authenticated execution until their
-- implementations are moved out of the exposed schema in the next step.
revoke all privileges
on function public.calculate_generation_from_birth_date(date)
from public, anon;
grant execute
on function public.calculate_generation_from_birth_date(date)
to authenticated;

revoke all privileges
on function public.smartdsp_survey_is_open(public.smartdsp_surveys)
from public, anon;
grant execute
on function public.smartdsp_survey_is_open(public.smartdsp_surveys)
to authenticated;

-- This RPC is called only by the export-audit-logs Edge Function with its
-- server-side service-role client.
grant execute on function public.increment_audit_log_retry_count(uuid[])
to service_role;

notify pgrst, 'reload schema';

commit;
