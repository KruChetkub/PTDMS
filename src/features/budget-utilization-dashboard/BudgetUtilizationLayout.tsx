import { useState } from 'react';
import { ArrowLeft, BarChart3, Coins, DatabaseZap, FileSpreadsheet, ListTree, LockKeyhole, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { cn } from '../../utils/cn';
import { reportClientError } from '../../utils/errorHandling';
import { canManageBudgetUtilization } from './services/budgetUtilization.service';

type BudgetNavItem = {
  to: string;
  label: string;
  icon: typeof BarChart3;
  end?: boolean;
};

const baseNavItems: BudgetNavItem[] = [
  { to: '/budget-utilization', label: 'Dashboard', icon: BarChart3, end: true },
];

const adminNavItems: BudgetNavItem[] = [
  { to: '/budget-utilization/items', label: 'รายการงบประมาณ', icon: ListTree },
  { to: '/budget-utilization/import', label: 'นำเข้าข้อมูล', icon: FileSpreadsheet },
  { to: '/budget-utilization/manage', label: 'จัดการรอบรายงาน', icon: DatabaseZap },
];

export function BudgetUtilizationLayout() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { profile, signOut } = useAuthStore();
  const role = profile?.role;
  const navItems = canManageBudgetUtilization(role) ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      void reportClientError('Logout failed:', error);
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'hidden shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all duration-200 lg:block',
            isSidebarOpen ? 'w-72 px-4 py-5' : 'w-0 px-0 py-5',
          )}
          aria-hidden={!isSidebarOpen}
        >
          {isSidebarOpen ? (
            <>
              <div className="mb-8">
                <button
                  type="button"
                  onClick={() => navigate('/portal')}
                  className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-teal-700 transition hover:text-teal-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  กลับ Portal
                </button>
                <div className="flex items-center gap-2 text-xl font-bold text-teal-700">
                  <Coins className="h-5 w-5" aria-hidden="true" />
                  Budget Utilization
                </div>
                <div className="mt-1 text-sm text-slate-500">กองยุทธศาสตร์และแผนงาน</div>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                          isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((current) => !current)}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
                  aria-label={isSidebarOpen ? 'ปิดแถบเมนู' : 'เปิดแถบเมนู'}
                  aria-pressed={isSidebarOpen}
                >
                  {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" aria-hidden="true" /> : <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />}
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate('/portal')}
                    className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition hover:text-teal-900 lg:hidden"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    กลับ Portal
                  </button>
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

            <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
                        isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 hidden rounded-full bg-teal-700 px-3 py-2 text-xs font-medium text-white shadow-lg sm:flex">
        <LockKeyhole className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Budget RBAC
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบใช่หรือไม่?"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
      />
    </div>
  );
}
