import { AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/env';

export function ConfiguredNotice() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">ยังไม่ได้ตั้งค่า Supabase</p>
        <p>เพิ่ม `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ในไฟล์ `.env` ก่อนทดสอบ Auth จริง</p>
      </div>
    </div>
  );
}

