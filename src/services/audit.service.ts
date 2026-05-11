import { supabase } from '../lib/supabase';

export type LoginHistory = {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  user_name?: string;
};

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
