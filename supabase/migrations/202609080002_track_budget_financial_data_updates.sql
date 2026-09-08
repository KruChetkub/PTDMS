-- Track the latest database change that can affect dashboard net totals.
-- A stored marker is required because MAX(updated_at) cannot detect deletions.

alter table public.budget_utilization_report_periods
  add column if not exists financial_data_updated_at timestamptz;

create or replace function public.touch_budget_financial_data_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_period_id uuid;
  v_item_id uuid;
begin
  if tg_table_name = 'budget_utilization_items' then
    v_report_period_id := case
      when tg_op = 'DELETE' then old.report_period_id
      else new.report_period_id
    end;
  else
    v_item_id := case
      when tg_op = 'DELETE' then old.item_id
      else new.item_id
    end;

    select item.report_period_id
    into v_report_period_id
    from public.budget_utilization_items item
    where item.id = v_item_id;
  end if;

  if v_report_period_id is not null then
    update public.budget_utilization_report_periods report_period
    set financial_data_updated_at = clock_timestamp()
    where report_period.id = v_report_period_id;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.touch_budget_financial_data_updated_at()
from public, anon, authenticated;

drop trigger if exists track_budget_items_financial_update
on public.budget_utilization_items;
create trigger track_budget_items_financial_update
after insert or update or delete on public.budget_utilization_items
for each row execute function public.touch_budget_financial_data_updated_at();

drop trigger if exists track_budget_amounts_financial_update
on public.budget_utilization_amounts;
create trigger track_budget_amounts_financial_update
after insert or update or delete on public.budget_utilization_amounts
for each row execute function public.touch_budget_financial_data_updated_at();

drop trigger if exists track_budget_allocations_financial_update
on public.budget_utilization_item_allocations;
create trigger track_budget_allocations_financial_update
after insert or update or delete on public.budget_utilization_item_allocations
for each row execute function public.touch_budget_financial_data_updated_at();

with latest_updates as (
  select
    report_period.id as report_period_id,
    greatest(
      report_period.created_at,
      coalesce(max(item.updated_at), '-infinity'::timestamptz),
      coalesce(max(amount.updated_at), '-infinity'::timestamptz),
      coalesce(max(allocation.updated_at), '-infinity'::timestamptz)
    ) as latest_update
  from public.budget_utilization_report_periods report_period
  left join public.budget_utilization_items item
    on item.report_period_id = report_period.id
  left join public.budget_utilization_amounts amount
    on amount.item_id = item.id
  left join public.budget_utilization_item_allocations allocation
    on allocation.item_id = item.id
  group by report_period.id, report_period.created_at
)
update public.budget_utilization_report_periods report_period
set financial_data_updated_at = latest_updates.latest_update
from latest_updates
where latest_updates.report_period_id = report_period.id
  and report_period.financial_data_updated_at is null;

notify pgrst, 'reload schema';
