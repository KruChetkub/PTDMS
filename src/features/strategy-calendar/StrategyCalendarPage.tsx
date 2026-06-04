import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock, Edit3, Filter, LayoutDashboard, List, MapPin, Plus, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
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
const hours24 = Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0'));
const minuteSteps = Array.from({ length: 12 }, (_, index) => `${index * 5}`.padStart(2, '0'));

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

const eventColorClasses: Record<string, string> = {
  slate: 'bg-slate-500 text-white',
  blue: 'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
  purple: 'bg-purple-500 text-white',
};

const eventColorLabels: Record<string, string> = {
  slate: 'ทั่วไป',
  blue: 'การประชุม',
  emerald: 'โครงการ/กิจกรรม',
  amber: 'ลงพื้นที่/เดินทาง',
  red: 'ด่วน/สำคัญ',
  purple: 'วันหยุด/อื่นๆ',
};

const eventColorDotClasses: Record<string, string> = {
  slate: 'bg-slate-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

const eventColorBgClasses: Record<string, string> = {
  slate: 'bg-slate-50 ring-slate-200',
  blue: 'bg-blue-50 ring-blue-200',
  emerald: 'bg-emerald-50 ring-emerald-200',
  amber: 'bg-amber-50 ring-amber-200',
  red: 'bg-red-50 ring-red-200',
  purple: 'bg-purple-50 ring-purple-200',
};

const eventColorTextClasses: Record<string, string> = {
  slate: 'text-slate-700',
  blue: 'text-blue-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  purple: 'text-purple-700',
};

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

function getEventColorClass(color: string | null | undefined) {
  return eventColorClasses[color || 'slate'] || eventColorClasses.slate;
}

const ITEMS_PER_PAGE = 5;

type TabType = 'dashboard' | 'list';
type ListFilter = 'month' | 'week';

export function StrategyCalendarPage() {
  const { profile } = useAuthStore();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState<StrategyEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [listFilter, setListFilter] = useState<ListFilter>('month');
  const [listPage, setListPage] = useState(0);
  const [form, setForm] = useState({
    title: '',
    description: '',
    endDate: '',
    startTime: '',
    endTime: '',
    color: 'slate',
    location: '',
  });

  const monthLabel = `${thaiMonths[monthDate.getMonth()]} ${monthDate.getFullYear() + 543}`;
  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);
  const todayKey = toDateKey(new Date());

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
  const visibleEvents = events;
  const upcomingCount = publishedEvents.filter((event) => event.event_date >= todayKey).length;
  const cancelledCount = events.filter((event) => event.status === 'cancelled').length;

  // Dashboard stats by color
  const statsByColor = useMemo(() => {
    const colorKeys = ['blue', 'emerald', 'amber', 'red', 'purple', 'slate'];
    return colorKeys.map(color => ({
      color,
      label: eventColorLabels[color] || color,
      count: publishedEvents.filter(e => (e.color || 'slate') === color).length,
    }));
  }, [publishedEvents]);

  // Weekly filter
  const filteredEvents = useMemo(() => {
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
    return visibleEvents;
  }, [visibleEvents, listFilter, selectedDate]);

  const totalFilteredPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const safeListPage = Math.min(listPage, totalFilteredPages - 1);
  const paginatedEvents = filteredEvents.slice(safeListPage * ITEMS_PER_PAGE, (safeListPage + 1) * ITEMS_PER_PAGE);

  const canManageEvent = (event: StrategyEventRow) =>
    event.created_by === profile?.user_id || profile?.role === 'super_admin' || profile?.role === 'admin';

  const resetForm = () => {
    setEditingEventId(null);
    setForm({ title: '', description: '', endDate: '', startTime: '', endTime: '', color: 'slate', location: '' });
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
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดปฏิทินกิจกรรมได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, [monthDate]);

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
        color: form.color,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : editingEventId ? 'แก้ไขกิจกรรมไม่สำเร็จ' : 'บันทึกกิจกรรมไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (eventId: string) => {
    setError(null);
    try {
      await cancelStrategyEvent(eventId);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ยกเลิกกิจกรรมไม่สำเร็จ');
    }
  };

  const handleRestore = async (eventId: string) => {
    setError(null);
    try {
      await restoreStrategyEvent(eventId);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'กู้คืนกิจกรรมไม่สำเร็จ');
    }
  };

  const moveMonth = (amount: number) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="ปฏิทินกิจกรรมกองยุทธศาสตร์และแผนงาน"
          description="แจ้งกิจกรรมภายในกองฯ และติดตามกำหนดการในมุมมองปฏิทินประเทศไทย"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectToday}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => void loadEvents()}
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

      <section className="mb-6 rounded-md border border-slate-200 bg-white shadow-sm">
        {/* Tabs: Dashboard / List */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
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
                <button
                  type="button"
                  onClick={() => { setListFilter('week'); setListPage(0); }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    listFilter === 'week'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  รายสัปดาห์
                </button>
                <button
                  type="button"
                  onClick={() => { setListFilter('month'); setListPage(0); }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    listFilter === 'month'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  รายเดือน
                </button>
              </div>
              <span className="text-xs text-slate-400">
                {filteredEvents.length} รายการ
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              ภาพรวมกิจกรรม {monthLabel}
            </p>
          )}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' ? (
          <div className="p-4 sm:p-6">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-white shadow">
                <p className="text-xs font-medium text-slate-300">กิจกรรมทั้งหมด</p>
                <p className="mt-2 text-3xl font-bold">{loading ? '...' : events.length}</p>
                <p className="mt-1 text-[11px] text-slate-400">รายการในเดือนนี้</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow">
                <p className="text-xs font-medium text-emerald-100">เผยแพร่แล้ว</p>
                <p className="mt-2 text-3xl font-bold">{loading ? '...' : publishedEvents.length}</p>
                <p className="mt-1 text-[11px] text-emerald-200">กิจกรรมที่ดำเนินการ</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow">
                <p className="text-xs font-medium text-blue-100">กำลังจะมาถึง</p>
                <p className="mt-2 text-3xl font-bold">{loading ? '...' : upcomingCount}</p>
                <p className="mt-1 text-[11px] text-blue-200">กิจกรรมที่ยังไม่ถึง</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-4 text-white shadow">
                <p className="text-xs font-medium text-red-100">ยกเลิก</p>
                <p className="mt-2 text-3xl font-bold">{loading ? '...' : cancelledCount}</p>
                <p className="mt-1 text-[11px] text-red-200">กิจกรรมที่ยกเลิก</p>
              </div>
            </div>

            {/* Breakdown by Category */}
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                สรุปตามประเภทกิจกรรม
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {statsByColor.map(stat => (
                  <div key={stat.color} className={cn('flex items-center gap-3 rounded-lg p-3 ring-1', eventColorBgClasses[stat.color] || 'bg-slate-50 ring-slate-200')}>
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white', eventColorDotClasses[stat.color] || 'bg-slate-500')}>
                      {stat.count}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold', eventColorTextClasses[stat.color] || 'text-slate-700')}>{stat.label}</p>
                      <p className="text-[11px] text-slate-400">รายการ</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Next 5 */}
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                กิจกรรมที่กำลังจะมาถึง
              </h3>
              <div className="mt-3 space-y-2">
                {publishedEvents.filter(e => e.event_date >= todayKey).slice(0, 5).length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                    ยังไม่มีกิจกรรมที่กำลังจะมาถึง
                  </p>
                ) : (
                  publishedEvents.filter(e => e.event_date >= todayKey).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 transition hover:shadow-sm">
                      <div className={cn('h-2 w-2 shrink-0 rounded-full', eventColorDotClasses[item.color || 'slate'] || 'bg-slate-500')}></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatThaiDate(item.event_date)}
                          {item.end_date && item.end_date !== item.event_date ? ` - ${formatThaiDate(item.end_date)}` : ''}
                          {' • '}{formatTime(item)}
                        </p>
                      </div>
                      <span className={cn('shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-white', eventColorDotClasses[item.color || 'slate'] || 'bg-slate-500')}>
                        {eventColorLabels[item.color || 'slate'] || 'ทั่วไป'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* List Tab */}
        {activeTab === 'list' ? (
          <>
            {filteredEvents.length === 0 ? (
              <div className="p-4">
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  {listFilter === 'week' ? 'ยังไม่มีกิจกรรมในสัปดาห์นี้' : 'ยังไม่มีกิจกรรมในเดือนนี้'}
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
                              <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', eventColorDotClasses[item.color || 'slate'] || 'bg-slate-500')}></span>
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
                            <span className={cn('inline-block h-2 w-2 rounded-full', eventColorDotClasses[item.color || 'slate'] || 'bg-slate-500')}></span>
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Thailand Calendar
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">{monthLabel}</h2>
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

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {weekdays.map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
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
                  onClick={() => setSelectedDate(dateKey)}
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
                              : getEventColorClass(item.color),
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
              <div>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">ประเภทกิจกรรม (สี)</span>
                  <select
                    value={form.color}
                    onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="slate">ทั่วไป (สีเทา)</option>
                    <option value="blue">การประชุม (สีฟ้า)</option>
                    <option value="emerald">โครงการ/กิจกรรม (สีเขียว)</option>
                    <option value="amber">ลงพื้นที่/เดินทาง (สีเหลือง)</option>
                    <option value="red">ด่วน/สำคัญ (สีแดง)</option>
                    <option value="purple">วันหยุด/อื่นๆ (สีม่วง)</option>
                  </select>
                </label>
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
                placeholder="สถานที่ / ช่องทางประชุม"
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

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">กิจกรรมของวันที่เลือก</h2>
            <div className="mt-3 space-y-2">
              {selectedEvents.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  ยังไม่มีกิจกรรมในวันนี้
                </div>
              ) : (
                selectedEvents.map((item) => (
                  <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={cn('text-sm font-semibold text-slate-950', item.status === 'cancelled' && 'text-slate-400 line-through')}>
                          {item.title}
                        </h3>
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
                      </div>
                      {canManageEvent(item) ? (
                        <div className="flex shrink-0 gap-1">
                          {item.status !== 'cancelled' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
                                aria-label="แก้ไขกิจกรรม"
                                title="แก้ไขกิจกรรม"
                              >
                                <Edit3 className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCancel(item.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                aria-label="ยกเลิกกิจกรรม"
                                title="ยกเลิกกิจกรรม"
                              >
                                <XCircle className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRestore(item.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label="กู้คืนกิจกรรม"
                              title="กู้คืนกิจกรรม"
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                    {item.status === 'cancelled' && item.cancelled_at ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        ยกเลิกเมื่อ {new Date(item.cancelled_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                      </p>
                    ) : null}
                    {item.description ? <p className="mt-2 text-sm leading-5 text-slate-600">{item.description}</p> : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
