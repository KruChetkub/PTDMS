import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Moon, RefreshCw, Sun, UsersRound, X } from 'lucide-react';
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
import {
  listCourseAttendees,
  listCourseDirectory,
  type CourseDirectoryAttendee,
  type CourseDirectoryData,
  type CourseDirectorySection,
} from '../../services/course.service';
import { getDashboardSummary, type DashboardSummary } from '../../services/dashboard.service';
import { trainingTypeOptions } from '../../constants/training';
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

type DashboardTheme = 'light' | 'dark';

const dashboardThemeConfig = {
  light: {
    page: 'min-h-screen rounded-2xl bg-[#f7f8ff] p-4 text-[#151a3d] transition-colors duration-300',
    headerTitle: 'text-2xl font-semibold tracking-normal text-[#151a3d]',
    sectionTitle: 'text-xl font-semibold text-[#151a3d]',
    cardTitle: 'font-semibold text-[#151a3d]',
    chartTitle: 'text-sm font-semibold text-[#151a3d]',
    mutedText: 'text-slate-500',
    secondaryText: 'text-slate-600',
    panel: 'rounded-2xl border border-white bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.80)] ring-1 ring-[#edf0ff]',
    card: 'rounded-2xl border border-[#edf0ff] bg-white p-5 shadow-[0_18px_44px_rgba(87,93,245,0.08)] ring-1 ring-white transition duration-200 hover:shadow-[0_22px_50px_rgba(87,93,245,0.12)]',
    kpiPersonnel: 'rounded-2xl border border-[#dfe7ff] border-l-4 border-l-[#5b5ff4] bg-white p-4 shadow-[0_14px_36px_rgba(91,95,244,0.10)] ring-1 ring-white',
    kpiAge: 'rounded-2xl border border-[#ffe8bb] border-l-4 border-l-[#ffb800] bg-white p-4 shadow-[0_14px_36px_rgba(255,184,0,0.10)] ring-1 ring-white',
    iconPersonnel: 'rounded-2xl bg-[#eef0ff] p-3 text-[#5b5ff4] ring-1 ring-[#dfe3ff]',
    iconAge: 'rounded-2xl bg-[#fff4de] p-3 text-[#d99200] ring-1 ring-[#ffe5ad]',
    actionButton: 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe3f5] bg-white px-3 py-2 text-sm font-medium text-[#151a3d] shadow-sm transition hover:bg-[#f1f3ff]',
    toggleButton: 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#5b5ff4] px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(91,95,244,0.28)] transition hover:bg-[#4b4fe0]',
    exportButton: 'inline-flex h-6 items-center justify-center rounded-lg border border-[#dfe3f5] bg-white px-1.5 text-[10px] font-semibold uppercase text-slate-600 shadow-sm transition hover:border-[#c7cbff] hover:bg-[#f1f3ff] hover:text-[#5b5ff4] disabled:cursor-not-allowed disabled:opacity-50',
    emptyChartState: 'flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-[#dfe3f5] bg-[#f8f9ff] text-sm text-slate-500',
    courseSection: 'mt-6 overflow-hidden rounded-2xl border border-[#edf0ff] bg-white shadow-[0_18px_44px_rgba(87,93,245,0.08)]',
    courseHeader: 'border-b border-[#edf0ff] bg-gradient-to-r from-[#eef0ff] via-white to-[#dcfce7] px-5 py-5 ring-1 ring-inset ring-white/70',
    courseCard: 'rounded-xl border border-[#edf0ff] bg-white shadow-sm',
    courseHeaderButton: 'flex w-full flex-col gap-2 border-b border-[#edf0ff] px-5 py-4 text-left transition hover:bg-[#f8f9ff] sm:flex-row sm:items-center sm:justify-between',
    courseRowCount: 'shrink-0 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-[#151a3d] ring-1 ring-[#edf0ff]',
    activeBadge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    inactiveBadge: 'bg-slate-100 text-slate-600 ring-slate-200',
    errorBox: 'mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700',
    tableHead: 'bg-[#f8f9ff] text-xs font-semibold uppercase tracking-wider text-slate-500',
    drawerPanel: 'absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-[#edf0ff] bg-white shadow-2xl',
    drawerStat: 'rounded-xl bg-[#f8f9ff] px-3 py-3',
    overlay: 'absolute inset-0 bg-slate-900/40 backdrop-blur-sm',
    grid: '#e4e8f7',
    chartLabel: '#151a3d',
    chartAxisTick: { fontSize: 12, fill: '#7a83a6' },
    tooltipContentStyle: { border: '1px solid #dfe3f5', borderRadius: 12, backgroundColor: '#ffffff', color: '#151a3d', boxShadow: '0 14px 34px rgba(87,93,245,0.14)' },
    tooltipLabelStyle: { color: '#151a3d', fontWeight: 700 },
    tooltipItemStyle: { color: '#151a3d' },
    genderColors: ['#0095ff', '#ff5b7f', '#a0aec0'],
    educationColors: ['#0095ff', '#00d4a6', '#ffb800', '#8b5cf6', '#ff5b7f', '#94a3b8'],
    generationColors: ['#00d4a6', '#ffb800', '#8b5cf6'],
    employmentTypeColors: ['#0095ff', '#00d4a6', '#ffb800', '#ff5b7f', '#8b5cf6', '#94a3b8'],
    monthlyBar: '#0095ff',
    yearlyLine: '#00a879',
    courseToneClasses: [
      'border-l-[#0095ff] bg-gradient-to-r from-[#e8f5ff] via-white to-white hover:from-[#dff0ff]',
      'border-l-[#00d4a6] bg-gradient-to-r from-[#dcfce7] via-white to-white hover:from-[#c9f7d8]',
      'border-l-[#ffb800] bg-gradient-to-r from-[#fff4de] via-white to-white hover:from-[#ffedc2]',
      'border-l-[#ff5b7f] bg-gradient-to-r from-[#ffe2e8] via-white to-white hover:from-[#ffd3dd]',
      'border-l-[#8b5cf6] bg-gradient-to-r from-[#f3e8ff] via-white to-white hover:from-[#ead9ff]',
    ],
  },
  dark: {
    page: 'min-h-screen rounded-2xl bg-[#0f1225] p-4 text-slate-100 transition-colors duration-300',
    headerTitle: 'text-2xl font-semibold tracking-normal text-slate-50',
    sectionTitle: 'text-xl font-semibold text-slate-50',
    cardTitle: 'font-semibold text-slate-50',
    chartTitle: 'text-sm font-semibold text-slate-50',
    mutedText: 'text-slate-400',
    secondaryText: 'text-slate-300',
    panel: 'rounded-2xl border border-[#272d52] bg-[#171b35] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/5',
    card: 'rounded-2xl border border-[#272d52] bg-[#171b35] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)] ring-1 ring-white/5 transition duration-200 hover:border-[#394174] hover:shadow-[0_22px_54px_rgba(0,0,0,0.30)]',
    kpiPersonnel: 'rounded-2xl border border-[#30386c] border-l-4 border-l-[#7c83ff] bg-[#171b35] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.24)] ring-1 ring-white/5',
    kpiAge: 'rounded-2xl border border-[#5a4724] border-l-4 border-l-[#ffd166] bg-[#171b35] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.24)] ring-1 ring-white/5',
    iconPersonnel: 'rounded-2xl bg-[#252b61] p-3 text-[#9aa0ff] ring-1 ring-[#38407d]',
    iconAge: 'rounded-2xl bg-[#3d321f] p-3 text-[#ffd166] ring-1 ring-[#5a4724]',
    actionButton: 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#343b68] bg-[#171b35] px-3 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:bg-[#20264a]',
    toggleButton: 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd166] px-3 py-2 text-sm font-semibold text-[#151a3d] shadow-[0_12px_28px_rgba(255,209,102,0.22)] transition hover:bg-[#ffc342]',
    exportButton: 'inline-flex h-6 items-center justify-center rounded-lg border border-[#343b68] bg-[#11162d] px-1.5 text-[10px] font-semibold uppercase text-slate-300 shadow-sm transition hover:border-[#7c83ff] hover:bg-[#20264a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
    emptyChartState: 'flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-[#343b68] bg-[#11162d] text-sm text-slate-400',
    courseSection: 'mt-6 overflow-hidden rounded-2xl border border-[#272d52] bg-[#171b35] shadow-[0_18px_44px_rgba(0,0,0,0.24)]',
    courseHeader: 'border-b border-[#272d52] bg-gradient-to-r from-[#242a5d] via-[#171b35] to-[#16362f] px-5 py-5 ring-1 ring-inset ring-white/5',
    courseCard: 'rounded-xl border border-[#272d52] bg-[#151932] shadow-sm',
    courseHeaderButton: 'flex w-full flex-col gap-2 border-b border-[#272d52] px-5 py-4 text-left transition hover:bg-[#20264a] sm:flex-row sm:items-center sm:justify-between',
    courseRowCount: 'shrink-0 rounded-lg bg-[#20264a] px-2.5 py-1 text-xs font-semibold text-slate-100 ring-1 ring-[#343b68]',
    activeBadge: 'bg-emerald-400/10 text-emerald-200 ring-emerald-400/30',
    inactiveBadge: 'bg-slate-700/50 text-slate-300 ring-slate-600',
    errorBox: 'mb-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200',
    tableHead: 'bg-[#11162d] text-xs font-semibold uppercase tracking-wider text-slate-400',
    drawerPanel: 'absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-[#272d52] bg-[#171b35] shadow-2xl',
    drawerStat: 'rounded-xl bg-[#11162d] px-3 py-3',
    overlay: 'absolute inset-0 bg-black/60 backdrop-blur-sm',
    grid: '#323a68',
    chartLabel: '#eef2ff',
    chartAxisTick: { fontSize: 12, fill: '#aab2d8' },
    tooltipContentStyle: { border: '1px solid #343b68', borderRadius: 12, backgroundColor: '#11162d', color: '#eef2ff', boxShadow: '0 14px 34px rgba(0,0,0,0.34)' },
    tooltipLabelStyle: { color: '#ffffff', fontWeight: 700 },
    tooltipItemStyle: { color: '#eef2ff' },
    genderColors: ['#38bdf8', '#fb7185', '#94a3b8'],
    educationColors: ['#38bdf8', '#34d399', '#facc15', '#a78bfa', '#fb7185', '#cbd5e1'],
    generationColors: ['#34d399', '#facc15', '#a78bfa'],
    employmentTypeColors: ['#38bdf8', '#34d399', '#facc15', '#fb7185', '#a78bfa', '#cbd5e1'],
    monthlyBar: '#38bdf8',
    yearlyLine: '#34d399',
    courseToneClasses: [
      'border-l-[#38bdf8] bg-gradient-to-r from-[#12334c] via-[#151932] to-[#151932] hover:from-[#17415f]',
      'border-l-[#34d399] bg-gradient-to-r from-[#12392f] via-[#151932] to-[#151932] hover:from-[#164638]',
      'border-l-[#facc15] bg-gradient-to-r from-[#3c3518] via-[#151932] to-[#151932] hover:from-[#4a411c]',
      'border-l-[#fb7185] bg-gradient-to-r from-[#42202d] via-[#151932] to-[#151932] hover:from-[#512637]',
      'border-l-[#a78bfa] bg-gradient-to-r from-[#2c2555] via-[#151932] to-[#151932] hover:from-[#372e68]',
    ],
  },
};
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

function EmptyChartState({ className }: { className: string }) {
  return <div className={className}>ไม่มีข้อมูล</div>;
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
      const color = item.color || dashboardThemeConfig.light.genderColors[index % dashboardThemeConfig.light.genderColors.length];
      const valueX = Math.min(width - 28, detailX + detailColumnWidth - 8);
      const valueText = `${countText}${percentText}`;

      return [
        `<circle cx="${detailX + 4}" cy="${y - 4}" r="4" fill="${color}"/>`,
        `<text x="${detailX + 16}" y="${y}" font-family="Tahoma, Arial, sans-serif" font-size="${detailLabelFontSize}" font-weight="500" fill="#475569">${label}</text>`,
        `<text x="${valueX}" y="${y}" font-family="Tahoma, Arial, sans-serif" font-size="${detailValueFontSize}" font-weight="600" fill="#151a3d" text-anchor="end">${valueText}</text>`,
      ].join('');
    })
    .join('');
  const summarySvg = summaryText
    ? `<text x="22" y="58" font-family="Tahoma, Arial, sans-serif" font-size="${summaryFontSize}" font-weight="600" fill="#5b5ff4">${escapeSvgText(summaryText)}</text>`
    : '';
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.12"/>',
    '</filter>',
    '</defs>',
    `<rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="8" fill="#ffffff" stroke="#e4e8f7" filter="url(#cardShadow)"/>`,
    `<text x="22" y="34" font-family="Tahoma, Arial, sans-serif" font-size="${titleFontSize}" font-weight="600" fill="#151a3d">${escapeSvgText(title)}</text>`,
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
  const [dashboardTheme, setDashboardTheme] = useState<DashboardTheme>('light');
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
  const theme = dashboardThemeConfig[dashboardTheme];
  const isDarkTheme = dashboardTheme === 'dark';
  const chartTooltipProps = {
    contentStyle: theme.tooltipContentStyle,
    labelStyle: theme.tooltipLabelStyle,
    itemStyle: theme.tooltipItemStyle,
  };

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
  const educationChartData = summary.demographics.educationBreakdown.map((item, index) => ({
    ...item,
    color: theme.educationColors[index % theme.educationColors.length],
    percent: educationTotal > 0 ? Math.round((item.count / educationTotal) * 100) : 0,
  }));
  const employmentTypeTotal = summary.demographics.employmentTypeBreakdown.reduce((sum, item) => sum + item.count, 0);
  const employmentTypeChartData = summary.demographics.employmentTypeBreakdown.map((item, index) => ({
    ...item,
    color: theme.employmentTypeColors[index % theme.employmentTypeColors.length],
    percent: employmentTypeTotal > 0 ? Math.round((item.count / employmentTypeTotal) * 100) : 0,
  }));

  const getExportDetails = (key: ExportKey) => {
    if (key === 'gender') {
      const details = buildDetails(summary.demographics.genderBreakdown, theme.genderColors);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'education') {
      const details = buildDetails(summary.demographics.educationBreakdown, theme.educationColors);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'generation') {
      const details = buildDetails(summary.demographics.generationBreakdown, theme.generationColors);
      return {
        details,
        summaryText: `จำนวนรวม: ${details.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน`,
      };
    }

    if (key === 'employment') {
      const details = buildDetails(summary.demographics.employmentTypeBreakdown, theme.employmentTypeColors);
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
            className={theme.exportButton}
            title={`ดาวน์โหลด ${format.toUpperCase()}`}
          >
            {isExporting ? '...' : format}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={theme.page}>
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="mb-6"><h1 className={theme.headerTitle}>แดชบอร์ดสำหรับผู้บริหาร</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDashboardTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            className={theme.toggleButton}
            aria-label={isDarkTheme ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            {isDarkTheme ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {isDarkTheme ? 'สว่าง' : 'มืด'}
          </button>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className={theme.actionButton}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <section className="mb-3">
        <div className="mb-1">
          <h2 className={theme.sectionTitle}>ข้อมูลพื้นฐานบุคลากร</h2>
        </div>

        <div className={theme.panel}>
          <div className="mb-4 grid gap-3 xl:grid-cols-2">
            <section className={theme.kpiPersonnel}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={`text-lg ${theme.cardTitle}`}>จำนวนบุคลากรทั้งหมด</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline justify-end gap-1 text-right">
                    <p className={`text-4xl font-bold tracking-tight ${isDarkTheme ? 'text-white' : 'text-[#151a3d]'}`}>
                      {loading ? '...' : summary.personnelCount.toLocaleString()}
                    </p>
                    <p className={`text-xl font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-[#151a3d]'}`}>คน</p>
                  </div>
                  <div className={theme.iconPersonnel}>
                    <UsersRound className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </section>

            <section className={theme.kpiAge}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={`text-lg ${theme.cardTitle}`}>อายุเฉลี่ยของบุคลากรภายในกองยุทธศาสตร์และแผนงาน</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline justify-end gap-1 text-right">
                    <p className={`text-4xl font-bold tracking-tight ${isDarkTheme ? 'text-white' : 'text-[#151a3d]'}`}>
                      {loading ? '...' : summary.demographics.averageAge !== null ? summary.demographics.averageAge.toLocaleString() : '-'}
                    </p>
                    <p className={`text-xl font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-[#151a3d]'}`}>ปี</p>
                  </div>
                  <div className={theme.iconAge}>
                    <CalendarDays className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
          <section ref={genderChartRef} className={`${theme.card} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={theme.chartTitle}>สัดส่วนเพศ</h2>
              {renderChartExportButtons(genderChartRef.current, 'gender')}
            </div>
            <div className="mt-4 h-60">
              {loading ? (
                <EmptyChartState className={theme.emptyChartState} />
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
                        <Cell key={item.label} fill={theme.genderColors[index % theme.genderColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipProps} formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState className={theme.emptyChartState} />
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {summary.demographics.genderBreakdown.map((item, index) => (
                <div key={item.label} className={`flex items-center gap-2 ${theme.secondaryText}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.genderColors[index % theme.genderColors.length] }} />
                  <span className="truncate">{item.label}</span>
                  <span className={`ml-2 font-medium ${isDarkTheme ? 'text-slate-50' : 'text-[#151a3d]'}`}>{item.count.toLocaleString()}</span>คน
                </div>
              ))}
            </div>
          </section>

          <section ref={educationChartRef} className={`${theme.card} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={theme.chartTitle}>ระดับการศึกษา</h2>
              {renderChartExportButtons(educationChartRef.current, 'education')}
            </div>
            <div className="mt-4 h-60">
              {loading ? (
                <EmptyChartState className={theme.emptyChartState} />
                ) : educationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={educationChartData} layout="vertical" margin={{ left: 18, right: 34 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={theme.chartAxisTick} />
                    <YAxis type="category" dataKey="label" width={92} tick={theme.chartAxisTick} />
                    <Tooltip {...chartTooltipProps} formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {educationChartData.map((item) => (
                        <Cell key={item.label} fill={item.color} />
                      ))}
                      <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value}%`} fill={theme.chartLabel} fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState className={theme.emptyChartState} />
              )}
            </div>
          </section>

          <section ref={generationChartRef} className={`${theme.card} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={theme.chartTitle}>Generation</h2>
              {renderChartExportButtons(generationChartRef.current, 'generation')}
            </div>
            <div className="mt-4 h-60">
              {loading ? (
                <EmptyChartState className={theme.emptyChartState} />
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
                        <Cell key={item.label} fill={theme.generationColors[index % theme.generationColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipProps} formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState className={theme.emptyChartState} />
              )}
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {summary.demographics.generationBreakdown.map((item, index) => (
                <div key={item.label} className={`flex items-center gap-2 ${theme.secondaryText}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.generationColors[index % theme.generationColors.length] }} />
                  <span className="truncate">{item.label}</span>
                  <span className={`ml-2 font-medium ${isDarkTheme ? 'text-slate-50' : 'text-[#151a3d]'}`}>{item.count.toLocaleString()}</span>คน
                </div>
              ))}
            </div>
          </section>

          <section ref={employmentChartRef} className={`${theme.card} xl:col-span-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={theme.chartTitle}>รูปแบบการจ้าง</h2>
              {renderChartExportButtons(employmentChartRef.current, 'employment')}
            </div>
            <div className={`mt-4 border-t pt-4 ${isDarkTheme ? 'border-[#272d52]' : 'border-[#edf0ff]'}`}>
              <p className={`text-xs font-semibold ${isDarkTheme ? 'text-sky-300' : 'text-[#5b5ff4]'}`}>
                จำนวนรวม {summary.demographics.employmentTypeBreakdown.reduce((sum, item) => sum + item.count, 0).toLocaleString()} คน
              </p>
              <div className="mt-3 h-56">
                {loading ? (
                  <EmptyChartState className={theme.emptyChartState} />
                ) : employmentTypeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employmentTypeChartData} layout="vertical" margin={{ left: 20, right: 34 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="label" width={118} tick={{ ...theme.chartAxisTick, fontSize: 11 }} />
                      <Tooltip {...chartTooltipProps} formatter={(value) => [`${Number(value).toLocaleString()} คน`, 'จำนวน']} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {employmentTypeChartData.map((item) => (
                          <Cell key={item.label} fill={item.color} />
                        ))}
                        <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value}%`} fill={theme.chartLabel} fontSize={11} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState className={theme.emptyChartState} />
                )}
              </div>
            </div>
          </section>
          </div>
        </div>
      </section>

      {error ? (
        <div className={theme.errorBox}>
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section ref={monthlyTrendRef} className={theme.card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-base ${theme.cardTitle}`}>สถิติการอบรมรายเดือน</h2>
              <p className={`mt-1 text-xs font-semibold ${isDarkTheme ? 'text-sky-300' : 'text-[#5b5ff4]'}`}>
                จำนวนรายการรวม {summary.monthlyTrend.reduce((sum, item) => sum + item.count, 0).toLocaleString()} รายการ
              </p>
            </div>
            {renderChartExportButtons(monthlyTrendRef.current, 'monthly-training')}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis dataKey="label" tick={theme.chartAxisTick} />
                <YAxis allowDecimals={false} tick={theme.chartAxisTick} />
                <Tooltip {...chartTooltipProps}
                  formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                  labelFormatter={(label) => `เดือน: ${label}`}
                />
                <Bar dataKey="count" fill={theme.monthlyBar} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" formatter={(value: number) => value.toLocaleString()} fill={theme.chartLabel} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section ref={yearlyTrendRef} className={theme.card}>
          <div className="flex items-start justify-between gap-3">
            <h2 className={`text-base ${theme.cardTitle}`}>สถิติการอบรมรายปี</h2>
            {renderChartExportButtons(yearlyTrendRef.current, 'yearly-training')}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis dataKey="label" tick={theme.chartAxisTick} />
                <YAxis allowDecimals={false} tick={theme.chartAxisTick} />
                <Tooltip {...chartTooltipProps}
                  formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                  labelFormatter={(label) => `ปี: ${label}`}
                />
                <Line type="monotone" dataKey="count" stroke={theme.yearlyLine} strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className={theme.courseSection}>
        <div className={theme.courseHeader}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-[#151a3d]'}`}>หลักสูตรที่มีผู้เข้ารับการอบรม</h2>
              <p className={`mt-1 text-sm ${theme.secondaryText}`}>
                หมวดหลักสูตรที่มีผู้เรียน
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <section key={index} className={`animate-pulse ${theme.card}`}>
                <div className={`h-5 w-40 rounded ${isDarkTheme ? 'bg-[#20264a]' : 'bg-slate-100'}`} />
                <div className="mt-4 space-y-3">
                  <div className={`h-14 rounded-md ${isDarkTheme ? 'bg-[#20264a]' : 'bg-slate-100'}`} />
                  <div className={`h-14 rounded-md ${isDarkTheme ? 'bg-[#20264a]' : 'bg-slate-100'}`} />
                  <div className={`h-14 rounded-md ${isDarkTheme ? 'bg-[#20264a]' : 'bg-slate-100'}`} />
                </div>
              </section>
            ))
          ) : displayedCourseSections.length === 0 ? (
            <div className={`col-span-full ${theme.emptyChartState} py-16 shadow-sm`}>
              ไม่พบข้อมูลหลักสูตร
            </div>
          ) : (
            displayedCourseSections.map((section) => (
              <section key={section.category} className={theme.courseCard}>
                <button
                  type="button"
                  onClick={() => toggleCourseCategory(section.category)}
                  className={theme.courseHeaderButton}
                >
                  <div>
                    <h3 className={`text-base ${theme.cardTitle}`}>{section.category}</h3>
                    <p className={`mt-1 text-sm ${theme.mutedText}`}>
                      {section.courseCount.toLocaleString()} หลักสูตร · {section.attendeeCount.toLocaleString()} ผู้เรียน
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                        section.active ? theme.activeBadge : theme.inactiveBadge
                      }`}
                    >
                      {section.active ? 'Active' : 'Inactive'}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 transition ${theme.mutedText} ${expandedCourseCategories[section.category] ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                <div className={`divide-y ${isDarkTheme ? 'divide-[#272d52]' : 'divide-[#edf0ff]'} ${expandedCourseCategories[section.category] ? 'block' : 'hidden'}`}>
                  {section.courses.length === 0 ? (
                    <div className={`px-5 py-8 text-sm ${theme.mutedText}`}>ยังไม่มีหลักสูตรในหมวดหมู่นี้</div>
                  ) : (
                    section.courses.map((course, courseIndex) => (
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
                        className={`flex w-full items-center justify-between gap-4 border-l-4 px-5 py-4 text-left transition ${theme.courseToneClasses[courseIndex % theme.courseToneClasses.length]}`}
                      >
                        <div className="min-w-0">
                          <div className={`truncate ${theme.cardTitle}`}>{course.course}</div>
                          <div className={`mt-1 text-xs ${theme.mutedText}`}>
                            อบรมล่าสุด {formatThaiDate(course.latestDate)}
                          </div>
                        </div>
                        <span className={theme.courseRowCount}>
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
            className={theme.overlay}
            onClick={closeCourseDrawer}
          />

          <aside
            className={theme.drawerPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${isDarkTheme ? 'border-[#272d52]' : 'border-[#edf0ff]'}`}>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? 'text-sky-300' : 'text-[#5b5ff4]'}`}>รายชื่อผู้เรียน</p>
                <h3 className={`mt-1 truncate text-lg ${theme.cardTitle}`}>{selectedCourse.course}</h3>
                <p className={`mt-1 text-sm ${theme.mutedText}`}>
                  {selectedCourse.category} · {selectedCourse.attendeeCount.toLocaleString()} คน · ล่าสุด{' '}
                  {formatThaiDate(selectedCourse.latestDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCourseDrawer}
                className={`rounded-xl border p-2 transition ${isDarkTheme ? 'border-[#343b68] text-slate-300 hover:bg-[#20264a] hover:text-white' : 'border-[#dfe3f5] text-slate-500 hover:bg-[#f1f3ff] hover:text-[#151a3d]'}`}
                aria-label="ปิด"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className={`border-b px-5 py-4 ${isDarkTheme ? 'border-[#272d52]' : 'border-[#edf0ff]'}`}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={theme.drawerStat}>
                  <p className={`text-xs ${theme.mutedText}`}>หมวดหมู่</p>
                  <p className={`mt-1 text-sm ${theme.cardTitle}`}>{selectedCourse.category}</p>
                </div>
                <div className={theme.drawerStat}>
                  <p className={`text-xs ${theme.mutedText}`}>ผู้เรียน</p>
                  <p className={`mt-1 text-sm ${theme.cardTitle}`}>{selectedCourse.attendeeCount.toLocaleString()} คน</p>
                </div>
                <div className={theme.drawerStat}>
                  <p className={`text-xs ${theme.mutedText}`}>อบรมล่าสุด</p>
                  <p className={`mt-1 text-sm ${theme.cardTitle}`}>{formatThaiDate(selectedCourse.latestDate)}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {drawerLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className={`animate-pulse rounded-xl border p-4 ${isDarkTheme ? 'border-[#272d52]' : 'border-[#edf0ff]'}`}>
                      <div className={`h-4 w-2/3 rounded ${isDarkTheme ? 'bg-[#20264a]' : 'bg-slate-100'}`} />
                      <div className={`mt-3 h-3 w-1/2 rounded ${isDarkTheme ? 'bg-[#20264a]' : 'bg-slate-100'}`} />
                    </div>
                  ))}
                </div>
              ) : drawerError ? (
                <div className={theme.errorBox}>
                  {drawerError}
                </div>
              ) : attendees.length === 0 ? (
                <div className={`rounded-xl border border-dashed px-4 py-10 text-center text-sm ${isDarkTheme ? 'border-[#343b68] bg-[#11162d] text-slate-400' : 'border-[#dfe3f5] bg-white text-slate-500'}`}>
                  ไม่พบรายชื่อผู้เรียนในหลักสูตรนี้
                </div>
              ) : (
                <div className={`overflow-hidden rounded-xl border ${isDarkTheme ? 'border-[#272d52]' : 'border-[#edf0ff]'}`}>
                  <table className="w-full text-left text-sm">
                    <thead className={theme.tableHead}>
                      <tr>
                        <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                        <th className="px-4 py-3">กลุ่มงาน</th>
                        <th className="px-4 py-3">วันที่อบรม</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkTheme ? 'divide-[#272d52] bg-[#171b35]' : 'divide-[#edf0ff] bg-white'}`}>
                      {attendees.map((attendee) => (
                        <tr key={attendee.userId} className="align-top">
                          <td className="px-4 py-3">
                            <Link
                              to={`/personnel/${attendee.userId}`}
                              className={`font-medium transition hover:underline ${isDarkTheme ? 'text-sky-200 hover:text-sky-100' : 'text-[#5b5ff4] hover:text-[#4b4fe0]'}`}
                            >
                              {attendee.fullName}
                            </Link>
                          </td>
                          <td className={`px-4 py-3 ${theme.secondaryText}`}>{attendee.workGroup || '-'}</td>
                          <td className={`px-4 py-3 ${theme.secondaryText}`}>{formatThaiDate(attendee.date)}</td>
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
