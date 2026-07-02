import { supabase } from '../lib/supabase';
import type { MeetingRoomReservation } from '../types/database.types';

const meetingRoomReservationSelect =
  'id, legacy_id, reservation_date, room, meeting_type, online_meeting_url, details, start_time, end_time, booker_name, work_group, topic, created_by, cancelled_at, cancelled_by, created_at, updated_at';

export type MeetingRoomReservationForm = {
  reservationDate: string;
  room: string;
  meetingType: string;
  onlineMeetingUrl: string;
  details: string;
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
    meeting_type: input.meetingType,
    online_meeting_url: input.onlineMeetingUrl.trim() || null,
    details: input.details.trim() || null,
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

export async function listUpcomingMeetingRoomLinkNotifications(fromDate: string) {
  const { data, error } = await supabase
    .from('meeting_room_reservations')
    .select(meetingRoomReservationSelect)
    .gte('reservation_date', fromDate)
    .is('cancelled_at', null)
    .not('online_meeting_url', 'is', null)
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

export type MeetingRoomTelegramNotifyResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
};

export async function notifyMeetingRoomReservationCreated(reservationId: string): Promise<MeetingRoomTelegramNotifyResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('ไม่พบ session สำหรับส่ง Telegram notification');
  }

  const { data, error } = await supabase.functions.invoke('meeting-room-telegram-notify', {
    body: {
      event: 'reservation_created',
      reservationId,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw error;
  }

  return (data || { sent: false, skipped: true, reason: 'empty_response' }) as MeetingRoomTelegramNotifyResult;
}

export type MeetingRoomReservationRow = MeetingRoomReservation;
