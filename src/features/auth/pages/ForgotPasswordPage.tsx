import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../auth.schemas';
import { reportClientError } from '../../../utils/errorHandling';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const { requestPasswordReset, loading, error, clearError } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    clearError();
    try {
      await requestPasswordReset(values.email);
      setSubmitted(true);
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      void reportClientError('Password reset request failed:', err);
    }
  };
  const goToLogin = () => {
    setSubmitted(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div>
          <div className="text-2xl font-bold text-brand-700">PTDMS</div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">ลืมรหัสผ่าน</h1>
          <p className="mt-2 text-sm text-slate-600">ระบบจะส่งลิงก์ Reset Password ไปยังอีเมลที่ลงทะเบียนไว้</p>
        </div>

        <ConfiguredNotice />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('email')}
            />
            {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {loading ? 'กำลังส่งอีเมล...' : 'Send reset link'}
          </button>

          <Link className="block text-sm font-medium text-brand-700 hover:text-brand-600" to="/login">
            กลับไปหน้า Login
          </Link>
        </form>
      </div>

      <ConfirmModal
        isOpen={submitted}
        onClose={goToLogin}
        onConfirm={goToLogin}
        title="ส่งอีเมลเรียบร้อย"
        message="กรุณาตรวจสอบ Inbox หรือ Spam แล้วกดลิงก์ในอีเมลเพื่อไปหน้าตั้งรหัสผ่านใหม่"
        confirmLabel="กลับไปหน้า Login"
        cancelLabel="ปิด"
        variant="info"
      />
    </div>
  );
}
