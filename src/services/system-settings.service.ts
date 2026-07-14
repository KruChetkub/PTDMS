import { supabase } from '../lib/supabase';
import { runSupabaseQuery } from '../lib/supabase-query';

export const SYSTEM_SETTINGS_UPDATED_EVENT = 'ptdms-system-settings-updated';
export const LOGIN_SECURITY_SETTING_KEY = 'login_security';
export const BACKUP_RESTORE_SETTING_KEY = 'backup_restore';
export const DEFAULT_AUTO_LOGOUT_MINUTES = 30;
export const MIN_AUTO_LOGOUT_MINUTES = 5;
export const MAX_AUTO_LOGOUT_MINUTES = 480;

export type LoginSecuritySettings = {
  autoLogoutMinutes: number;
};

export type RestoreTestStatus = 'not_started' | 'passed' | 'failed';

export type RestoreTestRecord = {
  id: string;
  testDate: string;
  tester: string;
  scope: string;
  status: RestoreTestStatus;
  notes: string;
};

export type BackupRestoreSettings = {
  rpoHours: number;
  rtoHours: number;
  databaseBackupSchedule: string;
  storageBackupSchedule: string;
  responsibleOwner: string;
  lastRestoreTestDate: string;
  restoreTestStatus: RestoreTestStatus;
  restoreTestRecords: RestoreTestRecord[];
};

type SystemSettingRow = {
  setting_key: string;
  setting_value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
};

function clampAutoLogoutMinutes(value: unknown) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_AUTO_LOGOUT_MINUTES;
  }

  return Math.min(MAX_AUTO_LOGOUT_MINUTES, Math.max(MIN_AUTO_LOGOUT_MINUTES, Math.round(numericValue)));
}

function clampPositiveHours(value: unknown, fallback: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(720, Math.max(1, Math.round(numericValue)));
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeRestoreTestStatus(value: unknown): RestoreTestStatus {
  return value === 'passed' || value === 'failed' || value === 'not_started' ? value : 'not_started';
}

function normalizeRestoreTestRecords(value: unknown): RestoreTestRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: normalizeText(item.id, `restore-test-${index + 1}`),
      testDate: normalizeText(item.testDate),
      tester: normalizeText(item.tester),
      scope: normalizeText(item.scope),
      status: normalizeRestoreTestStatus(item.status),
      notes: normalizeText(item.notes),
    }));
}

export function normalizeLoginSecuritySettings(value: unknown): LoginSecuritySettings {
  if (!value || typeof value !== 'object') {
    return { autoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES };
  }

  const settings = value as Record<string, unknown>;
  return {
    autoLogoutMinutes: clampAutoLogoutMinutes(settings.autoLogoutMinutes),
  };
}

export function normalizeBackupRestoreSettings(value: unknown): BackupRestoreSettings {
  if (!value || typeof value !== 'object') {
    return {
      rpoHours: 24,
      rtoHours: 4,
      databaseBackupSchedule: 'ตรวจ Supabase daily backup / PITR ตามแผนบริการ และบันทึกหลักฐานทุกเดือน',
      storageBackupSchedule: 'ตรวจ bucket สำคัญและสำรองไฟล์แนบ/รูปภาพตามรอบที่กำหนด',
      responsibleOwner: '',
      lastRestoreTestDate: '',
      restoreTestStatus: 'not_started',
      restoreTestRecords: [],
    };
  }

  const settings = value as Record<string, unknown>;
  return {
    rpoHours: clampPositiveHours(settings.rpoHours, 24),
    rtoHours: clampPositiveHours(settings.rtoHours, 4),
    databaseBackupSchedule: normalizeText(
      settings.databaseBackupSchedule,
      'ตรวจ Supabase daily backup / PITR ตามแผนบริการ และบันทึกหลักฐานทุกเดือน',
    ),
    storageBackupSchedule: normalizeText(
      settings.storageBackupSchedule,
      'ตรวจ bucket สำคัญและสำรองไฟล์แนบ/รูปภาพตามรอบที่กำหนด',
    ),
    responsibleOwner: normalizeText(settings.responsibleOwner),
    lastRestoreTestDate: normalizeText(settings.lastRestoreTestDate),
    restoreTestStatus: normalizeRestoreTestStatus(settings.restoreTestStatus),
    restoreTestRecords: normalizeRestoreTestRecords(settings.restoreTestRecords),
  };
}

export async function loadLoginSecuritySettings() {
  const { data } = await runSupabaseQuery(
    supabase
      .from('system_settings')
      .select('setting_key, setting_value, description, updated_at')
      .eq('setting_key', LOGIN_SECURITY_SETTING_KEY)
      .maybeSingle(),
    'โหลดการตั้งค่าความปลอดภัย',
  );

  const row = data as SystemSettingRow | null;
  return normalizeLoginSecuritySettings(row?.setting_value);
}

export async function saveLoginSecuritySettings(settings: LoginSecuritySettings) {
  const nextSettings = normalizeLoginSecuritySettings(settings);

  const { data } = await runSupabaseQuery(
    supabase
      .from('system_settings')
      .upsert(
        {
          setting_key: LOGIN_SECURITY_SETTING_KEY,
          setting_value: nextSettings,
          description: 'Browser inactivity auto logout timer in minutes.',
        },
        { onConflict: 'setting_key' },
      )
      .select('setting_key, setting_value, description, updated_at')
      .single(),
    'บันทึกการตั้งค่าความปลอดภัย',
  );

  window.dispatchEvent(new CustomEvent(SYSTEM_SETTINGS_UPDATED_EVENT, { detail: nextSettings }));

  const row = data as SystemSettingRow;
  return normalizeLoginSecuritySettings(row.setting_value);
}

export async function loadBackupRestoreSettings() {
  const { data } = await runSupabaseQuery(
    supabase
      .from('system_settings')
      .select('setting_key, setting_value, description, updated_at')
      .eq('setting_key', BACKUP_RESTORE_SETTING_KEY)
      .maybeSingle(),
    'โหลดการตั้งค่า Backup / Restore',
  );

  const row = data as SystemSettingRow | null;
  return normalizeBackupRestoreSettings(row?.setting_value);
}

export async function saveBackupRestoreSettings(settings: BackupRestoreSettings) {
  const nextSettings = normalizeBackupRestoreSettings(settings);

  const { data } = await runSupabaseQuery(
    supabase
      .from('system_settings')
      .upsert(
        {
          setting_key: BACKUP_RESTORE_SETTING_KEY,
          setting_value: nextSettings,
          description: 'PTDMS backup, restore, RPO/RTO, and restore test evidence settings.',
        },
        { onConflict: 'setting_key' },
      )
      .select('setting_key, setting_value, description, updated_at')
      .single(),
    'บันทึกการตั้งค่า Backup / Restore',
  );

  const row = data as SystemSettingRow;
  return normalizeBackupRestoreSettings(row.setting_value);
}
