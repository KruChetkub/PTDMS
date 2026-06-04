-- Strategy and planning division internal activity calendar.
-- This module is intentionally separate from the PTDMS training domain.

do $$
begin
  create type public.strategy_event_status as enum ('draft', 'published', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.strategy_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  owner_work_group text,
  status public.strategy_event_status not null default 'published',
  created_by uuid default auth.uid() references public.profiles(user_id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_events_title_not_blank check (length(trim(title)) > 0),
  constraint strategy_events_time_order check (
    start_time is null
    or end_time is null
    or end_time >= start_time
  )
);

create index if not exists idx_strategy_events_event_date on public.strategy_events(event_date);
create index if not exists idx_strategy_events_status on public.strategy_events(status);
create index if not exists idx_strategy_events_created_by on public.strategy_events(created_by);
create index if not exists idx_strategy_events_owner_work_group on public.strategy_events(owner_work_group);
create index if not exists idx_strategy_events_cancelled_by on public.strategy_events(cancelled_by);

drop trigger if exists set_strategy_events_updated_at on public.strategy_events;
create trigger set_strategy_events_updated_at
before update on public.strategy_events
for each row
execute function public.set_updated_at();

alter table public.strategy_events enable row level security;

drop policy if exists "strategy events active users read" on public.strategy_events;
create policy "strategy events active users read"
on public.strategy_events
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "strategy events active users insert" on public.strategy_events;
create policy "strategy events active users insert"
on public.strategy_events
for insert
to authenticated
with check (
  public.current_user_role() is not null
  and created_by = auth.uid()
);

drop policy if exists "strategy events update own or admin" on public.strategy_events;
create policy "strategy events update own or admin"
on public.strategy_events
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
)
with check (
  created_by = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "strategy events delete admin" on public.strategy_events;
create policy "strategy events delete admin"
on public.strategy_events
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select, insert, update, delete on public.strategy_events to authenticated;
