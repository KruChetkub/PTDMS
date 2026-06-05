import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, RefreshCw, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  listCourseAttendees,
  listCourseDirectory,
  type CourseDirectoryAttendee,
  type CourseDirectoryData,
  type CourseDirectorySection,
} from '../../services/course.service';
import { getDashboardSummary, type DashboardSummary } from '../../services/dashboard.service';
import { trainingTypeOptions } from '../self-service/training-form.schema';
import { formatThaiDate } from '../../utils/thaiDate';

const emptySummary: DashboardSummary = {
  personnelCount: 0,
  trainingRecordCount: 0,
  topCategory: '-',
  topWorkGroup: '-',
  demographics: {
    genderBreakdown: [],
    educationBreakdown: [],
    generationBreakdown: [],
    employmentTypeBreakdown: [],
    averageAge: null,
  },
  categoryBreakdown: [],
  monthlyTrend: [],
  yearlyTrend: [],
};

const genderColors = ['#1d75bd', '#db2777', '#94a3b8'];
const generationColors = ['#23805f', '#d97706', '#7c3aed'];
const demographicCardClass =
  'rounded-md border border-white/80 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.14)]';
type ImageFormat = 'png' | 'jpg' | 'svg';
type ExportKey = 'gender' | 'education' | 'generation' | 'employment' | 'monthly-training' | 'yearly-training';
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

function EmptyChartState() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      ไม่มีข้อมูล
    </div>
  );
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

function buildElementSvg(element: HTMLElement, details: ExportDetail[] = [], summaryText?: string) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const title = element.querySelector('h2')?.textContent?.trim() || 'Dashboard Chart';
  const chartSvg = element.querySelector('.recharts-wrapper svg') || element.querySelector('svg.recharts-surface');

  if (!chartSvg) {
    throw new Error('ไม่พบกราฟสำหรับดาวน์โหลด');
  }

  const chartRect = chartSvg.getBoundingClientRect();
  const chartX = Math.max(20, Math.round(chartRect.left - rect.left));
  const detailRows = details.slice(0, 8);
  const chartY = summaryText ? 84 : 58;
  const chartWidth = Math.max(240, Math.ceil(chartRect.width));
  const chartHeight = Math.max(180, Math.ceil(chartRect.height));
  const hasSideDetails = detailRows.length > 0 && width - (chartX + chartWidth) >= 240;
  const detailColumns = hasSideDetails || width < 520 ? 1 : 2;
  const detailColumnWidth = hasSideDetails ? 210 : Math.floor((width - 48) / detailColumns);
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

  const serializedChart = new XMLSerializer().serializeToString(chartClone);
  const detailBaseX = hasSideDetails ? chartX + chartWidth + 24 : 24;
  const detailBaseY = hasSideDetails ? chartY + 12 : chartY + chartHeight + 30;
  const titleFontSize = 13;
  const summaryFontSize = 12;
  const detailLabelFontSize = 11;
  const detailValueFontSize = 11;
  const detailsSvg = detailRows
    .map((item, index) => {
      const columnIndex = hasSideDetails ? 0 : Math.floor(index / detailRowsPerColumn);
      const rowIndex = hasSideDetails ? index : index % detailRowsPerColumn;
      const detailX = detailBaseX + columnIndex * detailColumnWidth;
      const y = detailBaseY + rowIndex * 24;
      const countText = `${item.count.toLocaleString()} คน`;
      const percentText = typeof item.percent === 'number' ? ` (${item.percent}%)` : '';
      const labelMaxLength = detailColumns === 1 ? 22 : 14;
      const label = escapeSvgText(truncateSvgText(item.label, labelMaxLength));
      const color = item.color || genderColors[index % genderColors.length];
      const valueX = Math.min(width - 28, detailX + detailColumnWidth - 8);
      const valueText = `${countText}${percentText}`;

      return [
        `<circle cx="${detailX + 4}" cy="${y - 4}" r="4" fill="${color}"/>`,
        `<text x="${detailX + 16}" y="${y}" font-family="Tahoma, Arial, sans-serif" font-size="${detailLabelFontSize}" font-weight="500" fill="#475569">${label}</text>`,
        `<text x="${valueX}" y="${y}" font-family="Tahoma, Arial, sans-serif" font-size="${detailValueFontSize}" font-weight="600" fill="#0f172a" text-anchor="end">${valueText}</text>`,
      ].join('');
    })
    .join('');
  const summarySvg = summaryText
    ? `<text x="22" y="58" font-family="Tahoma, Arial, sans-serif" font-size="${summaryFontSize}" font-weight="600" fill="#1d75bd">${escapeSvgText(summaryText)}</text>`
    : '';
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.12"/>',
    '</filter>',
    '</defs>',
    `<rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="8" fill="#ffffff" stroke="#e2e8f0" filter="url(#cardShadow)"/>`,
    `<text x="22" y="34" font-family="Tahoma, Arial, sans-serif" font-size="${titleFontSize}" font-weight="600" fill="#0f172a">${escapeSvgText(title)}</text>`,
    summarySvg,
    serializedChart,
    detailsSvg,
    '</svg>',
  ].join('');

  return { svg, width, height };
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [courseDirectory, setCourseDirectory] = useState<CourseDirectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [expandedCourseCategories, setExpandedCourseCategories] = useState<Record<string, boolean>>({});
  const [selectedCourse, setSelectedCourse] = useState<{
    category: string;
    course: string;
    attendeeCount: number;
    latestDate: string;
  } | null>(null);
  const [attendees, setAttendees] = useState<CourseDirectoryAttendee[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const genderChartRef = useRef<HTMLElement | null>(null);
  const educationChartRef = useRef<HTMLElement | null>(null);
  const generationChartRef = useRef<HTMLElement | null>(null);
  const employmentChartRef = useRef<HTMLElement | null>(null);
  const monthlyTrendRef = useRef<HTMLElement | null>(null);
  const yearlyTrendRef = useRef<HTMLElement | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardData, courseData] = await Promise.all([getDashboardSummary(), listCourseDirectory()]);
      setSummary(dashboardData);
      setCourseDirectory(courseData);
      setExpandedCourseCategories({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูล Dashboard ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const displayedCourseSections: CourseDirectorySection[] = trainingTypeOptions.map((category) => {
    const existingSection = courseDirectory?.sections.find((section) => section.category === category);

    return (
      existingSection || {
        category,
        active: true,
        courseCount: 0,
        attendeeCount: 0,
        courses: [],
      }
    );
  });
  const toggleCourseCategory = (category: string) => {
    setExpandedCourseCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };
  const openCourseDrawer = async (course: { category: string; course: string; attendeeCount: number; latestDate: string }) => {
    setSelectedCourse(course);
    setDrawerLoading(true);
    setDrawerError(null);
    setAttendees([]);

    try {
      const result = await listCourseAttendees(course.course);
      setAttendees(result);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายชื่อผู้เรียนได้');
    } finally {
      setDrawerLoading(false);
    }
  };
  const closeCourseDrawer = () => {
    setSelectedCourse(null);
    setAttendees([]);
    setDrawerLoading(false);
    setDrawerError(null);
  };

  const buildDetails = (items: Array<{ label: string; count: number }>, colors: string[]) => {
    const total = items.reduce((sum, item) => sum + item.count, 0);

    return items.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
      percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  };

  const educationTotal = summary.demographics.educationBreakdown.reduce((sum, item) => sum + item.count, 0);
  const educationChartData = summary.demographics.educationBreakdown.map((item) => ({
    ...item,
    percent: educationTotal > 0 ? Math.round((item.count / educationTotal) * 100) : 0,
  }));
  const employmentTypeTotal = summary.demographics.employmentTypeBreakdown.reduce((sum, item) => sum + item.count, 0);
  const employmentTypeChartData = summary.demographics.employmentTypeBreakdown.map((item) => ({
    ...item,
    percent: employmentTypeTotal > 0 ? Math.round((item.count / employmentTypeTotal) * 100) : 0,
  }));

  const getExportDetails = (key: ExportKey) => {
    if (key === 'gender') {
      const details = buildDetails(summary.demographics.genderBreakdown, genderColors);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'education') {
      const details = buildDetails(summary.demographics.educationBreakdown, ['#1d75bd']);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'generation') {
      const details = buildDetails(summary.demographics.generationBreakdown, generationColors);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'employment') {
      const details = buildDetails(summary.demographics.employmentTypeBreakdown, ['#23805f']);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'monthly-training') {
      return {
        details: [],
        summaryText: `จำนวนรายการรวม: ${summary.monthlyTrend.reduce((sum, item) => sum + item.count, 0).toLocaleString()} รายการ`,
      };
    }

    if (key === 'yearly-training') {
      return {
        details: [],
        summaryText: `จำนวนรายการรวม: ${summary.yearlyTrend.reduce((sum, item) => sum + item.count, 0).toLocaleString()} รายการ`,
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
      const { svg, width, height } = buildElementSvg(element, exportMeta.details, exportMeta.summaryText);
      const fileBaseName = `executive-dashboard-${key}-${new Date().toISOString().slice(0, 10)}`;

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
        context.fillStyle = '#f8fafc';
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
    <div data-export-hidden="true" className="flex shrink-0 gap-1">
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

  return (
    <div>
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="แดชบอร์ดสำหรับผู้บริหาร" description="" />
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="mb-3">
        <div className="mb-1">
          <h2 className="text-xl font-semibold text-slate-1000">ข้อมูลพื้นฐานบุคลากร</h2>
        </div>

        <div className="rounded-md border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <section className="mb-4 rounded-md border border-amber-100 bg-gradient-to-r from-white via-amber-50/70 to-white p-4 shadow-sm ring-1 ring-amber-900/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500"></p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">อายุเฉลี่ยของบุคลากรภายในกองยุทธศาสตร์และแผนงาน</h2>
              </div>
              <div className="flex items-center gap-4">
               {/* เพิ่ม flex items-baseline gap-1 เพื่อบังคับให้เรียงต่อกันแนวนอน */}
                  <div className="text-right flex items-baseline justify-end gap-1">
                        <p className="text-4xl font-bold tracking-tight text-slate-950">
                        {loading ? '...' : summary.demographics.averageAge !== null ? summary.demographics.averageAge.toLocaleString() : '-'}
                        </p>
                         <p className="text-xl font-semibold text-slate-1000">ปี</p>
                   </div>                
                   <div className="rounded-md bg-amber-100 p-3 text-amber-700">
                  <CalendarDays className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-12">
          <section ref={genderChartRef} className={`${demographicCardClass} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">สัดส่วนเพศ</h2>
              {renderChartExportButtons(genderChartRef.current, 'gender')}
            </div>
            <div className="mt-4 h-60">
              {loading ? (
                <EmptyChartState />
              ) : summary.demographics.genderBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.demographics.genderBreakdown}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                      labelLine={false}
                    >
                      {summary.demographics.genderBreakdown.map((item, index) => (
                        <Cell key={item.label} fill={genderColors[index % genderColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState />
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {summary.demographics.genderBreakdown.map((item, index) => (
                <div key={item.label} className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: genderColors[index % genderColors.length] }} />
                  <span className="truncate">{item.label}</span>
                  <span className="ml-2 font-medium text-slate-900">{item.count.toLocaleString()}</span>คน
                </div>
              ))}
            </div>
          </section>

          <section ref={educationChartRef} className={`${demographicCardClass} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">ระดับการศึกษา</h2>
              {renderChartExportButtons(educationChartRef.current, 'education')}
            </div>
            <div className="mt-4 h-60">
              {loading ? (
                <EmptyChartState />
                ) : educationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={educationChartData} layout="vertical" margin={{ left: 18, right: 34 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={92} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                    <Bar dataKey="count" fill="#1d75bd" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value}%`} fill="#0f172a" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState />
              )}
            </div>
          </section>

          <section ref={generationChartRef} className={`${demographicCardClass} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Generation</h2>
              {renderChartExportButtons(generationChartRef.current, 'generation')}
            </div>
            <div className="mt-4 h-60">
              {loading ? (
                <EmptyChartState />
              ) : summary.demographics.generationBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.demographics.generationBreakdown}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                      labelLine={false}
                    >
                      {summary.demographics.generationBreakdown.map((item, index) => (
                        <Cell key={item.label} fill={generationColors[index % generationColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState />
              )}
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {summary.demographics.generationBreakdown.map((item, index) => (
                <div key={item.label} className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: generationColors[index % generationColors.length] }} />
                  <span className="truncate">{item.label}</span>
                  <span className="ml-2 font-medium text-slate-900">{item.count.toLocaleString()}</span>คน
                </div>
              ))}
            </div>
          </section>

          <section ref={employmentChartRef} className={`${demographicCardClass} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">รูปแบบการจ้าง</h2>
              {renderChartExportButtons(employmentChartRef.current, 'employment')}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-brand-700">
                จำนวนรวม {summary.demographics.employmentTypeBreakdown.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน
              </p>
              <div className="mt-3 h-56">
                {loading ? (
                  <EmptyChartState />
                ) : employmentTypeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employmentTypeChartData} layout="vertical" margin={{ left: 20, right: 34 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="label" width={118} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                      <Bar dataKey="count" fill="#23805f" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value}%`} fill="#0f172a" fontSize={11} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState />
                )}
              </div>
            </div>
          </section>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section ref={monthlyTrendRef} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">แนวโน้มการอบรมรายเดือน</h2>
              <p className="mt-1 text-xs font-semibold text-brand-700">
                จำนวนรายการรวม {summary.monthlyTrend.reduce((sum, item) => sum + item.count, 0).toLocaleString()} รายการ
              </p>
            </div>
            {renderChartExportButtons(monthlyTrendRef.current, 'monthly-training')}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                  labelFormatter={(label) => `เดือน: ${label}`}
                />
                <Bar dataKey="count" fill="#1d75bd" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" formatter={(value: number) => value.toLocaleString()} fill="#0f172a" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section ref={yearlyTrendRef} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">แนวโน้มการอบรมรายปี</h2>
            {renderChartExportButtons(yearlyTrendRef.current, 'yearly-training')}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                  labelFormatter={(label) => `ปี: ${label}`}
                />
                <Line type="monotone" dataKey="count" stroke="#23805f" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Course Directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              หมวดหลักสูตรที่มีผู้เรียน
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <section key={index} className="animate-pulse rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-5 w-40 rounded bg-slate-100" />
                <div className="mt-4 space-y-3">
                  <div className="h-14 rounded-md bg-slate-100" />
                  <div className="h-14 rounded-md bg-slate-100" />
                  <div className="h-14 rounded-md bg-slate-100" />
                </div>
              </section>
            ))
          ) : displayedCourseSections.length === 0 ? (
            <div className="col-span-full rounded-md border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500 shadow-sm">
              ไม่พบข้อมูลหลักสูตร
            </div>
          ) : (
            displayedCourseSections.map((section) => (
              <section key={section.category} className="rounded-md border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleCourseCategory(section.category)}
                  className="flex w-full flex-col gap-2 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{section.category}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {section.courseCount.toLocaleString()} หลักสูตร · {section.attendeeCount.toLocaleString()} ผู้เรียน
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                        section.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}
                    >
                      {section.active ? 'Active' : 'Inactive'}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 text-slate-500 transition ${expandedCourseCategories[section.category] ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                <div className={`divide-y divide-slate-100 ${expandedCourseCategories[section.category] ? 'block' : 'hidden'}`}>
                  {section.courses.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-slate-500">ยังไม่มีหลักสูตรในหมวดหมู่นี้</div>
                  ) : (
                    section.courses.map((course) => (
                      <button
                        key={`${section.category}-${course.course}`}
                        type="button"
                        onClick={() =>
                          void openCourseDrawer({
                            category: section.category,
                            course: course.course,
                            attendeeCount: course.attendeeCount,
                            latestDate: course.latestDate,
                          })
                        }
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-brand-50/40"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{course.course}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            อบรมล่าสุด {formatThaiDate(course.latestDate)}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {course.attendeeCount.toLocaleString()} คน
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      {selectedCourse ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="ปิดรายละเอียดหลักสูตร"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeCourseDrawer}
          />

          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">รายชื่อผู้เรียน</p>
                <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">{selectedCourse.course}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCourse.category} · {selectedCourse.attendeeCount.toLocaleString()} คน · ล่าสุด{' '}
                  {formatThaiDate(selectedCourse.latestDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCourseDrawer}
                className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="ปิด"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">หมวดหมู่</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCourse.category}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">ผู้เรียน</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCourse.attendeeCount.toLocaleString()} คน</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">อบรมล่าสุด</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatThaiDate(selectedCourse.latestDate)}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {drawerLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-md border border-slate-200 p-4">
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                      <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : drawerError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {drawerError}
                </div>
              ) : attendees.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  ไม่พบรายชื่อผู้เรียนในหลักสูตรนี้
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                        <th className="px-4 py-3">หน่วยงาน</th>
                        <th className="px-4 py-3">วันที่อบรม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {attendees.map((attendee) => (
                        <tr key={attendee.userId} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900">{attendee.fullName}</td>
                          <td className="px-4 py-3 text-slate-600">{attendee.department || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatThaiDate(attendee.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
