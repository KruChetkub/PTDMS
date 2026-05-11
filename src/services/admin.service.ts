import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database.types';
import type { UserRole, ProfileStatus } from '../types/roles';

export async function listAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  if (error) throw error;
  return data as Profile[];
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      role,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function updateUserStatus(userId: string, status: ProfileStatus) {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteUser(userId: string) {
  // We call the RPC function we'll define in Supabase
  const { error } = await (supabase as any).rpc('delete_user', { target_user_id: userId });

  if (error) throw error;
}
