-- Link normalized budget rows back to their Excel source and track import verification.

begin;

alter table public.budget_utilization_import_batches
add column if not exists source_checksum text;

alter table public.budget_utilization_import_batches
add column if not exists validation_status text not null default 'pending';

alter table public.budget_utilization_import_batches
drop constraint if exists budget_utilization_import_batches_validation_status_check;

alter table public.budget_utilization_import_batches
add constraint budget_utilization_import_batches_validation_status_check
check (validation_status in ('pending', 'matched', 'mismatch', 'approved', 'superseded'));

alter table public.budget_utilization_import_batches
add column if not exists reconciliation jsonb not null default '{}'::jsonb;

alter table public.budget_utilization_import_batches
add column if not exists validated_at timestamptz;

alter table public.budget_utilization_import_batches
add column if not exists validated_by uuid references public.profiles(user_id) on delete set null;

alter table public.budget_utilization_items
add column if not exists source_import_batch_id uuid
references public.budget_utilization_import_batches(id) on delete set null;

alter table public.budget_utilization_items
add column if not exists source_sheet_name text;

alter table public.budget_utilization_items
add column if not exists source_row_number integer
check (source_row_number is null or source_row_number > 0);

alter table public.budget_utilization_items
add column if not exists source_row_data jsonb;

create index if not exists idx_budget_import_batches_checksum
on public.budget_utilization_import_batches(source_checksum)
where source_checksum is not null;

create index if not exists idx_budget_import_batches_validation
on public.budget_utilization_import_batches(validation_status, created_at desc);

create index if not exists idx_budget_items_source_row
on public.budget_utilization_items(source_import_batch_id, source_sheet_name, source_row_number);

commit;
