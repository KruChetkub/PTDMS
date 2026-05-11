import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export function ForbiddenPage() {
  const profile = useAuthStore((state) => state.profile);
  const homePath = profile?.role === 'personnel' ? '/profile' : '/dashboard';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md rounded-md border border-amber-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-amber-800">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="mt-2 text-sm text-slate-600">ระบบ RBAC ป้องกัน Route นี้ตาม Role ของผู้ใช้งาน</p>
        <Link className="mt-5 inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to={homePath}>
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
