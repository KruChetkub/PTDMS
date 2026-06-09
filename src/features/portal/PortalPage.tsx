import { useState } from 'react';
import { ArrowRight, CalendarDays, GraduationCap, LogOut, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';
import { canAccess, roleLabels } from '../../types/roles';

type PortalCard = {
  title: string;
  description: string;
  to: string;
  icon: typeof GraduationCap;
  roles: UserRole[];
  accent: string;
  meta: string;
};

const coreSystems: PortalCard[] = [
  {
    title: 'Personnel Training & Development Management System',
    description: 'บริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากรภายใน',
    to: '/dashboard',
    icon: GraduationCap,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-brand-600 to-cyan-500',
    meta: 'Training Intelligence',
  },
  {
    title: 'ปฏิทินกิจกรรมกองยุทธศาสตร์ฯ',
    description: 'แจ้งกิจกรรมภายในกองยุทธศาสตร์และแผนงาน พร้อมมุมมองปฏิทินประเทศไทย',
    to: '/strategy-calendar',
    icon: CalendarDays,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-emerald-600 to-amber-500',
    meta: 'Internal Activities',
  },
];

const assetSystems: PortalCard[] = [
  {
    title: 'IT Asset Dashboard',
    description: 'ระบบติดตามครุภัณฑ์คอมพิวเตอร์ สเปกเครื่อง สถานะคุณภาพ และข้อมูลผู้ใช้งาน',
    to: '/it-assets',
    icon: Monitor,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-blue-700 to-teal-500',
    meta: 'IT Assets',
  },
];

export function PortalPage() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { profile, signOut } = useAuthStore();
  const visibleCoreSystems = coreSystems.filter((system) => canAccess(profile?.role, system.roles));
  const visibleAssetSystems = assetSystems.filter((system) => canAccess(profile?.role, system.roles));
  const getSystemPath = (system: PortalCard) => {
    if (system.to === '/dashboard' && profile?.role === 'personnel') {
      return '/profile';
    }

    return system.to;
  };

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
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-xl font-bold text-brand-700">PTDMS Portal</div>
            <div className="mt-1 text-sm text-slate-500">เลือกใช้งานระบบภายใน</div>
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-emerald-500 to-amber-400" />
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Single Sign-On Portal
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                เลือกระบบที่ต้องการใช้งาน
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                สำหรับบริหารจัดการข้อมูลการฝึกอบรม การพัฒนาบุคลากรภายในกองยุทธศาสตร์และแผนงาน
              </p>
            </div>

            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Signed in as</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{profile?.full_name || 'PTDMS User'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile?.role ? roleLabels[profile.role] : '-'}
                  </p>
                </div>
                <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-500">Work group</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{profile?.work_group || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {visibleCoreSystems.map((system) => {
            const Icon = system.icon;
            return (
              <Link
                key={system.to}
                to={getSystemPath(system)}
                className="group rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex min-h-48 flex-col justify-between gap-6">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className={`rounded-md bg-gradient-to-br ${system.accent} p-3 text-white shadow-sm`}>
                        <Icon className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        {system.meta}
                      </span>
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-normal text-slate-950">{system.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{system.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-brand-700">
                    <span>เข้าใช้งาน</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {visibleAssetSystems.length > 0 ? (
          <section className="mt-6 border-t border-slate-200 pt-6">
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase text-slate-500">Separate IT Asset System</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleAssetSystems.map((system) => {
                const Icon = system.icon;
                return (
                  <Link
                    key={system.to}
                    to={getSystemPath(system)}
                    className="group rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                  >
                    <div className="flex min-h-48 flex-col justify-between gap-6">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className={`rounded-md bg-gradient-to-br ${system.accent} p-3 text-white shadow-sm`}>
                            <Icon className="h-7 w-7" aria-hidden="true" />
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            {system.meta}
                          </span>
                        </div>
                        <h2 className="mt-5 text-xl font-semibold tracking-normal text-slate-950">{system.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{system.description}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-brand-700">
                        <span>เข้าใช้งาน</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

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
