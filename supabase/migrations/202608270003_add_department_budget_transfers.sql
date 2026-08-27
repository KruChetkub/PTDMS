-- Add department-level budget increases and transfers to the effective budget formula.

begin;

alter table public.budget_utilization_amounts
  add column if not exists department_request_increase_amount numeric(14,2) not null default 0,
  add column if not exists department_transfer_out_amount numeric(14,2) not null default 0;

with calculated as (
  select
    amount.id,
    coalesce(dynamic_allocations.allocation_total, legacy_allocations.allocation_total)
      + amount.central_transfer_in_amount
      - amount.central_transfer_out_amount
      + amount.department_request_increase_amount
      - amount.department_transfer_out_amount
      + amount.division_transfer_in_amount
      - amount.division_transfer_out_amount
      + amount.committed_po_amount
      + amount.committed_without_po_amount as net_budget,
    amount.committed_po_amount + amount.committed_without_po_amount as committed_total,
    amount.disbursed_general_amount + amount.disbursed_advance_amount as disbursed_total
  from public.budget_utilization_amounts amount
  cross join lateral (
    select
      amount.allocation_tranche_1_amount
      + amount.allocation_tranche_2_amount
      + amount.allocation_tranche_3_amount as allocation_total
  ) legacy_allocations
  left join lateral (
    select sum(item_allocation.amount) as allocation_total
    from public.budget_utilization_item_allocations item_allocation
    where item_allocation.item_id = amount.item_id
  ) dynamic_allocations on true
)
update public.budget_utilization_amounts amount
set
  net_budget_after_transfer_amount = calculated.net_budget,
  committed_total_amount = calculated.committed_total,
  disbursed_total_amount = calculated.disbursed_total,
  utilization_total_amount = calculated.committed_total + calculated.disbursed_total,
  remaining_amount = greatest(0, calculated.net_budget - calculated.committed_total - calculated.disbursed_total),
  disbursement_rate = case
    when calculated.net_budget = 0 then 0
    else calculated.disbursed_total * 100 / calculated.net_budget
  end,
  utilization_with_po_rate = case
    when calculated.net_budget = 0 then 0
    else (calculated.committed_total + calculated.disbursed_total) * 100 / calculated.net_budget
  end
from calculated
where calculated.id = amount.id;

notify pgrst, 'reload schema';

commit;
