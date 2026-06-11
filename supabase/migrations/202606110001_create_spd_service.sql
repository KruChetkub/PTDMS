-- SPD Service Management System domain.
-- This module is intentionally separate from PTDMS training, strategy calendar, and IT asset domains.

do $$
begin
  create type public.spd_service_ticket_status as enum (
    'NEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.spd_service_urgency as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.spd_service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spd_service_categories_name_not_blank check (length(trim(name)) > 0),
  constraint spd_service_categories_name_unique unique (name)
);

create table if not exists public.spd_service_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null,
  requester_id uuid not null references public.profiles(user_id) on delete restrict,
  requester_name text not null,
  requester_department text,
  requester_phone text not null,
  category_id uuid references public.spd_service_categories(id) on delete set null,
  category_name text not null,
  urgency public.spd_service_urgency not null default 'MEDIUM',
  status public.spd_service_ticket_status not null default 'NEW',
  subject text not null,
  description text not null,
  assigned_to uuid references public.profiles(user_id) on delete set null,
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  problem_cause text,
  resolution_method text,
  resolution_result text,
  resolution_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spd_service_tickets_ticket_no_unique unique (ticket_no),
  constraint spd_service_tickets_ticket_no_not_blank check (length(trim(ticket_no)) > 0),
  constraint spd_service_tickets_requester_name_not_blank check (length(trim(requester_name)) > 0),
  constraint spd_service_tickets_requester_phone_not_blank check (length(trim(requester_phone)) > 0),
  constraint spd_service_tickets_category_name_not_blank check (length(trim(category_name)) > 0),
  constraint spd_service_tickets_subject_not_blank check (length(trim(subject)) > 0),
  constraint spd_service_tickets_description_not_blank check (length(trim(description)) > 0),
  constraint spd_service_tickets_resolution_minutes_non_negative check (resolution_minutes is null or resolution_minutes >= 0)
);

create table if not exists public.spd_service_ticket_timeline (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.spd_service_tickets(id) on delete cascade,
  actor_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  from_status public.spd_service_ticket_status,
  to_status public.spd_service_ticket_status,
  note text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint spd_service_timeline_action_not_blank check (length(trim(action)) > 0)
);

create table if not exists public.spd_service_satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.spd_service_tickets(id) on delete cascade,
  requester_id uuid not null references public.profiles(user_id) on delete restrict,
  speed_rating integer not null,
  quality_rating integer not null,
  courtesy_rating integer not null,
  overall_rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint spd_service_surveys_ticket_unique unique (ticket_id),
  constraint spd_service_surveys_speed_range check (speed_rating between 1 and 5),
  constraint spd_service_surveys_quality_range check (quality_rating between 1 and 5),
  constraint spd_service_surveys_courtesy_range check (courtesy_rating between 1 and 5),
  constraint spd_service_surveys_overall_range check (overall_rating between 1 and 5)
);

create table if not exists public.spd_service_notification_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  setting_value text,
  is_secret boolean not null default false,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spd_service_notification_settings_key_unique unique (setting_key),
  constraint spd_service_notification_settings_key_not_blank check (length(trim(setting_key)) > 0)
);

create index if not exists idx_spd_service_tickets_requester_id on public.spd_service_tickets(requester_id);
create index if not exists idx_spd_service_tickets_assigned_to on public.spd_service_tickets(assigned_to);
create index if not exists idx_spd_service_tickets_status on public.spd_service_tickets(status);
create index if not exists idx_spd_service_tickets_urgency on public.spd_service_tickets(urgency);
create index if not exists idx_spd_service_tickets_category_id on public.spd_service_tickets(category_id);
create index if not exists idx_spd_service_tickets_created_at on public.spd_service_tickets(created_at);
create index if not exists idx_spd_service_timeline_ticket_id on public.spd_service_ticket_timeline(ticket_id);
create index if not exists idx_spd_service_surveys_ticket_id on public.spd_service_satisfaction_surveys(ticket_id);

drop trigger if exists set_spd_service_categories_updated_at on public.spd_service_categories;
create trigger set_spd_service_categories_updated_at
before update on public.spd_service_categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_spd_service_tickets_updated_at on public.spd_service_tickets;
create trigger set_spd_service_tickets_updated_at
before update on public.spd_service_tickets
for each row
execute function public.set_updated_at();

drop trigger if exists set_spd_service_notification_settings_updated_at on public.spd_service_notification_settings;
create trigger set_spd_service_notification_settings_updated_at
before update on public.spd_service_notification_settings
for each row
execute function public.set_updated_at();

create or replace function public.generate_spd_service_ticket_no(category_label text, created_on date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text;
  date_part text;
  sequence_no integer;
begin
  prefix := case
    when lower(category_label) like '%it%' then 'SPD-IT'
    when lower(category_label) like '%software%' then 'SPD-SW'
    when lower(category_label) like '%information%' then 'SPD-IS'
    when lower(category_label) like '%digital%' then 'SPD-DG'
    else 'SPD-SV'
  end;

  date_part := to_char(created_on, 'YYYYMMDD');

  select count(*) + 1
  into sequence_no
  from public.spd_service_tickets
  where ticket_no like prefix || '-' || date_part || '-%';

  return prefix || '-' || date_part || '-' || lpad(sequence_no::text, 3, '0');
end;
$$;

alter table public.spd_service_categories enable row level security;
alter table public.spd_service_tickets enable row level security;
alter table public.spd_service_ticket_timeline enable row level security;
alter table public.spd_service_satisfaction_surveys enable row level security;
alter table public.spd_service_notification_settings enable row level security;

drop policy if exists "spd service categories active users read" on public.spd_service_categories;
create policy "spd service categories active users read"
on public.spd_service_categories
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "spd service categories admin write" on public.spd_service_categories;
create policy "spd service categories admin write"
on public.spd_service_categories
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd service tickets requester read own" on public.spd_service_tickets;
create policy "spd service tickets requester read own"
on public.spd_service_tickets
for select
to authenticated
using (requester_id = auth.uid());

drop policy if exists "spd service tickets dashboard read" on public.spd_service_tickets;
create policy "spd service tickets dashboard read"
on public.spd_service_tickets
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive']::public.user_role[]));

drop policy if exists "spd service tickets user create own" on public.spd_service_tickets;
create policy "spd service tickets user create own"
on public.spd_service_tickets
for insert
to authenticated
with check (requester_id = auth.uid());

drop policy if exists "spd service tickets admin update" on public.spd_service_tickets;
create policy "spd service tickets admin update"
on public.spd_service_tickets
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd service timeline linked read" on public.spd_service_ticket_timeline;
create policy "spd service timeline linked read"
on public.spd_service_ticket_timeline
for select
to authenticated
using (
  exists (
    select 1
    from public.spd_service_tickets t
    where t.id = ticket_id
      and (
        t.requester_id = auth.uid()
        or public.is_privileged_role(array['super_admin', 'admin', 'executive']::public.user_role[])
      )
  )
);

drop policy if exists "spd service timeline admin insert" on public.spd_service_ticket_timeline;
create policy "spd service timeline admin insert"
on public.spd_service_ticket_timeline
for insert
to authenticated
with check (
  actor_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd service surveys requester insert" on public.spd_service_satisfaction_surveys;
create policy "spd service surveys requester insert"
on public.spd_service_satisfaction_surveys
for insert
to authenticated
with check (requester_id = auth.uid());

drop policy if exists "spd service surveys requester read own" on public.spd_service_satisfaction_surveys;
create policy "spd service surveys requester read own"
on public.spd_service_satisfaction_surveys
for select
to authenticated
using (requester_id = auth.uid());

drop policy if exists "spd service surveys dashboard read" on public.spd_service_satisfaction_surveys;
create policy "spd service surveys dashboard read"
on public.spd_service_satisfaction_surveys
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive']::public.user_role[]));

drop policy if exists "spd service notification admin read" on public.spd_service_notification_settings;
create policy "spd service notification admin read"
on public.spd_service_notification_settings
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd service notification admin write" on public.spd_service_notification_settings;
create policy "spd service notification admin write"
on public.spd_service_notification_settings
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select, insert, update on public.spd_service_categories to authenticated;
grant select, insert, update on public.spd_service_tickets to authenticated;
grant select, insert on public.spd_service_ticket_timeline to authenticated;
grant select, insert on public.spd_service_satisfaction_surveys to authenticated;
grant select, insert, update on public.spd_service_notification_settings to authenticated;
grant execute on function public.generate_spd_service_ticket_no(text, date) to authenticated;

insert into public.spd_service_categories (name, description, sort_order) values
  ('IT Support', 'แจ้งซ่อมคอมพิวเตอร์ Notebook Printer Internet และ Email', 10),
  ('Software Support', 'ติดตั้ง อัปเดต และแก้ไขปัญหาซอฟต์แวร์', 20),
  ('Information System Support', 'ขอสิทธิ์ แจ้งปัญหา และขอปรับปรุงระบบงาน', 30),
  ('Digital Service', 'Microsoft 365 เว็บไซต์ Dashboard และระบบสารสนเทศภายใน', 40)
on conflict (name) do update set
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
