-- Add optional meeting room booking details for online and hybrid meetings.
alter table public.meeting_room_reservations
  add column if not exists online_meeting_url text,
  add column if not exists details text;