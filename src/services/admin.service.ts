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

export type UpdateUserDetailsPayload = {
  employee_code?: string | null;
  full_name?: string | null;
  position?: string | null;
  department?: string | null;
  work_group?: string | null;
  gender?: 'male' | 'female' | null;
  education?: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
  birth_date?: string | null;
  employment_type?: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
};

export async function updateUserDetails(userId: string, payload: UpdateUserDetailsPayload) {
  const { error } = await (supabase as any).rpc('update_user_profile_details', {
    p_user_id: userId,
    p_employee_code: payload.employee_code ?? null,
    p_full_name: payload.full_name ?? null,
    p_position: payload.position ?? null,
    p_department: payload.department ?? null,
    p_work_group: payload.work_group ?? null,
    p_gender: payload.gender ?? null,
    p_education: payload.education ?? null,
    p_birth_date: payload.birth_date ?? null,
    p_employment_type: payload.employment_type ?? null,
  });

  if (error) throw error;
}
