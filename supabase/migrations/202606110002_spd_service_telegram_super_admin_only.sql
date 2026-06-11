-- SPD Service Telegram notification settings access hardening.
-- Keep notification configuration visible and writable only by Super Admin.

drop policy if exists "spd service notification admin read" on public.spd_service_notification_settings;
drop policy if exists "spd service notification admin write" on public.spd_service_notification_settings;
drop policy if exists "spd service notification super admin read" on public.spd_service_notification_settings;
drop policy if exists "spd service notification super admin write" on public.spd_service_notification_settings;

create policy "spd service notification super admin read"
on public.spd_service_notification_settings
for select
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]));

create policy "spd service notification super admin write"
on public.spd_service_notification_settings
for all
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin']::public.user_role[]));

insert into public.spd_service_notification_settings (setting_key, setting_value, is_secret, is_active)
values
  ('telegram_enabled', 'false', false, false),
  ('telegram_chat_id', '', false, false),
  ('telegram_admin_recipient_ids', '[]', false, false)
on conflict (setting_key) do nothing;
