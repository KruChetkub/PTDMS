import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useAuthStore } from '../../stores/auth.store';

export function ForcedPasswordChangeGate() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [redirecting, setRedirecting] = useState(false);

  const goToPasswordRecovery = async () => {
    if (redirecting) return;

    setRedirecting(true);
    const email = user?.email ?? '';
    try {
      await signOut();
    } finally {
      navigate('/forgot-password', {
        replace: true,
        state: { forcedPasswordChange: true, email },
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <KeyRound className="h-5 w-5 text-amber-600" aria-hidden="true" />
        จำเป็นต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งานระบบ
      </div>

      <ConfirmModal
        isOpen
        onClose={() => undefined}
        onConfirm={() => void goToPasswordRecovery()}
        title="จำเป็นต้องเปลี่ยนรหัสผ่าน"
        message="Superadmin กำหนดให้บัญชีนี้เปลี่ยนรหัสผ่าน กรุณากดดำเนินการต่อเพื่อไปยังหน้าลืมรหัสผ่าน ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลที่ลงทะเบียนไว้"
        confirmLabel="ไปที่ลืมรหัสผ่าน"
        isLoading={redirecting}
        variant="warning"
        showCancelButton={false}
      />
    </div>
  );
}
