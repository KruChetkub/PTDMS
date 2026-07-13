import { supabase } from '../lib/supabase';
import { sanitizePlainTextInput, optionalPlainTextInput, sanitizeUrlInput } from '../utils/inputSecurity';
import type { MeetingRoomReservation } from '../types/database.types';
import { recordAuditLog } from './audit.service';

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
    room: sanitizePlainTextInput(input.room, { fieldName: 'ห้องประชุม', maxLength: 120, allowNewlines: false }),
    meeting_type: sanitizePlainTextInput(input.meetingType, { fieldName: 'รูปแบบการประชุม', maxLength: 120, allowNewlines: false }),
    online_meeting_url: sanitizeUrlInput(input.onlineMeetingUrl, { fieldName: 'ลิงก์ประชุมออนไลน์', maxLength: 1000 }),
    details: optionalPlainTextInput(input.details, { fieldName: 'รายละเอียดการประชุม', maxLength: 4000 }),
    start_time: input.startTime,
    end_time: input.endTime,
    booker_name: sanitizePlainTextInput(input.bookerName, { fieldName: 'ชื่อผู้จอง', maxLength: 200, allowNewlines: false }),
    work_group: sanitizePlainTextInput(input.workGroup, { fieldName: 'กลุ่มงาน', maxLength: 200, allowNewlines: false }),
    topic: sanitizePlainTextInput(input.topic, { fieldName: 'หัวข้อประชุม', maxLength: 240, allowNewlines: false }),
  };
}

function toReservationMetadata(reservation: MeetingRoomReservation) {
  return {
    room_name: reservation.room,
    reservation_date: reservation.reservation_date,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    title: reservation.topic,
    booker_name: reservation.booker_name,
    work_group: reservation.work_group,
    meeting_type: reservation.meeting_type,
  };
}

async function getReservationSnapshot(reservationId: string) {
  const { data } = await supabase
    .from('meeting_room_reservations')
    .select(meetingRoomReservationSelect)
    .eq('id', reservationId)
    .maybeSingle();

  return data ?? null;
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

export async function listUpcomingMeetingRoomLinkNotifications(
  fromDate: string,
  options?: { userId?: string; includeAll?: boolean },
) {
  const includeAll = options?.includeAll ?? false;
  const userId = options?.userId;

  let query = supabase
    .from('meeting_room_reservations')
    .select(meetingRoomReservationSelect)
    .gte('reservation_date', fromDate)
    .is('cancelled_at', null)
    .not('online_meeting_url', 'is', null)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (!includeAll) {
    if (!userId) {
      return [];
    }

    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;

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

  void recordAuditLog({
    module: 'meeting_room',
    action: 'meeting_room_reservation_create',
    route: '/strategy-calendar/meeting-room-booking',
    targetType: 'meeting_room_reservation',
    targetId: data.id,
    metadata: toReservationMetadata(data),
  });

  return data;
}

export async function updateMeetingRoomReservation(reservationId: string, input: MeetingRoomReservationForm) {
  const beforeReservation = await getReservationSnapshot(reservationId);
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

  void recordAuditLog({
    module: 'meeting_room',
    action: 'meeting_room_reservation_update',
    route: '/strategy-calendar/meeting-room-booking',
    targetType: 'meeting_room_reservation',
    targetId: data.id,
    beforeData: beforeReservation,
    afterData: data,
    metadata: toReservationMetadata(data),
  });

  return data;
}

export async function cancelMeetingRoomReservation(reservationId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(userError.message);
  }

  const beforeReservation = await getReservationSnapshot(reservationId);
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

  void recordAuditLog({
    module: 'meeting_room',
    action: 'meeting_room_reservation_cancel',
    route: '/strategy-calendar/meeting-room-booking',
    targetType: 'meeting_room_reservation',
    targetId: data.id,
    beforeData: beforeReservation,
    afterData: data,
    metadata: toReservationMetadata(data),
  });

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