import { useState } from 'react';
import { ArrowLeft, CalendarDays, LockKeyhole, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { cn } from '../../utils/cn';
import { ConfirmModal } from '../ui/ConfirmModal';

export function CalendarLayout() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { profile, signOut } = useAuthStore();
  const role = profile?.role;

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <div className="mb-8">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              กลับ Portal
            </button>
            <div className="text-xl font-bold text-emerald-700">Strategy Calendar</div>
            <div className="mt-1 text-sm text-slate-500">กองยุทธศาสตร์และแผนงาน</div>
          </div>

          <nav className="space-y-1">
            <NavLink
              to="/strategy-calendar"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Activity Calendar
            </NavLink>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate('/portal')}
                  className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition hover:text-emerald-900 lg:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  กลับ Portal
                </button>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{profile?.full_name || 'PTDMS User'}</div>
                  <div className="truncate text-xs text-slate-500">
                    {profile?.department || 'No department'} · {role ? roleLabels[role] : 'No role'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>

          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 hidden rounded-full bg-emerald-700 px-3 py-2 text-xs font-medium text-white shadow-lg sm:flex">
        <LockKeyhole className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Calendar RBAC
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบใช่หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกอาจสูญหายได้"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
      />
    </div>
  );
}
