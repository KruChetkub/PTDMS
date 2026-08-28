-- Store a document number for every editable budget transaction amount.

begin;

create table if not exists public.budget_utilization_transaction_references (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.budget_utilization_items(id) on delete cascade,
  reference_key text not null check (char_length(btrim(reference_key)) between 1 and 160),
  transaction_type text not null check (transaction_type in (
    'allocation',
    'central_transfer_in',
    'central_transfer_out',
    'department_request_increase',
    'department_transfer_out',
    'division_transfer_in',
    'division_transfer_out',
    'committed_po',
    'committed_without_po',
    'disbursed_general',
    'disbursed_advance'
  )),
  tranche_id uuid references public.budget_utilization_allocation_tranches(id) on delete cascade,
  document_number text not null check (char_length(btrim(document_number)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, reference_key),
  check (
    (transaction_type = 'allocation' and tranche_id is not null)
    or (transaction_type <> 'allocation' and tranche_id is null)
  )
);

create index if not exists idx_budget_transaction_references_item
on public.budget_utilization_transaction_references(item_id, transaction_type);

create index if not exists idx_budget_transaction_references_document
on public.budget_utilization_transaction_references(lower(document_number));

drop trigger if exists set_budget_transaction_references_updated_at
on public.budget_utilization_transaction_references;
create trigger set_budget_transaction_references_updated_at
before update on public.budget_utilization_transaction_references
for each row execute function public.set_updated_at();

alter table public.budget_utilization_transaction_references enable row level security;

drop policy if exists "budget transaction references read allowed roles"
on public.budget_utilization_transaction_references;
create policy "budget transaction references read allowed roles"
on public.budget_utilization_transaction_references
for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget transaction references write admin roles"
on public.budget_utilization_transaction_references;
create policy "budget transaction references write admin roles"
on public.budget_utilization_transaction_references
for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select, insert, update, delete
on public.budget_utilization_transaction_references to authenticated;

notify pgrst, 'reload schema';

commit;
