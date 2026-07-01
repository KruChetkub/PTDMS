import { supabase } from '../lib/supabase';
import { runSupabaseQuery } from '../lib/supabase-query';

export const SYSTEM_SETTINGS_UPDATED_EVENT = 'ptdms-system-settings-updated';
export const LOGIN_SECURITY_SETTING_KEY = 'login_security';
export const DEFAULT_AUTO_LOGOUT_MINUTES = 30;
export const MIN_AUTO_LOGOUT_MINUTES = 5;
export const MAX_AUTO_LOGOUT_MINUTES = 480;

export type LoginSecuritySettings = {
  autoLogoutMinutes: number;
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

export function normalizeLoginSecuritySettings(value: unknown): LoginSecuritySettings {
  if (!value || typeof value !== 'object') {
    return { autoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES };
  }

  const settings = value as Record<string, unknown>;
  return {
    autoLogoutMinutes: clampAutoLogoutMinutes(settings.autoLogoutMinutes),
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
