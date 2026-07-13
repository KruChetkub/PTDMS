import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  LogIn,
  Clock,
  Globe,
  Monitor,
  CheckCircle2,
  XCircle,
  CloudUpload,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  exportAuditLogsToGoogleSheet,
  listLoginHistory,
  type AuditLogGoogleSheetExportResult,
  type LoginHistory,
} from '../../services/audit.service';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

export function SecurityPage() {
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [exportResult, setExportResult] = useState<AuditLogGoogleSheetExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await listLoginHistory();
        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดประวัติการล็อกอินได้'));
      } finally {
        setLoading(false);
      }
    };
    void loadHistory();
  }, []);

  const safeHistory = Array.isArray(history) ? history : [];

  const handleExportLogs = async () => {
    setExportingLogs(true);
    setExportError(null);
    setExportResult(null);

    try {
      const result = await exportAuditLogsToGoogleSheet();
      setExportResult(result);
    } catch (err) {
      setExportError(getSafeUserErrorMessage(err, 'ไม่สามารถส่ง Audit Logs ไป Google Sheet ได้'));
    } finally {
      setExportingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Login History"
        description="ตรวจสอบประวัติการเข้าใช้งาน และสถานะความปลอดภัยของบัญชีผู้ใช้ในระบบ"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">System Security</h3>
            </div>
            <ul className="space-y-3 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Supabase RLS is active on all core tables.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>RBAC permissions enforced at Router and Database level.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <CloudUpload className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Audit Logs to Google Sheet</h4>
                <p className="text-xs text-slate-500">ส่งออก log ที่ค้างอยู่ไปยัง Google Sheet โดยตรง</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportLogs}
              disabled={exportingLogs}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {exportingLogs ? 'กำลังส่งไป Google Sheet' : 'ส่ง Audit Logs ไป Google Sheet'}
            </button>

            {exportResult ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                ส่งสำเร็จ {exportResult.total_logs ?? 0} รายการ
                {exportResult.batch_id ? <span className="block break-all">Batch: {exportResult.batch_id}</span> : null}
                <span className="block">ลบ log เก่าที่ส่งแล้ว: {exportResult.cleanup_deleted ?? 0} รายการ</span>
                {exportResult.export_status_update_error ? (
                  <span className="mt-1 block text-amber-700">ส่งเข้า Google Sheet แล้ว แต่ยังอัปเดตสถานะ log ไม่สำเร็จ: {exportResult.export_status_update_error}</span>
                ) : null}
              </div>
            ) : null}

            {exportError ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {exportError}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 font-bold text-slate-900">Login Statistics</h4>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Success</span>
                <span className="font-bold text-emerald-600">{safeHistory.filter((h) => h.success).length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Failed Attempts</span>
                <span className="font-bold text-red-600">{safeHistory.filter((h) => !h.success).length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <LogIn className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-slate-900">ประวัติการล็อกอินล่าสุด</h3>
          </div>

          {error ? <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">ผู้ใช้งาน</th>
                  <th className="px-6 py-3">วันเวลา</th>
                  <th className="px-6 py-3">สถานะ</th>
                  <th className="px-6 py-3">IP / อุปกรณ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-4"><div className="h-8 rounded bg-slate-50" /></td>
                    </tr>
                  ))
                ) : safeHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">ไม่มีข้อมูลการล็อกอิน</td>
                  </tr>
                ) : (
                  safeHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{log.user_name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(log.login_at).toLocaleString('th-TH')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {log.ip_address || 'Unknown'}
                          </span>
                          <span className="flex max-w-[150px] items-center gap-1 truncate" title={log.user_agent || ''}>
                            <Monitor className="h-3 w-3" /> {log.user_agent ? 'Browser/Device' : '-'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
