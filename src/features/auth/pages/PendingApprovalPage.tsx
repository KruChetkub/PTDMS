import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Mail } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useState } from 'react';

export function PendingApprovalPage() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { signOut, profile } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl text-center border border-slate-100">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <Clock className="h-10 w-10" />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Pending Approval
          </h2>
          <p className="text-slate-500 leading-relaxed">
            สวัสดีคุณ <span className="font-bold text-slate-900">{profile?.full_name}</span> บัญชีของคุณอยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ (Admin)
          </p>
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3 text-left">
            <Mail className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              เมื่อบัญชีของคุณได้รับการอนุมัติแล้ว คุณจะสามารถเข้าใช้งานระบบได้ทันที หากมีข้อสงสัยกรุณาติดต่อกลุ่มยุทธศาสตร์และพัฒนาองค์กรหรือนางสาวมินตรา สายพิมพ์
            </p>
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="group relative flex w-full justify-center rounded-md border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <LogOut className="h-5 w-5 text-slate-400 group-hover:text-slate-500" />
            </span>
            ออกจากระบบ
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบใช่หรือไม่?"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
      />
    </div>
  );
}
