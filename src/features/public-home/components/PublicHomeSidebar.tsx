import { useEffect } from 'react';
import { ArrowLeft, BarChart3, BookOpenText, ChevronLeft, ChevronRight, FilePlus, FileText, Globe2, Home, Microscope, Settings2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
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
  const { initialize, initialized, user, profile } = useAuthStore();
  const isSignedIn = Boolean(user);
  const canManagePublicContent = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  if (isCollapsed) {
    return (
      <aside className={`border-b border-cyan-200/20 ${sidebarSurface} lg:sticky lg:top-0 lg:h-screen lg:w-16 lg:shrink-0 lg:overflow-hidden lg:border-b-0 lg:border-r`}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 lg:h-full lg:flex-col lg:px-2 lg:py-4">
          <button type="button" onClick={() => navigate('/')} className="flex w-full justify-center" title="กลับหน้าหลัก" aria-label="กลับหน้าหลัก">
            <img src={logoUrl} alt={siteName} className="h-11 w-11 shrink-0 rounded-md border border-white/70 bg-white p-1.5 object-contain shadow-sm" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="เปิดเมนูด้านซ้าย"
            title="เปิดเมนู"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <nav className="flex items-center gap-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto" aria-label="เมนูคลังข้อมูลแบบย่อ">
            <button type="button" onClick={() => navigate('/')} className={getCollapsedItemClass(false)} title="Home" aria-label="Home">
              <Home className="h-5 w-5" aria-hidden="true" />
            </button>
            {canManagePublicContent ? (
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
            {canManagePublicContent ? (
              <button type="button" onClick={() => onViewChange('my-performance')} className={getCollapsedItemClass(activeView === 'my-performance')} title="เพิ่มผลการดำเนินงาน" aria-label="เพิ่มผลการดำเนินงาน">
                <FilePlus className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" onClick={() => onViewChange('research')} className={getCollapsedItemClass(activeView === 'research')} title="งานวิจัยจากงานประจำ" aria-label="งานวิจัยจากงานประจำ">
              <Microscope className="h-5 w-5" aria-hidden="true" />
            </button>
            {canManagePublicContent ? (
              <button type="button" onClick={() => onViewChange('my-research')} className={getCollapsedItemClass(activeView === 'my-research')} title="เพิ่มงานวิจัย" aria-label="เพิ่มงานวิจัย">
                <FilePlus className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <a href={dashboardUrl} target="_blank" rel="noreferrer" className={getCollapsedItemClass(false)} title="Dashboard" aria-label="Dashboard">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </a>
            {canManagePublicContent ? (
              <button type="button" onClick={() => onViewChange('home-settings')} className={getCollapsedItemClass(activeView === 'home-settings')} title="ตั้งค่าหน้า Home" aria-label="ตั้งค่าหน้า Home">
                <Settings2 className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            {canManagePublicContent ? (
              <button type="button" onClick={() => onViewChange('web-pages')} className={getCollapsedItemClass(activeView === 'web-pages')} title="หน้าเว็บไซต์เพิ่มเติม" aria-label="หน้าเว็บไซต์เพิ่มเติม">
                <Globe2 className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
          </nav>
          {isSignedIn ? (
            <button type="button" onClick={() => navigate('/portal')} className={getCollapsedItemClass(false)} title="กลับไปที่ SmartDSP" aria-label="กลับไปที่ SmartDSP">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className={`border-b border-cyan-200/20 ${sidebarSurface} lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-hidden lg:border-b-0 lg:border-r`}>
      <div className="flex flex-col px-4 py-5 sm:px-6 lg:h-full lg:px-5">
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
          <button type="button" onClick={() => navigate('/')} className="rounded-md" title="กลับหน้าหลัก" aria-label="กลับหน้าหลัก">
            <img src={logoUrl} alt={siteName} className="h-16 w-16 shrink-0 rounded-md border border-white/70 bg-white p-2 object-contain shadow-lg" />
          </button>
          <div className="min-w-0 px-6">
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100">คลังข้อมูลด้านยุทธศาสตร์</p>
            <h2 className="mt-1 text-sm font-bold leading-5 tracking-normal text-white">กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</h2>
          </div>
        </div>

        <nav className="order-2 mt-5 space-y-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1" aria-label="เมนูคลังข้อมูลด้านยุทธศาสตร์และแผนงาน">
          <button type="button" onClick={() => navigate('/')} className={getMainItemClass(false, 'bg-white text-cyan-950 shadow-sm ring-1 ring-white/70 hover:bg-cyan-50')}>
            <Home className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Home</span>
          </button>

          <div>
            <button
              type="button"
              onClick={() => onViewChange('plans')}
              className={getMainItemClass(activeView === 'plans', 'border border-white/70 bg-white text-cyan-950 shadow-sm hover:bg-cyan-50')}
            >
              <BookOpenText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>ยุทธศาสตร์/แผนปฏิบัติราชการ</span>
            </button>
            <div className={`mt-2 space-y-1 pl-8 ${canManagePublicContent ? '' : 'hidden'}`}>
              {canManagePublicContent ? (
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

          <div>
            <button type="button" onClick={() => onViewChange('performance')} className={getMainItemClass(activeView === 'performance', 'bg-white text-sky-950 shadow-sm ring-1 ring-white/70 hover:bg-sky-50')}>
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>ผลการดำเนินงานสำคัญ กรมควบคุมโรค</span>
            </button>
            {canManagePublicContent ? (
              <div className="mt-2 space-y-1 pl-8">
                <button type="button" onClick={() => onViewChange('my-performance')} className={getSubItemClass(activeView === 'my-performance')}>
                  <FilePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>เพิ่มผลการดำเนินงานของฉัน</span>
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <button type="button" onClick={() => onViewChange('research')} className={getMainItemClass(activeView === 'research', 'bg-white text-teal-950 shadow-sm ring-1 ring-white/70 hover:bg-teal-50')}>
              <Microscope className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>งานวิจัยจากงานประจำ</span>
            </button>
            <div className={`mt-2 space-y-1 pl-8 ${canManagePublicContent ? '' : 'hidden'}`}>
              {canManagePublicContent ? (
                <button type="button" onClick={() => onViewChange('my-research')} className={getSubItemClass(activeView === 'my-research')}><FilePlus className="h-4 w-4 shrink-0" aria-hidden="true" /><span>เพิ่มงานวิจัยของฉัน</span></button>
              ) : null}
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
          {canManagePublicContent ? (
            <button type="button" onClick={() => onViewChange('home-settings')} className={getMainItemClass(activeView === 'home-settings', 'bg-white text-cyan-950 shadow-sm ring-1 ring-white/70 hover:bg-cyan-50')}>
              <Settings2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>ตั้งค่าหน้า Home</span>
            </button>
          ) : null}
          {canManagePublicContent ? (
            <button type="button" onClick={() => onViewChange('web-pages')} className={getMainItemClass(activeView === 'web-pages', 'bg-white text-cyan-950 shadow-sm ring-1 ring-white/70 hover:bg-cyan-50')}>
              <Globe2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>หน้าเว็บไซต์เพิ่มเติม</span>
            </button>
          ) : null}
        </nav>

        {isSignedIn ? (
          <div className="order-3 mt-5 border-t border-white/15 pt-4 lg:shrink-0">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/70 bg-white px-3 py-2.5 text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-50"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>กลับไปที่ SmartDSP</span>
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
