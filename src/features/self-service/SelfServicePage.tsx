import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { TrainingForm } from '../../components/training/TrainingForm';
import { createTrainingRecord } from '../../services/training.service';
import { useAuthStore } from '../../stores/auth.store';
import type { TrainingFormValues } from './training-form.schema';

type SelfServiceRouteState = {
  targetUserId?: string;
  targetName?: string;
  returnTo?: string;
};

export function SelfServicePage() {
  const { user, profile } = useAuthStore();
  const location = useLocation();
  const routeState = location.state as SelfServiceRouteState | null;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const targetUserId = routeState?.targetUserId || profile?.user_id || '';
  const targetName = routeState?.targetName || profile?.full_name || 'ผู้ใช้งานปัจจุบัน';
  const returnTo = routeState?.returnTo;
  const canManageOtherProfile = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'hr';
  const isOtherProfile = Boolean(profile && targetUserId && targetUserId !== profile.user_id);
  const canSubmitForTarget = !isOtherProfile || canManageOtherProfile;

  const onSubmit = async (values: TrainingFormValues) => {
    setSuccessMessage(null);
    setSubmitError(null);
    setIsSubmitting(true);

    if (!user || !profile) {
      setSubmitError('ไม่พบข้อมูลผู้ใช้งาน กรุณา Login ใหม่อีกครั้ง');
      setIsSubmitting(false);
      return;
    }

    if (!targetUserId) {
      setSubmitError('ไม่พบข้อมูลบุคลากรที่จะบันทึก กรุณากลับไปเลือกโปรไฟล์อีกครั้ง');
      setIsSubmitting(false);
      return;
    }

    if (!canSubmitForTarget) {
      setSubmitError('บัญชีนี้ไม่มีสิทธิ์บันทึกข้อมูลอบรมให้บุคลากรคนอื่น');
      setIsSubmitting(false);
      return;
    }

    try {
      const record = await createTrainingRecord({
        ...values,
        userId: targetUserId,
        actorId: user.id,
      });

      setSuccessMessage(`บันทึกข้อมูลอบรม "${record.course}" ให้ ${targetName} เรียบร้อยแล้ว`);
      setResetKey(prev => prev + 1); // Reset form by remounting
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission Error:', err);
      setSubmitError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลอบรมได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Self-Service"
        description={`เพิ่มข้อมูลการอบรมสำหรับ ${targetName}`}
      />

      <div className="mx-auto max-w-4xl">
        {returnTo ? (
          <Link className="mb-4 inline-flex text-sm font-medium text-brand-700 hover:text-brand-600" to={returnTo}>
            กลับไปหน้าโปรไฟล์
          </Link>
        ) : null}

        {isOtherProfile ? (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            กำลังเพิ่มข้อมูลการอบรมให้ {targetName}
          </div>
        ) : null}

        {!canSubmitForTarget ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            บัญชีนี้ไม่มีสิทธิ์บันทึกข้อมูลอบรมให้บุคลากรคนอื่น
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {submitError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <TrainingForm key={resetKey} onSubmit={onSubmit} isLoading={isSubmitting || !canSubmitForTarget} showDevelopmentAnalysis={false} />
          
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-500">
              ข้อมูลจะถูกบันทึกให้ {targetName} โดยบัญชีผู้บันทึกคือ {profile?.full_name || 'ผู้ใช้งานปัจจุบัน'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
