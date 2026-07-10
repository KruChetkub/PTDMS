-- Configurable SPD Service request subjects and AI ChatGPT booking dates.

alter table public.spd_service_tickets
  add column if not exists requested_service_date date;

create index if not exists idx_spd_service_tickets_requested_service_date
on public.spd_service_tickets(requested_service_date);

create table if not exists public.spd_service_request_subjects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.spd_service_categories(id) on delete cascade,
  subject text not null,
  is_active boolean not null default true,
  requires_booking_date boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spd_service_request_subjects_subject_not_blank check (length(trim(subject)) > 0),
  constraint spd_service_request_subjects_unique unique (category_id, subject)
);

create index if not exists idx_spd_service_request_subjects_category_id
on public.spd_service_request_subjects(category_id);

create index if not exists idx_spd_service_request_subjects_sort_order
on public.spd_service_request_subjects(sort_order);

drop trigger if exists set_spd_service_request_subjects_updated_at on public.spd_service_request_subjects;
create trigger set_spd_service_request_subjects_updated_at
before update on public.spd_service_request_subjects
for each row
execute function public.set_updated_at();

alter table public.spd_service_request_subjects enable row level security;

drop policy if exists "spd service request subjects active users read" on public.spd_service_request_subjects;
create policy "spd service request subjects active users read"
on public.spd_service_request_subjects
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "spd service request subjects admin write" on public.spd_service_request_subjects;
create policy "spd service request subjects admin write"
on public.spd_service_request_subjects
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd service tickets ai booking calendar read" on public.spd_service_tickets;
create policy "spd service tickets ai booking calendar read"
on public.spd_service_tickets
for select
to authenticated
using (
  public.current_user_role() is not null
  and subject = 'แจ้งใช้งาน AI ChatGPT'
  and requested_service_date is not null
);

grant select, insert, update, delete on public.spd_service_request_subjects to authenticated;

insert into public.spd_service_request_subjects (category_id, subject, is_active, requires_booking_date, sort_order)
select c.id, seed.subject, true, seed.requires_booking_date, seed.sort_order
from (
  values
    ('IT Support', 'แจ้งปัญหาการใช้งานเครื่องคอมพิวเตอร์', false, 10),
    ('IT Support', 'ขอใช้งาน Internet', false, 20),
    ('IT Support', 'แจ้ง Reset Password Internet', false, 30),
    ('IT Support', 'ขอความอนุเคราะห์เจ้าหน้า IT', false, 40),
    ('Software Support', 'แจ้งใช้งาน AI ChatGPT', true, 10),
    ('Information System Support', 'แจ้งปัญหาการใช้งานระบบ NAS', false, 10),
    ('Digital Service', 'ขอใช้งาน Conference', false, 10),
    ('Digital Service', 'ลงข้อมูลหน้า Website', false, 20),
    ('Digital Service', 'ลงข่าวประชาสัมพันธ์', false, 30)
) as seed(category_name, subject, requires_booking_date, sort_order)
join public.spd_service_categories c on c.name = seed.category_name
on conflict (category_id, subject) do update set
  is_active = excluded.is_active,
  requires_booking_date = excluded.requires_booking_date,
  sort_order = excluded.sort_order,
  updated_at = now();