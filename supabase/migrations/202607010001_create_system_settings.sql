-- System-wide settings controlled by Super Admin.

create table if not exists public.system_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_settings_key_not_blank check (length(trim(setting_key)) > 0),
  constraint system_settings_value_object check (jsonb_typeof(setting_value) = 'object')
);

drop trigger if exists set_system_settings_updated_at on public.system_settings;
create trigger set_system_settings_updated_at
before update on public.system_settings
for each row
execute function public.set_updated_at();

alter table public.system_settings enable row level security;

drop policy if exists "system settings active users read" on public.system_settings;
create policy "system settings active users read"
on public.system_settings
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "system settings super admin write" on public.system_settings;
create policy "system settings super admin write"
on public.system_settings
for all
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin']::public.user_role[]));

grant select on public.system_settings to authenticated;
grant insert, update, delete on public.system_settings to authenticated;

insert into public.system_settings (setting_key, setting_value, description)
values (
  'login_security',
  '{"autoLogoutMinutes": 30}'::jsonb,
  'Browser inactivity auto logout timer in minutes.'
)
on conflict (setting_key) do nothing;
