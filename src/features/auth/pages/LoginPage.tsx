import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { useAuthStore } from '../../../stores/auth.store';
import { loginSchema, type LoginFormValues } from '../auth.schemas';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname || '/dashboard';
  const { signIn, loading, error, clearError } = useAuthStore();
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

  const onSubmit = async (values: LoginFormValues) => {
    clearError();
    try {
      await signIn(values.email, values.password);
      const profile = useAuthStore.getState().profile;
      
      if (profile?.status === 'pending') {
        navigate('/pending-approval', { replace: true });
      } else if (profile?.role === 'personnel') {
        navigate('/profile', { replace: true });
      } else if (from === '/dashboard' || from === '/' || from === '/self-service' || from === '/profile') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div>
          <div className="text-2xl font-bold text-brand-700">PTDMS</div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-sm text-slate-600">ระบบบริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากร</p>
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

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('password')}
            />
            {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link className="font-medium text-brand-700 hover:text-brand-600" to="/forgot-password">
              ลืมรหัสผ่าน
            </Link>
            <Link className="font-medium text-brand-700 hover:text-brand-600" to="/register">
              สมัครใช้งาน
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
