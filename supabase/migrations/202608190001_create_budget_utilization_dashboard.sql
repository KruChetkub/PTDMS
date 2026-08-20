-- Budget Utilization Dashboard.
-- This module is isolated from the PTDMS training domain and other portal systems.

begin;

create table if not exists public.budget_utilization_import_batches (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null check (fiscal_year between 2500 and 2700),
  report_as_of timestamptz,
  source_file_name text,
  source_file_size integer check (source_file_size is null or source_file_size >= 0),
  status text not null default 'draft' check (status in ('draft', 'previewed', 'imported', 'failed')),
  imported_by uuid references public.profiles(user_id) on delete set null,
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.budget_utilization_snapshots') is not null
    and to_regclass('public.budget_utilization_report_periods') is null then
    alter table public.budget_utilization_snapshots rename to budget_utilization_report_periods;
  end if;
end $$;

create table if not exists public.budget_utilization_report_periods (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.budget_utilization_import_batches(id) on delete set null,
  fiscal_year integer not null check (fiscal_year between 2500 and 2700),
  report_as_of timestamptz,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  department_name text not null default 'กองยุทธศาสตร์และแผนงาน' check (char_length(btrim(department_name)) between 1 and 300),
  is_active boolean not null default true,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_utilization_items (
  id uuid primary key default gen_random_uuid(),
  report_period_id uuid not null references public.budget_utilization_report_periods(id) on delete cascade,
  parent_id uuid references public.budget_utilization_items(id) on delete cascade,
  row_number integer check (row_number is null or row_number > 0),
  sort_order integer not null,
  depth integer not null default 0 check (depth >= 0),
  row_type text not null check (
    row_type in ('total', 'budget_category', 'output_activity', 'expense_group', 'major_project', 'sub_project', 'activity', 'line_item')
  ),
  sequence_label text,
  item_name text not null check (char_length(btrim(item_name)) between 1 and 500),
  output_label text,
  activity_label text,
  raw_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_utilization_items'
      and column_name = 'snapshot_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_utilization_items'
      and column_name = 'report_period_id'
  ) then
    alter table public.budget_utilization_items rename column snapshot_id to report_period_id;
  end if;
end $$;

alter table public.budget_utilization_items
add column if not exists report_period_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'budget_utilization_items_report_period_id_fkey'
      and conrelid = 'public.budget_utilization_items'::regclass
  ) then
    alter table public.budget_utilization_items
      add constraint budget_utilization_items_report_period_id_fkey
      foreign key (report_period_id)
      references public.budget_utilization_report_periods(id)
      on delete cascade;
  end if;
end $$;

create table if not exists public.budget_utilization_amounts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.budget_utilization_items(id) on delete cascade,
  planned_budget_amount numeric(14,2) not null default 0,
  allocation_tranche_1_amount numeric(14,2) not null default 0,
  allocation_tranche_1_date date,
  allocation_tranche_2_amount numeric(14,2) not null default 0,
  allocation_tranche_2_date date,
  allocation_tranche_3_amount numeric(14,2) not null default 0,
  allocation_tranche_3_date date,
  net_budget_after_transfer_amount numeric(14,2) not null default 0,
  central_transfer_in_amount numeric(14,2) not null default 0,
  central_transfer_out_amount numeric(14,2) not null default 0,
  division_transfer_in_amount numeric(14,2) not null default 0,
  division_transfer_out_amount numeric(14,2) not null default 0,
  committed_po_amount numeric(14,2) not null default 0,
  committed_without_po_amount numeric(14,2) not null default 0,
  committed_total_amount numeric(14,2) not null default 0,
  disbursed_general_amount numeric(14,2) not null default 0,
  disbursed_advance_amount numeric(14,2) not null default 0,
  disbursed_total_amount numeric(14,2) not null default 0,
  utilization_total_amount numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) not null default 0,
  disbursement_rate numeric(7,2),
  utilization_with_po_rate numeric(7,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_utilization_amounts
add column if not exists allocation_tranche_1_date date;

alter table public.budget_utilization_amounts
add column if not exists allocation_tranche_2_date date;

alter table public.budget_utilization_amounts
add column if not exists allocation_tranche_3_date date;

create table if not exists public.budget_utilization_import_errors (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.budget_utilization_import_batches(id) on delete cascade,
  row_number integer,
  column_name text,
  error_code text not null,
  error_message text not null,
  raw_value text,
  created_at timestamptz not null default now()
);

create index if not exists idx_budget_import_batches_fiscal_year on public.budget_utilization_import_batches(fiscal_year, created_at desc);
create index if not exists idx_budget_report_periods_fiscal_year on public.budget_utilization_report_periods(fiscal_year, is_active, report_as_of desc);
create index if not exists idx_budget_items_report_period_order on public.budget_utilization_items(report_period_id, sort_order);
create index if not exists idx_budget_items_parent on public.budget_utilization_items(parent_id);
create index if not exists idx_budget_items_row_type on public.budget_utilization_items(row_type);
create index if not exists idx_budget_import_errors_batch on public.budget_utilization_import_errors(import_batch_id, row_number);

drop trigger if exists set_budget_import_batches_updated_at on public.budget_utilization_import_batches;
create trigger set_budget_import_batches_updated_at
before update on public.budget_utilization_import_batches
for each row
execute function public.set_updated_at();

drop trigger if exists set_budget_report_periods_updated_at on public.budget_utilization_report_periods;
create trigger set_budget_report_periods_updated_at
before update on public.budget_utilization_report_periods
for each row
execute function public.set_updated_at();

drop trigger if exists set_budget_items_updated_at on public.budget_utilization_items;
create trigger set_budget_items_updated_at
before update on public.budget_utilization_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_budget_amounts_updated_at on public.budget_utilization_amounts;
create trigger set_budget_amounts_updated_at
before update on public.budget_utilization_amounts
for each row
execute function public.set_updated_at();

alter table public.budget_utilization_import_batches enable row level security;
alter table public.budget_utilization_report_periods enable row level security;
alter table public.budget_utilization_items enable row level security;
alter table public.budget_utilization_amounts enable row level security;
alter table public.budget_utilization_import_errors enable row level security;

drop policy if exists "budget utilization read allowed roles" on public.budget_utilization_import_batches;
create policy "budget utilization read allowed roles"
on public.budget_utilization_import_batches
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget utilization write admin roles" on public.budget_utilization_import_batches;
create policy "budget utilization write admin roles"
on public.budget_utilization_import_batches
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "budget report periods read allowed roles" on public.budget_utilization_report_periods;
create policy "budget report periods read allowed roles"
on public.budget_utilization_report_periods
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget report periods write admin roles" on public.budget_utilization_report_periods;
create policy "budget report periods write admin roles"
on public.budget_utilization_report_periods
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "budget items read allowed roles" on public.budget_utilization_items;
create policy "budget items read allowed roles"
on public.budget_utilization_items
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget items write admin roles" on public.budget_utilization_items;
create policy "budget items write admin roles"
on public.budget_utilization_items
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "budget amounts read allowed roles" on public.budget_utilization_amounts;
create policy "budget amounts read allowed roles"
on public.budget_utilization_amounts
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget amounts write admin roles" on public.budget_utilization_amounts;
create policy "budget amounts write admin roles"
on public.budget_utilization_amounts
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "budget import errors read allowed roles" on public.budget_utilization_import_errors;
create policy "budget import errors read allowed roles"
on public.budget_utilization_import_errors
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[]));

drop policy if exists "budget import errors write admin roles" on public.budget_utilization_import_errors;
create policy "budget import errors write admin roles"
on public.budget_utilization_import_errors
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select, insert, update, delete on public.budget_utilization_import_batches to authenticated;
grant select, insert, update, delete on public.budget_utilization_report_periods to authenticated;
grant select, insert, update, delete on public.budget_utilization_items to authenticated;
grant select, insert, update, delete on public.budget_utilization_amounts to authenticated;
grant select, insert, update, delete on public.budget_utilization_import_errors to authenticated;

commit;
