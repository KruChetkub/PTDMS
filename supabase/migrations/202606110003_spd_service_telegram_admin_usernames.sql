-- Store Telegram usernames for selected SPD Service Admin notification recipients.

insert into public.spd_service_notification_settings (setting_key, setting_value, is_secret, is_active)
values ('telegram_admin_usernames', '{}', false, false)
on conflict (setting_key) do nothing;
