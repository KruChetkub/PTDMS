import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { useAuthStore } from '../../../stores/auth.store';
import { registerSchema, type RegisterFormValues } from '../auth.schemas';

export function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const { signUp, loading, error, clearError } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    clearError();
    try {
      await signUp(values.email, values.password, values.fullName);
      setSubmitted(true);
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div>
          <div className="text-2xl font-bold text-brand-700">PTDMS</div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">สมัครใช้งาน</h1>
          <p className="mt-2 text-sm text-slate-600">ระบบจะสร้างบัญชี Supabase Auth และโปรไฟล์เริ่มต้นเป็น Personnel</p>
        </div>

        <ConfiguredNotice />

        {submitted ? (
          <div className="rounded-md border border-emerald-200 bg-white p-6 text-sm text-slate-700 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <UserPlus className="h-6 w-6" />
            </div>
            <p className="text-lg font-bold text-slate-900">ส่งคำขอสมัครสำเร็จ</p>
            <p className="mt-2 text-slate-600 leading-relaxed">
              บัญชีของคุณถูกสร้างแล้วและอยู่ในสถานะ **รอการอนุมัติ** <br/>
              กรุณารอให้ผู้ดูแลระบบ (Admin) ตรวจสอบและเปิดใช้งานบัญชี <br/>
              คุณสามารถลองเข้าสู่ระบบได้หลังจากได้รับการแจ้งเตือน
            </p>
            <Link className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/login">
              กลับไปหน้า Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">ชื่อ-สกุล</span>
              <input
                type="text"
                autoComplete="name"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                {...register('fullName')}
              />
              {errors.fullName ? <span className="mt-1 block text-xs text-red-600">{errors.fullName.message}</span> : null}
            </label>

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
                autoComplete="new-password"
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
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {loading ? 'กำลังสมัครใช้งาน...' : 'Register'}
            </button>

            <Link className="block text-sm font-medium text-brand-700 hover:text-brand-600" to="/login">
              มีบัญชีแล้ว กลับไป Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

