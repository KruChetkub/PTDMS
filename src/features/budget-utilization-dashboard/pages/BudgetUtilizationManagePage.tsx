import { useEffect, useState } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2, DatabaseZap, ListTree, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../../stores/auth.store';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { canManageBudgetUtilization, createBudgetReportPeriod, deleteBudgetReportPeriod, listBudgetReportPeriods, setActiveBudgetReportPeriod } from '../services/budgetUtilization.service';
import type { BudgetUtilizationReportPeriod } from '../types/budgetUtilization.types';
import { getCurrentThaiFiscalYear } from '../../../utils/thaiDate';

function getFiscalYearPeriod(fiscalYear: number) {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2500 || fiscalYear > 2700) {
    return 'กรุณาระบุปีงบประมาณให้ถูกต้อง';
  }
  return `1 ต.ค. ${fiscalYear - 1} – 30 ก.ย. ${fiscalYear}`;
}

export function BudgetUtilizationManagePage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_manage_access', route: '/budget-utilization/manage' });
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.profile?.role);
  const [reportPeriods, setReportPeriods] = useState<BudgetUtilizationReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetUtilizationReportPeriod | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState(getCurrentThaiFiscalYear());
  const [departmentName, setDepartmentName] = useState('กองยุทธศาสตร์และแผนงาน');
  const [creating, setCreating] = useState(false);
  const latestFiscalYear = reportPeriods.length > 0
    ? Math.max(...reportPeriods.map((period) => period.fiscal_year))
    : getCurrentThaiFiscalYear() - 1;
  const availableFiscalYears = Array.from(
    { length: 10 },
    (_, index) => Math.max(getCurrentThaiFiscalYear(), latestFiscalYear + 1) + index,
  ).filter((year) => year <= 2700);
  const duplicateFiscalYears = Array.from(new Set(reportPeriods.map((period) => period.fiscal_year)))
    .map((year) => ({ year, count: reportPeriods.filter((period) => period.fiscal_year === year).length }))
    .filter((entry) => entry.count > 1);

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

  useEffect(() => {
    if (reportPeriods.length === 0) return;
    setFiscalYear((current) => (
      reportPeriods.some((period) => period.fiscal_year === current)
        ? Math.min(latestFiscalYear + 1, 2700)
        : current
    ));
  }, [latestFiscalYear, reportPeriods]);

  const createFiscalYear = async () => {
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2500 || fiscalYear > 2700) {
      setError('กรุณาระบุปีงบประมาณระหว่าง 2500–2700');
      return;
    }
    if (reportPeriods.some((period) => period.fiscal_year === fiscalYear)) {
      setError(`มีชุดข้อมูลปีงบประมาณ ${fiscalYear} อยู่แล้ว`);
      return;
    }

    try {
      setCreating(true);
      setMessage(null);
      setError(null);
      const createdPeriod = await createBudgetReportPeriod({
        fiscalYear,
        title: `ข้อมูลการใช้จ่ายงบประมาณ ปีงบประมาณ ${fiscalYear}`,
        departmentName,
        isActive: true,
      });
      setMessage(`สร้างปีงบประมาณ ${fiscalYear} แล้ว`);
      await loadData();
      navigate(`/budget-utilization/items?period=${createdPeriod.id}`);
    } catch (createError) {
      setError(getSafeUserErrorMessage(createError, 'ไม่สามารถสร้างปีงบประมาณได้'));
    } finally {
      setCreating(false);
    }
  };

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
        <PageHeader title="จัดการปีงบประมาณ" description="สร้างและเลือกชุดข้อมูลสำหรับกรอกงบประมาณแยกตามปี" />
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
      {duplicateFiscalYears.length > 0 ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">พบชุดข้อมูลปีงบประมาณซ้ำจากข้อมูลเดิม</p>
            <p className="mt-1">
              {duplicateFiscalYears.map((entry) => `ปี ${entry.year} จำนวน ${entry.count} ชุด`).join(' · ')} กรุณาเปิดตรวจสอบแต่ละชุดก่อนลบชุดที่ไม่ใช้งาน ระบบจะไม่ลบให้อัตโนมัติ
            </p>
          </div>
        </div>
      ) : null}

      <section className="mb-5 rounded-md border border-teal-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">สร้างปีงบประมาณใหม่</h2>
          <p className="mt-1 text-sm text-slate-500">ระบบจะสร้างแบบฟอร์มรายการงบประมาณเปล่า โดยไม่คัดลอกหรือแก้ไขข้อมูลปีเดิม</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(12rem,0.45fr)_minmax(16rem,1fr)_auto] md:items-start">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">ปีงบประมาณ (พ.ศ.)</span>
            <select
              value={fiscalYear}
              onChange={(event) => setFiscalYear(Number(event.target.value))}
              aria-describedby="fiscal-year-period"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {availableFiscalYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">หน่วยงาน</span>
            <input
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              maxLength={300}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void createFiscalYear()}
            disabled={creating || !departmentName.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 md:mt-5"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {creating ? 'กำลังสร้าง...' : 'สร้างและเริ่มกรอกข้อมูล'}
          </button>
        </div>
        <p id="fiscal-year-period" className="mt-2 text-xs text-slate-500">
          ช่วงปีงบประมาณ: {getFiscalYearPeriod(fiscalYear)}
        </p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">กำลังโหลดปีงบประมาณ...</div>
          ) : reportPeriods.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีปีงบประมาณ</div>
          ) : reportPeriods.map((reportPeriod) => (
            <div key={reportPeriod.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-950">{reportPeriod.title}</h2>
                  {reportPeriod.is_active ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">ใช้งานอยู่</span> : null}
                  {reportPeriods.filter((period) => period.fiscal_year === reportPeriod.fiscal_year).length > 1 ? (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">ปีซ้ำ — ตรวจสอบก่อนลบ</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">ปีงบประมาณ {reportPeriod.fiscal_year} · {getFiscalYearPeriod(reportPeriod.fiscal_year)} · {reportPeriod.department_name}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/budget-utilization/items?period=${reportPeriod.id}`)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ListTree className="h-4 w-4" aria-hidden="true" />
                  เปิดตรวจสอบ
                </button>
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
