-- Update existing SPD Service Telegram template wording from ticket-style wording to request-style wording.

update public.spd_service_notification_settings
set
  setting_value = replace(setting_value, 'เลขที่: <code>{{ticket_no}}</code>', 'เลขคำขอ: <code>{{ticket_no}}</code>'),
  updated_at = now()
where setting_key = 'telegram_ticket_created_template'
  and setting_value like '%เลขที่: <code>{{ticket_no}}</code>%';
