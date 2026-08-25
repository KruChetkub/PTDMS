-- Store a project's activity number separately from its activity name and output label.

begin;

alter table public.budget_utilization_items
add column if not exists activity_sequence_label text;

commit;
