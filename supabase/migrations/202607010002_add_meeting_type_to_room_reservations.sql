-- Add meeting format to meeting room reservations.
alter table public.meeting_room_reservations
  add column if not exists meeting_type text not null default 'การประชุมแบบ on site';

update public.meeting_room_reservations
set meeting_type = 'การประชุมแบบ on site'
where meeting_type is null or length(trim(meeting_type)) = 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_room_reservations_meeting_type_check'
      and conrelid = 'public.meeting_room_reservations'::regclass
  ) then
    alter table public.meeting_room_reservations
      add constraint meeting_room_reservations_meeting_type_check
      check (meeting_type in ('การประชุมแบบ on site', 'การประชุม online', 'การประชุมแบบ on site และ online'));
  end if;
end $$;