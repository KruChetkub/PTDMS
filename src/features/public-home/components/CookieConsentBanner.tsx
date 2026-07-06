import { useEffect, useState } from 'react';
import { BarChart3, Cookie, Settings, X } from 'lucide-react';
import { getStoredCookieConsent, saveCookieConsent } from '../../../services/public-analytics.service';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [performanceEnabled, setPerformanceEnabled] = useState(true);

  useEffect(() => {
    const stored = getStoredCookieConsent();
    setIsVisible(!stored);
    setPerformanceEnabled(stored?.performance ?? true);
  }, []);

  const acceptAll = () => {
    saveCookieConsent(true);
    setPerformanceEnabled(true);
    setIsVisible(false);
    setIsSettingsOpen(false);
  };

  const saveSettings = () => {
    saveCookieConsent(performanceEnabled);
    setIsVisible(false);
    setIsSettingsOpen(false);
  };

  const closeBanner = () => {
    saveCookieConsent(false);
    setPerformanceEnabled(false);
    setIsVisible(false);
    setIsSettingsOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950 px-4 py-4 text-white shadow-2xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-pink-100">
              <Cookie className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm leading-6 text-white/80">
              เว็บไซต์ของเราใช้คุกกี้เพื่อพัฒนาประสิทธิภาพ และประสบการณ์ที่ดีในการใช้บริการของท่าน
              ท่านสามารถศึกษารายละเอียดได้ที่นโยบายคุกกี้ และสามารถจัดการความเป็นส่วนตัวของท่านได้โดยคลิกที่ปุ่มตั้งค่า
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              ตั้งค่า
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-pink-50"
            >
              ยอมรับ
            </button>
            <button
              type="button"
              onClick={closeBanner}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="ปิดแถบแจ้งคุกกี้"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/55 px-4 py-6 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm font-semibold text-pink-700">กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">ตั้งค่าความเป็นส่วนตัว</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  คุณสามารถเลือกการตั้งค่าคุกกี้โดยเปิด/ปิดคุกกี้ในแต่ละประเภทได้ตามความต้องการ ยกเว้นคุกกี้ที่จำเป็น
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="ปิดหน้าตั้งค่าคุกกี้"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <section className="rounded-md border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">คุกกี้ที่มีความจำเป็น</h3>
                    <p className="text-sm text-slate-500">(Strictly Necessary Cookies)</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">เปิดใช้งานตลอด</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  คุกกี้ประเภทนี้มีความจำเป็นต่อการให้บริการเว็บไซต์ของกองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
                  เพื่อให้ท่านสามารถเข้าใช้งานในส่วนต่าง ๆ ของเว็บไซต์ได้ รวมถึงช่วยจดจำข้อมูลที่ท่านเคยให้ไว้ผ่านเว็บไซต์
                  การปิดการใช้งานคุกกี้ประเภทนี้จะส่งผลให้ท่านไม่สามารถใช้บริการในสาระสำคัญของเว็บไซต์ได้
                </p>
              </section>

              <section className="rounded-md border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">คุกกี้เพื่อการวิเคราะห์และประเมินผลการใช้งาน</h3>
                    <p className="text-sm text-slate-500">(Performance Cookies)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPerformanceEnabled((current) => !current)}
                    className={`inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                      performanceEnabled ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                    aria-pressed={performanceEnabled}
                  >
                    {performanceEnabled ? 'เปิด' : 'ปิด'}
                  </button>
                </div>
                <div className="mt-3 flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                  <p>
                    คุกกี้ประเภทนี้ช่วยให้กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค ทราบถึงการปฏิสัมพันธ์ของผู้ใช้งาน
                    เช่น จำนวนผู้เข้าชมและจำนวนการเข้าชมหน้าเว็บ เพื่อนำไปปรับปรุงคุณภาพเว็บไซต์ โดยข้อมูลที่เก็บจะใช้วิเคราะห์เชิงสถิติ
                    และไม่ระบุตัวตนของผู้ใช้งาน
                  </p>
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={saveSettings}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                บันทึกการตั้งค่า
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-700"
              >
                ยอมรับทั้งหมด
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}