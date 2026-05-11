import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const finish = async () => {
      await initialize();
      navigate('/login', { replace: true });
    };

    void finish();
  }, [initialize, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        กำลังยืนยันบัญชีและนำเข้าสู่ระบบ...
      </div>
    </div>
  );
}

