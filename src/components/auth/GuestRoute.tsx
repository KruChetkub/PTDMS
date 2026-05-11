import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

/**
 * GuestRoute ensures that authenticated users are redirected away from
 * pages meant for guests (like Login, Register, etc.)
 */
export function GuestRoute() {
  const { initialize, initialized, loading, user, profile } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          กำลังตรวจสอบสถานะการเข้าสู่ระบบ...
        </div>
      </div>
    );
  }

  if (user && profile) {
    // If already logged in, redirect to an appropriate home page
    const defaultPath = profile.role === 'personnel' ? '/profile' : '/dashboard';
    return <Navigate to={defaultPath} replace />;
  }

  return <Outlet />;
}
