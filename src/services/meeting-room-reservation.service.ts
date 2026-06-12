import { supabase } from '../lib/supabase';
import type { MeetingRoomReservation } from '../types/database.types';

const meetingRoomReservationSelect =
  'id, legacy_id, reservation_date, room, start_time, end_time, booker_name, work_group, topic, created_by, cancelled_at, cancelled_by, created_at, updated_at';

export type MeetingRoomReservationForm = {
  reservationDate: string;
  room: string;
  startTime: string;
  endTime: string;
  bookerName: string;
  workGroup: string;
  topic: string;
};

function toReservationPayload(input: MeetingRoomReservationForm) {
  return {
    reservation_date: input.reservationDate,
    room: input.room,
    start_time: input.startTime,
    end_time: input.endTime,
    booker_name: input.bookerName.trim(),
    work_group: input.workGroup.trim(),
    topic: input.topic.trim(),
  };
}

export async function listMeetingRoomReservations(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('meeting_room_reservations')
    .select(meetingRoomReservationSelect)
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)
    .is('cancelled_at', null)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAllMeetingRoomReservations() {
  const { data, error } = await supabase
    .from('meeting_room_reservations')
    .select(meetingRoomReservationSelect)
    .is('cancelled_at', null)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createMeetingRoomReservation(input: MeetingRoomReservationForm) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(userError.message);
  }

  const { data, error } = await supabase
    .from('meeting_room_reservations')
    .insert({ ...toReservationPayload(input), created_by: userData.user?.id ?? null })
    .select(meetingRoomReservationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateMeetingRoomReservation(reservationId: string, input: MeetingRoomReservationForm) {
  const { data, error } = await supabase
    .from('meeting_room_reservations')
    .update({
      ...toReservationPayload(input),
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq('id', reservationId)
    .select(meetingRoomReservationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function cancelMeetingRoomReservation(reservationId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(userError.message);
  }

  const { data, error } = await supabase
    .from('meeting_room_reservations')
    .update({
      cancelled_at: new Date().toISOString(),
      cancelled_by: userData.user?.id ?? null,
    })
    .eq('id', reservationId)
    .select(meetingRoomReservationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export type MeetingRoomReservationRow = MeetingRoomReservation;
