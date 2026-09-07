-- Security contract for 202609070014_add_edge_function_rate_limits.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  function_oid oid := to_regprocedure(
    'public.consume_edge_function_rate_limit(text,integer,integer)'
  );
begin
  if to_regclass('private.edge_function_rate_limits') is null then
    raise exception 'Private Edge Function rate-limit table is missing';
  end if;

  if function_oid is null then
    raise exception 'Edge Function rate-limit RPC is missing';
  end if;

  if has_function_privilege('anon', function_oid, 'EXECUTE')
    or has_function_privilege('authenticated', function_oid, 'EXECUTE')
    or not has_function_privilege('service_role', function_oid, 'EXECUTE')
  then
    raise exception 'Rate-limit RPC privileges are unsafe';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    where procedure.oid = function_oid
      and (
        procedure.prosecdef
        or not exists (
          select 1
          from unnest(coalesce(procedure.proconfig, array[]::text[])) config(setting)
          -- PostgreSQL serializes SET search_path = '' as search_path="".
          -- Keep the unquoted form for compatibility with other versions.
          where config.setting in ('search_path=', 'search_path=""')
        )
      )
  ) then
    raise exception 'Rate-limit RPC must be SECURITY INVOKER with an empty search_path';
  end if;

  if has_table_privilege('anon', 'private.edge_function_rate_limits', 'SELECT')
    or has_table_privilege('authenticated', 'private.edge_function_rate_limits', 'SELECT')
    or has_table_privilege('anon', 'private.edge_function_rate_limits', 'INSERT')
    or has_table_privilege('authenticated', 'private.edge_function_rate_limits', 'INSERT')
  then
    raise exception 'Client roles can access private rate-limit counters';
  end if;
end;
$block$;

select
  'PASS' as result,
  'Edge Function rate limits are private and service-role-only' as check_name;
