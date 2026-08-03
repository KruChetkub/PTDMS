import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import { roleLabels } from '../../../types/roles';
import { reportClientError } from '../../../utils/errorHandling';

type PublicHomeHeaderProps = {
  logoUrl: string;
  siteName: string;
};

export function PublicHomeHeader({ logoUrl, siteName }: PublicHomeHeaderProps) {
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

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/20 bg-slate-950/70 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3" aria-label={siteName}>
          <img src={logoUrl} alt={siteName} className="h-8 w-8 shrink-0 rounded-md bg-white p-1 object-contain sm:h-9 sm:w-9" />
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-semibold sm:text-base">{siteName}</div>
            <div className="hidden text-xs text-white/70 sm:block"></div>
          </div>
        </div>

        {isSignedIn ? (
          <div ref={userPanelRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsUserPanelOpen((current) => !current)}
              className="inline-flex max-w-[210px] items-center gap-2 rounded-full border border-white/70 bg-white px-2.5 py-1.5 text-left text-slate-900 shadow-sm transition hover:bg-cyan-50 sm:max-w-xs sm:gap-3 sm:px-3 sm:py-2"
              aria-expanded={isUserPanelOpen}
              aria-label={`บัญชีผู้ใช้ ${accountLabel}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white sm:h-9 sm:w-9">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">บัญชีผู้ใช้</span>
                <span className="block truncate text-xs font-medium text-slate-500">{accountDetail}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isUserPanelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {isUserPanelOpen ? (
              <div className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-2xl">
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

                  <button
                    type="button"
                    onClick={handleOpenPasswordSettings}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    ตั้งค่ารหัสผ่านใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    {isLoggingOut ? 'กำลังออกจากระบบ...' : 'Logout'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <a
            href="/login"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 sm:px-4"
          >
            เข้าสู่ระบบ
          </a>
        )}
      </div>
    </header>
  );
}
