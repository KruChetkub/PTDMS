import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { PasswordRequirementsChecklist } from '../../../components/auth/PasswordRequirementsChecklist';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth.store';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../auth.schemas';
import { isPasswordFormValid } from '../passwordPolicy';
import { getSafeUserErrorMessage, reportClientError } from '../../../utils/errorHandling';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [preparingSession, setPreparingSession] = useState(true);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { updatePassword, loading, error, clearError } = useAuthStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const passwordFormValid = isPasswordFormValid(password, confirmPassword);

  useEffect(() => {
    const prepareRecoverySession = async () => {
      setPreparingSession(true);
      setRecoveryError(null);

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
        const type = searchParams.get('type') || hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyError) {
            throw verifyError;
          }
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            throw sessionError;
          }
        }

        const { data, error: sessionReadError } = await supabase.auth.getSession();
        if (sessionReadError) {
          throw sessionReadError;
        }

        if (!data.session) {
          setRecoveryError('ลิงก์ Reset Password ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง');
          return;
        }

        if (window.location.search || window.location.hash) {
          navigate(window.location.pathname || '/set-new-password', { replace: true });
        }
      } catch (err) {
        setRecoveryError(getSafeUserErrorMessage(err, 'ไม่สามารถตรวจสอบลิงก์ Reset Password ได้'));
      } finally {
        setPreparingSession(false);
      }
    };

    void prepareRecoverySession();
  }, [navigate]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    clearError();
    try {
      await updatePassword(values.password);
      navigate('/portal', { replace: true });
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      void reportClientError('Password update failed:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div>
          <div className="text-2xl font-bold text-brand-700">PTDMS</div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">ตั้งรหัสผ่านใหม่</h1>
          <p className="mt-2 text-sm text-slate-600">กรอกรหัสผ่านใหม่ หลังบันทึกสำเร็จระบบจะพาเข้าสู่หน้าแรก</p>
        </div>

        <ConfiguredNotice />

        {preparingSession ? (
          <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            กำลังตรวจสอบลิงก์ Reset Password...
          </div>
        ) : recoveryError ? (
          <div className="rounded-md border border-red-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-red-700">ไม่สามารถตั้งรหัสผ่านใหม่ได้</p>
            <p className="mt-2">{recoveryError}</p>
            <Link className="mt-4 inline-block font-medium text-brand-700 hover:text-brand-600" to="/forgot-password">
              ขอ Reset Password ใหม่
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

            <div>
              <span className="text-sm font-medium text-slate-700">New Password</span>
              <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full bg-transparent py-2 pr-2 text-sm outline-none"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่านใหม่' : 'แสดงรหัสผ่านใหม่'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
            </div>

            <div>
              <span className="text-sm font-medium text-slate-700">Confirm Password</span>
              <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full bg-transparent py-2 pr-2 text-sm outline-none"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.confirmPassword ? (
                <span className="mt-1 block text-xs text-red-600">{errors.confirmPassword.message}</span>
              ) : null}
            </div>

            <PasswordRequirementsChecklist password={password} confirmPassword={confirmPassword} />

            <button
              type="submit"
              disabled={loading || !passwordFormValid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {loading ? 'กำลังบันทึก...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
