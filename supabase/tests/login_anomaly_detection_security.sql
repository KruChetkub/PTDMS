-- Security contract for 202609080003_detect_login_anomalies.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  detector_oid oid := to_regprocedure('private.detect_login_anomaly_impl()');
  detector_definition text;
begin
  if to_regclass('public.security_alerts') is null then
    raise exception 'Security alerts table is missing';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class relation
    where relation.oid = 'public.security_alerts'::regclass
  ), false) then
    raise exception 'RLS is not enabled on security_alerts';
  end if;

  if detector_oid is null then
    raise exception 'Private login anomaly detector is missing';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    where procedure.oid = detector_oid
      and (
        not procedure.prosecdef
        or not exists (
          select 1
          from unnest(coalesce(procedure.proconfig, array[]::text[])) config(setting)
          where config.setting in ('search_path=', 'search_path=""')
        )
      )
  ) then
    raise exception 'Detector must be SECURITY DEFINER with an empty search_path';
  end if;

  if has_function_privilege('anon', detector_oid, 'EXECUTE')
    or has_function_privilege('authenticated', detector_oid, 'EXECUTE')
  then
    raise exception 'Client roles can directly execute the anomaly detector';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_definition
    where trigger_definition.tgrelid = 'public.audit_logs'::regclass
      and trigger_definition.tgname = 'detect_login_anomaly'
      and trigger_definition.tgfoid = detector_oid
      and not trigger_definition.tgisinternal
  ) then
    raise exception 'Audit-log anomaly trigger is missing';
  end if;

  if has_table_privilege('anon', 'public.security_alerts', 'SELECT')
    or has_table_privilege('anon', 'public.security_alerts', 'INSERT')
    or has_table_privilege('authenticated', 'public.security_alerts', 'INSERT')
    or has_table_privilege('authenticated', 'public.security_alerts', 'DELETE')
    or not has_table_privilege('authenticated', 'public.security_alerts', 'SELECT')
    or not has_table_privilege('authenticated', 'public.security_alerts', 'UPDATE')
  then
    raise exception 'Security-alert table grants are unsafe';
  end if;

  if not exists (
    select 1 from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'security_alerts'
      and policy.policyname = 'security alerts super admin read'
      and policy.roles = array['authenticated']::name[]
      and coalesce(policy.qual, '') like '%private.is_privileged_role_impl%'
  ) then
    raise exception 'Super Admin read policy is missing';
  end if;

  detector_definition := pg_get_functiondef(detector_oid);
  if detector_definition not like '%interval ''10 minutes''%'
    or detector_definition not like '%interval ''30 minutes''%'
    or detector_definition not like '%credential_stuffing%'
    or detector_definition not like '%success_after_failures%'
  then
    raise exception 'Detector thresholds or anomaly classes are incomplete';
  end if;
end;
$block$;

select
  'PASS' as result,
  'login anomalies are detected in the database and visible only to Super Admins' as check_name;
