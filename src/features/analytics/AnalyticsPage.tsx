import { useEffect, useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  Target,
  Download
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { getAnalyticsData, type AnalyticsData } from '../../services/analytics.service';
import { getDashboardSummary, type DashboardSummary } from '../../services/dashboard.service';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkGroup, setSelectedWorkGroup] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const developmentAreaDetails = data?.developmentAreaDetails || [];
  const developmentAreaFilterOptions = data?.developmentAreaFilterOptions || { departments: [], workGroups: [], years: [] };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [analytics, dashSummary] = await Promise.all([
          getAnalyticsData(),
          getDashboardSummary()
        ]);
        setData(analytics);
        setSummary(dashSummary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลสถิติได้');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const filteredDevelopmentDetails = useMemo(() => {
    return developmentAreaDetails.filter((item) => {
      const workGroupOk = selectedWorkGroup === 'all' || item.workGroup === selectedWorkGroup;
      const yearOk = selectedYear === 'all' || String(item.year ?? '') === selectedYear;
      return workGroupOk && yearOk;
    });
  }, [developmentAreaDetails, selectedWorkGroup, selectedYear]);

  const filteredDevelopmentAreas = useMemo(() => {
    const stats = filteredDevelopmentDetails.reduce<Record<string, { count: number; users: Set<string> }>>((acc, item) => {
      if (!acc[item.label]) {
        acc[item.label] = { count: 0, users: new Set<string>() };
      }
      acc[item.label].count += 1;
      acc[item.label].users.add(item.userId);
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([label, value]) => ({ label, count: value.count, personnelCount: value.users.size }))
      .sort((a, b) => b.count - a.count || b.personnelCount - a.personnelCount)
      .slice(0, 10);
  }, [filteredDevelopmentDetails]);

  const developmentRecordsTotal = filteredDevelopmentAreas.reduce((sum, item) => sum + item.count, 0);
  const impactedPersonnelTotal = filteredDevelopmentAreas.reduce((sum, item) => sum + item.personnelCount, 0);
  const selectedAreaResolved = selectedArea && filteredDevelopmentAreas.some((item) => item.label === selectedArea) ? selectedArea : null;
  const selectedAreaPersonnel = useMemo(() => {
    if (!selectedAreaResolved) return [];
    const selectedRows = filteredDevelopmentDetails.filter((item) => item.label === selectedAreaResolved);
    const grouped = selectedRows.reduce<Record<string, { fullName: string; department: string; workGroup: string; mentionCount: number; lastYear: number | null }>>((acc, item) => {
      if (!acc[item.userId]) {
        acc[item.userId] = {
          fullName: item.fullName,
          department: item.department,
          workGroup: item.workGroup,
          mentionCount: 0,
          lastYear: null,
        };
      }
      acc[item.userId].mentionCount += 1;
      if (typeof item.year === 'number') {
        const currentLastYear = acc[item.userId].lastYear;
        acc[item.userId].lastYear = currentLastYear === null ? item.year : Math.max(currentLastYear, item.year);
      }
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([userId, item]) => ({ userId, ...item }))
      .sort((a, b) => b.mentionCount - a.mentionCount || a.fullName.localeCompare(b.fullName));
  }, [filteredDevelopmentDetails, selectedAreaResolved]);

  if (loading) return <div className="py-20 text-center text-slate-500">กำลังประมวลผลข้อมูลสถิติ...</div>;
  if (error || !data || !summary) return <div className="py-20 text-center text-red-600">{error || 'ไม่พบข้อมูล'}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Analytics & Insights"
          description="ภาพรวมเชิงลึกของการพัฒนาบุคลากร รายหมวดหมู่ กลุ่มงาน และแนวโน้มการเติบโต"
        />
        <button 
          onClick={() => window.print()}
          className="hidden lg:inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.personnelCount}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">บุคลากรทั้งหมด</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.trainingRecordCount}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">รายการอบรมสะสม</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-pink-50 p-3 text-pink-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 truncate max-w-[150px]">{summary.topCategory}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">หมวดหมู่ยอดนิยม</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{data.developmentAreas.length}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">หัวข้อการพัฒนา</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Analysis - Pie Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-slate-900">
            <PieChartIcon className="h-5 w-5 text-brand-600" />
            สัดส่วนตามประเภทการอบรม
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {data.categories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Work Group Analysis - Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-slate-900">
            <Users className="h-5 w-5 text-brand-600" />
            จำนวนการอบรมแยกตามกลุ่มงาน
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {(data?.workGroups?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.workGroups} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="workGroup" 
                    type="category" 
                    width={150} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 italic">ไม่มีข้อมูลกลุ่มงานที่จะแสดง</div>
            )}
          </div>
        </div>

        {/* Development Trend - Area Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-slate-900">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            แนวโน้มการพัฒนาบุคลากรรายเดือน
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.monthlyTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Development Areas - Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-slate-900">
            <Target className="h-5 w-5 text-brand-600" />
            วิเคราะห์จุดเน้นด้านการพัฒนา (Development Areas)
          </h3>
          <div className="mb-4 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-slate-700">Work Group</span>
              <select
                value={selectedWorkGroup}
                onChange={(event) => setSelectedWorkGroup(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">ทั้งหมด</option>
                {developmentAreaFilterOptions.workGroups.map((workGroup) => (
                  <option key={workGroup} value={workGroup}>{workGroup}</option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-slate-700">Year</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">ทั้งหมด</option>
                {developmentAreaFilterOptions.years.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mb-4 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-800">หัวข้อที่แสดง</p>
              <p>Top {filteredDevelopmentAreas.length} หัวข้อที่พบมากสุด</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">จำนวนรายการวิเคราะห์</p>
              <p>{developmentRecordsTotal} รายการ</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">บุคลากรที่ได้รับผลกระทบ</p>
              <p>{impactedPersonnelTotal} คน (นับรวมตามแต่ละหัวข้อ)</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDevelopmentAreas} onClick={(state) => {
                const label = state?.activeLabel;
                if (typeof label === 'string') {
                  setSelectedArea((prev) => (prev === label ? null : label));
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  dy={10} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value, name, props) => {
                    if (name === 'count') return [`${value} รายการ`, 'จำนวนที่ถูกระบุ'];
                    if (name === 'personnelCount') return [`${value} คน`, 'บุคลากรที่เกี่ยวข้อง'];
                    return [value, String(name)];
                  }}
                  labelFormatter={(label) => `หัวข้อ: ${label}`}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50}>
                  {filteredDevelopmentAreas.map((entry) => {
                    const isSelected = entry.label === selectedAreaResolved;
                    return (
                      <Cell
                        key={`dev-area-${entry.label}`}
                        fill={isSelected ? '#6d28d9' : '#8b5cf6'}
                        stroke={isSelected ? '#4c1d95' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                        fillOpacity={isSelected || !selectedAreaResolved ? 1 : 0.4}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-lg border border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                รายชื่อบุคลากรจากหัวข้อที่เลือก: {selectedAreaResolved || 'ยังไม่ได้เลือกหัวข้อ'}
              </p>
              {selectedAreaResolved ? (
                <button
                  type="button"
                  onClick={() => setSelectedArea(null)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  ล้างการเลือก
                </button>
              ) : null}
            </div>
            {selectedAreaResolved ? (
              selectedAreaPersonnel.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">ชื่อบุคลากร</th>
                        <th className="px-3 py-2">Department</th>
                        <th className="px-3 py-2">Work Group</th>
                        <th className="px-3 py-2 text-right">จำนวนครั้งที่ถูกระบุ</th>
                        <th className="px-3 py-2 text-right">ปีล่าสุด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedAreaPersonnel.map((person) => (
                        <tr key={person.userId}>
                          <td className="px-3 py-2 text-slate-800">{person.fullName}</td>
                          <td className="px-3 py-2 text-slate-600">{person.department}</td>
                          <td className="px-3 py-2 text-slate-600">{person.workGroup}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700">{person.mentionCount}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{person.lastYear ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">ไม่พบบุคลากรตาม filter ปัจจุบัน</p>
              )
            ) : (
              <p className="text-sm text-slate-500">คลิกที่แท่งกราฟเพื่อดูรายชื่อบุคลากร</p>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            คำแนะนำการตีความ: แท่งสูงแปลว่าหัวข้อนั้นถูกระบุบ่อย เหมาะสำหรับใช้จัดลำดับแผนอบรมระดับองค์กร
          </p>
        </div>
      </div>
    </div>
  );
}
