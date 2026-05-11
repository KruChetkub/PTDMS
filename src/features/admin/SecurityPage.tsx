import { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  LogIn, 
  Clock, 
  Globe,
  Monitor,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { listLoginHistory, type LoginHistory } from '../../services/audit.service';

export function SecurityPage() {
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await listLoginHistory();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการล็อกอินได้');
      } finally {
        setLoading(false);
      }
    };
    void loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Login History"
        description="ตรวจสอบประวัติการเข้าใช้งาน และสถานะความปลอดภัยของบัญชีผู้ใช้ในระบบ"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Security Overview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-emerald-900 text-lg">System Security</h3>
            </div>
            <ul className="space-y-3 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Supabase RLS is active on all core tables.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>RBAC permissions enforced at Router and Database level.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2">Login Statistics</h4>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Total Success</span>
                <span className="font-bold text-emerald-600">{history.filter(h => h.success).length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Failed Attempts</span>
                <span className="font-bold text-red-600">{history.filter(h => !h.success).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login History Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
            <LogIn className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-slate-900">ประวัติการล็อกอินล่าสุด</h3>
          </div>
          
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
                      <td colSpan={4} className="px-6 py-4"><div className="h-8 bg-slate-50 rounded"></div></td>
                    </tr>
                  ))
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">ไม่มีข้อมูลการล็อกอิน</td>
                  </tr>
                ) : (
                  history.map((log) => (
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
                        <div className="flex items-center gap-3 text-slate-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {log.ip_address || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1 max-w-[150px] truncate" title={log.user_agent || ''}>
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
