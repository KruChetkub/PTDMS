import { useEffect, useRef, useState } from 'react';
import { BarChart3, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, FilePlus, FileText, KeyRound, LogOut, Microscope, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import { roleLabels } from '../../../types/roles';
import { reportClientError } from '../../../utils/errorHandling';
import type { PublicHomeView } from '../types/publicHomeView.types';

const dashboardUrl = 'https://strategy-and-planning-dept-bw9o.vercel.app/';

const sidebarSurface = 'bg-[linear-gradient(180deg,#063B78_0%,#075DA8_48%,#0B8FA5_100%)] text-white';

type PublicHomeSidebarProps = {
  activeView: PublicHomeView;
  isCollapsed: boolean;
  logoUrl: string;
  siteName: string;
  onToggleCollapsed: () => void;
  onViewChange: (view: PublicHomeView) => void;
};

function getSubItemClass(isActive: boolean) {
  return `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
    isActive ? 'bg-white/95 text-cyan-950 shadow-sm' : 'text-white/85 hover:bg-white/12 hover:text-white'
  }`;
}

function getMainItemClass(isActive: boolean, activeClass: string) {
  return `flex w-full items-start gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold leading-6 transition ${
    isActive ? activeClass : 'text-white/90 hover:bg-white/12 hover:text-white'
  }`;
}

function getCollapsedItemClass(isActive: boolean) {
  return `inline-flex h-11 w-11 items-center justify-center rounded-md transition ${
    isActive ? 'bg-white text-cyan-900 shadow-sm' : 'text-white/85 hover:bg-white/12 hover:text-white'
  }`;
}

export function PublicHomeSidebar({ activeView, isCollapsed, logoUrl, siteName, onToggleCollapsed, onViewChange }: PublicHomeSidebarProps) {
  const navigate = useNavigate();
  const userPanelRef = useRef<HTMLDivElement | null>(null);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { initialize, initialized, user, profile, signOut } = useAuthStore();
  const isSignedIn = Boolean(user);
  const accountLabel = profile?.full_name || user?.email || 'เข้าสู่ระบบแล้ว';
  const accountDetail = profile?.work_group || 'เมนูส่วนตัว';
  const roleLabel = profile?.role ? roleLabels[profile.role] : '-';
  const workGroupLabel = profile?.work_group || profile?.department || '-';

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  useEffect(() => {
    if (!isUserPanelOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!userPanelRef.current?.contains(event.target as Node)) {
        setIsUserPanelOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isUserPanelOpen]);

  const handleOpenPasswordSettings = () => {
    setIsUserPanelOpen(false);
    navigate('/settings?tab=password');
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      setIsUserPanelOpen(false);
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      void reportClientError('Public home logout failed:', error);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isCollapsed) {
    return (
      <aside className={`border-b border-cyan-200/20 ${sidebarSurface} lg:sticky lg:top-0 lg:h-screen lg:w-16 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r`}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 lg:flex-col lg:px-2 lg:py-4">
          <div className="flex w-full justify-center">
            <img src={logoUrl} alt={siteName} className="h-11 w-11 shrink-0 rounded-md border border-white/70 bg-white p-1.5 object-contain shadow-sm" />
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="เปิดเมนูด้านซ้าย"
            title="เปิดเมนู"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <nav className="flex items-center gap-2 lg:flex-col" aria-label="เมนูคลังข้อมูลแบบย่อ">
            {isSignedIn ? (
              <button type="button" onClick={() => setIsUserPanelOpen((current) => !current)} className={getCollapsedItemClass(false)} title="บัญชีผู้ใช้" aria-label="บัญชีผู้ใช้">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={() => navigate('/login')} className={getCollapsedItemClass(false)} title="เข้าสู่ระบบ" aria-label="เข้าสู่ระบบ">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            {isSignedIn ? (
              <button type="button" onClick={() => onViewChange('my-plans')} className={getCollapsedItemClass(activeView === 'my-plans')} title="เพิ่มแผนของฉัน" aria-label="เพิ่มแผนของฉัน">
                <FilePlus className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" onClick={() => onViewChange('plans')} className={getCollapsedItemClass(activeView === 'plans')} title="แผน" aria-label="แผน">
              <BookOpenText className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onViewChange('performance')} className={getCollapsedItemClass(activeView === 'performance')} title="ผลการดำเนินงานสำคัญ" aria-label="ผลการดำเนินงานสำคัญ">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onViewChange('research')} className={getCollapsedItemClass(activeView === 'research')} title="งานวิจัยจากงานประจำ" aria-label="งานวิจัยจากงานประจำ">
              <Microscope className="h-5 w-5" aria-hidden="true" />
            </button>
            <a href={dashboardUrl} target="_blank" rel="noreferrer" className={getCollapsedItemClass(false)} title="Dashboard" aria-label="Dashboard">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`border-b border-cyan-200/20 ${sidebarSurface} lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r`}>
      <div className="px-4 py-5 sm:px-6 lg:px-5">
        <div className="relative flex flex-col items-center gap-3 text-center">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="absolute right-0 top-0 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="ซ่อนเมนูด้านซ้าย"
            title="ซ่อนเมนู"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <img src={logoUrl} alt={siteName} className="h-16 w-16 shrink-0 rounded-md border border-white/70 bg-white p-2 object-contain shadow-lg" />
          <div className="min-w-0 px-6">
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100">คลังข้อมูล</p>
            <h2 className="mt-1 text-sm font-bold leading-5 tracking-normal text-white">กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</h2>
          </div>
        </div>

        <div ref={userPanelRef} className="relative mt-5">
          {isSignedIn ? (
            <>
              <button
                type="button"
                onClick={() => setIsUserPanelOpen((current) => !current)}
                className="flex w-full items-center gap-3 rounded-md border border-white/25 bg-white/12 px-3 py-3 text-left text-white transition hover:bg-white/18"
                aria-expanded={isUserPanelOpen}
                aria-label={`บัญชีผู้ใช้ ${accountLabel}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-cyan-900">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">บัญชีผู้ใช้</span>
                  <span className="block truncate text-xs font-medium text-cyan-100/85">{accountDetail}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-100 transition ${isUserPanelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {isUserPanelOpen ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserPanelOpen(false);
                      navigate(profile?.status === 'pending' ? '/pending-approval' : '/portal');
                    }}
                    className="flex w-full items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">ข้อมูลผู้ใช้งาน</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">จัดการบัญชีและเมนูส่วนตัว</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </button>

                  <div className="grid gap-1 p-2">
                    <div className="rounded-md bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                      <div className="grid gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{accountLabel}</p>
                        <p className="truncate text-sm font-semibold text-slate-900">{roleLabel}</p>
                        <p className="whitespace-normal break-words text-sm font-semibold leading-5 text-slate-900">{workGroupLabel}</p>
                      </div>
                    </div>

                    <div className="my-1 border-t border-slate-100" />

                    <button type="button" onClick={handleOpenPasswordSettings} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      ตั้งค่ารหัสผ่านใหม่
                    </button>
                    <button type="button" onClick={() => void handleSignOut()} disabled={isLoggingOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                      <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      {isLoggingOut ? 'กำลังออกจากระบบ...' : 'Logout'}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <button type="button" onClick={() => navigate('/login')} className="w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-50">
              เข้าสู่ระบบ
            </button>
          )}
        </div>

        <nav className="mt-5 space-y-5" aria-label="เมนูคลังข้อมูลด้านยุทธศาสตร์และแผนงาน">
          <div>
            <button
              type="button"
              onClick={() => onViewChange('plans')}
              className={getMainItemClass(activeView === 'plans', 'border border-white/70 bg-white text-cyan-950 shadow-sm hover:bg-cyan-50')}
            >
              <BookOpenText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>ยุทธศาสตร์/แผนปฏิบัติราชการ</span>
            </button>
            <div className="mt-2 space-y-1 pl-8">
              {isSignedIn ? (
                <button type="button" onClick={() => onViewChange('my-plans')} className={getSubItemClass(activeView === 'my-plans')}>
                  <FilePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>เพิ่มแผนของฉัน</span>
                </button>
              ) : null}
              <button type="button" onClick={() => onViewChange('plans')} className={getSubItemClass(activeView === 'plans')}>
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>แผนยุทธศาสตร์</span>
              </button>
            </div>
          </div>

          <button type="button" onClick={() => onViewChange('performance')} className={getMainItemClass(activeView === 'performance', 'bg-white text-sky-950 shadow-sm ring-1 ring-white/70 hover:bg-sky-50')}>
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>ผลการดำเนินงานสำคัญ กรมควบคุมโรค</span>
          </button>

          <div>
            <button type="button" onClick={() => onViewChange('research')} className={getMainItemClass(activeView === 'research', 'bg-white text-teal-950 shadow-sm ring-1 ring-white/70 hover:bg-teal-50')}>
              <Microscope className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>งานวิจัยจากงานประจำ</span>
            </button>
            <div className="mt-2 space-y-1 pl-8">
              <button type="button" onClick={() => onViewChange('research')} className={getSubItemClass(activeView === 'research')}>
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>การวิจัยเพื่อพัฒนาคุณภาพงาน</span>
              </button>
            </div>
          </div>

          <a href={dashboardUrl} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/12 hover:text-white">
            <BarChart3 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Dashboard</span>
          </a>
        </nav>
      </div>
    </aside>
  );
}
