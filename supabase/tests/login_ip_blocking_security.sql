-- Security contract for 202609080004_enforce_ip_login_blocks.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  trigger_function_oid oid := to_regprocedure('private.enforce_login_ip_block_impl()');
  function_definition text;
begin
  if to_regclass('public.login_ip_block_settings') is null
    or to_regclass('public.login_ip_rules') is null
  then
    raise exception 'Login IP block tables are missing';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class relation
    where relation.oid = 'public.login_ip_block_settings'::regclass
  ), false)
    or not coalesce((
      select relation.relrowsecurity
      from pg_class relation
      where relation.oid = 'public.login_ip_rules'::regclass
    ), false)
  then
    raise exception 'RLS is not enabled on login IP block tables';
  end if;

  if has_table_privilege('anon', 'public.login_ip_block_settings', 'SELECT')
    or has_table_privilege('anon', 'public.login_ip_rules', 'SELECT')
    or not has_table_privilege('authenticated', 'public.login_ip_block_settings', 'SELECT')
    or not has_table_privilege('authenticated', 'public.login_ip_rules', 'SELECT')
    or not has_table_privilege('authenticated', 'public.login_ip_rules', 'UPDATE')
  then
    raise exception 'Login IP block table grants are unsafe';
  end if;

  if not exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'login_ip_block_settings'
      and policy.policyname = 'login IP settings super admin manage'
      and policy.roles = array['authenticated']::name[]
      and concat_ws(' ', policy.qual, policy.with_check)
        like '%private.is_privileged_role_impl%super_admin%'
      and concat_ws(' ', policy.qual, policy.with_check) like '%aal2%'
  ) or not exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'login_ip_rules'
      and policy.policyname = 'login IP rules super admin manage'
      and policy.roles = array['authenticated']::name[]
      and concat_ws(' ', policy.qual, policy.with_check)
        like '%private.is_privileged_role_impl%super_admin%'
      and concat_ws(' ', policy.qual, policy.with_check) like '%aal2%'
  ) then
    raise exception 'Super Admin-only policies are missing';
  end if;

  if trigger_function_oid is null then
    raise exception 'Private IP block trigger function is missing';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    where procedure.oid = trigger_function_oid
      and (
        not procedure.prosecdef
        or not exists (
          select 1
          from unnest(coalesce(procedure.proconfig, array[]::text[])) config(setting)
          where config.setting in ('search_path=', 'search_path=""')
        )
      )
  ) then
    raise exception 'IP block detector must be SECURITY DEFINER with an empty search_path';
  end if;

  if has_function_privilege('anon', trigger_function_oid, 'EXECUTE')
    or has_function_privilege('authenticated', trigger_function_oid, 'EXECUTE')
  then
    raise exception 'Client roles can directly execute the IP block detector';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_definition
    where trigger_definition.tgrelid = 'public.audit_logs'::regclass
      and trigger_definition.tgname = 'enforce_login_ip_block'
      and trigger_definition.tgfoid = trigger_function_oid
      and not trigger_definition.tgisinternal
  ) then
    raise exception 'Automatic IP block trigger is missing';
  end if;

  function_definition := pg_get_functiondef(trigger_function_oid);
  if function_definition not like '%login_failed%'
    or function_definition not like '%attempt_limit%'
    or function_definition not like '%window_minutes%'
    or function_definition not like '%rule_type = ''allow''%'
  then
    raise exception 'IP block threshold or allowlist precedence is incomplete';
  end if;

  if not exists (
    select 1
    from public.login_ip_block_settings settings
    where settings.singleton_id = 1
      and settings.attempt_limit between 3 and 100
      and settings.window_minutes between 1 and 1440
  ) then
    raise exception 'Login IP block singleton settings are missing or invalid';
  end if;
end;
$block$;

select
  'PASS' as result,
  'failed login IPs are blocked automatically and managed only by Super Admins' as check_name;
