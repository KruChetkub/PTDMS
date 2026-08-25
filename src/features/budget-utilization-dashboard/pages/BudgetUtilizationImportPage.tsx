import { ChangeEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Database, Download, Eye, FileSpreadsheet, RefreshCw, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../../stores/auth.store';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { canManageBudgetUtilization, deleteBudgetImportFile, importBudgetPreview, listBudgetImportFiles, normalizeExistingBudgetImportFile } from '../services/budgetUtilization.service';
import { parseBudgetWorkbook } from '../services/budgetUtilizationImport';
import type { BudgetUtilizationImportFileRecord, BudgetUtilizationImportPreview, BudgetUtilizationRawWorkbook } from '../types/budgetUtilization.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const validationStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'รอตรวจสอบ', className: 'bg-slate-100 text-slate-700' },
  matched: { label: 'ข้อมูลตรงกัน', className: 'bg-emerald-50 text-emerald-700' },
  mismatch: { label: 'ข้อมูลไม่ตรงกัน', className: 'bg-red-50 text-red-700' },
  approved: { label: 'ยืนยันแล้ว', className: 'bg-teal-50 text-teal-700' },
  superseded: { label: 'มีชุดข้อมูลใหม่กว่า', className: 'bg-amber-50 text-amber-700' },
};

function getRawMerge(rawWorkbook: BudgetUtilizationRawWorkbook, rowIndex: number, columnIndex: number) {
  return rawWorkbook.merges.find((merge) => merge.startRow === rowIndex && merge.startCol === columnIndex) ?? null;
}

function isCoveredRawCell(rawWorkbook: BudgetUtilizationRawWorkbook, rowIndex: number, columnIndex: number) {
  return rawWorkbook.merges.some((merge) => (
    rowIndex >= merge.startRow &&
    rowIndex <= merge.endRow &&
    columnIndex >= merge.startCol &&
    columnIndex <= merge.endCol &&
    (rowIndex !== merge.startRow || columnIndex !== merge.startCol)
  ));
}

function RawWorkbookTable({ rawWorkbook }: { rawWorkbook: BudgetUtilizationRawWorkbook }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs" style={{ minWidth: `${Math.max(rawWorkbook.columnCount, 1) * 132}px` }}>
        <tbody>
          {rawWorkbook.rows.map((row, rowIndex) => (
            <tr key={`raw-row-${rowIndex}`} className={rowIndex < 2 ? 'bg-slate-100 font-semibold text-slate-950' : undefined}>
              {Array.from({ length: rawWorkbook.columnCount }, (_, columnIndex) => {
                if (isCoveredRawCell(rawWorkbook, rowIndex, columnIndex)) {
                  return null;
                }

                const merge = getRawMerge(rawWorkbook, rowIndex, columnIndex);
                const value = row[columnIndex] || '';

                return (
                  <td
                    key={`raw-cell-${rowIndex}-${columnIndex}`}
                    colSpan={merge ? merge.endCol - merge.startCol + 1 : undefined}
                    rowSpan={merge ? merge.endRow - merge.startRow + 1 : undefined}
                    className="whitespace-pre-wrap border border-slate-300 px-2 py-2 align-middle text-slate-800"
                  >
                    {value || <span className="text-slate-300">-</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BudgetUtilizationImportPage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_import_access', route: '/budget-utilization/import' });
  const role = useAuthStore((state) => state.profile?.role);
  const [importFiles, setImportFiles] = useState<BudgetUtilizationImportFileRecord[]>([]);
  const [preview, setPreview] = useState<BudgetUtilizationImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [normalizingBatchId, setNormalizingBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadImportFiles = async () => {
    try {
      setListLoading(true);
      setError(null);
      setImportFiles(await listBudgetImportFiles());
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดรายการไฟล์นำเข้าได้'));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (canManageBudgetUtilization(role)) {
      void loadImportFiles();
    }
  }, [role]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);
      setError(null);
      setPreview(await parseBudgetWorkbook(file));
    } catch (parseError) {
      setPreview(null);
      setError(getSafeUserErrorMessage(parseError, 'ไม่สามารถอ่านไฟล์ Excel ได้'));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    try {
      setSaving(true);
      setError(null);
      const result = await importBudgetPreview(preview);
      setMessage(`อัปโหลดและบันทึกไฟล์สำเร็จ: ${result.batch.source_file_name ?? result.reportPeriod?.title ?? preview.title}`);
      setPreview(null);
      await loadImportFiles();
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกข้อมูลนำเข้าได้'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImportFile = async (record: BudgetUtilizationImportFileRecord) => {
    const fileName = record.batch.source_file_name ?? record.reportPeriod?.title ?? 'ไฟล์นำเข้านี้';
    const confirmed = window.confirm(`ต้องการลบ ${fileName} ออกจากรายการไฟล์ที่อัปโหลดใช่หรือไม่`);
    if (!confirmed) return;

    try {
      setDeletingBatchId(record.batch.id);
      setError(null);
      setMessage(null);
      await deleteBudgetImportFile(record.batch.id);
      setImportFiles((current) => current.filter((item) => item.batch.id !== record.batch.id));
      setMessage(`ลบไฟล์นำเข้าสำเร็จ: ${fileName}`);
    } catch (deleteError) {
      setError(getSafeUserErrorMessage(deleteError, 'ไม่สามารถลบไฟล์นำเข้าได้'));
    } finally {
      setDeletingBatchId(null);
    }
  };

  const handleNormalizeImportFile = async (record: BudgetUtilizationImportFileRecord) => {
    try {
      setNormalizingBatchId(record.batch.id);
      setError(null);
      setMessage(null);
      await normalizeExistingBudgetImportFile(record.batch.id);
      setMessage(`นำข้อมูลเข้าสู่รายการงบประมาณสำเร็จ: ${record.batch.source_file_name ?? 'ไฟล์ Excel'}`);
      await loadImportFiles();
    } catch (normalizeError) {
      setError(getSafeUserErrorMessage(normalizeError, 'ไม่สามารถนำข้อมูลจากไฟล์เข้าสู่รายการงบประมาณได้'));
    } finally {
      setNormalizingBatchId(null);
    }
  };

  if (!canManageBudgetUtilization(role)) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        คุณมีสิทธิ์ดู Dashboard และข้อมูลงบประมาณ แต่ไม่มีสิทธิ์นำเข้าข้อมูล
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="นำเข้าข้อมูลงบประมาณ" description="อัปโหลดไฟล์ Excel เก็บเป็นชุดข้อมูลอ้างอิง และเลือกใช้ชุดข้อมูลนั้นบน Dashboard ได้" />
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/templates/budget-utilization-template.xlsx"
            download="budget-utilization-template.xlsx"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ดาวน์โหลด Template
          </a>
          <a
            href="/templates/budget-utilization-template-example.xlsx"
            download="budget-utilization-template-example.xlsx"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ดาวน์โหลดตัวอย่าง
          </a>
          <button
            type="button"
            onClick={() => void loadImportFiles()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            โหลดรายการ
          </button>
        </div>
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

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-teal-300 hover:bg-teal-50/40">
          <FileSpreadsheet className="h-10 w-10 text-teal-700" aria-hidden="true" />
          <span className="mt-3 text-sm font-semibold text-slate-950">{loading ? 'กำลังอ่านไฟล์...' : 'เลือกไฟล์ Excel เพื่อตรวจสอบข้อมูล'}</span>
          <span className="mt-1 text-xs text-slate-500">รองรับ .xlsx และ .xls ตามโครงสร้างต้นแบบ</span>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="sr-only" disabled={loading || saving} />
        </label>
      </section>

      {preview ? (
        <section className="mt-5 rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Preview ข้อมูลนำเข้า</h2>
              <p className="mt-1 text-sm text-slate-500">
                {preview.sourceFileName}
                {' · '}
                {preview.rawWorkbook ? `${preview.rawWorkbook.rows.length} แถวในตาราง Excel` : `${preview.rows.length} รายการ`}
                {' · '}
                error {preview.errors.length} รายการ
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={saving || (preview.rows.length === 0 && !preview.rawWorkbook?.rows.length)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกเป็นไฟล์อ้างอิง'}
            </button>
          </div>
          {preview.rawWorkbook ? (
            <RawWorkbookTable rawWorkbook={preview.rawWorkbook} />
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-[920px] divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">รายการ</th>
                  <th className="px-4 py-3 text-right">วงเงิน</th>
                  <th className="px-4 py-3 text-right">เบิกจ่าย</th>
                  <th className="px-4 py-3 text-right">ร้อยละ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3" style={{ paddingLeft: `${16 + item.depth * 18}px` }}>{item.item_name}</td>
                    <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.planned_budget_amount, 0)}</td>
                    <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.disbursed_total_amount, 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-teal-700">{formatBudgetAmount(item.amount.disbursement_rate ?? 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-5 rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-950">รายการไฟล์ที่อัปโหลด</h2>
          <p className="text-sm text-slate-500">ไฟล์ที่บันทึกแล้วจะเก็บเป็นชุดข้อมูลสำหรับเปิดดูรายละเอียดและเลือกใช้บน Dashboard</p>
        </div>
        <div className="divide-y divide-slate-100">
          {listLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">กำลังโหลดรายการไฟล์...</div>
          ) : importFiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีไฟล์ที่อัปโหลด</div>
          ) : importFiles.map((record) => (
            <div key={record.batch.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  <h3 className="font-semibold text-slate-950">{record.batch.source_file_name ?? record.reportPeriod?.title ?? 'ไฟล์นำเข้าไม่ระบุชื่อ'}</h3>
                  {record.reportPeriod?.is_active ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">ใช้งานอยู่</span> : null}
                  {record.batch.validation_status && validationStatusLabels[record.batch.validation_status] ? (
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${validationStatusLabels[record.batch.validation_status].className}`}>
                      {validationStatusLabels[record.batch.validation_status].label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  อัปโหลดเมื่อ {formatDateTime(record.batch.created_at)}
                  {' · '}
                  {record.reportPeriod ? `ปีงบประมาณ ${record.reportPeriod.fiscal_year}` : 'ยังไม่พบชุดข้อมูล'}
                  {' · '}
                  {record.batch.imported_rows.toLocaleString()} รายการ
                  {record.batch.rejected_rows > 0 ? ` · error ${record.batch.rejected_rows.toLocaleString()} รายการ` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!record.reportPeriod ? (
                  <button
                    type="button"
                    onClick={() => void handleNormalizeImportFile(record)}
                    disabled={normalizingBatchId === record.batch.id}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Database className="h-4 w-4" aria-hidden="true" />
                    {normalizingBatchId === record.batch.id ? 'กำลังนำเข้าฐานข้อมูล...' : 'นำเข้าสู่รายการงบประมาณ'}
                  </button>
                ) : null}
                <Link
                  to={`/budget-utilization/import/${record.batch.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  เปิดดูรายการ
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDeleteImportFile(record)}
                  disabled={deletingBatchId === record.batch.id}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {deletingBatchId === record.batch.id ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
