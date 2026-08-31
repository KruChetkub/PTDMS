import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';
import { canAccess } from '../../types/roles';
import { useAutoLogoutTimer } from '../../features/auth/hooks/useAutoLogoutTimer';
import { ForcedPasswordChangeGate } from './ForcedPasswordChangeGate';

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
  allowedPermissions?: string[];
};

export function ProtectedRoute({ allowedRoles, allowedPermissions }: ProtectedRouteProps) {
  const location = useLocation();
  const { initialize, initialized, loading, user, profile, permissions, refreshProfile } = useAuthStore();
  useAutoLogoutTimer(Boolean(initialized && user && profile?.status === 'active' && !profile.force_password_change));

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized || !user) return undefined;

    const refresh = () => {
      void refreshProfile();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const intervalId = window.setInterval(refresh, 30_000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    refresh();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialized, location.pathname, refreshProfile, user]);

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          กำลังตรวจสอบสิทธิ์ผู้ใช้งาน...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-md border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-800">ไม่พบโปรไฟล์ผู้ใช้งาน</h1>
          <p className="mt-2 text-sm text-slate-600">
            บัญชีนี้ Login ได้แล้ว แต่ยังไม่มีข้อมูลในตาราง `profiles` กรุณาให้ผู้ดูแลระบบตรวจสอบ Supabase
            migration และข้อมูลผู้ใช้
          </p>
        </div>
      </div>
    );
  }

  // Handle account approval status
  if (profile.status === 'pending') {
    if (location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />;
    }
    return <Outlet />;
  }

  if (profile.status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-md border border-amber-200 bg-white p-6 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-amber-800 uppercase">Account Restricted</h1>
          <p className="mt-2 text-sm text-slate-600">บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      </div>
    );
  }

  if (profile.force_password_change) {
    return <ForcedPasswordChangeGate />;
  }

  const roleAllowed = Boolean(allowedRoles?.length && canAccess(profile.role, allowedRoles));
  const permissionAllowed = Boolean(allowedPermissions?.some((permission) => permissions.includes(permission)));
  const hasAccessRule = Boolean(allowedRoles?.length || allowedPermissions?.length);

  if (hasAccessRule && !roleAllowed && !permissionAllowed) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
