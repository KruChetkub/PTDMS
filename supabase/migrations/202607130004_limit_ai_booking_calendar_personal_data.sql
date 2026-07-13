-- Original AI ChatGPT booking calendar limited-data view.
-- Follow-up migration 202607130005 replaces this view with an RPC to avoid Security Definer View warnings.

create or replace view public.spd_service_ai_chatgpt_booking_calendar as
select
  id,
  requester_name,
  requester_department,
  subject,
  requested_service_date,
  created_at
from public.spd_service_tickets
where
  public.current_user_role() is not null
  and subject = 'แจ้งใช้งาน AI ChatGPT'
  and requested_service_date is not null
  and status <> 'CANCELLED';

revoke all on public.spd_service_ai_chatgpt_booking_calendar from anon;
revoke all on public.spd_service_ai_chatgpt_booking_calendar from authenticated;
grant select on public.spd_service_ai_chatgpt_booking_calendar to authenticated;

drop policy if exists "spd service tickets ai booking calendar read" on public.spd_service_tickets;
