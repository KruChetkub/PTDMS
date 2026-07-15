-- Allow strategy calendar activities that do not reserve a physical meeting room.
alter table public.meeting_room_reservations
  drop constraint if exists meeting_room_reservations_room_check;

alter table public.meeting_room_reservations
  add constraint meeting_room_reservations_room_check
  check (room in ('ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องสมุด', 'ไม่ใช้ห้องประชุม'));

notify pgrst, 'reload schema';
