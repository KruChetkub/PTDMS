import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, GraduationCap, RefreshCw, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { getDashboardSummary, type DashboardSummary } from '../../services/dashboard.service';

const emptySummary: DashboardSummary = {
  personnelCount: 0,
  trainingRecordCount: 0,
  topCategory: '-',
  topWorkGroup: '-',
  monthlyTrend: [],
  yearlyTrend: [],
};

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูล Dashboard ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const metrics = [
    { label: 'บุคลากรทั้งหมด', value: summary.personnelCount.toLocaleString(), icon: Users, tone: 'brand' },
    { label: 'รายการอบรม', value: summary.trainingRecordCount.toLocaleString(), icon: ClipboardList, tone: 'forest' },
    { label: 'ประเภทอบรมยอดนิยม', value: summary.topCategory, icon: GraduationCap, tone: 'amber' },
    { label: 'กลุ่มงานที่อบรมมากที่สุด', value: summary.topWorkGroup, icon: BarChart3, tone: 'slate' },
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Executive Dashboard" description="ภาพรวมข้อมูลการฝึกอบรมจาก Supabase ตามสิทธิ์ผู้ใช้งาน" />
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <section key={metric.label} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p className="mt-2 truncate text-2xl font-semibold text-slate-950">{loading ? '...' : metric.value}</p>
                </div>
                <div
                  className={
                    metric.tone === 'forest'
                      ? 'rounded-md bg-emerald-50 p-3 text-emerald-700'
                      : metric.tone === 'amber'
                        ? 'rounded-md bg-amber-50 p-3 text-amber-700'
                        : metric.tone === 'slate'
                          ? 'rounded-md bg-slate-100 p-3 text-slate-700'
                          : 'rounded-md bg-brand-50 p-3 text-brand-700'
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Monthly Trend</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1d75bd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Yearly Trend</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#23805f" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
