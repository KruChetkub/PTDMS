-- Security/behavior contract for 202609080002_track_budget_financial_data_updates.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  trigger_count integer;
  function_oid oid := to_regprocedure(
    'public.touch_budget_financial_data_updated_at()'
  );
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_utilization_report_periods'
      and column_name = 'financial_data_updated_at'
      and data_type = 'timestamp with time zone'
  ) then
    raise exception 'financial_data_updated_at column is missing';
  end if;

  if function_oid is null then
    raise exception 'Budget financial update trigger function is missing';
  end if;

  if has_function_privilege('anon', function_oid, 'EXECUTE')
    or has_function_privilege('authenticated', function_oid, 'EXECUTE')
  then
    raise exception 'Budget update trigger function is directly client-callable';
  end if;

  select count(*)
  into trigger_count
  from pg_trigger trigger_definition
  join pg_class relation on relation.oid = trigger_definition.tgrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where not trigger_definition.tgisinternal
    and namespace.nspname = 'public'
    and relation.relname in (
      'budget_utilization_items',
      'budget_utilization_amounts',
      'budget_utilization_item_allocations'
    )
    and trigger_definition.tgfoid = function_oid;

  if trigger_count <> 3 then
    raise exception 'Expected 3 budget update tracking triggers, found %',
      trigger_count;
  end if;
end;
$block$;

select 'PASS' as result,
  'net-total source changes update the dashboard timestamp' as check_name;
