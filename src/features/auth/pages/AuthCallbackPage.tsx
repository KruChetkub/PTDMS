import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const finish = async () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
      const next = searchParams.get('next');
      const isPasswordRecovery = next === 'reset-password' || next === 'set-new-password' || hashParams.get('type') === 'recovery';

      if (isPasswordRecovery) {
        navigate(`/set-new-password${location.search}${location.hash}`, { replace: true });
        return;
      }

      await initialize();
      navigate('/login', { replace: true });
    };

    void finish();
  }, [initialize, location.hash, location.search, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        กำลังยืนยันบัญชีและนำเข้าสู่ระบบ...
      </div>
    </div>
  );
}
