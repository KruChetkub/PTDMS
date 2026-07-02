import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types/database.types';

export type LoginHistory = {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  user_name?: string;
};

export type AuditLogStatus = 'success' | 'fail';

export type AuditLogInput = {
  module: string;
  action: string;
  route?: string;
  targetType?: string;
  targetId?: string | null;
  status?: AuditLogStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  requestId?: string | null;
  sessionId?: string | null;
};

const sensitiveKeyPattern = /(password|token|secret|apikey|api_key|authorization|otp|refresh|access)/i;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !sensitiveKeyPattern.test(key))
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  }

  return value;
}

export function sanitizeAuditData(value?: unknown) {
  if (!value) {
    return null;
  }

  return sanitizeValue(value) as Record<string, unknown>;
}

function getRoute() {
  if (typeof window === 'undefined') {
    return null;
  }

  return `${window.location.pathname}${window.location.search}`;
}

function getUserAgent() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator.userAgent || null;
}

export async function recordAuditLog(input: AuditLogInput) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { logged: false, reason: 'no_authenticated_user' };
    }

    const user = userData.user;
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name, role')
      .eq('user_id', user.id)
      .maybeSingle();

    const targetType = input.targetType || input.module;
    const targetId = input.targetId ?? null;
    const status = input.status || 'success';

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      actor_name: profile?.full_name ?? null,
      actor_role: profile?.role ?? null,
      module: input.module,
      action: input.action,
      route: input.route || getRoute(),
      resource_type: targetType,
      resource_id: targetId,
      target_type: targetType,
      target_id: targetId,
      status,
      error_message: input.errorMessage ?? null,
      metadata: sanitizeAuditData(input.metadata),
      before_data: sanitizeAuditData(input.beforeData),
      after_data: sanitizeAuditData(input.afterData),
      request_id: input.requestId ?? null,
      session_id: input.sessionId ?? null,
      user_agent: getUserAgent(),
      export_status: 'pending',
    });

    if (error) {
      console.warn('Audit log insert failed:', error.message);
      return { logged: false, reason: error.message };
    }

    return { logged: true };
  } catch (error) {
    console.warn('Audit log insert failed:', error);
    return { logged: false, reason: error instanceof Error ? error.message : 'unknown_error' };
  }
}

export type AuditLogGoogleSheetExportResult = {
  exported: boolean;
  trigger?: 'manual' | 'scheduler';
  batch_id?: string;
  total_logs?: number;
  cleanup_deleted?: number;
  cleanup_error?: string | null;
  reason?: string;
};

async function getFunctionErrorReason(error: unknown) {
  const context = (error as { context?: unknown })?.context;

  if (context instanceof Response) {
    try {
      const result = await context.clone().json() as { reason?: string; message?: string; error?: string };
      return result.reason || result.message || result.error || null;
    } catch {
      try {
        return await context.clone().text();
      } catch {
        return null;
      }
    }
  }

  return error instanceof Error ? error.message : null;
}

export async function exportAuditLogsToGoogleSheet() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('missing_authorization');
  }

  const { data, error } = await supabase.functions.invoke('export-audit-logs', {
    body: { trigger: 'manual' },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const reason = await getFunctionErrorReason(error);
    throw new Error(reason || 'ไม่สามารถส่งออก Audit Logs ไป Google Sheet ได้');
  }

  const result = data as AuditLogGoogleSheetExportResult;
  if (!result?.exported) {
    throw new Error(result?.reason || 'ไม่สามารถส่งออก Audit Logs ไป Google Sheet ได้');
  }

  return result;
}
export async function listAuditLogs(limit = 200) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

export async function listLoginHistory() {
  const { data, error } = await supabase
    .from('login_history')
    .select('*, profiles(full_name)')
    .order('login_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return data.map((history: any) => ({
    ...history,
    user_name: history.profiles?.full_name || 'Unknown',
  })) as LoginHistory[];
}
