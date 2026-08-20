import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, DatabaseZap, RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../../stores/auth.store';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { canManageBudgetUtilization, deleteBudgetReportPeriod, listBudgetReportPeriods, setActiveBudgetReportPeriod } from '../services/budgetUtilization.service';
import type { BudgetUtilizationReportPeriod } from '../types/budgetUtilization.types';

export function BudgetUtilizationManagePage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_manage_access', route: '/budget-utilization/manage' });
  const role = useAuthStore((state) => state.profile?.role);
  const [reportPeriods, setReportPeriods] = useState<BudgetUtilizationReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetUtilizationReportPeriod | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setReportPeriods(await listBudgetReportPeriods());
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดรอบรายงานได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activate = async (reportPeriod: BudgetUtilizationReportPeriod) => {
    try {
      setBusyId(reportPeriod.id);
      setMessage(null);
      setError(null);
      await setActiveBudgetReportPeriod(reportPeriod.id);
      setMessage(`ตั้งค่ารอบรายงานใช้งานแล้ว: ${reportPeriod.title}`);
      await loadData();
    } catch (activateError) {
      setError(getSafeUserErrorMessage(activateError, 'ไม่สามารถตั้งค่ารอบรายงานใช้งานได้'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setBusyId(deleteTarget.id);
      setError(null);
      await deleteBudgetReportPeriod(deleteTarget.id);
      setMessage(`ลบรอบรายงานแล้ว: ${deleteTarget.title}`);
      setDeleteTarget(null);
      await loadData();
    } catch (deleteError) {
      setError(getSafeUserErrorMessage(deleteError, 'ไม่สามารถลบรอบรายงานได้'));
    } finally {
      setBusyId(null);
    }
  };

  if (!canManageBudgetUtilization(role)) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        คุณมีสิทธิ์ดู Dashboard และข้อมูลงบประมาณ แต่ไม่มีสิทธิ์จัดการรอบรายงาน
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="จัดการรอบรายงาน" description="เปิดใช้งานหรือลบชุดข้อมูลงบประมาณที่นำเข้า" />
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          โหลดใหม่
        </button>
      </div>

      {error ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {message}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">กำลังโหลดรอบรายงาน...</div>
          ) : reportPeriods.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีรอบรายงาน</div>
          ) : reportPeriods.map((reportPeriod) => (
            <div key={reportPeriod.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-950">{reportPeriod.title}</h2>
                  {reportPeriod.is_active ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">ใช้งานอยู่</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">ปีงบประมาณ {reportPeriod.fiscal_year} · {reportPeriod.department_name}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === reportPeriod.id || reportPeriod.is_active}
                  onClick={() => void activate(reportPeriod)}
                  className="inline-flex items-center gap-2 rounded-md border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DatabaseZap className="h-4 w-4" aria-hidden="true" />
                  ใช้งาน
                </button>
                <button
                  type="button"
                  disabled={busyId === reportPeriod.id}
                  onClick={() => setDeleteTarget(reportPeriod)}
                  className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบรอบรายงาน"
        message={`ต้องการลบ ${deleteTarget?.title ?? ''} ใช่หรือไม่? ข้อมูลรายการและตัวเลขภายในรอบรายงานนี้จะถูกลบด้วย`}
        confirmLabel="ลบรอบรายงาน"
        cancelLabel="ยกเลิก"
        isLoading={Boolean(deleteTarget && busyId === deleteTarget.id)}
        variant="danger"
      />
    </div>
  );
}
