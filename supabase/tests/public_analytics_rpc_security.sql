-- Run after 202609070002_harden_public_analytics_rpcs.sql.
-- Both queries must return zero rows.

with expected(function_signature, is_security_definer, anon_can_execute) as (
  values
    ('public.record_public_page_visit(uuid,text,text,boolean,text)', false, true),
    ('public.get_public_visit_stats()', false, true),
    ('public.increment_public_web_page_view_count(uuid)', false, true),
    ('public.process_public_visit_event_intake()', true, false),
    ('public.process_public_web_page_view_event_intake()', true, false)
), actual as (
  select
    expected.function_signature,
    expected.is_security_definer,
    expected.anon_can_execute,
    p.prosecdef as actual_is_security_definer,
    has_function_privilege('anon', expected.function_signature, 'EXECUTE')
      as actual_anon_can_execute
  from expected
  left join pg_proc p
    on p.oid = to_regprocedure(expected.function_signature)
)
select *
from actual
where actual_is_security_definer is distinct from is_security_definer
   or actual_anon_can_execute is distinct from anon_can_execute
order by function_signature;

with expected(role_name, table_name, privilege_name, has_privilege) as (
  values
    ('anon', 'public.public_visit_event_intake', 'INSERT', true),
    ('anon', 'public.public_visit_event_intake', 'SELECT', false),
    ('anon', 'public.public_visit_totals', 'SELECT', true),
    ('anon', 'public.public_visit_totals', 'INSERT', false),
    ('anon', 'public.public_visit_daily_stats', 'SELECT', true),
    ('anon', 'public.public_visit_daily_stats', 'INSERT', false),
    ('anon', 'public.public_web_page_view_event_intake', 'INSERT', true),
    ('anon', 'public.public_web_page_view_event_intake', 'SELECT', false)
), actual as (
  select
    *,
    has_table_privilege(role_name, table_name, privilege_name) as actual_has_privilege
  from expected
)
select *
from actual
where actual_has_privilege is distinct from has_privilege
order by table_name, privilege_name;
