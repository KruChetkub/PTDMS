import { supabase } from '../lib/supabase';
import type { ProfileStatus, UserRole } from '../types/roles';

export type MfaEnforcementUser = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  status: ProfileStatus;
  mfa_required: boolean;
  mfa_required_at: string | null;
  mfa_required_by: string | null;
  mfa_enabled: boolean;
};

export async function listMfaEnforcementUsers() {
  const { data, error } = await supabase.rpc('list_mfa_enforcement_users');
  if (error) throw error;
  return (data ?? []) as MfaEnforcementUser[];
}

export async function setMfaRequirement(userIds: string[], required: boolean) {
  const { data, error } = await supabase.rpc('set_mfa_requirement', {
    target_user_ids: userIds,
    required,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
