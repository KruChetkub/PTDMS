-- Allow allocation tranches to be added dynamically while preserving legacy tranche columns.

begin;

create table if not exists public.budget_utilization_allocation_tranches (
  id uuid primary key default gen_random_uuid(),
  report_period_id uuid not null references public.budget_utilization_report_periods(id) on delete cascade,
  tranche_number integer not null check (tranche_number > 0),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_period_id, tranche_number),
  unique (report_period_id, sort_order)
);

create table if not exists public.budget_utilization_item_allocations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.budget_utilization_items(id) on delete cascade,
  tranche_id uuid not null references public.budget_utilization_allocation_tranches(id) on delete restrict,
  amount numeric(14,2) not null default 0,
  allocation_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, tranche_id)
);

insert into public.budget_utilization_allocation_tranches (
  report_period_id,
  tranche_number,
  label,
  sort_order
)
select
  period.id,
  tranche.tranche_number,
  'จัดสรรงวด ' || tranche.tranche_number,
  tranche.tranche_number
from public.budget_utilization_report_periods period
cross join (values (1), (2), (3)) as tranche(tranche_number)
on conflict (report_period_id, tranche_number) do nothing;

insert into public.budget_utilization_item_allocations (
  item_id,
  tranche_id,
  amount,
  allocation_date
)
select
  amount.item_id,
  tranche.id,
  case tranche.tranche_number
    when 1 then amount.allocation_tranche_1_amount
    when 2 then amount.allocation_tranche_2_amount
    else amount.allocation_tranche_3_amount
  end,
  case tranche.tranche_number
    when 1 then amount.allocation_tranche_1_date
    when 2 then amount.allocation_tranche_2_date
    else amount.allocation_tranche_3_date
  end
from public.budget_utilization_amounts amount
join public.budget_utilization_items item on item.id = amount.item_id
join public.budget_utilization_allocation_tranches tranche
  on tranche.report_period_id = item.report_period_id
 and tranche.tranche_number between 1 and 3
where case tranche.tranche_number
  when 1 then amount.allocation_tranche_1_amount <> 0 or amount.allocation_tranche_1_date is not null
  when 2 then amount.allocation_tranche_2_amount <> 0 or amount.allocation_tranche_2_date is not null
  else amount.allocation_tranche_3_amount <> 0 or amount.allocation_tranche_3_date is not null
end
on conflict (item_id, tranche_id) do update
set
  amount = excluded.amount,
  allocation_date = excluded.allocation_date;

create index if not exists idx_budget_allocation_tranches_period
on public.budget_utilization_allocation_tranches(report_period_id, sort_order);

create index if not exists idx_budget_item_allocations_item
on public.budget_utilization_item_allocations(item_id);

create index if not exists idx_budget_item_allocations_tranche
on public.budget_utilization_item_allocations(tranche_id);

drop trigger if exists set_budget_allocation_tranches_updated_at
on public.budget_utilization_allocation_tranches;
create trigger set_budget_allocation_tranches_updated_at
before update on public.budget_utilization_allocation_tranches
for each row execute function public.set_updated_at();

drop trigger if exists set_budget_item_allocations_updated_at
on public.budget_utilization_item_allocations;
create trigger set_budget_item_allocations_updated_at
before update on public.budget_utilization_item_allocations
for each row execute function public.set_updated_at();

alter table public.budget_utilization_allocation_tranches enable row level security;
alter table public.budget_utilization_item_allocations enable row level security;

drop policy if exists "budget allocation tranches read allowed roles"
on public.budget_utilization_allocation_tranches;
create policy "budget allocation tranches read allowed roles"
on public.budget_utilization_allocation_tranches
for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget allocation tranches write admin roles"
on public.budget_utilization_allocation_tranches;
create policy "budget allocation tranches write admin roles"
on public.budget_utilization_allocation_tranches
for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "budget item allocations read allowed roles"
on public.budget_utilization_item_allocations;
create policy "budget item allocations read allowed roles"
on public.budget_utilization_item_allocations
for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget item allocations write admin roles"
on public.budget_utilization_item_allocations;
create policy "budget item allocations write admin roles"
on public.budget_utilization_item_allocations
for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select, insert, update, delete on public.budget_utilization_allocation_tranches to authenticated;
grant select, insert, update, delete on public.budget_utilization_item_allocations to authenticated;

commit;
