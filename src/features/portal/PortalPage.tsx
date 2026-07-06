import { useState } from 'react';
import { ArrowRight, CalendarDays, GraduationCap, Headphones, LogOut, Megaphone, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';
import { canAccess, roleLabels } from '../../types/roles';

type PortalCard = {
  title: string;
  shortTitle: string;
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
    shortTitle: 'PTDMS',
    description: 'บริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากรภายใน',
    to: '/dashboard',
    icon: GraduationCap,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-brand-600 to-cyan-500',
    meta: 'Training Intelligence',
  },
  {
    title: 'ปฏิทินกิจกรรมกองยุทธศาสตร์ฯ',
    shortTitle: 'ปฏิทินฯ',
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
    shortTitle: 'IT Assets',
    description: 'ระบบติดตามครุภัณฑ์คอมพิวเตอร์ สเปกเครื่อง สถานะคุณภาพ และข้อมูลผู้ใช้งาน',
    to: '/it-assets',
    icon: Monitor,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-blue-700 to-teal-500',
    meta: 'IT Assets',
  },
];

const serviceSystems: PortalCard[] = [
  {
    title: 'DSP Service Management System',
    shortTitle: 'DSP Service',
    description: 'ติดตามคำขอรับบริการและงานสนับสนุนด้านสารสนเทศภายในกองยุทธศาสตร์ฯ',
    to: '/spd-service',
    icon: Headphones,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-teal-700 to-sky-500',
    meta: 'Service Desk',
  },
];

const adminSystems: PortalCard[] = [
  {
    title: 'PTDMS Site Manager',
    shortTitle: 'Site Manager',
    description: 'จัดการหน้า Home ป้ายประชาสัมพันธ์ ข่าวสาร และหมวดเอกสารสำหรับเว็บไซต์',
    to: '/site-manager',
    icon: Megaphone,
    roles: ['super_admin', 'admin'],
    accent: 'from-cyan-700 to-emerald-500',
    meta: 'Public Content',
  },
];

export function PortalPage() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { profile, signOut } = useAuthStore();
  useAuditPageAccess({ module: 'ptdms', action: 'ptdms_portal_access', route: '/portal' });
  const visibleSystems = [...coreSystems, ...assetSystems, ...serviceSystems, ...adminSystems].filter((system) => canAccess(profile?.role, system.roles));
  const getSystemPath = (system: PortalCard) => {
    if (system.to === '/dashboard' && profile?.role === 'personnel') {
      return '/profile';
    }

    if (system.to === '/spd-service' && profile?.role !== 'super_admin' && profile?.role !== 'admin' && profile?.role !== 'executive') {
      return '/spd-service/my-requests';
    }

    return system.to;
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsLogoutModalOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLogoutModalOpen(false);
      navigate('/', { replace: true });
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

            <div className="hidden gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid">
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

        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {visibleSystems.map((system) => {
            const Icon = system.icon;
            return (
              <Link
                key={system.to}
                to={getSystemPath(system)}
                className="group flex flex-col items-center rounded-md p-1 text-center transition hover:bg-slate-100 sm:items-stretch sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:text-left sm:shadow-sm sm:hover:-translate-y-0.5 sm:hover:border-slate-300 sm:hover:shadow-lg"
              >
                <div className="flex h-full flex-col items-center gap-2 sm:min-h-48 sm:items-stretch sm:justify-between sm:gap-6">
                  <div className="w-full">
                    <div className="flex justify-center sm:items-start sm:justify-between sm:gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${system.accent} text-white shadow-sm ring-1 ring-black/5 sm:h-20 sm:w-20`}
                      >
                        <Icon className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />
                      </div>
                      <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        {system.meta}
                      </span>
                    </div>
                    <h2 className="mt-2 text-center text-sm font-semibold tracking-normal text-slate-950 sm:mt-5 sm:text-left sm:text-xl">
                      {system.shortTitle}
                    </h2>
                    <p className="mt-1 hidden text-sm leading-6 text-slate-600 sm:block">{system.description}</p>
                  </div>

                  <div className="hidden items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-brand-700 sm:flex">
                    <span>เข้าใช้งาน</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
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
