-- Fully disbursed budget items cannot retain outstanding commitments.

begin;

with calculated as (
  select
    amount.id,
    coalesce(
      dynamic_allocations.allocation_total,
      amount.allocation_tranche_1_amount
        + amount.allocation_tranche_2_amount
        + amount.allocation_tranche_3_amount
    )
      + amount.central_transfer_in_amount
      - amount.central_transfer_out_amount
      + amount.department_request_increase_amount
      - amount.department_transfer_out_amount
      + amount.division_transfer_in_amount
      - amount.division_transfer_out_amount as net_budget,
    amount.disbursed_general_amount + amount.disbursed_advance_amount as disbursed_total
  from public.budget_utilization_amounts amount
  left join lateral (
    select sum(item_allocation.amount) as allocation_total
    from public.budget_utilization_item_allocations item_allocation
    where item_allocation.item_id = amount.item_id
  ) dynamic_allocations on true
)
update public.budget_utilization_amounts amount
set
  net_budget_after_transfer_amount = calculated.net_budget,
  committed_po_amount = 0,
  committed_without_po_amount = 0,
  committed_total_amount = 0,
  disbursed_total_amount = calculated.disbursed_total,
  utilization_total_amount = calculated.disbursed_total,
  remaining_amount = calculated.net_budget - calculated.disbursed_total,
  disbursement_rate = case
    when calculated.net_budget = 0 then 0
    else calculated.disbursed_total * 100 / calculated.net_budget
  end,
  utilization_with_po_rate = case
    when calculated.net_budget = 0 then 0
    else calculated.disbursed_total * 100 / calculated.net_budget
  end,
  updated_at = now()
from calculated
where calculated.id = amount.id
  and calculated.net_budget > 0
  and calculated.disbursed_total >= calculated.net_budget - 0.01
  and (amount.committed_po_amount <> 0 or amount.committed_without_po_amount <> 0);

notify pgrst, 'reload schema';

commit;
