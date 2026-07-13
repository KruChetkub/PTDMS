-- Replace the AI ChatGPT booking calendar view with an RPC to avoid Security Definer View warnings.
-- Everyone who can sign in can still see booked AI ChatGPT dates and who booked them.
-- The RPC returns only the minimum fields needed for the calendar.

drop view if exists public.spd_service_ai_chatgpt_booking_calendar;

create or replace function public.get_spd_service_ai_chatgpt_booking_calendar(
  p_start_date date,
  p_end_date date
)
returns table (
  id uuid,
  requester_name text,
  requester_department text,
  subject text,
  requested_service_date date,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.requester_name,
    t.requester_department,
    t.subject,
    t.requested_service_date,
    t.created_at
  from public.spd_service_tickets t
  where
    public.current_user_role() is not null
    and t.subject = 'แจ้งใช้งาน AI ChatGPT'
    and t.requested_service_date is not null
    and t.requested_service_date >= p_start_date
    and t.requested_service_date <= p_end_date
    and t.status <> 'CANCELLED'
  order by t.requested_service_date asc, t.created_at asc;
$$;

revoke all on function public.get_spd_service_ai_chatgpt_booking_calendar(date, date) from public;
grant execute on function public.get_spd_service_ai_chatgpt_booking_calendar(date, date) to authenticated;

drop policy if exists "spd service tickets ai booking calendar read" on public.spd_service_tickets;
