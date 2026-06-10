-- Editable IT asset health grading criteria.

create table if not exists public.it_asset_evaluation_settings (
  id text primary key,
  criteria jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_it_asset_evaluation_settings_updated_at on public.it_asset_evaluation_settings;
create trigger set_it_asset_evaluation_settings_updated_at
before update on public.it_asset_evaluation_settings
for each row
execute function public.set_updated_at();

alter table public.it_asset_evaluation_settings enable row level security;

drop policy if exists "it asset evaluation active users read" on public.it_asset_evaluation_settings;
create policy "it asset evaluation active users read"
on public.it_asset_evaluation_settings
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "it asset evaluation admin write" on public.it_asset_evaluation_settings;
create policy "it asset evaluation admin write"
on public.it_asset_evaluation_settings
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.it_asset_evaluation_settings to authenticated;
grant insert, update, delete on public.it_asset_evaluation_settings to authenticated;

insert into public.it_asset_evaluation_settings (id, criteria)
values (
  'default',
  '{
    "ram": {
      "highMinGb": 16,
      "highScore": 30,
      "mediumMinGb": 8,
      "mediumScore": 20,
      "lowScore": 5
    },
    "disk": {
      "nvmeScore": 40,
      "ssdScore": 30,
      "otherScore": 10
    },
    "os": {
      "windows11Score": 30,
      "windows10Score": 20,
      "otherScore": 0
    },
    "penalty": {
      "diskHoursOver": 43800,
      "points": -20
    },
    "grades": {
      "aMin": 80,
      "bMin": 60,
      "cMin": 40
    }
  }'::jsonb
)
on conflict (id) do nothing;
