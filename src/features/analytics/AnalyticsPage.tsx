import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LabelList
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  Target,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { getAnalyticsData, type AnalyticsData } from '../../services/analytics.service';
import { getDashboardSummary, type DashboardSummary } from '../../services/dashboard.service';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];
const WORK_GROUP_DETAIL_PAGE_SIZE = 5;
const RADIAN = Math.PI / 180;
type ImageFormat = 'png' | 'jpg' | 'svg';
type ExportKey = 'training-categories' | 'work-groups' | 'monthly-development';
type ExportDetail = {
  label: string;
  count: number;
  color?: string;
  percent?: number;
};

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateSvgText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function copyComputedStyles(source: Element, target: Element) {
  const computedStyle = window.getComputedStyle(source);
  Array.from(computedStyle).forEach((property) => {
    (target as HTMLElement).style.setProperty(property, computedStyle.getPropertyValue(property), computedStyle.getPropertyPriority(property));
  });

  Array.from(source.children).forEach((child, index) => {
    const targetChild = target.children.item(index);
    if (targetChild) {
      copyComputedStyles(child, targetChild);
    }
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildChartSvg(element: HTMLElement, details: ExportDetail[] = [], summaryText?: string) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const title = element.querySelector('h3')?.textContent?.trim() || 'Analytics Chart';
  const chartSvg = element.querySelector('.recharts-wrapper svg') || element.querySelector('svg.recharts-surface');

  if (!chartSvg) {
    throw new Error('ไม่พบกราฟสำหรับดาวน์โหลด');
  }

  const chartRect = chartSvg.getBoundingClientRect();
  const chartX = Math.max(20, Math.round(chartRect.left - rect.left));
  const detailRows = details.slice(0, 8);
  const chartY = summaryText ? 88 : 62;
  const chartWidth = Math.max(240, Math.ceil(chartRect.width));
  const chartHeight = Math.max(180, Math.ceil(chartRect.height));
  const hasSideDetails = detailRows.length > 0 && width - (chartX + chartWidth) >= 320;
  const detailColumns = hasSideDetails || width < 720 ? 1 : 2;
  const detailColumnWidth = hasSideDetails ? Math.max(260, width - (chartX + chartWidth) - 52) : Math.floor((width - 48) / detailColumns);
  const detailRowsPerColumn = Math.ceil(detailRows.length / detailColumns);
  const bottomDetailsHeight = detailRows.length > 0 && !hasSideDetails ? detailRowsPerColumn * 24 + 44 : 0;
  const height = chartY + chartHeight + 24 + bottomDetailsHeight;
  const chartClone = chartSvg.cloneNode(true) as SVGElement;

  copyComputedStyles(chartSvg, chartClone);
  chartClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  chartClone.setAttribute('x', String(chartX));
  chartClone.setAttribute('y', String(chartY));
  chartClone.setAttribute('width', String(chartWidth));
  chartClone.setAttribute('height', String(chartHeight));

  const detailBaseX = hasSideDetails ? chartX + chartWidth + 24 : 24;
  const detailBaseY = hasSideDetails ? chartY + 12 : chartY + chartHeight + 30;
  const titleFontSize = 13;
  const summaryFontSize = 12;
  const detailLabelFontSize = 11;
  const detailValueFontSize = 11;
  const detailsSvg = detailRows.map((item, index) => {
    const columnIndex = hasSideDetails ? 0 : Math.floor(index / detailRowsPerColumn);
    const rowIndex = hasSideDetails ? index : index % detailRowsPerColumn;
    const detailX = detailBaseX + columnIndex * detailColumnWidth;
    const y = detailBaseY + rowIndex * 24;
    const countText = `${item.count.toLocaleString()} รายการ`;
    const percentText = typeof item.percent === 'number' ? ` (${item.percent}%)` : '';
    const label = escapeSvgText(truncateSvgText(item.label, hasSideDetails ? 22 : 28));
    const color = item.color || COLORS[index % COLORS.length];
    const valueX = Math.min(width - 28, detailX + detailColumnWidth - 8);
    const valueText = `${countText}${percentText}`;

    return [
      `<circle cx="${detailX + 4}" cy="${y - 4}" r="4" fill="${color}"/>`,
      `<text x="${detailX + 16}" y="${y}" font-family="Tahoma, Arial, sans-serif" font-size="${detailLabelFontSize}" font-weight="500" fill="#475569">${label}</text>`,
      `<text x="${valueX}" y="${y}" font-family="Tahoma, Arial, sans-serif" font-size="${detailValueFontSize}" font-weight="600" fill="#0f172a" text-anchor="end">${valueText}</text>`,
    ].join('');
  }).join('');
  const summarySvg = summaryText
    ? `<text x="22" y="62" font-family="Tahoma, Arial, sans-serif" font-size="${summaryFontSize}" font-weight="600" fill="#2563eb">${escapeSvgText(summaryText)}</text>`
    : '';
  const serializedChart = new XMLSerializer().serializeToString(chartClone);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.12"/>',
    '</filter>',
    '</defs>',
    `<rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="12" fill="#ffffff" stroke="#e2e8f0" filter="url(#cardShadow)"/>`,
    `<text x="22" y="38" font-family="Tahoma, Arial, sans-serif" font-size="${titleFontSize}" font-weight="600" fill="#0f172a">${escapeSvgText(title)}</text>`,
    summarySvg,
    serializedChart,
    detailsSvg,
    '</svg>',
  ].join('');

  return { svg, width, height };
}

function renderPieCalloutLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  fill?: string;
  index?: number;
}) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    outerRadius = 0,
    percent = 0,
    name = '',
    fill = '#334155',
    index = 999,
  } = props;

  // Show callout for up to 5 categories.
  if (index > 4 || percent < 0.01) return null;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 9) * cos;
  const my = cy + (outerRadius + 9) * sin;
  const ex = mx + (cos >= 0 ? 18 : -18);
  const isRight = cos >= 0;
  // Keep label order aligned with slice angle to prevent color-line mismatch/crossing.
  // Apply vertical spreading (without reordering) so labels separate but still follow their slices.
  const spread = isRight ? 1.9 : 1.35;
  const rawEy = cy + (my - cy) * spread;
  const minEy = cy - 82;
  const maxEy = cy + 82;
  const ey = Math.max(minEy, Math.min(maxEy, rawEy));
  const label = `${name} (${(percent * 100).toFixed(0)}%)`;
  const approxWidth = Math.min(250, Math.max(120, label.length * 6.2));
  const boxX = isRight ? ex + 4 : ex - approxWidth - 4;
  const boxY = ey - 12;

  return (
    <g>
      <path d={`M${sx},${sy} L${mx},${my} L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={sx} cy={sy} r={2.5} fill={fill} />
      <rect x={boxX} y={boxY} width={approxWidth} height={24} rx={4} fill="#ffffff" stroke={fill} strokeWidth={1} />
      <text x={isRight ? boxX + 8 : boxX + approxWidth - 8} y={ey + 4} textAnchor={isRight ? 'start' : 'end'} fontSize={11} fill="#0f172a">
        {label}
      </text>
    </g>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkGroup, setSelectedWorkGroup] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedWorkGroupChart, setSelectedWorkGroupChart] = useState<string | null>(null);
  const [workGroupDetailPage, setWorkGroupDetailPage] = useState(1);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const categoryChartRef = useRef<HTMLDivElement | null>(null);
  const workGroupChartRef = useRef<HTMLDivElement | null>(null);
  const monthlyDevelopmentRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 640px)');
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

  const categoryExportDetails = useMemo(() => {
    const categories = data?.categories || [];
    const total = categories.reduce((sum, item) => sum + item.count, 0);

    return categories.map((item, index) => ({
      label: item.category,
      count: item.count,
      color: COLORS[index % COLORS.length],
      percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  }, [data?.categories]);

  const workGroupExportDetails = useMemo(
    () => {
      const workGroups = data?.workGroups || [];
      const total = workGroups.reduce((sum, item) => sum + item.count, 0);

      return workGroups.map((item, index) => ({
        label: item.workGroup,
        count: item.count,
        color: COLORS[index % COLORS.length],
        percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
      }));
    },
    [data?.workGroups],
  );
  const workGroupChartData = useMemo(() => {
    const workGroups = data?.workGroups || [];
    const total = workGroups.reduce((sum, item) => sum + item.count, 0);

    return workGroups.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  }, [data?.workGroups]);

  const selectedWorkGroupResolved = selectedWorkGroupChart && workGroupChartData.some((item) => item.workGroup === selectedWorkGroupChart)
    ? selectedWorkGroupChart
    : null;
  const selectedWorkGroupDetails = useMemo(() => {
    if (!selectedWorkGroupResolved) return [];
    return (data?.workGroupTrainingDetails || []).filter((item) => item.workGroup === selectedWorkGroupResolved);
  }, [data?.workGroupTrainingDetails, selectedWorkGroupResolved]);
  const workGroupDetailTotalPages = Math.max(1, Math.ceil(selectedWorkGroupDetails.length / WORK_GROUP_DETAIL_PAGE_SIZE));
  const paginatedWorkGroupDetails = selectedWorkGroupDetails.slice(
    (workGroupDetailPage - 1) * WORK_GROUP_DETAIL_PAGE_SIZE,
    workGroupDetailPage * WORK_GROUP_DETAIL_PAGE_SIZE,
  );

  useEffect(() => {
    setWorkGroupDetailPage(1);
  }, [selectedWorkGroupResolved]);

  const getExportDetails = (key: ExportKey) => {
    if (key === 'training-categories') {
      return {
        details: categoryExportDetails,
        summaryText: `จำนวนรายการรวม: ${categoryExportDetails.reduce((sum, item) => sum + item.count, 0).toLocaleString()} รายการ`,
      };
    }

    if (key === 'work-groups') {
      return {
        details: workGroupExportDetails,
        summaryText: `จำนวนรายการรวม: ${workGroupExportDetails.reduce((sum, item) => sum + item.count, 0).toLocaleString()} รายการ`,
      };
    }

    return { details: [], summaryText: undefined };
  };

  const exportChartImage = async (element: HTMLElement | null, key: ExportKey, format: ImageFormat) => {
    if (!element || exportingKey) {
      return;
    }

    const nextExportingKey = `${key}-${format}`;
    setExportingKey(nextExportingKey);

    try {
      const exportMeta = getExportDetails(key);
      const { svg, width, height } = buildChartSvg(element, exportMeta.details, exportMeta.summaryText);
      const fileBaseName = `analytics-${key}-${new Date().toISOString().slice(0, 10)}`;

      if (format === 'svg') {
        downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${fileBaseName}.svg`);
        return;
      }

      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();
      const scale = 2;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('ไม่สามารถสร้างไฟล์ภาพได้'));
        image.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('เบราว์เซอร์ไม่รองรับการสร้างภาพ');
      }

      context.scale(scale, scale);
      if (format === 'jpg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error('ไม่สามารถสร้างไฟล์ภาพได้'))),
          mimeType,
          0.95,
        );
      });

      downloadBlob(blob, `${fileBaseName}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถดาวน์โหลดภาพได้');
    } finally {
      setExportingKey(null);
    }
  };

  const renderChartExportButtons = (element: HTMLElement | null, key: ExportKey) => (
    <div className="flex shrink-0 gap-1">
      {(['png', 'jpg', 'svg'] as const).map((format) => {
        const isExporting = exportingKey === `${key}-${format}`;

        return (
          <button
            key={format}
            type="button"
            onClick={() => void exportChartImage(element, key, format)}
            disabled={loading || exportingKey !== null}
            className="inline-flex h-6 items-center justify-center rounded border border-slate-200 bg-white px-1.5 text-[10px] font-semibold uppercase text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={`ดาวน์โหลด ${format.toUpperCase()}`}
          >
            {isExporting ? '...' : format}
          </button>
        );
      })}
    </div>
  );

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
        <div ref={categoryChartRef} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-1000">
              <PieChartIcon className="h-5 w-3 text-brand-600" />
              สัดส่วนตามประเภทการอบรม
            </h3>
            {renderChartExportButtons(categoryChartRef.current, 'training-categories')}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)] lg:items-center">
            <div className={`${isMobile ? 'h-[250px]' : 'h-[300px]'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categories}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy={isMobile ? '52%' : '50%'}
                    outerRadius={isMobile ? 78 : 100}
                    label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                    labelLine={false}
                  >
                    {data.categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                    labelFormatter={(label) => `ประเภทการอบรม: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="hidden lg:block">
              <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                {data.categories.slice(0, 5).map((item, index) => {
                  const total = data.categories.reduce((sum, entry) => sum + entry.count, 0);
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.category} className="flex items-start justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-slate-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <p className="text-sm font-medium text-slate-800">{item.category}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-900">{item.count.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Work Group Analysis - Bar Chart */}
        <div ref={workGroupChartRef} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Users className="h-5 w-5 text-brand-600" />
              จำนวนการอบรมแยกตามกลุ่มงาน
            </h3>
            {renderChartExportButtons(workGroupChartRef.current, 'work-groups')}
          </div>
          <div className={`${isMobile ? 'h-[340px]' : 'h-[300px]'} w-full flex items-center justify-center`}>
            {workGroupChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workGroupChartData}
                  layout="vertical"
                  margin={{ right: 40 }}
                  onClick={(state) => {
                    const workGroup = state?.activeLabel;
                    if (typeof workGroup === 'string') {
                      setSelectedWorkGroupChart((prev) => (prev === workGroup ? null : workGroup));
                      setWorkGroupDetailPage(1);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="workGroup" 
                    type="category" 
                    width={isMobile ? 128 : 230} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: isMobile ? 9 : 11, fill: '#64748b' }} 
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    wrapperStyle={{ maxWidth: isMobile ? 180 : 260 }}
                    formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                    labelFormatter={(label) => `กลุ่มงาน: ${label}`}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {workGroupChartData.map((entry) => {
                      const isSelected = entry.workGroup === selectedWorkGroupResolved;
                      return (
                        <Cell
                          key={`work-group-${entry.workGroup}`}
                          fill={entry.color}
                          stroke={isSelected ? '#0f172a' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                          fillOpacity={isSelected || !selectedWorkGroupResolved ? 1 : 0.35}
                        />
                      );
                    })}
                    <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value}%`} fill="#0f172a" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 italic">ไม่มีข้อมูลกลุ่มงานที่จะแสดง</div>
            )}
          </div>
          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  รายการอบรมของกลุ่มงาน: {selectedWorkGroupResolved || 'ยังไม่ได้เลือกกลุ่มงาน'}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedWorkGroupResolved ? `${selectedWorkGroupDetails.length.toLocaleString()} รายการ` : 'คลิกแท่งกราฟเพื่อดูรายการ'}
                </p>
              </div>
              {selectedWorkGroupResolved ? (
                <button
                  type="button"
                  onClick={() => setSelectedWorkGroupChart(null)}
                  className="self-start rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 sm:self-auto"
                >
                  ล้างการเลือก
                </button>
              ) : null}
            </div>

            {selectedWorkGroupResolved ? (
              selectedWorkGroupDetails.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2">ลำดับ</th>
                          <th className="px-3 py-2">บุคลากร</th>
                          <th className="px-3 py-2">หลักสูตร</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedWorkGroupDetails.map((item, index) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 font-medium text-slate-500">
                              {((workGroupDetailPage - 1) * WORK_GROUP_DETAIL_PAGE_SIZE + index + 1).toLocaleString('th-TH')}
                            </td>
                            <td className="px-3 py-2">
                              <Link
                                to={`/personnel/${item.userId}`}
                                className="font-medium text-brand-600 transition hover:text-brand-700 hover:underline"
                              >
                                {item.fullName}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{item.course}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {workGroupDetailTotalPages > 1 ? (
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
                      <span>หน้า {workGroupDetailPage.toLocaleString('th-TH')} / {workGroupDetailTotalPages.toLocaleString('th-TH')}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setWorkGroupDetailPage((page) => Math.max(1, page - 1))}
                          disabled={workGroupDetailPage <= 1}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ก่อนหน้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkGroupDetailPage((page) => Math.min(workGroupDetailTotalPages, page + 1))}
                          disabled={workGroupDetailPage >= workGroupDetailTotalPages}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-slate-500">ไม่พบรายการอบรมของกลุ่มงานนี้</p>
              )
            ) : (
              <p className="text-sm text-slate-500">คลิกแท่งกราฟเพื่อดูรายการอบรมของกลุ่มงานนั้น</p>
            )}
          </div>
        </div>

        {/* Development Trend - Area Chart */}
        <div ref={monthlyDevelopmentRef} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              แนวโน้มการพัฒนาบุคลากรรายเดือน
            </h3>
            {renderChartExportButtons(monthlyDevelopmentRef.current, 'monthly-development')}
          </div>
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
                <Tooltip
                  formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                  labelFormatter={(label) => `เดือน: ${label}`}
                />
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
        <div className="hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
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

