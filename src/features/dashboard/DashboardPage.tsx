import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ClipboardList, GraduationCap, RefreshCw, Sparkles, Target, Users } from 'lucide-react';
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
  ReferenceLine,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { getDashboardSummary, type DashboardSummary } from '../../services/dashboard.service';

const emptySummary: DashboardSummary = {
  personnelCount: 0,
  trainingRecordCount: 0,
  topCategory: '-',
  topWorkGroup: '-',
  categoryBreakdown: [],
  monthlyTrend: [],
  yearlyTrend: [],
};

const categoryColors: Record<string, string> = {
  'หลักสูตรพื้นฐานสำหรับบุคลากร': '#1d75bd',
  'หลักสูตรด้านภาวะผู้นำ กรมควบคุมโรค': '#23805f',
  'หลักสูตรด้านนโยบายและยุทธศาสตร์': '#d97706',
  'หลักสูตรด้านดิจิทัล': '#7c3aed',
  'หลักสูตรตามสมรรถนะที่เหมาะสมสำหรับการปฏิบัติงาน (อื่นๆ)': '#475569',
};

function formatPercent(value: number) {
  return `${value.toLocaleString()}%`;
}

function truncateLabel(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 17)}…`;
}

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

  const topCategory = useMemo(
    () => summary.categoryBreakdown.reduce((best, current) => (current.count > best.count ? current : best), summary.categoryBreakdown[0] || null),
    [summary.categoryBreakdown],
  );

  const sortedCategoryBreakdown = useMemo(
    () => [...summary.categoryBreakdown].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'th')),
    [summary.categoryBreakdown],
  );

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

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Training Portfolio by Category</h2>
            <p className="mt-1 text-sm text-slate-500">ภาพรวม 5 หมวดหลักสูตรที่ผู้บริหารอ่านได้ในทันที</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              หมวดเด่น: {topCategory?.label || '-'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <Target className="h-3.5 w-3.5" />
              สัดส่วนสูงสุด: {topCategory ? formatPercent(topCategory.percentage) : '-'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)] xl:items-stretch">
          <div className="flex min-h-[520px] flex-col pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedCategoryBreakdown}
                layout="vertical"
                margin={{ top: 20, right: 28, bottom: 28, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} height={34} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={190}
                  interval={0}
                  tick={({ x, y, payload }) => {
                    const label = truncateLabel(String(payload.value));
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={4} textAnchor="end" fill="#64748b" fontSize={12}>
                          {label}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgb(15 23 42 / 0.08)' }}
                  formatter={(value: number, name, item) => [
                    `${value.toLocaleString()} รายการ`,
                    item.payload?.label || String(name),
                  ]}
                />
                <ReferenceLine x={0} stroke="#cbd5e1" />
                <Bar
                  dataKey="count"
                  radius={[0, 8, 8, 0]}
                  barSize={20}
                  shape={(props: unknown) => {
                    const { x, y, width, height, payload } = props as {
                      x?: number;
                      y?: number;
                      width?: number;
                      height?: number;
                      payload?: { label?: string };
                    };

                    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
                      return <g />;
                    }

                    const label = payload?.label || '';

                    return (
                      <rect
                        x={x}
                        y={y}
                        width={Math.max(width, 0)}
                        height={height}
                        rx={8}
                        ry={8}
                        fill={categoryColors[label] || '#1d75bd'}
                      />
                    );
                  }}
                >
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {summary.categoryBreakdown.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{item.label}</h3>
                    <p className="mt-1 text-xs text-slate-500">หลักสูตรเด่น: {item.topCourse}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-950">{item.count.toLocaleString()}</div>
                    <div className="text-xs font-medium text-slate-500">{formatPercent(item.percentage)}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: categoryColors[item.label] || '#1d75bd',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
