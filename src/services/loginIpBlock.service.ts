import { supabase } from '../lib/supabase';
import type { LoginIpBlockSettings, LoginIpRule } from '../types/database.types';

export type LoginIpSettingsInput = Pick<
  LoginIpBlockSettings,
  'enabled' | 'attempt_limit' | 'window_minutes' | 'permanent_block' | 'auto_unblock_days'
>;

export async function getLoginIpBlockSettings() {
  const { data, error } = await supabase
    .from('login_ip_block_settings')
    .select('*')
    .eq('singleton_id', 1)
    .single();
  if (error) throw error;
  return data as LoginIpBlockSettings;
}

export async function updateLoginIpBlockSettings(input: LoginIpSettingsInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('ไม่พบผู้ใช้ที่ยืนยันตัวตน');

  const { data, error } = await supabase
    .from('login_ip_block_settings')
    .update({
      ...input,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('singleton_id', 1)
    .select('*')
    .single();
  if (error) throw error;
  return data as LoginIpBlockSettings;
}

export async function listLoginIpRules() {
  const { data, error } = await supabase
    .from('login_ip_rules')
    .select('*')
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LoginIpRule[];
}

export async function saveLoginIpRule(input: {
  ipAddress: string;
  ruleType: LoginIpRule['rule_type'];
  reason: string;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('ไม่พบผู้ใช้ที่ยืนยันตัวตน');

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('login_ip_rules')
    .upsert({
      ip_address: input.ipAddress.trim(),
      rule_type: input.ruleType,
      source: 'manual',
      is_active: true,
      reason: input.reason.trim().slice(0, 500),
      failed_attempt_count: 0,
      blocked_at: input.ruleType === 'block' ? now : null,
      expires_at: null,
      created_by: userData.user.id,
      updated_by: userData.user.id,
      updated_at: now,
    }, { onConflict: 'ip_address' })
    .select('*')
    .single();
  if (error) throw error;
  return data as LoginIpRule;
}

export async function deactivateLoginIpRule(ruleId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('ไม่พบผู้ใช้ที่ยืนยันตัวตน');

  const { error } = await supabase
    .from('login_ip_rules')
    .update({
      is_active: false,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId);
  if (error) throw error;
}
