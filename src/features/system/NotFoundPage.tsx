import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mt-2 text-sm text-slate-600">ตรวจสอบ URL อีกครั้ง หรือกลับไปหน้า Login</p>
        <Link className="mt-5 inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/login">
          กลับไป Login
        </Link>
      </div>
    </div>
  );
}

