-- Editable Telegram message template for SPD Service ticket-created notifications.

insert into public.spd_service_notification_settings (setting_key, setting_value, is_secret, is_active)
values (
  'telegram_ticket_created_template',
  '<b>SPD Service: มีคำขอใหม่</b>
เลขคำขอ: <code>{{ticket_no}}</code>
หัวข้อ: {{subject}}
ประเภท: {{category_name}}
ความเร่งด่วน: {{urgency}}
ผู้แจ้ง: {{requester_name}}
หน่วยงาน: {{requester_department}}
โทร: {{requester_phone}}
สถานะ: {{status}}
เวลาแจ้ง: {{created_at}}
Admin ที่ตั้งค่าแจ้งเตือน: {{admin_mentions}}

<b>รายละเอียด</b>
{{description}}',
  false,
  false
)
on conflict (setting_key) do nothing;
