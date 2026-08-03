import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, FileText, Lock, LogIn, Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { useAuthStore } from '../../../stores/auth.store';
import { reportClientError } from '../../../utils/errorHandling';
import { LegalFooter } from '../../legal/LegalFooter';
import { PrivacyNoticeIntro, PrivacyNoticeSummary } from '../../legal/PrivacyNoticeContent';
import { usePublishedSiteContent } from '../../site-content/hooks/useSiteContent';
import { loginSchema, type LoginFormValues } from '../auth.schemas';

export function LoginPage() {
  useEffect(() => {
    document.title = 'SmartDSP';
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isPrivacyNoticeOpen, setIsPrivacyNoticeOpen] = useState(true);
  const from = (location.state as { from?: Location } | null)?.from?.pathname || '/portal';
  const { signIn, loading, error, clearError } = useAuthStore();
  const siteContent = usePublishedSiteContent();
  const loginSideImage = siteContent.loginPage.status === 'published' ? siteContent.loginPage.sideImageUrl : '';
  const loginSideImageAlt = siteContent.loginPage.sideImageAlt || 'ภาพประกอบหน้าเข้าสู่ระบบ SmartDSP';
  const loginBackgroundImage = siteContent.loginPage.backgroundImageUrl || '/SmartDSP.png';
  const loginBackgroundImageEnabled = siteContent.loginPage.backgroundImageEnabled !== false;
  const loginBackgroundOverlayValue = Math.min(90, Math.max(0, siteContent.loginPage.backgroundOverlayOpacity));
  const loginBackgroundOverlayOpacity = loginBackgroundOverlayValue / 100;
  const loginBackgroundBrightness = 1 + ((90 - loginBackgroundOverlayValue) / 90) * 0.35;
  const loginPanelStyle = siteContent.loginPage.loginPanelGradientEnabled
    ? { background: `linear-gradient(135deg, ${siteContent.loginPage.loginPanelGradientFrom}, ${siteContent.loginPage.loginPanelGradientTo})` }
    : undefined;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const closePrivacyNotice = () => setIsPrivacyNoticeOpen(false);

  const onSubmit = async (values: LoginFormValues) => {
    clearError();
    try {
      await signIn(values.email, values.password);
      const profile = useAuthStore.getState().profile;

      if (profile?.status === 'pending') {
        navigate('/pending-approval', { replace: true });
      } else if (from === '/' || from === '/login' || from === '/dashboard' || from === '/self-service' || from === '/profile') {
        navigate('/portal', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      void reportClientError('Login failed:', err);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      {loginBackgroundImageEnabled ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${loginBackgroundImage})`,
            filter: `brightness(${loginBackgroundBrightness})`,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(8, 47, 73, ${loginBackgroundOverlayOpacity * 0.86}), rgba(23, 37, 84, ${loginBackgroundOverlayOpacity * 0.8}), rgba(2, 6, 23, ${loginBackgroundOverlayOpacity}))`,
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <section className="hidden min-h-[34rem] items-center justify-center lg:flex">
          {loginSideImage ? (
            <div className="w-full max-w-2xl overflow-hidden rounded-md border border-white/25 bg-white/10 p-3 shadow-2xl backdrop-blur-sm">
              <img src={loginSideImage} alt={loginSideImageAlt} className="max-h-[70vh] w-full rounded-md object-cover" />
            </div>
          ) : (
            <div className="max-w-xl rounded-md border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-normal text-cyan-200">Smart DSP</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-normal text-white">Smart Division Strategy and Planning</h2>
              <p className="mt-4 text-sm leading-6 text-cyan-50/85">ระบบสนับสนุนงานยุทธศาสตร์ แผนงาน บริการดิจิทัล และการจัดการข้อมูลภายในกองยุทธศาสตร์และแผนงาน</p>
            </div>
          )}
        </section>

        <section className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
          <div className="rounded-md border border-white/25 bg-slate-950/35 p-4 shadow-2xl backdrop-blur-md sm:p-5" style={loginPanelStyle}>
            <div className="mb-5 text-center">
              <div className="text-lg font-bold leading-7 tracking-normal text-white sm:text-xl">Smart Division Strategy and Planning</div>
              <div className="text-sm font-semibold text-cyan-100">(Smart DSP)</div>
              <h1 className="mt-4 text-3xl font-bold tracking-normal text-white">เข้าสู่ระบบ</h1>
              <p className="mt-2 text-sm text-cyan-50/85">กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</p>
            </div>

            <ConfiguredNotice />

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4 rounded-md border border-white/70 bg-white/90 p-5 text-slate-900 shadow-xl sm:p-6">
              {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-100">
                  <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="smartdsp@mail.com"
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none"
                    {...register('email')}
                  />
                </div>
                {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
              </label>

              <div>
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-100">
                  <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#17718C] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0F5D77] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <Link className="font-medium text-[#17718C] hover:text-[#0F5D77]" to="/forgot-password">
                  ลืมรหัสผ่าน
                </Link>
              </div>
            </form>

            <div className="mt-5">
              <LegalFooter variant="dark" />
            </div>
          </div>
        </section>
      </main>

      {isPrivacyNoticeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-900">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" aria-hidden="true" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-notice-title"
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-white/20 bg-slate-50 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pink-50 text-pink-700">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-pink-700">Privacy Notice</p>
                  <h2 id="privacy-notice-title" className="text-lg font-bold leading-7 text-slate-950">
                    ประกาศความเป็นส่วนตัวสำหรับผู้ใช้งาน SmartDSP
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">กรุณาอ่านและรับทราบก่อนเข้าใช้งานระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePrivacyNotice}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-200"
                aria-label="ปิด Privacy Notice"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <PrivacyNoticeIntro />
                <section className="rounded-lg border border-pink-100 bg-pink-50 px-5 py-4 text-sm leading-6 text-pink-950">
                  <p className="font-semibold">
                    การเข้าสู่ระบบ SmartDSP ถือว่าผู้ใช้งานได้รับทราบประกาศความเป็นส่วนตัวฉบับนี้แล้ว
                    และยินยอมให้ระบบประมวลผลข้อมูลเท่าที่จำเป็นต่อการให้บริการและการปฏิบัติงานของหน่วยงาน
                  </p>
                </section>
                <PrivacyNoticeSummary compact />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link className="text-sm font-semibold text-pink-700 transition hover:text-pink-600" to="/privacy-notice">
                อ่าน Privacy Notice ฉบับเต็ม
              </Link>
              <button
                type="button"
                onClick={closePrivacyNotice}
                className="inline-flex items-center justify-center rounded-md bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:ring-offset-2"
              >
                รับทราบและเข้าสู่ระบบ
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
