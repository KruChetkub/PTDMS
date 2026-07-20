import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Bell, CalendarCheck2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock, Edit3, Filter, Hourglass, LayoutDashboard, List, MapPin, Plus, RefreshCw, RotateCcw, UserRound, X, XCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import {
  cancelStrategyEvent,
  createStrategyEvent,
  listStrategyEvents,
  restoreStrategyEvent,
  updateStrategyEvent,
  type StrategyEventRow,
} from '../../services/strategy-calendar.service';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../utils/cn';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const thaiMonths = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const weekdays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const thaiShortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const hours24 = Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0'));
const minuteSteps = Array.from({ length: 12 }, (_, index) => `${index * 5}`.padStart(2, '0'));

const dashboardColors = {
  total: '#0F172A',
  completed: '#10B981',
  inProgress: '#3B82F6',
  cancelled: '#EF4444',
  pending: '#F59E0B',
  purple: '#8B5CF6',
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function getEventEndKey(event: StrategyEventRow) {
  return event.end_date || event.event_date;
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getMonthRange(monthDate: Date) {
  const days = getCalendarDays(monthDate);
  return {
    start: toDateKey(days[0]),
    end: toDateKey(days[days.length - 1]),
  };
}

function formatTime(event: StrategyEventRow) {
  if (!event.start_time && !event.end_time) {
    return 'ทั้งวัน';
  }

  const start = event.start_time?.slice(0, 5) || '';
  const end = event.end_time?.slice(0, 5) || '';
  return end ? `${start} - ${end}` : start;
}

function formatThaiDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function statusLabel(status: StrategyEventRow['status']) {
  if (status === 'cancelled') {
    return 'ยกเลิก';
  }

  if (status === 'draft') {
    return 'ร่าง';
  }

  return 'เผยแพร่';
}

const fallbackWorkGroupLabel = 'ไม่ระบุกลุ่มงาน';

const workGroupColorPalette = [
  { key: 'blue', eventClassName: 'bg-blue-600 text-white', dotClassName: 'bg-blue-600', badgeClassName: 'bg-blue-50 text-blue-800', fill: '#2563EB' },
  { key: 'rose', eventClassName: 'bg-rose-600 text-white', dotClassName: 'bg-rose-600', badgeClassName: 'bg-rose-50 text-rose-800', fill: '#E11D48' },
  { key: 'emerald', eventClassName: 'bg-emerald-600 text-white', dotClassName: 'bg-emerald-600', badgeClassName: 'bg-emerald-50 text-emerald-800', fill: '#059669' },
  { key: 'violet', eventClassName: 'bg-violet-600 text-white', dotClassName: 'bg-violet-600', badgeClassName: 'bg-violet-50 text-violet-800', fill: '#7C3AED' },
  { key: 'amber', eventClassName: 'bg-amber-500 text-slate-950', dotClassName: 'bg-amber-500', badgeClassName: 'bg-amber-50 text-amber-800', fill: '#F59E0B' },
  { key: 'cyan', eventClassName: 'bg-cyan-600 text-white', dotClassName: 'bg-cyan-600', badgeClassName: 'bg-cyan-50 text-cyan-800', fill: '#0891B2' },
  { key: 'fuchsia', eventClassName: 'bg-fuchsia-600 text-white', dotClassName: 'bg-fuchsia-600', badgeClassName: 'bg-fuchsia-50 text-fuchsia-800', fill: '#C026D3' },
  { key: 'lime', eventClassName: 'bg-lime-600 text-white', dotClassName: 'bg-lime-600', badgeClassName: 'bg-lime-50 text-lime-800', fill: '#65A30D' },
  { key: 'orange', eventClassName: 'bg-orange-600 text-white', dotClassName: 'bg-orange-600', badgeClassName: 'bg-orange-50 text-orange-800', fill: '#EA580C' },
  { key: 'sky', eventClassName: 'bg-sky-600 text-white', dotClassName: 'bg-sky-600', badgeClassName: 'bg-sky-50 text-sky-800', fill: '#0284C7' },
  { key: 'pink', eventClassName: 'bg-pink-600 text-white', dotClassName: 'bg-pink-600', badgeClassName: 'bg-pink-50 text-pink-800', fill: '#DB2777' },
  { key: 'teal', eventClassName: 'bg-teal-600 text-white', dotClassName: 'bg-teal-600', badgeClassName: 'bg-teal-50 text-teal-800', fill: '#0D9488' },
  { key: 'red', eventClassName: 'bg-red-600 text-white', dotClassName: 'bg-red-600', badgeClassName: 'bg-red-50 text-red-800', fill: '#DC2626' },
  { key: 'indigo', eventClassName: 'bg-indigo-600 text-white', dotClassName: 'bg-indigo-600', badgeClassName: 'bg-indigo-50 text-indigo-800', fill: '#4F46E5' },
  { key: 'yellow', eventClassName: 'bg-yellow-400 text-slate-950', dotClassName: 'bg-yellow-400', badgeClassName: 'bg-yellow-50 text-yellow-800', fill: '#FACC15' },
  { key: 'slate', eventClassName: 'bg-slate-600 text-white', dotClassName: 'bg-slate-600', badgeClassName: 'bg-slate-50 text-slate-800', fill: '#475569' },
];

function formatDateRange(event: StrategyEventRow) {
  if (!event.end_date || event.end_date === event.event_date) {
    return formatThaiDate(event.event_date);
  }

  return `${formatThaiDate(event.event_date)} - ${formatThaiDate(event.end_date)}`;
}

type TimeSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function splitTime(value: string) {
  const [hour = '', minute = ''] = value.split(':');
  return { hour, minute };
}

function TimeSelect({ label, value, onChange }: TimeSelectProps) {
  const { hour, minute } = splitTime(value);

  const updateTime = (nextHour: string, nextMinute: string) => {
    if (!nextHour && !nextMinute) {
      onChange('');
      return;
    }

    onChange(`${nextHour || '00'}:${nextMinute || '00'}`);
  };

  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <select
          value={hour}
          onChange={(event) => updateTime(event.target.value, minute)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          aria-label={`${label} ชั่วโมง`}
        >
          <option value="">--</option>
          {hours24.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <span className="text-sm font-semibold text-slate-400">:</span>
        <select
          value={minute}
          onChange={(event) => updateTime(hour, event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          aria-label={`${label} นาที`}
        >
          <option value="">--</option>
          {minuteSteps.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function ThaiDateSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const dateParts = value ? value.split('-') : [];
  const year = dateParts[0] ? parseInt(dateParts[0], 10) : new Date().getFullYear();
  const month = dateParts[1] ? parseInt(dateParts[1], 10) : new Date().getMonth() + 1;
  const day = dateParts[2] ? parseInt(dateParts[2], 10) : new Date().getDate();

  const daysInMonth = new Date(year, month, 0).getDate();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = e.target.value.padStart(2, '0');
    onChange(`${year}-${String(month).padStart(2, '0')}-${newDay}`);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    let newDay = day;
    const newDaysInMonth = new Date(year, parseInt(newMonth, 10), 0).getDate();
    if (newDay > newDaysInMonth) newDay = newDaysInMonth;
    onChange(`${year}-${newMonth.padStart(2, '0')}-${String(newDay).padStart(2, '0')}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    let newDay = day;
    const newDaysInMonth = new Date(parseInt(newYear, 10), month, 0).getDate();
    if (newDay > newDaysInMonth) newDay = newDaysInMonth;
    onChange(`${newYear}-${String(month).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`);
  };

  return (
    <div className="flex gap-1 w-full">
      <select
        value={day}
        onChange={handleDayChange}
        className="flex-1 min-w-0 rounded-md border border-slate-300 bg-white px-1 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        value={month}
        onChange={handleMonthChange}
        className="flex-[1.5] min-w-0 rounded-md border border-slate-300 bg-white px-1 py-2 text-[13px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {thaiMonths.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={handleYearChange}
        className="flex-1 min-w-0 rounded-md border border-slate-300 bg-white px-1 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y + 543}
          </option>
        ))}
      </select>
    </div>
  );
}

function getWorkGroupName(ownerWorkGroup: string | null | undefined) {
  return ownerWorkGroup?.trim() || fallbackWorkGroupLabel;
}

type WorkGroupColor = (typeof workGroupColorPalette)[number];
type WorkGroupColorMap = Record<string, WorkGroupColor>;

function buildWorkGroupColorMap(workGroups: Array<string | null | undefined>) {
  const names = Array.from(new Set(workGroups.map(getWorkGroupName))).sort((a, b) => a.localeCompare(b, 'th'));

  return names.reduce<WorkGroupColorMap>((colorMap, name, index) => {
    colorMap[name] = workGroupColorPalette[index % workGroupColorPalette.length];
    return colorMap;
  }, {});
}

function getWorkGroupColor(ownerWorkGroup: string | null | undefined, colorMap?: WorkGroupColorMap) {
  const name = getWorkGroupName(ownerWorkGroup);
  return colorMap?.[name] || workGroupColorPalette[0];
}

const ITEMS_PER_PAGE = 5;

type TabType = 'dashboard' | 'list';
type ListFilter = 'all' | 'month' | 'week';
type DashboardFilterMode = 'all' | 'month' | 'year';

function StrategyEventDetailModal({
  event,
  onClose,
  workGroupColorMap,
}: {
  event: StrategyEventRow | null;
  onClose: () => void;
  workGroupColorMap: WorkGroupColorMap;
}) {
  if (!event) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Upcoming Event Detail</p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-normal text-slate-950">{event.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateRange(event)} · {formatTime(event)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="ปิดรายละเอียดกิจกรรม"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">สถานะ</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{statusLabel(event.status)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">สีประจำกลุ่มงาน</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                <span className={cn('h-2.5 w-2.5 rounded-full', getWorkGroupColor(event.owner_work_group, workGroupColorMap).dotClassName)} />
                {getWorkGroupName(event.owner_work_group)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">วันที่</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{formatDateRange(event)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">เวลา</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{formatTime(event)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500">สถานที่</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{event.location || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500">กลุ่มงานเจ้าของกิจกรรม</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{event.owner_work_group || '-'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">รายละเอียด</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {event.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StrategyCalendarPage() {
  useAuditPageAccess({ module: 'strategy_calendar', action: 'strategy_calendar_access', route: '/strategy-calendar' });
  const { profile } = useAuthStore();
  const selectedDateEventsRef = useRef<HTMLDivElement | null>(null);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState<StrategyEventRow[]>([]);
  const [dashboardEvents, setDashboardEvents] = useState<StrategyEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [dashboardFilterMode, setDashboardFilterMode] = useState<DashboardFilterMode>('all');
  const [dashboardMonth, setDashboardMonth] = useState(() => new Date().getMonth() + 1);
  const [dashboardYear, setDashboardYear] = useState(() => new Date().getFullYear());
  const [listPage, setListPage] = useState(0);
  const [selectedUpcomingEvent, setSelectedUpcomingEvent] = useState<StrategyEventRow | null>(null);
  const [selectedWorkGroup, setSelectedWorkGroup] = useState<string | null>(null);
  const [workGroupPage, setWorkGroupPage] = useState(0);
  const [form, setForm] = useState({
    title: '',
    description: '',
    endDate: '',
    startTime: '',
    endTime: '',
    color: 'blue',
    location: '',
  });

  const monthLabel = `${thaiMonths[monthDate.getMonth()]} ${monthDate.getFullYear() + 543}`;
  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);
  const currentMonthDays = useMemo(() => calendarDays.filter((date) => date.getMonth() === monthDate.getMonth()), [calendarDays, monthDate]);
  const todayKey = toDateKey(new Date());
  const canFilterDashboard = profile?.role === 'super_admin' || profile?.role === 'admin';
  const canViewUpcomingEventDetails = canFilterDashboard;
  const dashboardYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  }, []);

  const eventsByDate = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    const slotMap: Record<string, (StrategyEventRow | null)[]> = {};

    weeks.forEach((week) => {
      const weekStart = week[0];
      const weekEnd = week[6];
      
      const weekEvents = events.filter(event => {
        const start = parseDateKey(event.event_date);
        const end = event.end_date ? parseDateKey(event.end_date) : start;
        return start <= weekEnd && end >= weekStart;
      });

      weekEvents.sort((a, b) => {
        const aStart = parseDateKey(a.event_date).getTime();
        const bStart = parseDateKey(b.event_date).getTime();
        if (aStart !== bStart) return aStart - bStart;
        
        const aEnd = (a.end_date ? parseDateKey(a.end_date) : parseDateKey(a.event_date)).getTime();
        const bEnd = (b.end_date ? parseDateKey(b.end_date) : parseDateKey(b.event_date)).getTime();
        return (bEnd - aStart) - (aEnd - bStart);
      });

      const slots: StrategyEventRow[][] = [];

      weekEvents.forEach(event => {
        const start = parseDateKey(event.event_date);
        const end = event.end_date ? parseDateKey(event.end_date) : start;
        
        let slotIndex = 0;
        while (true) {
          if (!slots[slotIndex]) {
            slots[slotIndex] = [];
            break;
          }
          
          const hasOverlap = slots[slotIndex].some(existing => {
            const eStart = parseDateKey(existing.event_date);
            const eEnd = existing.end_date ? parseDateKey(existing.end_date) : eStart;
            return start <= eEnd && end >= eStart;
          });
          
          if (!hasOverlap) {
            break;
          }
          slotIndex++;
        }
        
        slots[slotIndex].push(event);
      });

      week.forEach(day => {
        const dateKey = toDateKey(day);
        slotMap[dateKey] = [];
        for (let i = 0; i < slots.length; i++) {
          const eventOnDay = slots[i]?.find(existing => {
            const eStart = parseDateKey(existing.event_date);
            const eEnd = existing.end_date ? parseDateKey(existing.end_date) : eStart;
            return day >= eStart && day <= eEnd;
          });
          slotMap[dateKey][i] = eventOnDay || null;
        }
      });
    });

    return slotMap;
  }, [events, calendarDays]);
  
  const selectedEvents = (eventsByDate[selectedDate] || []).filter((item): item is StrategyEventRow => item !== null);
  const publishedEvents = events.filter((event) => event.status === 'published');
  const dashboardSourceEvents = canFilterDashboard ? dashboardEvents : events;
  const workGroupColorMap = useMemo(
    () =>
      buildWorkGroupColorMap([
        ...events.map((event) => event.owner_work_group),
        ...dashboardEvents.map((event) => event.owner_work_group),
        profile?.work_group || profile?.department,
      ]),
    [dashboardEvents, events, profile?.department, profile?.work_group],
  );
  const dashboardPublishedEvents = dashboardSourceEvents.filter((event) => event.status === 'published');
  const upcomingDashboardEvents = useMemo(
    () =>
      dashboardPublishedEvents
        .filter((event) => event.event_date >= todayKey)
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 5),
    [dashboardPublishedEvents, todayKey],
  );
  const visibleEvents = canFilterDashboard ? dashboardSourceEvents : events;
  const upcomingCount = publishedEvents.filter((event) => event.event_date >= todayKey).length;
  const dashboardCancelledCount = dashboardSourceEvents.filter((event) => event.status === 'cancelled').length;
  const dashboardCompletedCount = dashboardPublishedEvents.filter((event) => getEventEndKey(event) < todayKey).length;
  const dashboardInProgressCount = dashboardPublishedEvents.filter((event) => getEventEndKey(event) >= todayKey).length;
  const dashboardPendingCount = dashboardSourceEvents.filter((event) => event.status === 'draft').length;
  const dashboardChartYear = canFilterDashboard && dashboardFilterMode !== 'all' ? dashboardYear : monthDate.getFullYear();

  const dashboardAnalytics = useMemo(() => {
    const activeEvents = dashboardSourceEvents.filter((event) => event.status !== 'cancelled');
    const published = dashboardSourceEvents.filter((event) => event.status === 'published');

    const monthlyActivityData = Array.from({ length: 12 }, (_, index) => {
      const monthEvents = activeEvents.filter((event) => {
        const date = parseDateKey(event.event_date);
        return date.getFullYear() === dashboardChartYear && date.getMonth() === index;
      });
      const completed = monthEvents.filter((event) => event.status === 'published' && getEventEndKey(event) < todayKey).length;

      return {
        month: thaiShortMonths[index],
        total: monthEvents.length,
        completed,
      };
    });

    const workGroupCounts = new Map<string, number>();
    published.forEach((event) => {
      const workGroup = getWorkGroupName(event.owner_work_group);
      workGroupCounts.set(workGroup, (workGroupCounts.get(workGroup) || 0) + 1);
    });

    const workGroupColorData = Array.from(workGroupCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        fill: getWorkGroupColor(name, workGroupColorMap).fill,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));

    const trendEnd =
      canFilterDashboard && dashboardFilterMode === 'year'
        ? new Date(dashboardYear, 11, 1)
        : canFilterDashboard && dashboardFilterMode === 'month'
          ? new Date(dashboardYear, dashboardMonth - 1, 1)
          : parseDateKey(todayKey);

    const activityTrendData = Array.from({ length: 12 }, (_, offset) => {
      const date = new Date(trendEnd.getFullYear(), trendEnd.getMonth() - (11 - offset), 1);
      const key = monthKey(date.getFullYear(), date.getMonth());
      return {
        month: `${thaiShortMonths[date.getMonth()]} ${String(date.getFullYear() + 543).slice(2)}`,
        count: published.filter((event) => event.event_date.startsWith(key)).length,
      };
    });

    const heatmapStart = new Date(dashboardChartYear, 0, 1);
    const heatmapEnd = new Date(dashboardChartYear, 11, 31);
    const heatmapCounts = new Map<string, number>();

    published.forEach((event) => {
      let cursor = parseDateKey(event.event_date);
      const end = parseDateKey(getEventEndKey(event));

      while (cursor <= end) {
        if (cursor >= heatmapStart && cursor <= heatmapEnd) {
          const key = toDateKey(cursor);
          heatmapCounts.set(key, (heatmapCounts.get(key) || 0) + 1);
        }
        cursor = addDays(cursor, 1);
      }
    });

    const heatmapLeadingDays = (heatmapStart.getDay() + 6) % 7;
    const heatmapDays = [
      ...Array.from({ length: heatmapLeadingDays }, (_, index) => ({
        key: `empty-start-${index}`,
        dateKey: '',
        day: null as number | null,
        count: 0,
      })),
      ...Array.from({ length: Math.round((heatmapEnd.getTime() - heatmapStart.getTime()) / 86400000) + 1 }, (_, index) => {
        const date = addDays(heatmapStart, index);
        const dateKey = toDateKey(date);
        return {
          key: dateKey,
          dateKey,
          day: date.getDate(),
          count: heatmapCounts.get(dateKey) || 0,
        };
      }),
    ];
    const heatmapMax = Math.max(1, ...heatmapDays.map((day) => day.count));
    const heatmapWeeks = Array.from({ length: Math.ceil(heatmapDays.length / 7) }, (_, index) =>
      heatmapDays.slice(index * 7, index * 7 + 7),
    );
    const heatmapMonthLabels = heatmapWeeks.map((week, index) => {
      const firstDate = week.find((day) => day.dateKey);
      if (!firstDate) {
        return '';
      }

      const date = parseDateKey(firstDate.dateKey);
      const previousWeek = heatmapWeeks[index - 1];
      const previousDate = previousWeek?.find((day) => day.dateKey);
      const isFirstWeek = index === 0 || !previousDate;
      const isNewMonth = previousDate ? parseDateKey(previousDate.dateKey).getMonth() !== date.getMonth() : false;
      return isFirstWeek || isNewMonth ? thaiShortMonths[date.getMonth()] : '';
    });
    const bestMonth = monthlyActivityData.reduce((best, item) => (item.total > best.total ? item : best), monthlyActivityData[0]);
    const topWorkGroup = workGroupColorData.reduce((best, item) => (item.count > best.count ? item : best), workGroupColorData[0] || { name: '-', count: 0, fill: '#64748B' });

    return {
      monthlyActivityData,
      workGroupColorData,
      activityTrendData,
      heatmapDays,
      heatmapWeeks,
      heatmapMonthLabels,
      heatmapMax,
      bestMonth,
      topWorkGroup,
    };
  }, [canFilterDashboard, dashboardChartYear, dashboardFilterMode, dashboardMonth, dashboardSourceEvents, dashboardYear, todayKey, workGroupColorMap]);

  const statusDistributionData = useMemo(
    () => [
      { name: 'เสร็จสิ้น', value: dashboardCompletedCount, color: dashboardColors.completed },
      { name: 'กำลังดำเนินการ', value: dashboardInProgressCount, color: dashboardColors.inProgress },
      { name: 'รออนุมัติ', value: dashboardPendingCount, color: dashboardColors.pending },
      { name: 'ยกเลิก', value: dashboardCancelledCount, color: dashboardColors.cancelled },
    ],
    [dashboardCancelledCount, dashboardCompletedCount, dashboardInProgressCount, dashboardPendingCount],
  );

  const selectedWorkGroupEvents = useMemo(
    () =>
      selectedWorkGroup
        ? dashboardPublishedEvents
            .filter((event) => getWorkGroupName(event.owner_work_group) === selectedWorkGroup)
            .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.start_time || '').localeCompare(b.start_time || ''))
        : [],
    [dashboardPublishedEvents, selectedWorkGroup],
  );
  const totalWorkGroupPages = Math.max(1, Math.ceil(selectedWorkGroupEvents.length / ITEMS_PER_PAGE));
  const safeWorkGroupPage = Math.min(workGroupPage, totalWorkGroupPages - 1);
  const paginatedWorkGroupEvents = selectedWorkGroupEvents.slice(safeWorkGroupPage * ITEMS_PER_PAGE, (safeWorkGroupPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    setWorkGroupPage(0);
  }, [selectedWorkGroup]);

  const dashboardFilterLabel = useMemo(() => {
    if (!canFilterDashboard) {
      return `ภาพรวมกิจกรรม ${monthLabel}`;
    }

    if (dashboardFilterMode === 'month') {
      return `กิจกรรมเดือน${thaiMonths[dashboardMonth - 1]} ${dashboardYear + 543}`;
    }

    if (dashboardFilterMode === 'year') {
      return `กิจกรรมปี ${dashboardYear + 543}`;
    }

    return 'ภาพรวมกิจกรรมทั้งหมดถึงปัจจุบัน';
  }, [canFilterDashboard, dashboardFilterMode, dashboardMonth, dashboardYear, monthLabel]);

  // Weekly filter
  const filteredEvents = useMemo(() => {
    if (listFilter === 'all') {
      return visibleEvents;
    }

    if (listFilter === 'week') {
      const selDate = parseDateKey(selectedDate);
      const dayOfWeek = (selDate.getDay() + 6) % 7;
      const weekStart = new Date(selDate);
      weekStart.setDate(selDate.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const ws = toDateKey(weekStart);
      const we = toDateKey(weekEnd);
      return visibleEvents.filter(e => {
        const eEnd = e.end_date || e.event_date;
        return e.event_date <= we && eEnd >= ws;
      });
    }
    const monthStart = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
    return visibleEvents.filter(e => {
      const eEnd = e.end_date || e.event_date;
      return e.event_date <= monthEnd && eEnd >= monthStart;
    });
  }, [visibleEvents, listFilter, selectedDate, monthDate]);

  const totalFilteredPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const safeListPage = Math.min(listPage, totalFilteredPages - 1);
  const paginatedEvents = filteredEvents.slice(safeListPage * ITEMS_PER_PAGE, (safeListPage + 1) * ITEMS_PER_PAGE);

  const canManageEvent = (event: StrategyEventRow) =>
    event.created_by === profile?.user_id || profile?.role === 'super_admin' || profile?.role === 'admin';

  const resetForm = () => {
    setEditingEventId(null);
    setForm({ title: '', description: '', endDate: '', startTime: '', endTime: '', color: 'blue', location: '' });
  };

  const startEdit = (event: StrategyEventRow) => {
    setSelectedDate(event.event_date);
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      description: event.description || '',
      endDate: event.end_date || '',
      startTime: event.start_time?.slice(0, 5) || '',
      endTime: event.end_time?.slice(0, 5) || '',
      color: event.color || 'slate',
      location: event.location || '',
    });
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const range = getMonthRange(monthDate);
      const data = await listStrategyEvents(range.start, range.end);
      setEvents(data);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดปฏิทินกิจกรรมได้'));
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardEvents = async () => {
    setDashboardLoading(true);
    setError(null);

    try {
      let start = '1900-01-01';
      let end = '2100-12-31';

      if (!canFilterDashboard) {
        const range = getMonthRange(monthDate);
        start = range.start;
        end = range.end;
      } else if (dashboardFilterMode === 'month') {
        start = `${dashboardYear}-${String(dashboardMonth).padStart(2, '0')}-01`;
        end = toDateKey(new Date(dashboardYear, dashboardMonth, 0));
      } else if (dashboardFilterMode === 'year') {
        start = `${dashboardYear}-01-01`;
        end = `${dashboardYear}-12-31`;
      }

      const data = await listStrategyEvents(start, end);
      setDashboardEvents(data);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้'));
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, [monthDate]);

  useEffect(() => {
    void loadDashboardEvents();
  }, [canFilterDashboard, dashboardFilterMode, dashboardMonth, dashboardYear, monthDate, todayKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('กรุณาระบุชื่อกิจกรรม');
      return;
    }

    if (form.endDate && form.endDate < selectedDate) {
      setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น');
      return;
    }

    if (form.startTime && form.endTime && form.endTime < form.startTime) {
      setError('เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น ตามเวลาไทย 24 ชม.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        eventDate: selectedDate,
        endDate: form.endDate || selectedDate,
        startTime: form.startTime,
        endTime: form.endTime,
        color: getWorkGroupColor(profile?.work_group || profile?.department, workGroupColorMap).key,
        location: form.location,
        ownerWorkGroup: profile?.work_group || profile?.department || null,
      };

      if (editingEventId) {
        await updateStrategyEvent(editingEventId, payload);
      } else {
        await createStrategyEvent(payload);
      }

      resetForm();
      await loadEvents();
      await loadDashboardEvents();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, editingEventId ? 'แก้ไขกิจกรรมไม่สำเร็จ' : 'บันทึกกิจกรรมไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (eventId: string) => {
    setError(null);
    try {
      await cancelStrategyEvent(eventId);
      await loadEvents();
      await loadDashboardEvents();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ยกเลิกกิจกรรมไม่สำเร็จ'));
    }
  };

  const handleRestore = async (eventId: string) => {
    setError(null);
    try {
      await restoreStrategyEvent(eventId);
      await loadEvents();
      await loadDashboardEvents();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'กู้คืนกิจกรรมไม่สำเร็จ'));
    }
  };

  const moveMonth = (amount: number) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectCalendarDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    window.setTimeout(() => {
      selectedDateEventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const selectToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    selectCalendarDate(toDateKey(today));
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="hidden sm:block">
          <PageHeader
            title="ปฏิทินกิจกรรมกองยุทธศาสตร์และแผนงาน"
            description="แจ้งกิจกรรมภายในกองฯ และติดตามกำหนดการ"
          />
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          <button
            type="button"
            onClick={selectToday}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => {
              void loadEvents();
              void loadDashboardEvents();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {canFilterDashboard ? (
      <section className="mb-6 rounded-md border border-slate-200 bg-white shadow-sm">
        {/* Tabs: Dashboard / List */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden rounded-lg bg-slate-100 p-1 sm:inline-flex">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition',
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              แดชบอร์ด
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('list'); setListPage(0); }}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition',
                activeTab === 'list'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              รายการ
            </button>
          </div>

          {activeTab === 'list' ? (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                {([
                  ['all', 'ทั้งหมด'],
                  ['week', 'รายสัปดาห์'],
                  ['month', 'รายเดือน'],
                ] as Array<[ListFilter, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setListFilter(mode); setListPage(0); }}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                      listFilter === mode
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {filteredEvents.length} รายการ
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="text-sm text-slate-500">{dashboardFilterLabel}</p>
              {canFilterDashboard ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                    {([
                      ['all', 'ทั้งหมด'],
                      ['month', 'รายเดือน'],
                      ['year', 'รายปี'],
                    ] as Array<[DashboardFilterMode, string]>).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDashboardFilterMode(mode)}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                          dashboardFilterMode === mode ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-700',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {dashboardFilterMode === 'month' ? (
                    <select
                      value={dashboardMonth}
                      onChange={(event) => setDashboardMonth(Number(event.target.value))}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                      {thaiMonths.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {dashboardFilterMode !== 'all' ? (
                    <select
                      value={dashboardYear}
                      onChange={(event) => setDashboardYear(Number(event.target.value))}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                      {dashboardYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year + 543}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' ? (
          <div className="space-y-4 bg-[#F5F8FC] p-3 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-normal text-slate-950 sm:text-xl">ภาพรวมกิจกรรม</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">สรุปภาพรวมการดำเนินงานทั้งหมด</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="truncate">{dashboardFilterLabel}</span>
                </div>
                <button type="button" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm" aria-label="การแจ้งเตือน">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{upcomingDashboardEvents.length}</span>
                </button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm" aria-label="ผู้ใช้งาน">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    {
                      label: 'กิจกรรมทั้งหมด',
                      value: dashboardSourceEvents.length,
                      caption: dashboardFilterLabel,
                      icon: CalendarCheck2,
                      className: 'from-slate-950 to-slate-800',
                      iconClassName: 'bg-white/15 text-white',
                    },
                    {
                      label: 'เสร็จสิ้นแล้ว',
                      value: dashboardCompletedCount,
                      caption: `${dashboardSourceEvents.length ? Math.round((dashboardCompletedCount / dashboardSourceEvents.length) * 100) : 0}% จากทั้งหมด`,
                      icon: CheckCircle2,
                      className: 'from-emerald-500 to-emerald-700',
                      iconClassName: 'bg-white/15 text-white',
                    },
                    {
                      label: 'กำลังดำเนินการ',
                      value: dashboardInProgressCount,
                      caption: 'ยังไม่ถึงวันสิ้นสุด',
                      icon: Clock,
                      className: 'from-blue-500 to-blue-700',
                      iconClassName: 'bg-white/15 text-white',
                    },
                    {
                      label: 'รออนุมัติ',
                      value: dashboardPendingCount,
                      caption: 'รองรับสถานะอนาคต',
                      icon: Hourglass,
                      className: 'from-amber-400 to-orange-500',
                      iconClassName: 'bg-white/20 text-white',
                    },
                  ].map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className={cn('overflow-hidden rounded-md bg-gradient-to-br p-3 text-white shadow-sm sm:p-4', card.className)}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold leading-4 text-white/90 sm:text-xs">{card.label}</p>
                          <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10', card.iconClassName)}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-bold tracking-normal sm:text-3xl">{dashboardLoading ? '...' : card.value}</p>
                        <p className="text-xs text-white/85">รายการ</p>
                        <p className="mt-3 border-t border-white/10 pt-2 text-[10px] font-medium leading-4 text-white/85 sm:mt-4 sm:text-[11px]">+ {card.caption}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                  <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-950">สถานะกิจกรรม</h3>
                        <p className="mt-1 text-[11px] text-slate-500">จำนวนและสัดส่วนตามสถานะ</p>
                      </div>
                    </div>
                    <div className="mt-3 h-52 sm:h-56">
                      {dashboardSourceEvents.length === 0 ? (
                        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusDistributionData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="70%" paddingAngle={2}>
                              {statusDistributionData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-[11px]">ทั้งหมด</text>
                            <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-950 text-2xl font-bold">{dashboardSourceEvents.length}</text>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="grid gap-2 text-xs">
                      {statusDistributionData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-semibold text-slate-950">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-950">จำนวนกิจกรรมรายเดือน</h3>
                        <p className="mt-1 text-[11px] text-slate-500">Bar = กิจกรรมทั้งหมด, Line = เสร็จสิ้น</p>
                      </div>
                      <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">ปี {dashboardChartYear + 543}</span>
                    </div>
                    <div className="mt-4 h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dashboardAnalytics.monthlyActivityData} margin={{ top: 8, right: 4, bottom: 0, left: -26 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="total" name="กิจกรรมทั้งหมด" fill={dashboardColors.inProgress} radius={[5, 5, 0, 0]} barSize={16} />
                          <Line type="monotone" dataKey="completed" name="เสร็จสิ้น" stroke={dashboardColors.completed} strokeWidth={3} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </div>
              </div>

              <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-950">กิจกรรมที่กำลังจะมาถึง</h3>
                  <button type="button" onClick={() => setActiveTab('list')} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">ดูทั้งหมด</button>
                </div>
                <div className="mt-4 space-y-3">
                  {upcomingDashboardEvents.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                      ยังไม่มีกิจกรรมที่กำลังจะมาถึง
                    </p>
                  ) : (
                    upcomingDashboardEvents.map((item) => {
                      const eventDate = parseDateKey(item.event_date);
                      const content = (
                        <>
                          <div className="w-12 shrink-0 rounded-md border border-blue-100 bg-blue-50 px-2 py-2 text-center text-blue-700 sm:w-14">
                            <p className="text-xl font-bold leading-none">{eventDate.getDate()}</p>
                            <p className="mt-1 text-[11px] font-semibold">{thaiShortMonths[eventDate.getMonth()]}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.title}</h4>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{formatTime(item)}</span>
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{item.location || '-'}</span>
                            </div>
                            <span className={cn('mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold', getWorkGroupColor(item.owner_work_group, workGroupColorMap).badgeClassName)}>
                              <span className={cn('h-2 w-2 rounded-full', getWorkGroupColor(item.owner_work_group, workGroupColorMap).dotClassName)} />
                              {getWorkGroupName(item.owner_work_group)}
                            </span>
                          </div>
                        </>
                      );

                      if (!canViewUpcomingEventDetails) {
                        return (
                          <div key={item.id} className="flex gap-3 rounded-md bg-white p-2">
                            {content}
                          </div>
                        );
                      }

                      return (
                        <button key={item.id} type="button" onClick={() => setSelectedUpcomingEvent(item)} className="flex w-full gap-3 rounded-md bg-white p-2 text-left transition hover:bg-slate-50">
                          {content}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)]">
              <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-950">สีของกลุ่มงาน</h3>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">คลิกแท่งสีเพื่อดูรายการกิจกรรมของกลุ่มงาน</p>
                <div className="mt-4 h-52">
                  {dashboardAnalytics.workGroupColorData.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">ยังไม่มีข้อมูลกลุ่มงาน</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardAnalytics.workGroupColorData}
                        layout="vertical"
                        margin={{ top: 4, right: 10, bottom: 14, left: -6 }}
                        onClick={(chartState) => {
                          const name = chartState?.activePayload?.[0]?.payload?.name;
                          if (typeof name === 'string') {
                            setSelectedWorkGroup((current) => (current === name ? null : name));
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
                        <YAxis type="category" dataKey="name" width={82} tickLine={false} axisLine={false} fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="count" name="จำนวน" radius={[0, 5, 5, 0]} barSize={10} cursor="pointer">
                          {dashboardAnalytics.workGroupColorData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} opacity={!selectedWorkGroup || selectedWorkGroup === entry.name ? 1 : 0.42} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {dashboardAnalytics.workGroupColorData.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedWorkGroup((current) => (current === item.name ? null : item.name))}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-xs transition',
                        selectedWorkGroup === item.name ? 'border-slate-900 bg-slate-50 text-slate-950' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', getWorkGroupColor(item.name, workGroupColorMap).dotClassName)} />
                        <span className="truncate font-semibold">{item.name}</span>
                      </span>
                      <span className="shrink-0 font-bold">{item.count}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">แนวโน้มกิจกรรม</h3>
                  <p className="mt-1 text-[11px] text-slate-500">ย้อนหลัง 12 เดือน</p>
                </div>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardAnalytics.activityTrendData} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="strategyTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={dashboardColors.inProgress} stopOpacity={0.24} />
                          <stop offset="95%" stopColor={dashboardColors.inProgress} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="จำนวนกิจกรรม" stroke={dashboardColors.inProgress} strokeWidth={3} fill="url(#strategyTrendFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {selectedWorkGroup ? (
              <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">รายการกิจกรรมของกลุ่มงาน</h3>
                    <p className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className={cn('h-2.5 w-2.5 rounded-full', getWorkGroupColor(selectedWorkGroup, workGroupColorMap).dotClassName)} />
                      {selectedWorkGroup} · {selectedWorkGroupEvents.length} รายการ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkGroup(null)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    ล้างการเลือก
                  </button>
                </div>
                <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                  {selectedWorkGroupEvents.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">ยังไม่พบกิจกรรมของกลุ่มงานนี้</div>
                  ) : (
                    paginatedWorkGroupEvents.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedUpcomingEvent(item)}
                        className="flex w-full flex-col gap-2 px-3 py-3 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', getWorkGroupColor(item.owner_work_group, workGroupColorMap).dotClassName)} />
                            <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.description || item.location || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                        </div>
                        <div className="shrink-0 text-xs font-medium text-slate-500 sm:text-right">
                          <p>{formatDateRange(item)}</p>
                          <p className="mt-0.5">{formatTime(item)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {selectedWorkGroupEvents.length > ITEMS_PER_PAGE ? (
                  <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      แสดง {safeWorkGroupPage * ITEMS_PER_PAGE + 1}-{Math.min((safeWorkGroupPage + 1) * ITEMS_PER_PAGE, selectedWorkGroupEvents.length)} จาก {selectedWorkGroupEvents.length} รายการ
                    </span>
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWorkGroupPage((page) => Math.max(0, page - 1))}
                        disabled={safeWorkGroupPage === 0}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        ก่อนหน้า
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkGroupPage((page) => Math.min(totalWorkGroupPages - 1, page + 1))}
                        disabled={safeWorkGroupPage >= totalWorkGroupPages - 1}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ถัดไป
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">ปฏิทินความหนาแน่นกิจกรรม</h3>
                  <p className="mt-1 text-[11px] text-slate-500">ปี {dashboardChartYear + 543}</p>
                </div>
                <div className="hidden items-center gap-1.5 text-[11px] text-slate-500 sm:flex">
                  น้อย
                  <span className="h-3 w-3 rounded-sm bg-slate-100" />
                  <span className="h-3 w-3 rounded-sm bg-emerald-200" />
                  <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                  <span className="h-3 w-3 rounded-sm bg-emerald-700" />
                  มาก
                </div>
              </div>
              <div className="mt-4 pb-2">
                <div className="w-full">
                  <div className="ml-8 grid gap-1" style={{ gridTemplateColumns: `repeat(${dashboardAnalytics.heatmapWeeks.length}, minmax(0, 1fr))` }}>
                    {dashboardAnalytics.heatmapMonthLabels.map((label, index) => (
                      <div key={`${label || 'blank'}-${index}`} className="h-4 overflow-visible text-[10px] font-medium leading-3 text-slate-500">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="grid w-6 shrink-0 grid-rows-7 gap-1 text-[10px] font-medium leading-3 text-slate-500">
                      {weekdays.map((day) => (
                        <div key={day} className="flex aspect-square items-center justify-end">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid min-w-0 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${dashboardAnalytics.heatmapWeeks.length}, minmax(0, 1fr))` }}>
                      {dashboardAnalytics.heatmapWeeks.map((week, weekIndex) => (
                        <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                          {week.map((day) => (
                            <div
                              key={day.key}
                              title={day.dateKey ? `${formatThaiDate(day.dateKey)} · ${day.count} รายการ` : undefined}
                              className={cn(
                                'aspect-square min-h-2 rounded-[3px]',
                                !day.dateKey && 'bg-transparent',
                                day.dateKey && day.count === 0 && 'bg-slate-100',
                                day.count > 0 && day.count <= Math.ceil(dashboardAnalytics.heatmapMax / 3) && 'bg-emerald-200',
                                day.count > Math.ceil(dashboardAnalytics.heatmapMax / 3) && day.count <= Math.ceil((dashboardAnalytics.heatmapMax * 2) / 3) && 'bg-emerald-400',
                                day.count > Math.ceil((dashboardAnalytics.heatmapMax * 2) / 3) && 'bg-emerald-700',
                              )}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-500 sm:hidden">
                น้อย
                <span className="h-3 w-3 rounded-sm bg-slate-100" />
                <span className="h-3 w-3 rounded-sm bg-emerald-200" />
                <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                <span className="h-3 w-3 rounded-sm bg-emerald-700" />
                มาก
              </div>
            </section>

          </div>
        ) : null}

        {/* List Tab */}
        {activeTab === 'list' ? (
          <>
            {filteredEvents.length === 0 ? (
              <div className="p-4">
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  {listFilter === 'all' ? 'ยังไม่มีกิจกรรมทั้งหมด' : listFilter === 'week' ? 'ยังไม่มีกิจกรรมในสัปดาห์นี้' : 'ยังไม่มีกิจกรรมในเดือนนี้'}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">วันที่</th>
                        <th className="px-4 py-3">เวลาไทย</th>
                        <th className="px-4 py-3">กิจกรรม</th>
                        <th className="px-4 py-3">สถานที่</th>
                        <th className="px-4 py-3">กลุ่มงาน</th>
                        <th className="px-4 py-3">สถานะ</th>
                        <th className="px-4 py-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedEvents.map((item) => (
                        <tr
                          key={item.id}
                          className={cn(
                            'cursor-pointer transition hover:bg-slate-50',
                            item.event_date === selectedDate && 'bg-brand-50/70',
                            item.status === 'cancelled' && 'text-slate-400',
                          )}
                          onClick={() => setSelectedDate(item.event_date)}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                            {item.end_date && item.end_date !== item.event_date
                              ? `${formatThaiDate(item.event_date)} - ${formatThaiDate(item.end_date)}`
                              : formatThaiDate(item.event_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTime(item)}</td>
                          <td className="min-w-64 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', getWorkGroupColor(item.owner_work_group, workGroupColorMap).dotClassName)}></span>
                              <div>
                                <div className={cn('font-semibold text-slate-950', item.status === 'cancelled' && 'text-slate-400 line-through')}>
                                  {item.title}
                                </div>
                                {item.description ? (
                                  <div className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-slate-500">{item.description}</div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.location || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{item.owner_work_group || '-'}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                'rounded-md px-2 py-1 text-xs font-semibold',
                                item.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                              )}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {!canManageEvent(item) ? (
                              <span className="text-xs text-slate-400">ดูได้เท่านั้น</span>
                            ) : item.status === 'cancelled' ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleRestore(item.id);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                กู้คืน
                              </button>
                            ) : (
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startEdit(item);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                                >
                                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  แก้ไข
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleCancel(item.id);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  ยกเลิก
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {paginatedEvents.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        'w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-white',
                        item.event_date === selectedDate && 'border-brand-300 bg-brand-50',
                        item.status === 'cancelled' && 'bg-slate-100',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className={cn('inline-block h-2 w-2 rounded-full', getWorkGroupColor(item.owner_work_group, workGroupColorMap).dotClassName)}></span>
                            {item.end_date && item.end_date !== item.event_date
                              ? `${formatThaiDate(item.event_date)} - ${formatThaiDate(item.end_date)}`
                              : formatThaiDate(item.event_date)}
                          </div>
                          <h3 className={cn('mt-1 text-sm font-semibold text-slate-950', item.status === 'cancelled' && 'text-slate-400 line-through')}>
                            {item.title}
                          </h3>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold ring-1 ring-slate-200',
                            item.status === 'cancelled' ? 'text-red-700' : 'text-slate-600',
                          )}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatTime(item)}
                        </span>
                        {item.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            {item.location}
                          </span>
                        ) : null}
                      </div>
                      {item.owner_work_group ? (
                        <div className="mt-2 text-xs font-medium text-slate-500">กลุ่มงาน: {item.owner_work_group}</div>
                      ) : null}
                      {item.description ? <p className="mt-2 text-sm leading-5 text-slate-600">{item.description}</p> : null}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDate(item.event_date)}
                          className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          เลือกวันที่นี้
                        </button>
                        {!canManageEvent(item) ? (
                          <span className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
                            ดูได้เท่านั้น
                          </span>
                        ) : item.status === 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => void handleRestore(item.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            กู้คืน
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCancel(item.id)}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              ยกเลิก
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    แสดง {safeListPage * ITEMS_PER_PAGE + 1}-{Math.min((safeListPage + 1) * ITEMS_PER_PAGE, filteredEvents.length)} จาก {filteredEvents.length} รายการ
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safeListPage === 0}
                      onClick={() => setListPage(p => Math.max(0, p - 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="หน้าก่อนหน้า"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="px-2 text-xs font-semibold text-slate-700">
                      {safeListPage + 1} / {totalFilteredPages}
                    </span>
                    <button
                      type="button"
                      disabled={safeListPage >= totalFilteredPages - 1}
                      onClick={() => setListPage(p => p + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="หน้าถัดไป"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
      </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <div className="hidden items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Thailand Calendar
              </div>
              <h2 className="text-xl font-semibold tracking-normal text-slate-950 sm:mt-3">{monthLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                aria-label="เดือนก่อนหน้า"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                aria-label="เดือนถัดไป"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="hidden grid-cols-7 border-b border-slate-100 bg-slate-50 sm:grid">
            {weekdays.map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="hidden grid-cols-7 sm:grid">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const dayEvents = eventsByDate[dateKey] || [];
              const isCurrentMonth = date.getMonth() === monthDate.getMonth();
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectCalendarDate(dateKey)}
                  className={cn(
                    'min-h-24 border-b border-r border-slate-100 p-2 text-left transition hover:bg-slate-50',
                    !isCurrentMonth && 'bg-slate-50/70 text-slate-400',
                    isSelected && 'bg-brand-50 ring-2 ring-inset ring-brand-500',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold',
                        isToday ? 'bg-slate-950 text-white' : 'text-slate-700',
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((item, index) => {
                      if (!item) {
                        return <div key={`spacer-${index}`} className="h-6"></div>;
                      }

                      const isStart = item.event_date === dateKey;
                      const isEnd = (item.end_date || item.event_date) === dateKey;
                      const isCancelled = item.status === 'cancelled';
                      
                      let barClasses = 'rounded-md mx-0';
                      if (!isStart && !isEnd) barClasses = 'rounded-none -mx-2 px-3 z-10 relative';
                      else if (isStart && !isEnd) barClasses = 'rounded-l-md rounded-r-none -mr-2 z-10 relative';
                      else if (!isStart && isEnd) barClasses = 'rounded-l-none rounded-r-md -ml-2 z-10 relative';

                      const showTitle = isStart || date.getDay() === 1;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'truncate px-2 py-1 text-[11px] font-medium',
                            barClasses,
                            isCancelled
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : getWorkGroupColor(item.owner_work_group, workGroupColorMap).eventClassName,
                          )}
                        >
                          {showTitle ? item.title : '\u00A0'}
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="divide-y divide-slate-100 sm:hidden">
            {currentMonthDays.map((date) => {
              const dateKey = toDateKey(date);
              const dayEvents = (eventsByDate[dateKey] || []).filter((item): item is StrategyEventRow => item !== null);
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectCalendarDate(dateKey)}
                  className={cn(
                    'flex w-full gap-3 px-3 py-3 text-left transition hover:bg-emerald-50/50',
                    isSelected && 'bg-emerald-50 ring-2 ring-inset ring-emerald-300',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border text-sm font-semibold',
                      isToday
                        ? 'border-slate-900 bg-slate-950 text-white shadow-md shadow-slate-500/20'
                        : 'border-slate-200 bg-white text-slate-800',
                    )}
                  >
                    <span className="text-[11px] leading-none">{weekdays[(date.getDay() + 6) % 7]}</span>
                    <span className="mt-1 text-base leading-none">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{formatThaiDate(dateKey)}</p>
                      <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        {dayEvents.length} รายการ
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {dayEvents.length === 0 ? (
                        <p className="text-xs text-slate-400">ยังไม่มีกิจกรรม</p>
                      ) : (
                        dayEvents.slice(0, 3).map((item) => {
                          const color = getWorkGroupColor(item.owner_work_group, workGroupColorMap);
                          return (
                            <div key={item.id} className="rounded-md border border-slate-100 bg-white px-2 py-2 shadow-sm">
                              <div className="flex items-start gap-2">
                                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', color.dotClassName)} />
                                <div className="min-w-0 flex-1">
                                  <p className={cn('break-words text-xs font-semibold text-slate-900', item.status === 'cancelled' && 'text-slate-400 line-through')}>
                                    {item.title}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                    <span>{formatTime(item)}</span>
                                    {item.location ? <span className="break-words">สถานที่: {item.location}</span> : null}
                                    {item.owner_work_group ? <span className="break-words">กลุ่มงาน: {item.owner_work_group}</span> : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {dayEvents.length > 3 ? <p className="text-xs font-semibold text-emerald-600">+{dayEvents.length - 3} รายการ</p> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div ref={selectedDateEventsRef} className="scroll-mt-6 border-t border-slate-100 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-950">กิจกรรมของวันที่เลือก</h2>
              <p className="text-sm text-slate-500">{formatThaiDate(selectedDate)} · {selectedEvents.length} รายการ</p>
            </div>
            <div className="mt-3 space-y-2">
              {selectedEvents.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  ยังไม่มีกิจกรรมในวันนี้
                </div>
              ) : (
                selectedEvents.map((item) => (
                  <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('inline-block h-2.5 w-2.5 rounded-full', getWorkGroupColor(item.owner_work_group, workGroupColorMap).dotClassName)}></span>
                          <h3 className={cn('text-sm font-semibold text-slate-950', item.status === 'cancelled' && 'text-slate-400 line-through')}>
                            {item.title}
                          </h3>
                          <span
                            className={cn(
                              'rounded-md px-2 py-1 text-[11px] font-semibold',
                              item.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                            )}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatTime(item)}
                          </span>
                          {item.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              {item.location}
                            </span>
                          ) : null}
                          {item.owner_work_group ? <span>กลุ่มงาน: {item.owner_work_group}</span> : null}
                        </div>
                        {item.description ? <p className="mt-2 text-sm leading-5 text-slate-600">{item.description}</p> : null}
                      </div>
                      {canManageEvent(item) ? (
                        <div className="flex shrink-0 gap-1">
                          {item.status !== 'cancelled' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCancel(item.id)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                ยกเลิก
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRestore(item.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                              กู้คืน
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">กิจกรรมเดือนนี้</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{loading ? '...' : publishedEvents.length}</p>
              </div>
              <div className="rounded-md bg-emerald-50 p-3 ring-1 ring-emerald-100">
                <p className="text-xs text-emerald-700">กำลังจะมาถึง</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-800">{loading ? '...' : upcomingCount}</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{editingEventId ? 'แก้ไขกิจกรรม' : 'แจ้งกิจกรรม'}</h2>
                {editingEventId ? <p className="mt-1 text-xs font-medium text-amber-700">กำลังแก้ไขรายการเดิม</p> : null}
              </div>
              {editingEventId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  ยกเลิกแก้ไข
                </button>
              ) : null}
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="ชื่อกิจกรรม"
              />
              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">วันที่เริ่มต้น (ตามที่คลิก)</span>
                  <div className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    {formatThaiDate(selectedDate)}
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">วันที่สิ้นสุด (ข้ามวัน)</span>
                  <div className="mt-1">
                    <ThaiDateSelect
                      value={form.endDate || selectedDate}
                      onChange={(val) => setForm((current) => ({ ...current, endDate: val }))}
                    />
                  </div>
                </label>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-600">สีของกลุ่มงาน</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                    {getWorkGroupName(profile?.work_group || profile?.department)}
                  </span>
                  <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold', getWorkGroupColor(profile?.work_group || profile?.department, workGroupColorMap).badgeClassName)}>
                    <span className={cn('h-2 w-2 rounded-full', getWorkGroupColor(profile?.work_group || profile?.department, workGroupColorMap).dotClassName)} />
                    อัตโนมัติ
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TimeSelect
                  label="เริ่ม เวลาไทย 24 ชม."
                  value={form.startTime}
                  onChange={(value) => setForm((current) => ({ ...current, startTime: value }))}
                />
                <TimeSelect
                  label="สิ้นสุด เวลาไทย 24 ชม."
                  value={form.endTime}
                  onChange={(value) => setForm((current) => ({ ...current, endTime: value }))}
                />
              </div>
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="สถานที่"
              />
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="รายละเอียดเพิ่มเติม"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {submitting ? 'กำลังบันทึก...' : editingEventId ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม'}
              </button>
            </form>
          </section>

        </aside>
      </div>

      <StrategyEventDetailModal event={selectedUpcomingEvent} onClose={() => setSelectedUpcomingEvent(null)} workGroupColorMap={workGroupColorMap} />
    </div>
  );
}
