import { supabase } from '../lib/supabase';
import type { ProfileStatus, UserRole } from '../types/roles';

export type ForcePasswordChangeUser = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  status: ProfileStatus;
  force_password_change: boolean;
  force_password_change_requested_at: string | null;
  force_password_change_requested_by: string | null;
  password_changed_at: string | null;
};

export async function listForcePasswordChangeUsers() {
  const { data, error } = await supabase.rpc('list_force_password_change_users');
  if (error) throw error;
  return (data ?? []) as ForcePasswordChangeUser[];
}

export async function setForcePasswordChange(userIds: string[] | null, forceChange: boolean) {
  const { data, error } = await supabase.rpc('set_force_password_change', {
    target_user_ids: userIds,
    force_change: forceChange,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
