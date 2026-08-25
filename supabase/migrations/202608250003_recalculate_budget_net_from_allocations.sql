-- Recalculate net budget from allocations, transfers, and commitments, never from planned budget.

begin;

update public.budget_utilization_amounts
set
  net_budget_after_transfer_amount =
    allocation_tranche_1_amount
    + allocation_tranche_2_amount
    + allocation_tranche_3_amount
    + central_transfer_in_amount
    - central_transfer_out_amount
    + division_transfer_in_amount
    - division_transfer_out_amount
    + committed_po_amount
    + committed_without_po_amount,
  remaining_amount = greatest(
    0,
    allocation_tranche_1_amount
    + allocation_tranche_2_amount
    + allocation_tranche_3_amount
    + central_transfer_in_amount
    - central_transfer_out_amount
    + division_transfer_in_amount
    - division_transfer_out_amount
    + committed_po_amount
    + committed_without_po_amount
    - utilization_total_amount
  ),
  disbursement_rate = case
    when allocation_tranche_1_amount
      + allocation_tranche_2_amount
      + allocation_tranche_3_amount
      + central_transfer_in_amount
      - central_transfer_out_amount
      + division_transfer_in_amount
      - division_transfer_out_amount
      + committed_po_amount
      + committed_without_po_amount = 0
    then 0
    else disbursed_total_amount * 100 / (
      allocation_tranche_1_amount
      + allocation_tranche_2_amount
      + allocation_tranche_3_amount
      + central_transfer_in_amount
      - central_transfer_out_amount
      + division_transfer_in_amount
      - division_transfer_out_amount
      + committed_po_amount
      + committed_without_po_amount
    )
  end,
  utilization_with_po_rate = case
    when allocation_tranche_1_amount
      + allocation_tranche_2_amount
      + allocation_tranche_3_amount
      + central_transfer_in_amount
      - central_transfer_out_amount
      + division_transfer_in_amount
      - division_transfer_out_amount
      + committed_po_amount
      + committed_without_po_amount = 0
    then 0
    else utilization_total_amount * 100 / (
      allocation_tranche_1_amount
      + allocation_tranche_2_amount
      + allocation_tranche_3_amount
      + central_transfer_in_amount
      - central_transfer_out_amount
      + division_transfer_in_amount
      - division_transfer_out_amount
      + committed_po_amount
      + committed_without_po_amount
    )
  end
where not exists (
  select 1
  from public.budget_utilization_items item
  where item.id = budget_utilization_amounts.item_id
    and item.source_import_batch_id is not null
);

commit;
