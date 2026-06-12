import { supabase } from '../lib/supabase';
import type {
  Profile,
  SpdServiceCategory,
  SpdServiceNotificationSettings,
  SpdServiceSatisfactionSurvey,
  SpdServiceTicket,
  SpdServiceTicketTimeline,
  SpdServiceTicketStatus,
  SpdServiceUrgency,
} from '../types/database.types';

export type SpdServiceDashboardData = {
  tickets: SpdServiceTicket[];
  categories: SpdServiceCategory[];
  surveys: SpdServiceSatisfactionSurvey[];
};

export type SpdServiceTicketDetail = {
  ticket: SpdServiceTicket;
  timeline: SpdServiceTicketTimeline[];
};

export type CreateSpdServiceTicketValues = {
  requesterId: string;
  requesterName: string;
  requesterDepartment: string | null;
  requesterPhone: string;
  categoryId: string | null;
  categoryName: string;
  urgency: SpdServiceUrgency;
  subject: string;
  description: string;
};

export type UpdateSpdServiceTicketWorkflowValues = {
  ticket: SpdServiceTicket;
  actorId: string;
  nextStatus: SpdServiceTicketStatus;
  action: string;
  note: string;
  updates?: Partial<
    Pick<
      SpdServiceTicket,
      | 'assigned_to'
      | 'assigned_at'
      | 'started_at'
      | 'completed_at'
      | 'cancelled_at'
      | 'problem_cause'
      | 'resolution_method'
      | 'resolution_result'
      | 'resolution_minutes'
    >
  >;
};

export type CreateSpdServiceSatisfactionSurveyValues = {
  ticketId: string;
  requesterId: string;
  speedRating: number;
  qualityRating: number;
  courtesyRating: number;
  overallRating: number;
  comment: string | null;
};

export type SpdServiceTelegramSettings = {
  enabled: boolean;
  chatId: string;
  adminRecipientIds: string[];
  adminUsernames: Record<string, string>;
  messageTemplate: string;
};

export type SaveSpdServiceTelegramSettingsValues = SpdServiceTelegramSettings & {
  updatedBy: string;
};

export type SpdServiceTelegramNotifyResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
};

const telegramSettingKeys = {
  enabled: 'telegram_enabled',
  chatId: 'telegram_chat_id',
  adminRecipientIds: 'telegram_admin_recipient_ids',
  adminUsernames: 'telegram_admin_usernames',
  messageTemplate: 'telegram_ticket_created_template',
} as const;

export const defaultSpdServiceTelegramMessageTemplate = [
  '<b>SPD Service: มีคำขอใหม่</b>',
  'เลขคำขอ: <code>{{ticket_no}}</code>',
  'หัวข้อ: {{subject}}',
  'ประเภท: {{category_name}}',
  'ความเร่งด่วน: {{urgency}}',
  'ผู้แจ้ง: {{requester_name}}',
  'หน่วยงาน: {{requester_department}}',
  'โทร: {{requester_phone}}',
  'สถานะ: {{status}}',
  'เวลาแจ้ง: {{created_at}}',
  'Mention Admin: {{admin_mentions}}',
  '',
  '<b>รายละเอียด</b>',
  '{{description}}',
].join('\n');

function parseAdminRecipientIds(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseAdminUsernames(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
        .map(([adminId, username]) => [adminId, username.trim()]),
    );
  } catch {
    return {};
  }
}

export async function getSpdServiceCategories(): Promise<SpdServiceCategory[]> {
  const { data, error } = await supabase
    .from('spd_service_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getSpdServiceDashboardData(): Promise<SpdServiceDashboardData> {
  const [ticketsResult, categoriesResult, surveysResult] = await Promise.all([
    supabase.from('spd_service_tickets').select('*').order('created_at', { ascending: false }),
    supabase.from('spd_service_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('spd_service_satisfaction_surveys').select('*').order('created_at', { ascending: false }),
  ]);

  if (ticketsResult.error) {
    throw ticketsResult.error;
  }

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (surveysResult.error) {
    throw surveysResult.error;
  }

  return {
    tickets: ticketsResult.data || [],
    categories: categoriesResult.data || [],
    surveys: surveysResult.data || [],
  };
}

export async function getSpdServiceTickets(): Promise<SpdServiceTicket[]> {
  const { data, error } = await supabase
    .from('spd_service_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getMySpdServiceTickets(userId: string): Promise<SpdServiceTicket[]> {
  const { data, error } = await supabase
    .from('spd_service_tickets')
    .select('*')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getMySpdServiceSatisfactionSurveys(userId: string): Promise<SpdServiceSatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from('spd_service_satisfaction_surveys')
    .select('*')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getSpdServiceTicketDetail(ticketId: string): Promise<SpdServiceTicketDetail> {
  const [ticketResult, timelineResult] = await Promise.all([
    supabase.from('spd_service_tickets').select('*').eq('id', ticketId).single(),
    supabase.from('spd_service_ticket_timeline').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
  ]);

  if (ticketResult.error) {
    throw ticketResult.error;
  }

  if (timelineResult.error) {
    throw timelineResult.error;
  }

  return {
    ticket: ticketResult.data,
    timeline: timelineResult.data || [],
  };
}

export async function createSpdServiceTicket(values: CreateSpdServiceTicketValues): Promise<SpdServiceTicket> {
  const ticketDate = new Date().toISOString().slice(0, 10);
  const ticketNoResult = await supabase.rpc('generate_spd_service_ticket_no', {
    category_label: values.categoryName,
    created_on: ticketDate,
  });

  if (ticketNoResult.error) {
    throw ticketNoResult.error;
  }

  const ticketNo = ticketNoResult.data;
  const { data, error } = await supabase
    .from('spd_service_tickets')
    .insert({
      ticket_no: ticketNo,
      requester_id: values.requesterId,
      requester_name: values.requesterName,
      requester_department: values.requesterDepartment,
      requester_phone: values.requesterPhone,
      category_id: values.categoryId,
      category_name: values.categoryName,
      urgency: values.urgency,
      subject: values.subject,
      description: values.description,
      status: 'NEW',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const ticket = data as SpdServiceTicket;
  const timelineResult = await supabase.from('spd_service_ticket_timeline').insert({
    ticket_id: ticket.id,
    actor_id: values.requesterId,
    action: 'CREATE_TICKET',
    to_status: 'NEW',
    note: 'ผู้ใช้งานสร้างคำขอใหม่',
    metadata: {
      ticket_no: ticket.ticket_no,
      category_name: ticket.category_name,
      urgency: ticket.urgency,
    },
  });

  if (timelineResult.error) {
    throw timelineResult.error;
  }

  return ticket;
}

export async function notifySpdServiceTicketCreated(ticketId: string): Promise<SpdServiceTelegramNotifyResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('ไม่พบ session สำหรับส่ง Telegram notification');
  }

  const { data, error } = await supabase.functions.invoke('spd-service-telegram-notify', {
    body: {
      event: 'ticket_created',
      ticketId,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw error;
  }

  return (data || { sent: false, skipped: true, reason: 'empty_response' }) as SpdServiceTelegramNotifyResult;
}

export async function updateSpdServiceTicketWorkflow(values: UpdateSpdServiceTicketWorkflowValues): Promise<SpdServiceTicket> {
  const { ticket, actorId, nextStatus, action, note, updates = {} } = values;
  const { data, error } = await supabase
    .from('spd_service_tickets')
    .update({
      ...updates,
      status: nextStatus,
    })
    .eq('id', ticket.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const updatedTicket = data as SpdServiceTicket;
  const timelineResult = await supabase.from('spd_service_ticket_timeline').insert({
    ticket_id: ticket.id,
    actor_id: actorId,
    action,
    from_status: ticket.status,
    to_status: nextStatus,
    note,
    metadata: {
      ticket_no: ticket.ticket_no,
      subject: ticket.subject,
    },
  });

  if (timelineResult.error) {
    throw timelineResult.error;
  }

  return updatedTicket;
}

export async function deleteSpdServiceTicket(ticketId: string): Promise<void> {
  const { error } = await supabase
    .from('spd_service_tickets')
    .delete()
    .eq('id', ticketId);

  if (error) {
    throw error;
  }
}

export async function createSpdServiceSatisfactionSurvey(
  values: CreateSpdServiceSatisfactionSurveyValues,
): Promise<SpdServiceSatisfactionSurvey> {
  const { data, error } = await supabase
    .from('spd_service_satisfaction_surveys')
    .insert({
      ticket_id: values.ticketId,
      requester_id: values.requesterId,
      speed_rating: values.speedRating,
      quality_rating: values.qualityRating,
      courtesy_rating: values.courtesyRating,
      overall_rating: values.overallRating,
      comment: values.comment,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getSpdServiceAdminRecipients(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, employee_code, full_name, position, department, work_group, gender, education, birth_date, generation, employment_type, role, status, avatar_url, created_at, updated_at')
    .eq('role', 'admin')
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getSpdServiceTelegramSettings(): Promise<SpdServiceTelegramSettings> {
  const { data, error } = await supabase
    .from('spd_service_notification_settings')
    .select('*')
    .in('setting_key', Object.values(telegramSettingKeys));

  if (error) {
    throw error;
  }

  const settingsByKey = new Map((data || []).map((item: SpdServiceNotificationSettings) => [item.setting_key, item]));

  return {
    enabled: settingsByKey.get(telegramSettingKeys.enabled)?.setting_value === 'true',
    chatId: settingsByKey.get(telegramSettingKeys.chatId)?.setting_value || '',
    adminRecipientIds: parseAdminRecipientIds(settingsByKey.get(telegramSettingKeys.adminRecipientIds)?.setting_value),
    adminUsernames: parseAdminUsernames(settingsByKey.get(telegramSettingKeys.adminUsernames)?.setting_value),
    messageTemplate: settingsByKey.get(telegramSettingKeys.messageTemplate)?.setting_value || defaultSpdServiceTelegramMessageTemplate,
  };
}

export async function saveSpdServiceTelegramSettings(values: SaveSpdServiceTelegramSettingsValues): Promise<void> {
  const rows = [
    {
      setting_key: telegramSettingKeys.enabled,
      setting_value: values.enabled ? 'true' : 'false',
      is_secret: false,
      is_active: true,
      updated_by: values.updatedBy,
    },
    {
      setting_key: telegramSettingKeys.chatId,
      setting_value: values.chatId.trim(),
      is_secret: false,
      is_active: values.enabled,
      updated_by: values.updatedBy,
    },
    {
      setting_key: telegramSettingKeys.adminRecipientIds,
      setting_value: JSON.stringify(values.adminRecipientIds),
      is_secret: false,
      is_active: values.enabled,
      updated_by: values.updatedBy,
    },
    {
      setting_key: telegramSettingKeys.adminUsernames,
      setting_value: JSON.stringify(values.adminUsernames),
      is_secret: false,
      is_active: values.enabled,
      updated_by: values.updatedBy,
    },
    {
      setting_key: telegramSettingKeys.messageTemplate,
      setting_value: values.messageTemplate.trim() || defaultSpdServiceTelegramMessageTemplate,
      is_secret: false,
      is_active: values.enabled,
      updated_by: values.updatedBy,
    },
  ];

  const { error } = await supabase
    .from('spd_service_notification_settings')
    .upsert(rows, { onConflict: 'setting_key' });

  if (error) {
    throw error;
  }
}
