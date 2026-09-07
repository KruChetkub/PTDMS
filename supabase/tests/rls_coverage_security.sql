-- Security Hardening Plan 1.2: RLS coverage regression checks.
-- Safe to run in the Supabase SQL Editor; this script does not modify data.

do $block$
declare
  insecure_tables text;
  exposed_owner_views text;
  expected_sensitive_tables constant text[] := array[
    'audit_logs',
    'budget_utilization_import_batches',
    'budget_utilization_import_errors',
    'certificates',
    'development_analysis',
    'it_assets',
    'login_history',
    'meeting_room_reservations',
    'permissions',
    'profiles',
    'role_permissions',
    'smartdsp_survey_answers',
    'smartdsp_survey_consents',
    'smartdsp_survey_respondent_contexts',
    'smartdsp_survey_responses',
    'spd_assistant_conversations',
    'spd_assistant_feedback',
    'spd_assistant_messages',
    'spd_service_notification_settings',
    'spd_service_satisfaction_surveys',
    'spd_service_ticket_timeline',
    'spd_service_tickets',
    'system_settings',
    'training_records',
    'user_permission_overrides'
  ];
  table_name text;
  table_oid regclass;
begin
  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by relation.relname)
  into insecure_tables
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and not relation.relrowsecurity;

  if insecure_tables is not null then
    raise exception 'RLS is disabled on exposed tables: %', insecure_tables;
  end if;

  foreach table_name in array expected_sensitive_tables
  loop
    table_oid := to_regclass(format('public.%I', table_name));

    if table_oid is null then
      raise exception 'Expected sensitive table is missing: public.%', table_name;
    end if;

    if not exists (
      select 1
      from pg_class relation
      where relation.oid = table_oid
        and relation.relkind in ('r', 'p')
        and relation.relrowsecurity
    ) then
      raise exception 'Sensitive table does not have RLS enabled: public.%', table_name;
    end if;
  end loop;

  -- Views do not receive table RLS. A public view reachable by API roles must
  -- use security_invoker so the underlying tables' RLS applies to the caller.
  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by relation.relname)
  into exposed_owner_views
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind = 'v'
    and (
      has_table_privilege('anon', relation.oid, 'SELECT')
      or has_table_privilege('authenticated', relation.oid, 'SELECT')
    )
    and not coalesce(relation.reloptions, array[]::text[]) @> array['security_invoker=true'];

  if exposed_owner_views is not null then
    raise exception 'API-readable public views are not security_invoker: %', exposed_owner_views;
  end if;
end;
$block$;

