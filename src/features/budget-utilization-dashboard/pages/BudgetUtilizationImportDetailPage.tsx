import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, DatabaseZap, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { getBudgetImportFileDetail, setActiveBudgetReportPeriod } from '../services/budgetUtilization.service';
import type { BudgetUtilizationImportFileDetail, BudgetUtilizationRawWorkbook } from '../types/budgetUtilization.types';
import { formatBudgetAmount } from '../utils/budgetUtilizationCalculations';

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

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

export function BudgetUtilizationImportDetailPage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_import_detail_access', route: '/budget-utilization/import/:id' });
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  const [detail, setDetail] = useState<BudgetUtilizationImportFileDetail | null>(null);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!batchId) {
      setError('ไม่พบรหัสไฟล์นำเข้า');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDetail(await getBudgetImportFileDetail(batchId));
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดรายละเอียดไฟล์นำเข้าได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [batchId]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const items = detail?.items ?? [];

    if (!normalizedKeyword) return items;

    return items.filter((item) => (
      `${item.sequence_label ?? ''} ${item.item_name} ${item.output_label ?? ''} ${item.activity_label ?? ''}`
        .toLowerCase()
        .includes(normalizedKeyword)
    ));
  }, [detail?.items, keyword]);

  const activateDataset = async () => {
    if (!detail?.reportPeriod) return;

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      await setActiveBudgetReportPeriod(detail.reportPeriod.id);
      setMessage('ตั้งค่าไฟล์นี้เป็นชุดข้อมูลใช้งานบน Dashboard แล้ว');
      await loadData();
    } catch (activateError) {
      setError(getSafeUserErrorMessage(activateError, 'ไม่สามารถตั้งค่าไฟล์นี้เป็นชุดข้อมูลใช้งานได้'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/budget-utilization/import')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับรายการไฟล์นำเข้า
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={detail?.batch.source_file_name ?? 'รายละเอียดไฟล์นำเข้า'}
          description="ดูรายการทั้งหมดจากไฟล์ Excel ที่อัปโหลดไว้ และใช้เป็นชุดข้อมูลอ้างอิงสำหรับ Dashboard"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            โหลดใหม่
          </button>
          {detail?.reportPeriod ? (
            <button
              type="button"
              onClick={() => void activateDataset()}
              disabled={busy || detail.reportPeriod.is_active}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DatabaseZap className="h-4 w-4" aria-hidden="true" />
              {detail.reportPeriod.is_active ? 'ใช้งานบน Dashboard แล้ว' : 'ใช้ไฟล์นี้บน Dashboard'}
            </button>
          ) : null}
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

      {detail ? (
        <section className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">ไฟล์อ้างอิง</p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-950">{detail.batch.source_file_name ?? '-'}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">อัปโหลดเมื่อ</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(detail.batch.created_at)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">จำนวนรายการ</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {detail.rawWorkbook ? `${detail.rawWorkbook.rows.length.toLocaleString()} แถว` : `${detail.items.length.toLocaleString()} รายการ`}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Dashboard</p>
            <Link to={`/budget-utilization?reportPeriodId=${detail.reportPeriod?.id ?? ''}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              เปิด Dashboard ชุดนี้
            </Link>
          </div>
        </section>
      ) : null}

      {detail?.rawWorkbook ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">ตารางจากไฟล์ Excel</h2>
            <p className="mt-1 text-sm text-slate-500">แสดงข้อมูลตามตารางในชีต {detail.rawWorkbook.sheetName} โดยยังไม่แปลงหรือคำนวณใหม่</p>
          </div>
          <RawWorkbookTable rawWorkbook={detail.rawWorkbook} />
        </section>
      ) : (
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">รายการทั้งหมดในไฟล์</h2>
            <p className="mt-1 text-sm text-slate-500">ข้อมูลนี้ถูกเก็บในระบบตามไฟล์ที่อัปโหลดไว้</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="ค้นหารายการ"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1900px] divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">รายการ</th>
                <th className="px-4 py-3 text-right">กรอบวงเงิน</th>
                <th className="px-4 py-3 text-right">งวด 1</th>
                <th className="px-4 py-3 text-right">งวด 2</th>
                <th className="px-4 py-3 text-right">งวด 3</th>
                <th className="px-4 py-3 text-right">ส่วนกลางรับโอน</th>
                <th className="px-4 py-3 text-right">ส่วนกลางโอนออก</th>
                <th className="px-4 py-3 text-right">ภายในกรมขอเพิ่ม</th>
                <th className="px-4 py-3 text-right">ภายในกรมโอนออก</th>
                <th className="px-4 py-3 text-right">ภายในกองรับโอน</th>
                <th className="px-4 py-3 text-right">ภายในกองโอนออก</th>
                <th className="px-4 py-3 text-right">ผูกพันมี PO</th>
                <th className="px-4 py-3 text-right">ผูกพันไม่มี PO</th>
                <th className="px-4 py-3 text-right">เบิกจ่ายรวม</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
                <th className="px-4 py-3 text-right">ร้อยละ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={16} className="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={16} className="px-4 py-8 text-center text-slate-500">ไม่พบรายการในไฟล์นี้</td></tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className={item.parent_id === null ? 'bg-teal-50/50 font-semibold' : undefined}>
                  <td className="px-4 py-3 text-slate-900">
                    <div style={{ paddingLeft: `${item.depth * 18}px` }}>
                      <span className="text-xs text-slate-400">{item.sequence_label}</span>
                      <span className="ml-2">{item.item_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.planned_budget_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.allocation_tranche_1_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.allocation_tranche_2_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.allocation_tranche_3_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.central_transfer_in_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.central_transfer_out_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.department_request_increase_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.department_transfer_out_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.division_transfer_in_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.division_transfer_out_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.committed_po_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.committed_without_po_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.disbursed_total_amount, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatBudgetAmount(item.amount.remaining_amount, 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-700">{formatBudgetAmount(item.amount.disbursement_rate ?? 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {detail?.errors.length ? (
        <section className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          พบข้อผิดพลาดจากไฟล์นี้ {detail.errors.length.toLocaleString()} รายการ
        </section>
      ) : null}
    </div>
  );
}
