import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, ArrowLeft, CheckCircle2, HardDrive, Monitor, PencilLine, RefreshCw, Search, Server, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getItAssetEvaluationCriteria } from '../../services/it-asset-evaluation.service';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { getItAssets } from '../../services/it-asset.service';
import { useAuthStore } from '../../stores/auth.store';
import { formatThaiDate } from '../../utils/thaiDate';
import { ItAssetDetailModal } from './components/ItAssetDetailModal';
import { ItAssetFilterSection } from './components/ItAssetFilterSection';
import { ItAssetStatCard } from './components/ItAssetStatCard';
import type { ItAssetFilters, ItAssetViewModel } from './types';
import { cleanFilterValue, countByLabel, itAssetChartColors, toItAssetViewModel } from './utils/assetMetrics';

const emptyFilters: ItAssetFilters = {
  assetType: [],
  operatingSystem: [],
  cpu: [],
  memory: [],
  graphics: [],
  disk1Type: [],
  disk2Type: [],
  assetAge: [],
  workGroup: [],
};

function uniqueOptions(values: Array<string | number | null | undefined>) {
  return [...new Set(values.map(cleanFilterValue).filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b, 'th'),
  );
}

const assetAgeFilterThresholds = {
  over5: 5,
  over7: 7,
} as const;

function matchesFilter(selected: string[], value: string | number | null | undefined) {
  return selected.length === 0 || selected.includes(cleanFilterValue(value) || '');
}

function matchesAssetAgeFilter(selected: string[], ageYears: number) {
  return selected.length === 0 || selected.some((value) => ageYears > assetAgeFilterThresholds[value as keyof typeof assetAgeFilterThresholds]);
}

export function ItAssetsPage() {
  useAuditPageAccess({ module: 'it_assets', action: 'it_assets_access', route: '/it-assets' });
  const { profile } = useAuthStore();
  const [assets, setAssets] = useState<ItAssetViewModel[]>([]);
  const [filters, setFilters] = useState<ItAssetFilters>(emptyFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ItAssetViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManageAssets = profile?.role === 'super_admin' || profile?.role === 'admin';

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, criteria] = await Promise.all([getItAssets(), getItAssetEvaluationCriteria()]);
      setAssets(data.map((asset) => toItAssetViewModel(asset, criteria)));
    } catch (loadError) {
      console.error('Failed to load IT assets:', loadError);
      setError('ไม่สามารถโหลดข้อมูลครุภัณฑ์คอมพิวเตอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
  }, []);

  const options = useMemo(
    () => ({
      assetType: uniqueOptions(assets.map((asset) => asset.asset_type)),
      operatingSystem: uniqueOptions(assets.map((asset) => asset.operating_system)),
      cpu: uniqueOptions(assets.map((asset) => asset.cpu)),
      memory: uniqueOptions(assets.map((asset) => asset.memory_gb)),
      graphics: uniqueOptions(assets.map((asset) => asset.graphics)),
      disk1Type: uniqueOptions(assets.map((asset) => asset.disk1_type)),
      disk2Type: uniqueOptions(assets.map((asset) => asset.disk2_type)),
      workGroup: uniqueOptions(assets.map((asset) => asset.work_group)),
    }),
    [assets],
  );

  const baseFilteredAssets = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return assets.filter((asset) => {
      const searchSource = [asset.asset_code, asset.computer_name, asset.user_name, asset.work_group]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!keyword || searchSource.includes(keyword)) &&
        matchesFilter(filters.assetType, asset.asset_type) &&
        matchesFilter(filters.operatingSystem, asset.operating_system) &&
        matchesFilter(filters.cpu, asset.cpu) &&
        matchesFilter(filters.memory, asset.memory_gb) &&
        matchesFilter(filters.graphics, asset.graphics) &&
        matchesFilter(filters.disk1Type, asset.disk1_type) &&
        matchesFilter(filters.disk2Type, asset.disk2_type) &&
        matchesFilter(filters.workGroup, asset.work_group)
      );
    });
  }, [assets, filters.assetType, filters.cpu, filters.disk1Type, filters.disk2Type, filters.graphics, filters.memory, filters.operatingSystem, filters.workGroup, searchTerm]);

  const ageFilterOptions = useMemo(
    () => [
      {
        value: 'over5',
        label: `มากกว่า 5 ปี (${baseFilteredAssets.filter((asset) => asset.ageYears > assetAgeFilterThresholds.over5).length.toLocaleString()})`,
      },
      {
        value: 'over7',
        label: `มากกว่า 7 ปี (${baseFilteredAssets.filter((asset) => asset.ageYears > assetAgeFilterThresholds.over7).length.toLocaleString()})`,
      },
    ],
    [baseFilteredAssets],
  );

  const filteredAssets = useMemo(() => {
    return baseFilteredAssets.filter((asset) => matchesAssetAgeFilter(filters.assetAge, asset.ageYears));
  }, [baseFilteredAssets, filters.assetAge]);

  const latestDataUpdatedAt = useMemo(() => {
    return assets
      .map((asset) => asset.updated_at?.slice(0, 10))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => b.localeCompare(a))[0];
  }, [assets]);

  const stats = useMemo(() => {
    const windows11Count = filteredAssets.filter((asset) => (asset.operating_system || '').toLowerCase().includes('windows 11')).length;
    const fastDiskCount = filteredAssets.filter((asset) => {
      const disk1 = (asset.disk1_type || '').toLowerCase();
      const disk2 = (asset.disk2_type || '').toLowerCase();
      return disk1.includes('ssd') || disk1.includes('nvme') || disk1.includes('m.2') || disk2.includes('ssd') || disk2.includes('nvme');
    }).length;
    const averageHours =
      filteredAssets.length > 0
        ? Math.round(filteredAssets.reduce((sum, asset) => sum + (asset.disk1_hours || 0), 0) / filteredAssets.length)
        : 0;
    const osChartData = countByLabel(filteredAssets.map((asset) => asset.operating_system || 'ไม่ระบุ'));
    const gradeChartData = ['A', 'B', 'C', 'D'].map((grade) => ({
      name: `เกรด ${grade}`,
      value: filteredAssets.filter((asset) => asset.health.grade === grade).length,
      grade,
    }));
    const diskChartData = countByLabel(
      filteredAssets
        .flatMap((asset) => [asset.disk1_type, asset.disk2_type])
        .map((value) => cleanFilterValue(value))
        .filter((value): value is string => Boolean(value)),
    );

    return { windows11Count, fastDiskCount, averageHours, osChartData, gradeChartData, diskChartData };
  }, [filteredAssets]);

  const gradeChartMaxValue = useMemo(() => {
    return Math.max(...stats.gradeChartData.map((item) => item.value), 0);
  }, [stats.gradeChartData]);

  const displayedAssets = useMemo(() => {
    return selectedGrade ? filteredAssets.filter((asset) => asset.health.grade === selectedGrade) : filteredAssets;
  }, [filteredAssets, selectedGrade]);

  const toggleFilter = (key: keyof ItAssetFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setSearchTerm('');
    setSelectedGrade(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link to="/portal" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับ Portal
            </Link>
            <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">IT Asset Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">ระบบครุภัณฑ์คอมพิวเตอร์กองยุทธศาสตร์และแผนงาน</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageAssets ? (
              <Link
                to="/it-assets/manage"
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                Manage
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void loadAssets()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              รีเฟรช
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-8">
        <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-950">ตัวกรองข้อมูล</p>
            <p className="mt-1 text-xs text-slate-500">กรองเฉพาะระบบ IT Asset</p>
          </div>
          <div className="space-y-1">
            <ItAssetFilterSection title="กลุ่มงาน" options={options.workGroup} selected={filters.workGroup} onToggle={(value) => toggleFilter('workGroup', value)} defaultOpen />
            <ItAssetFilterSection title="ลักษณะเครื่อง" options={options.assetType} selected={filters.assetType} onToggle={(value) => toggleFilter('assetType', value)} />
            <ItAssetFilterSection title="ระบบปฏิบัติการ" options={options.operatingSystem} selected={filters.operatingSystem} onToggle={(value) => toggleFilter('operatingSystem', value)} />
            <ItAssetFilterSection title="CPU" options={options.cpu} selected={filters.cpu} onToggle={(value) => toggleFilter('cpu', value)} />
            <ItAssetFilterSection title="Memory" options={options.memory} selected={filters.memory} onToggle={(value) => toggleFilter('memory', value)} />
            <ItAssetFilterSection title="Graphics" options={options.graphics} selected={filters.graphics} onToggle={(value) => toggleFilter('graphics', value)} />
            <ItAssetFilterSection title="Disk 1" options={options.disk1Type} selected={filters.disk1Type} onToggle={(value) => toggleFilter('disk1Type', value)} />
            <ItAssetFilterSection title="Disk 2" options={options.disk2Type} selected={filters.disk2Type} onToggle={(value) => toggleFilter('disk2Type', value)} />
            <ItAssetFilterSection title="อายุการใช้งาน" options={ageFilterOptions} selected={filters.assetAge} onToggle={(value) => toggleFilter('assetAge', value)} />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            ล้างตัวกรอง
          </button>
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              {error ? (
                <p className="inline-flex items-center gap-2 text-sm font-medium text-red-600">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {error}
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ข้อมูลอัปเดตข้อมูลล่าสุดเมื่อ {formatThaiDate(latestDataUpdatedAt, 'รอการบันทึกใน Manage')}
                </p>
              )}
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหารหัส ชื่อเครื่อง ผู้ใช้"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ItAssetStatCard title="จำนวนเครื่องทั้งหมด" value={filteredAssets.length} subtext="รายการที่ตรงเงื่อนไข" icon={Monitor} tone="blue" />
            <ItAssetStatCard title="Windows 11" value={stats.windows11Count} subtext={`${((stats.windows11Count / (filteredAssets.length || 1)) * 100).toFixed(1)}% ของทั้งหมด`} icon={Server} tone="violet" />
            <ItAssetStatCard title="SSD / NVMe" value={stats.fastDiskCount} subtext="เครื่องที่มี disk ความเร็วสูง" icon={HardDrive} tone="green" />
            <ItAssetStatCard title="ชั่วโมงเฉลี่ย" value={stats.averageHours.toLocaleString()} subtext="ชั่วโมงการทำงาน Disk หลัก" icon={Activity} tone="orange" />
          </div>

          {isLoading && assets.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
              <RefreshCw className="mb-3 h-8 w-8 animate-spin text-blue-700" aria-hidden="true" />
              กำลังโหลดข้อมูลครุภัณฑ์
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold text-slate-950">สัดส่วนระบบปฏิบัติการ</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.osChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={84}
                          paddingAngle={4}
                          label={({ value }) => value}
                        >
                          {stats.osChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={itAssetChartColors[index % itAssetChartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">จำนวนเครื่องแยกตามเกรด</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {stats.gradeChartData.map((item) => `เกรด ${item.grade}: ${item.value.toLocaleString()}`).join(' / ')}
                      </p>
                    </div>
                    {selectedGrade ? (
                      <button
                        type="button"
                        onClick={() => setSelectedGrade(null)}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        เกรด {selectedGrade}
                      </button>
                    ) : null}
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.gradeChartData} margin={{ top: 28, right: 16, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis
                          allowDecimals={false}
                          domain={[0, Math.max(1, Math.ceil(gradeChartMaxValue * 1.2))]}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          name="จำนวนเครื่อง"
                          radius={[4, 4, 0, 0]}
                          barSize={42}
                          cursor="pointer"
                          onClick={(data) => {
                            const grade = data.grade as 'A' | 'B' | 'C' | 'D';
                            setSelectedGrade((current) => (current === grade ? null : grade));
                          }}
                        >
                          <LabelList dataKey="value" position="top" className="fill-slate-700 text-xs font-semibold" />
                          {stats.gradeChartData.map((entry) => {
                            const color = entry.grade === 'A' ? '#16a34a' : entry.grade === 'B' ? '#2563eb' : entry.grade === 'C' ? '#f97316' : '#dc2626';
                            return <Cell key={entry.grade} fill={color} fillOpacity={selectedGrade && selectedGrade !== entry.grade ? 0.35 : 1} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <h2 className="text-base font-semibold text-slate-950">{selectedGrade ? `รายการครุภัณฑ์เกรด ${selectedGrade}` : 'รายการครุภัณฑ์'}</h2>
                  <p className="text-sm text-slate-500">แสดง {Math.min(displayedAssets.length, 100)} จาก {displayedAssets.length} รายการ</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                        <th className="px-2 pb-3">รหัสครุภัณฑ์</th>
                        <th className="px-2 pb-3">ผู้ใช้งาน / ชื่อเครื่อง</th>
                        <th className="px-2 pb-3">OS / CPU / RAM</th>
                        <th className="px-2 pb-3">Disk 1 / Disk 2</th>
                        <th className="px-2 pb-3 text-center">คุณภาพ</th>
                        <th className="px-2 pb-3 text-right">ชม.ทำงาน</th>
                        <th className="px-2 pb-3">กลุ่มงาน</th>
                        <th className="px-2 pb-3 text-center">อายุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedAssets.slice(0, 100).map((asset) => (
                        <tr key={asset.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => setSelectedAsset(asset)}>
                          <td className="px-2 py-3 font-mono text-xs font-semibold text-blue-700">{asset.asset_code}</td>
                          <td className="px-2 py-3">
                            <p className="font-semibold text-slate-900">{asset.user_name || '-'}</p>
                            <p className="text-xs text-slate-500">{asset.computer_name || '-'}</p>
                          </td>
                          <td className="px-2 py-3">
                            <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{asset.operating_system || '-'}</span>
                            <p className="mt-1 text-xs text-slate-500">{asset.cpu || '-'}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">{asset.memory_gb ? `${asset.memory_gb} GB` : '-'}</p>
                          </td>
                          <td className="px-2 py-3 text-xs text-slate-600">
                            <p>{asset.disk1_type || '-'} {asset.disk1_product ? `· ${asset.disk1_product}` : ''}</p>
                            <p className="mt-1">{asset.disk2_type || '-'} {asset.disk2_product ? `· ${asset.disk2_product}` : ''}</p>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${asset.health.colorClass}`}>
                              {asset.health.grade}
                            </span>
                            <p className="mt-1 text-[11px] text-slate-500">{asset.health.score} คะแนน</p>
                          </td>
                          <td className="px-2 py-3 text-right font-mono text-sm font-semibold text-slate-800">{(asset.disk1_hours || 0).toLocaleString()}</td>
                          <td className="max-w-[180px] truncate px-2 py-3 text-slate-600" title={asset.work_group || undefined}>{asset.work_group || '-'}</td>
                          <td className="px-2 py-3 text-center text-slate-700">{asset.ageText}</td>
                        </tr>
                      ))}
                      {displayedAssets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-2 py-10 text-center text-slate-400">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <ItAssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
