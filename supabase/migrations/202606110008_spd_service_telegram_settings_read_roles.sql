-- Allow SPD Service Telegram settings to be viewed by dashboard roles while keeping writes Super Admin only.

drop policy if exists "spd service notification super admin read" on public.spd_service_notification_settings;

create policy "spd service notification dashboard read"
on public.spd_service_notification_settings
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive']::public.user_role[]));
