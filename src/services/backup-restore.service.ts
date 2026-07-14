import { supabase } from '../lib/supabase';

export type BackupRestoreSummary = {
  table_count: number;
  row_count: number;
  storage_object_count: number;
};

export type BackupRestoreFunctionResult = {
  ok: boolean;
  backup_id?: string;
  created_at?: string;
  summary?: BackupRestoreSummary;
  apps_script?: {
    ok?: boolean;
    skipped?: boolean;
    reason?: string;
    result?: Record<string, unknown>;
  };
  backup?: Record<string, unknown>;
  restored?: Record<string, number>;
  errors?: Array<{ table: string; error: string }>;
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

function getBackupRestoreErrorMessage(reason?: string | null) {
  if (!reason) return 'ไม่สามารถดำเนินการ Backup / Restore ได้';
  if (reason === 'missing_authorization' || reason === 'invalid_authorization') return 'สิทธิ์เข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่';
  if (reason === 'super_admin_required') return 'เฉพาะ Super Admin เท่านั้นที่ใช้งาน Backup / Restore ได้';
  if (reason === 'missing_supabase_env') return 'Supabase Function ยังไม่ได้ตั้งค่า SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY';
  if (reason === 'missing_backup_restore_env') return 'ยังไม่ได้ตั้งค่า BACKUP_RESTORE_APPS_SCRIPT_URL หรือ BACKUP_RESTORE_SECRET ใน Supabase Secrets';
  if (reason === 'invalid_backup_payload') return 'ไฟล์ Backup ไม่ถูกต้องหรือไม่ใช่ไฟล์ของ PTDMS';
  return reason;
}

async function invokeBackupRestore(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('สิทธิ์เข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  const { data, error } = await supabase.functions.invoke('backup-restore-data', {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const reason = await getFunctionErrorReason(error);
    throw new Error(getBackupRestoreErrorMessage(reason));
  }

  const result = data as BackupRestoreFunctionResult;
  if (!result?.ok && !result?.restored) {
    throw new Error(getBackupRestoreErrorMessage(result?.reason));
  }

  return result;
}

export async function createSystemBackup(includeStorage = true) {
  return invokeBackupRestore({ action: 'create_backup', includeStorage });
}

export async function restoreSystemBackup(backup: Record<string, unknown>) {
  return invokeBackupRestore({ action: 'restore_backup', backup });
}

export function downloadBackupJson(backup: Record<string, unknown>) {
  const backupId = typeof backup.backup_id === 'string' ? backup.backup_id : 'ptdms-backup';
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${backupId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}