import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { useAuthStore } from '../../../stores/auth.store';
import { loginSchema, type LoginFormValues } from '../auth.schemas';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname || '/portal';
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
      } else if (from === '/' || from === '/login' || from === '/dashboard' || from === '/self-service' || from === '/profile') {
        navigate('/portal', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-300 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="absolute -left-24 top-16 h-80 w-80 rotate-6 rounded-[3rem] bg-white/20 blur-2xl" />
        <div className="absolute right-8 top-4 h-72 w-72 rotate-12 rounded-[2.5rem] bg-white/15 blur-2xl" />
        <div className="absolute bottom-4 left-1/3 h-72 w-72 -rotate-6 rounded-[2.5rem] bg-white/10 blur-2xl" />
      </div>

      <div className="relative w-full max-w-md space-y-5">
        <div className="text-center text-white">
          <div className="text-xl font-bold tracking-wide sm:text-2xl">Smart Strategy and Planning Division (SPD)</div>
          <h1 className="mt-5 text-3xl font-semibold">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-sm text-pink-50">กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</p>
        </div>

        <ConfiguredNotice />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl border border-white/50 bg-white/85 p-6 shadow-2xl backdrop-blur-sm"
        >
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-100">
              <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <input
                type="email"
                autoComplete="email"
                className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none"
                {...register('email')}
              />
            </div>
            {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-100">
              <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <input
                type="password"
                autoComplete="current-password"
                className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none"
                {...register('password')}
              />
            </div>
            {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-fuchsia-700 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link className="font-medium text-pink-700 hover:text-pink-600" to="/forgot-password">
              ลืมรหัสผ่าน
            </Link>
            <Link className="font-medium text-pink-700 hover:text-pink-600" to="/register">
              
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
