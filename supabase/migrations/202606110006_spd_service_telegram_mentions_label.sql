-- Update existing SPD Service Telegram template label to clarify that admin_mentions uses Telegram @username.

update public.spd_service_notification_settings
set
  setting_value = replace(setting_value, 'Admin ที่ตั้งค่าแจ้งเตือน: {{admin_mentions}}', 'Mention Admin: {{admin_mentions}}'),
  updated_at = now()
where setting_key = 'telegram_ticket_created_template'
  and setting_value like '%Admin ที่ตั้งค่าแจ้งเตือน: {{admin_mentions}}%';
