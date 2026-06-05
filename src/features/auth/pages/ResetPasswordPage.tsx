import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth.store';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../auth.schemas';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [preparingSession, setPreparingSession] = useState(true);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const { updatePassword, loading, error, clearError } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

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
          navigate('/reset-password', { replace: true });
        }
      } catch (err) {
        setRecoveryError(err instanceof Error ? err.message : 'ไม่สามารถตรวจสอบลิงก์ Reset Password ได้');
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
      setSubmitted(true);
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      console.error('Password update failed:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div>
          <div className="text-2xl font-bold text-brand-700">PTDMS</div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">ตั้งรหัสผ่านใหม่</h1>
          <p className="mt-2 text-sm text-slate-600">หน้านี้ใช้หลังจากเปิดลิงก์ Reset Password จากอีเมล</p>
        </div>

        <ConfiguredNotice />

        {submitted ? (
          <div className="rounded-md border border-emerald-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-emerald-700">เปลี่ยนรหัสผ่านเรียบร้อย</p>
            <Link className="mt-4 inline-block font-medium text-brand-700 hover:text-brand-600" to="/login">
              กลับไปหน้า Login
            </Link>
          </div>
        ) : preparingSession ? (
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

            <label className="block">
              <span className="text-sm font-medium text-slate-700">New Password</span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                {...register('password')}
              />
              {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Confirm Password</span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <span className="mt-1 block text-xs text-red-600">{errors.confirmPassword.message}</span>
              ) : null}
            </label>

            <button
              type="submit"
              disabled={loading}
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
