import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Home,
  Library,
  LineChart,
  Plus,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  cancelMeetingRoomReservation,
  createMeetingRoomReservation,
  listAllMeetingRoomReservations,
  listMeetingRoomReservations,
  listUpcomingMeetingRoomLinkNotifications,
  notifyMeetingRoomReservationCreated,
  updateMeetingRoomReservation,
  type MeetingRoomReservationForm,
  type MeetingRoomReservationRow,
} from '../../services/meeting-room-reservation.service';
import { useAuthStore } from '../../stores/auth.store';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { createStrategyEvent } from '../../services/strategy-calendar.service';
import { cn } from '../../utils/cn';
import { getSafeUserErrorMessage, reportClientError } from '../../utils/errorHandling';

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

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const noMeetingRoomLabel = 'ไม่ใช้ห้องประชุม';
const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องสมุด', noMeetingRoomLabel];
const meetingTypes = ['การประชุมแบบ on site', 'การประชุม online', 'การประชุมแบบ on site และ online'];
const workGroups = [
  'กลุ่มพัฒนาและบริหารยุทธศาสตร์',
  'กลุ่มงบประมาณ',
  'กลุ่มแผนปฏิบัติราชการ',
  'กลุ่มยุทธศาสตร์และพัฒนาองค์กร',
  'กลุ่มติดตามและประเมินผล',
  'กลุ่มพัฒนาเครือข่ายและประสานงานพิเศษ',
  'กลุ่มบริหารทั่วไป',
];

const startSlots = buildTimeSlots('08:00', '17:00');
const endSlots = buildTimeSlots('08:30', '17:30');

type DashboardFilterMode = 'all' | 'month' | 'year';
type DashboardUsageSelection = { type: 'room' | 'workGroup'; value: string } | null;

const emptyForm = (date: string, profileName?: string | null, workGroup?: string | null): MeetingRoomReservationForm => ({
  topic: '',
  room: '',
  meetingType: meetingTypes[0],
  onlineMeetingUrl: '',
  details: '',
  reservationDate: date,
  startTime: '',
  endTime: '',
  bookerName: profileName || '',
  workGroup: workGroup || '',
});

function buildTimeSlots(start: string, end: string) {
  const slots: string[] = [];
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  for (let value = startMinutes; value <= endMinutes; value += 30) {
    slots.push(minutesToTime(value));
  }

  return slots;
}

function timeToMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.slice(0, 5).split(':');
  return Number(hour) * 60 + Number(minute);
}

function minutesToTime(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${hour}`.padStart(2, '0') + ':' + `${minute}`.padStart(2, '0');
}

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
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatThaiDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function roomStyle(room: string) {
  if (room === 'ห้องประชุม 1') {
    return {
      chip: 'bg-blue-200 text-blue-950 ring-1 ring-blue-300',
      stripe: 'bg-blue-700',
      icon: <Home className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (room === 'ห้องประชุม 2') {
    return {
      chip: 'bg-cyan-200 text-cyan-950 ring-1 ring-cyan-300',
      stripe: 'bg-cyan-700',
      icon: <UsersRound className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (room === noMeetingRoomLabel) {
    return {
      chip: 'bg-amber-200 text-amber-950 ring-1 ring-amber-300',
      stripe: 'bg-amber-700',
      icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
    };
  }

  return {
    chip: 'bg-indigo-200 text-indigo-950 ring-1 ring-indigo-300',
    stripe: 'bg-indigo-700',
    icon: <Library className="h-4 w-4" aria-hidden="true" />,
  };
}

function reservationsOverlap(
  first: Pick<MeetingRoomReservationForm, 'startTime' | 'endTime'>,
  second: Pick<MeetingRoomReservationRow, 'start_time' | 'end_time'>,
) {
  return timeToMinutes(first.startTime) < timeToMinutes(second.end_time) && timeToMinutes(first.endTime) > timeToMinutes(second.start_time);
}

function reservationDurationHours(reservation: Pick<MeetingRoomReservationRow, 'start_time' | 'end_time'>) {
  return Math.max(0, timeToMinutes(reservation.end_time) - timeToMinutes(reservation.start_time)) / 60;
}

function groupCount<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

export function MeetingRoomBookingPage() {
  useAuditPageAccess({ module: 'meeting_room', action: 'meeting_room_page_access', route: '/strategy-calendar/meeting-room-booking' });
  const { profile } = useAuthStore();
  const todayKey = toDateKey(new Date());
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [reservations, setReservations] = useState<MeetingRoomReservationRow[]>([]);
  const [dashboardReservations, setDashboardReservations] = useState<MeetingRoomReservationRow[]>([]);
  const [linkNotifications, setLinkNotifications] = useState<MeetingRoomReservationRow[]>([]);
  const [form, setForm] = useState(() => emptyForm(todayKey, profile?.full_name, profile?.work_group));
  const [shouldCreateCalendarEvent, setShouldCreateCalendarEvent] = useState(false);
  const [calendarEventLocation, setCalendarEventLocation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState<MeetingRoomReservationRow[]>([]);
  const [pendingCancel, setPendingCancel] = useState<MeetingRoomReservationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardFilterMode, setDashboardFilterMode] = useState<DashboardFilterMode>('all');
  const [dashboardMonth, setDashboardMonth] = useState(() => new Date().getMonth() + 1);
  const [dashboardYear, setDashboardYear] = useState(() => new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dashboardUsageSelection, setDashboardUsageSelection] = useState<DashboardUsageSelection>(null);
  const [highlightedReservationId, setHighlightedReservationId] = useState<string | null>(null);
  const [isLinkNotificationPanelOpen, setIsLinkNotificationPanelOpen] = useState(false);

  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);
  const currentMonthDays = useMemo(() => calendarDays.filter((date) => date.getMonth() === monthDate.getMonth()), [calendarDays, monthDate]);
  const monthLabel = `${thaiMonths[monthDate.getMonth()]} ${monthDate.getFullYear() + 543}`;
  const canManageAll = profile?.role === 'super_admin' || profile?.role === 'admin';
  const canViewDashboard = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'executive';
  const canShowLinkNotifications = Boolean(profile?.user_id);
  const canEditOnlineMeetingUrl = canManageAll;

  const reservationsByDate = useMemo(() => {
    return reservations.reduce<Record<string, MeetingRoomReservationRow[]>>((acc, reservation) => {
      const list = acc[reservation.reservation_date] || [];
      list.push(reservation);
      acc[reservation.reservation_date] = list.sort((a, b) => a.start_time.localeCompare(b.start_time));
      return acc;
    }, {});
  }, [reservations]);

  const selectedReservations = reservationsByDate[selectedDate] || [];
  const dashboardSource = canViewDashboard ? dashboardReservations : [];
  const dashboardYearOptions = useMemo(() => {
    const years = dashboardReservations.map((reservation) => parseDateKey(reservation.reservation_date).getFullYear());
    const currentYear = new Date().getFullYear();
    return Array.from(new Set([...years, currentYear])).sort((a, b) => b - a);
  }, [dashboardReservations]);
  const filteredDashboardSource = useMemo(() => {
    if (dashboardFilterMode === 'month') {
      return dashboardSource.filter((reservation) => {
        const date = parseDateKey(reservation.reservation_date);
        return date.getFullYear() === dashboardYear && date.getMonth() + 1 === dashboardMonth;
      });
    }

    if (dashboardFilterMode === 'year') {
      return dashboardSource.filter((reservation) => parseDateKey(reservation.reservation_date).getFullYear() === dashboardYear);
    }

    return dashboardSource;
  }, [dashboardFilterMode, dashboardMonth, dashboardSource, dashboardYear]);
  const dashboardFilterLabel =
    dashboardFilterMode === 'month'
      ? `${thaiMonths[dashboardMonth - 1]} ${dashboardYear + 543}`
      : dashboardFilterMode === 'year'
        ? `ปี ${dashboardYear + 543}`
        : 'ข้อมูลทั้งหมด';
  const roomCounts = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        count: reservations.filter((reservation) => reservation.room === room).length,
      })),
    [reservations],
  );

  const dashboardAnalytics = useMemo(() => {
    const total = filteredDashboardSource.length;
    const totalHours = filteredDashboardSource.reduce((sum, reservation) => sum + reservationDurationHours(reservation), 0);
    const roomUsage = rooms
      .map((room) => {
        const roomReservations = filteredDashboardSource.filter((reservation) => reservation.room === room);
        return {
          room,
          count: roomReservations.length,
          hours: roomReservations.reduce((sum, reservation) => sum + reservationDurationHours(reservation), 0),
        };
      })
      .sort((a, b) => b.count - a.count);

    const workGroupUsage = Object.entries(groupCount(filteredDashboardSource.map((reservation) => reservation.work_group)))
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    let overlapCount = 0;
    const byDateRoom = filteredDashboardSource.reduce<Record<string, MeetingRoomReservationRow[]>>((acc, reservation) => {
      const key = `${reservation.reservation_date}|${reservation.room}`;
      acc[key] = [...(acc[key] || []), reservation];
      return acc;
    }, {});

    Object.values(byDateRoom).forEach((items) => {
      const sorted = [...items].sort((a, b) => a.start_time.localeCompare(b.start_time));
      sorted.forEach((first, firstIndex) => {
        sorted.slice(firstIndex + 1).forEach((second) => {
          if (timeToMinutes(first.start_time) < timeToMinutes(second.end_time) && timeToMinutes(first.end_time) > timeToMinutes(second.start_time)) {
            overlapCount += 1;
          }
        });
      });
    });

    return {
      total,
      totalHours,
      topRoom: roomUsage[0],
      roomUsage,
      workGroupUsage: workGroupUsage.slice(0, 6),
      overlapCount,
    };
  }, [filteredDashboardSource]);

  const selectedDashboardReservations = useMemo(() => {
    if (!dashboardUsageSelection) {
      return [];
    }

    const selectedItems = filteredDashboardSource.filter((reservation) =>
      dashboardUsageSelection.type === 'room'
        ? reservation.room === dashboardUsageSelection.value
        : reservation.work_group === dashboardUsageSelection.value,
    );

    return [...selectedItems].sort((a, b) => {
      const dateCompare = a.reservation_date.localeCompare(b.reservation_date);
      return dateCompare || a.start_time.localeCompare(b.start_time);
    });
  }, [dashboardUsageSelection, filteredDashboardSource]);

  const selectedDashboardTitle = dashboardUsageSelection
    ? dashboardUsageSelection.type === 'room'
      ? 'รายการใช้งาน' + dashboardUsageSelection.value
      : 'รายการใช้งานของ' + dashboardUsageSelection.value
    : '';

  const filteredEndSlots = useMemo(() => {
    if (!form.startTime) {
      return endSlots;
    }

    const startMinutes = timeToMinutes(form.startTime);
    return endSlots.filter((slot) => timeToMinutes(slot) > startMinutes);
  }, [form.startTime]);

  const loadReservations = async () => {
    const firstDate = toDateKey(calendarDays[0]);
    const lastDate = toDateKey(calendarDays[calendarDays.length - 1]);

    try {
      setLoading(true);
      setMessage(null);
      const data = await listMeetingRoomReservations(firstDate, lastDate);
      setReservations(data);
    } catch (error) {
      setMessage({ type: 'error', text: getSafeUserErrorMessage(error, 'ไม่สามารถโหลดข้อมูลการจองได้') });
    } finally {
      setLoading(false);
    }
  };

  const loadLinkNotifications = async () => {
    if (!profile?.user_id || !canShowLinkNotifications) {
      setLinkNotifications([]);
      return;
    }

    try {
      const data = await listUpcomingMeetingRoomLinkNotifications(todayKey, {
        userId: profile.user_id,
        includeAll: canManageAll,
      });
      setLinkNotifications(data);
    } catch (error) {
      void reportClientError('Failed to load meeting room link notifications:', error);
      setLinkNotifications([]);
    }
  };

  const loadDashboardReservations = async () => {
    if (!canViewDashboard) {
      return;
    }

    try {
      setDashboardLoading(true);
      const data = await listAllMeetingRoomReservations();
      setDashboardReservations(data);
    } catch (error) {
      setMessage({ type: 'error', text: getSafeUserErrorMessage(error, 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้') });
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, [calendarDays]);

  useEffect(() => {
    void loadDashboardReservations();
  }, [canViewDashboard]);

  useEffect(() => {
    void loadLinkNotifications();
  }, [canManageAll, canShowLinkNotifications, profile?.user_id, todayKey]);

  const scrollToReservationList = () => {
    window.setTimeout(() => {
      document.getElementById('meeting-room-reservation-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const selectDate = (dateKey: string, shouldScroll = false) => {
    setSelectedDate(dateKey);
    setForm((current) => ({ ...current, reservationDate: dateKey }));

    if (shouldScroll) {
      scrollToReservationList();
    }
  };

  const moveMonth = (amount: number) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    selectDate(toDateKey(today));
  };

  const resetForm = () => {
    setEditingId(null);
    setPendingDuplicate([]);
    setShouldCreateCalendarEvent(false);
    setCalendarEventLocation('');
    setForm(emptyForm(selectedDate, profile?.full_name, profile?.work_group));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setPendingDuplicate([]);
    setShouldCreateCalendarEvent(false);
    setCalendarEventLocation('');
    setForm(emptyForm(selectedDate, profile?.full_name, profile?.work_group));
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    resetForm();
  };

  const canManageReservation = (reservation: MeetingRoomReservationRow) => {
    return canManageAll || reservation.created_by === profile?.user_id;
  };

  const findDuplicates = (input: MeetingRoomReservationForm) => {
    return reservations.filter(
      (reservation) =>
        reservation.id !== editingId &&
        reservation.reservation_date === input.reservationDate &&
        reservation.room !== noMeetingRoomLabel &&
        input.room !== noMeetingRoomLabel &&
        reservation.room === input.room &&
        reservationsOverlap(input, reservation),
    );
  };

  const saveReservation = async (input: MeetingRoomReservationForm) => {
    setSubmitting(true);
    setMessage(null);

    try {
      let successText = editingId ? 'แก้ไขการจองเรียบร้อยแล้ว' : 'บันทึกการจองเรียบร้อยแล้ว';

      if (editingId) {
        await updateMeetingRoomReservation(editingId, input);
      } else {
        const savedReservation = await createMeetingRoomReservation(input);

        if (shouldCreateCalendarEvent) {
          try {
            await createStrategyEvent({
              title: input.topic,
              description: [
                input.details.trim(),
                `สร้างจากการจองห้องประชุม โดย ${input.bookerName.trim()}`,
                input.meetingType,
                input.onlineMeetingUrl.trim() ? `ลิงก์ประชุมออนไลน์: ${input.onlineMeetingUrl.trim()}` : '',
              ]
                .filter(Boolean)
                .join('\n'),
              eventDate: input.reservationDate,
              endDate: input.reservationDate,
              startTime: input.startTime,
              endTime: input.endTime,
              color: 'blue',
              location: calendarEventLocation.trim() || input.room,
              ownerWorkGroup: input.workGroup,
            });
            successText = 'บันทึกการจองและเพิ่มกิจกรรมในปฏิทินเรียบร้อยแล้ว';
          } catch (calendarEventError) {
            void reportClientError('Failed to create strategy calendar event:', calendarEventError);
            successText = 'บันทึกการจองเรียบร้อยแล้ว แต่เพิ่มกิจกรรมในปฏิทินไม่สำเร็จ';
          }
        }

        try {
          const notificationResult = await notifyMeetingRoomReservationCreated(savedReservation.id);

          if (!notificationResult.sent && !notificationResult.skipped) {
            successText = `${successText} แต่ยังส่ง Telegram ไม่สำเร็จ`;
          }
        } catch (notificationError) {
          void reportClientError('Failed to notify meeting room Telegram:', notificationError);
          successText = `${successText} แต่ยังส่ง Telegram ไม่สำเร็จ`;
        }
      }

      setMessage({ type: 'success', text: successText });
      resetForm();
      setIsBookingModalOpen(false);
      await loadReservations();
      await loadDashboardReservations();
      await loadLinkNotifications();
    } catch (error) {
      setMessage({ type: 'error', text: getSafeUserErrorMessage(error, 'บันทึกการจองไม่สำเร็จ') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.topic.trim() || !form.room || !form.meetingType || !form.reservationDate || !form.startTime || !form.endTime || !form.bookerName.trim() || !form.workGroup.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลการจองให้ครบถ้วน' });
      return;
    }

    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
      setMessage({ type: 'error', text: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มจอง' });
      return;
    }

    const duplicates = findDuplicates(form);
    if (duplicates.length > 0) {
      setPendingDuplicate(duplicates);
      return;
    }

    void saveReservation(form);
  };

  const openReservationFromNotification = (reservation: MeetingRoomReservationRow) => {
    const reservationDate = parseDateKey(reservation.reservation_date);
    setMonthDate(new Date(reservationDate.getFullYear(), reservationDate.getMonth(), 1));
    setSelectedDate(reservation.reservation_date);
    setHighlightedReservationId(reservation.id);
    setIsLinkNotificationPanelOpen(false);

    window.setTimeout(() => {
      document.getElementById(`meeting-room-reservation-${reservation.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const startEdit = (reservation: MeetingRoomReservationRow) => {
    setShouldCreateCalendarEvent(false);
    setCalendarEventLocation('');
    setEditingId(reservation.id);
    setSelectedDate(reservation.reservation_date);
    setForm({
      topic: reservation.topic,
      room: reservation.room,
      meetingType: reservation.meeting_type || meetingTypes[0],
      onlineMeetingUrl: reservation.online_meeting_url || '',
      details: reservation.details || '',
      reservationDate: reservation.reservation_date,
      startTime: formatTime(reservation.start_time),
      endTime: formatTime(reservation.end_time),
      bookerName: reservation.booker_name,
      workGroup: reservation.work_group,
    });
    setIsBookingModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!pendingCancel) {
      return;
    }

    setSubmitting(true);
    try {
      await cancelMeetingRoomReservation(pendingCancel.id);
      setPendingCancel(null);
      setMessage({ type: 'success', text: 'ยกเลิกการจองเรียบร้อยแล้ว' });
      await loadReservations();
      await loadDashboardReservations();
      await loadLinkNotifications();
    } catch (error) {
      setMessage({ type: 'error', text: getSafeUserErrorMessage(error, 'ยกเลิกการจองไม่สำเร็จ') });
    } finally {
      setSubmitting(false);
    }
  };

  const bookingForm = (
    <form className="space-y-3 p-4" onSubmit={handleSubmit}>
      {!editingId ? (
        <label className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2">
          <input
            type="checkbox"
            checked={shouldCreateCalendarEvent}
            onChange={(event) => setShouldCreateCalendarEvent(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-700 focus:ring-blue-400"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-blue-800">เพิ่มกิจกรรมในปฏิทินกองยุทธศาสตร์และแผนงาน</span>
            <span className="mt-0.5 block text-xs text-slate-500">เมื่อบันทึกการจองแล้ว ระบบจะสร้างกิจกรรมตามวันและเวลานี้</span>
          </span>
        </label>
      ) : null}

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">หัวข้อการประชุม</span>
        <input
          value={form.topic}
          onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
          className="mt-1 w-full rounded-md border border-blue-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="ระบุหัวข้อการประชุม"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">สถานที่</span>
        <input
          value={calendarEventLocation}
          onChange={(event) => setCalendarEventLocation(event.target.value)}
          className="mt-1 w-full rounded-md border border-blue-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="เช่น ห้องประชุม 1 หรือสถานที่จัดกิจกรรม"
        />
      </label>


      <label className="block">
        <span className="text-xs font-semibold text-blue-700">เลือกห้องประชุม</span>
        <select
          value={form.room}
          onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
          className="mt-1 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">กรุณาเลือกห้อง / ไม่ใช้ห้องประชุม</option>
          {rooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">รูปแบบการประชุม</span>
        <select
          value={form.meetingType}
          onChange={(event) => setForm((current) => ({ ...current, meetingType: event.target.value }))}
          className="mt-1 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {meetingTypes.map((meetingType) => (
            <option key={meetingType} value={meetingType}>
              {meetingType}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">ลิงก์ประชุมออนไลน์</span>
        <input
          type="url"
          value={form.onlineMeetingUrl}
          onChange={(event) => setForm((current) => ({ ...current, onlineMeetingUrl: event.target.value }))}
          disabled={!canEditOnlineMeetingUrl}
          className={cn(
            'mt-1 w-full rounded-md border border-blue-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
            !canEditOnlineMeetingUrl && 'bg-slate-50 text-slate-500',
          )}
          placeholder={canEditOnlineMeetingUrl ? 'https://...' : 'รอ Admin สร้างลิงก์ประชุมออนไลน์'}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">รายละเอียดเพิ่มเติม</span>
        <textarea
          value={form.details}
          onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
          className="mt-1 min-h-24 w-full resize-y rounded-md border border-blue-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="ระบุรายละเอียดเพิ่มเติม"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">วันที่ต้องการจอง</span>
        <input
          type="date"
          value={form.reservationDate}
          min={todayKey}
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setForm((current) => ({ ...current, reservationDate: event.target.value }));
          }}
          className="mt-1 w-full rounded-md border border-blue-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-blue-700">เวลาเริ่มจอง</span>
          <select
            value={form.startTime}
            onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value, endTime: '' }))}
            className="mt-1 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">เลือกเวลา</option>
            {startSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot} น.
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-blue-700">เวลาสิ้นสุด</span>
          <select
            value={form.endTime}
            disabled={!form.startTime}
            onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
            className="mt-1 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">เลือกเวลา</option>
            {filteredEndSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot} น.
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">ชื่อผู้จอง</span>
        <input
          value={form.bookerName}
          onChange={(event) => setForm((current) => ({ ...current, bookerName: event.target.value }))}
          className="mt-1 w-full rounded-md border border-blue-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="ชื่อ-นามสกุล"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-blue-700">กลุ่ม</span>
        <select
          value={form.workGroup}
          onChange={(event) => setForm((current) => ({ ...current, workGroup: event.target.value }))}
          className="mt-1 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">กรุณาเลือกกลุ่ม</option>
          {workGroups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        {editingId ? (
          <button
            type="button"
            onClick={closeBookingModal}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            ยกเลิกแก้ไข
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-700 to-cyan-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'ยืนยันการจอง'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="hidden min-w-0 items-start gap-3 sm:flex">
          <PageHeader title="ห้องประชุม กองยุทธศาสตร์และแผนงาน"/>
          {canShowLinkNotifications ? (
            <div className="relative pt-1">
              <button
                type="button"
                onClick={() => setIsLinkNotificationPanelOpen((current) => !current)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-sm transition hover:bg-sky-50"
                aria-label="แจ้งเตือนลิงก์ประชุมออนไลน์"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                {linkNotifications.length > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {linkNotifications.length}
                  </span>
                ) : null}
              </button>

              {isLinkNotificationPanelOpen ? (
                <div className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-sky-100 bg-white shadow-xl shadow-slate-900/15">
                  <div className="border-b border-sky-100 px-4 py-3">
                    <h2 className="text-sm font-semibold text-slate-950">แจ้งเตือนลิงก์ประชุมออนไลน์</h2>
                    <p className="mt-0.5 text-xs text-slate-500">รายการจองที่มีลิงก์แล้วและยังไม่ถึงกำหนดประชุม</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {linkNotifications.length > 0 ? (
                      linkNotifications.map((reservation) => (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={() => openReservationFromNotification(reservation)}
                          className="flex w-full items-start gap-3 border-b border-sky-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-sky-50"
                        >
                          <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-950">ได้สร้างลิงก์ประชุมเรียบร้อยแล้ว</p>
                            <p className="mt-1 truncate text-xs text-slate-600">{reservation.topic}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatThaiDate(reservation.reservation_date)} · {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)} น.
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">ยังไม่มีแจ้งเตือนลิงก์ประชุมออนไลน์</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="hidden">
          <h1 className="text-xl font-semibold text-slate-950">ระบบจองห้องประชุม</h1>
          <p className="mt-1 text-sm text-slate-500">กองยุทธศาสตร์และแผนงาน</p>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          <button
            type="button"
            onClick={selectToday}
            className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => void loadReservations()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>
{message ? (
        <div
          className={cn(
            'mb-4 rounded-md border px-4 py-3 text-sm',
            message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {message.text}
        </div>
      ) : null}

      {canViewDashboard ? (
        <section className="mb-5 rounded-md border border-blue-100 bg-white shadow-lg shadow-blue-900/5">
          <div className="flex flex-col gap-4 border-b border-blue-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">ภาพรวมการใช้ห้องประชุม</h2>
              <p className="mt-1 text-xs text-slate-500">{dashboardLoading ? 'กำลังโหลดข้อมูลแดชบอร์ด...' : dashboardFilterLabel}</p>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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
                      dashboardFilterMode === mode ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-800',
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
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {dashboardYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year + 543}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs text-emerald-700">การจองทั้งหมด</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">{dashboardLoading ? '...' : dashboardAnalytics.total}</p>
            </div>
            <div className="rounded-md bg-blue-50 p-4 ring-1 ring-blue-100">
              <p className="text-xs text-blue-700">ชั่วโมงใช้งานรวม</p>
              <p className="mt-2 text-3xl font-semibold text-blue-900">{dashboardLoading ? '...' : dashboardAnalytics.totalHours.toFixed(1)}</p>
            </div>
            <div className="rounded-md bg-cyan-50 p-4 ring-1 ring-cyan-100">
              <p className="text-xs text-cyan-700">ห้องที่ถูกใช้มากที่สุด</p>
              <p className="mt-2 truncate text-2xl font-semibold text-cyan-900">{dashboardLoading ? '...' : dashboardAnalytics.topRoom?.room || '-'}</p>
              <p className="mt-1 text-xs text-cyan-700">{dashboardAnalytics.topRoom ? `${dashboardAnalytics.topRoom.count} รายการ` : ''}</p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-blue-50 p-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-md border border-blue-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">การใช้งานแยกตามห้อง</h3>
                <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-3">
                {dashboardAnalytics.roomUsage.map((item) => {
                  const percent = dashboardAnalytics.total > 0 ? (item.count / dashboardAnalytics.total) * 100 : 0;
                  const style = roomStyle(item.room);
                  const isSelected = dashboardUsageSelection?.type === 'room' && dashboardUsageSelection.value === item.room;
                  return (
                    <button
                      key={item.room}
                      type="button"
                      disabled={item.count === 0}
                      onClick={() =>
                        setDashboardUsageSelection((current) =>
                          current?.type === 'room' && current.value === item.room ? null : { type: 'room', value: item.room },
                        )
                      }
                      className={cn(
                        'w-full rounded-md border p-2 text-left transition',
                        isSelected ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-transparent hover:border-blue-100 hover:bg-slate-50',
                        item.count === 0 && 'cursor-not-allowed opacity-60 hover:border-transparent hover:bg-transparent',
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{item.room}</span>
                        <span className="text-slate-500">
                          {item.count} รายการ · {item.hours.toFixed(1)} ชม.
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full', style.stripe)} style={{ width: `${Math.max(percent, item.count > 0 ? 5 : 0)}%` }}></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-blue-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">กลุ่มงานที่ใช้ห้องมากที่สุด</h3>
              <div className="mt-4 space-y-3">
                {dashboardAnalytics.workGroupUsage.map((item) => {
                  const percent = dashboardAnalytics.total > 0 ? (item.count / dashboardAnalytics.total) * 100 : 0;
                  const isSelected = dashboardUsageSelection?.type === 'workGroup' && dashboardUsageSelection.value === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() =>
                        setDashboardUsageSelection((current) =>
                          current?.type === 'workGroup' && current.value === item.name ? null : { type: 'workGroup', value: item.name },
                        )
                      }
                      className={cn(
                        'w-full rounded-md border p-2 text-left transition',
                        isSelected ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-100' : 'border-transparent hover:border-cyan-100 hover:bg-slate-50',
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-semibold text-slate-700">{item.name}</span>
                        <span className="shrink-0 text-slate-500">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-500" style={{ width: `${Math.max(percent, 5)}%` }}></div>
                      </div>
                    </button>
                  );
                })}
                {dashboardAnalytics.workGroupUsage.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีข้อมูล</p> : null}
              </div>
            </div>
          </div>

          {dashboardUsageSelection ? (
            <div className="border-t border-blue-50 p-4">
              <div className="rounded-md border border-blue-100 bg-blue-50/40">
                <div className="flex flex-col gap-2 border-b border-blue-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">{selectedDashboardTitle}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {dashboardFilterLabel} · {selectedDashboardReservations.length} รายการ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashboardUsageSelection(null)}
                    className="inline-flex w-full items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 sm:w-fit"
                  >
                    ล้างการเลือก
                  </button>
                </div>

                <div className="divide-y divide-blue-100 bg-white">
                  {selectedDashboardReservations.map((reservation) => {
                    const style = roomStyle(reservation.room);
                    return (
                      <article key={reservation.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-start">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{formatThaiDate(reservation.reservation_date)}</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)} น.
                          </p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold', style.chip)}>
                              {style.icon}
                              {reservation.room}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{reservation.work_group}</span>
                          </div>
                          <h4 className="mt-2 break-words text-sm font-semibold text-slate-950">{reservation.topic}</h4>
                          <p className="mt-1 text-xs text-slate-500">ผู้จอง: {reservation.booker_name}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="space-y-5">
        <section className="overflow-hidden rounded-md border border-blue-100 bg-white shadow-lg shadow-blue-900/5">
          <div className="flex flex-col gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-500 p-3 text-white sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Meeting Room Calendar
              </div>
              <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{monthLabel}</h2>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-md shadow-blue-950/10 transition hover:bg-blue-50 sm:ml-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              จองห้องประชุม
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/30 bg-white/10 transition hover:bg-white/20"
                aria-label="เดือนก่อนหน้า"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/30 bg-white/10 transition hover:bg-white/20"
                aria-label="เดือนถัดไป"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="hidden grid-cols-7 border-b border-blue-100 bg-blue-50 sm:grid">
            {weekdays.map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-blue-600">
                {day}
              </div>
            ))}
          </div>

          <div className="hidden grid-cols-7 sm:grid">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const dayReservations = reservationsByDate[dateKey] || [];
              const isCurrentMonth = date.getMonth() === monthDate.getMonth();
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(dateKey, dayReservations.length > 0)}
                  className={cn(
                    'min-h-28 border-b border-r border-blue-50 p-2 text-left transition hover:bg-blue-50',
                    !isCurrentMonth && 'bg-slate-50/70 text-slate-400',
                    isSelected && 'bg-blue-50 ring-2 ring-inset ring-blue-400',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                      isToday ? 'bg-gradient-to-r from-blue-700 to-cyan-500 text-white shadow-md shadow-blue-500/25' : 'text-blue-900',
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayReservations.slice(0, 4).map((reservation) => (
                      <div
                        key={reservation.id}
                        className={cn('truncate rounded px-2 py-1 text-[11px] font-semibold', roomStyle(reservation.room).chip)}
                        title={`${reservation.room} ${formatTime(reservation.start_time)}-${formatTime(reservation.end_time)} | ${reservation.topic} | ${reservation.booker_name}`}
                      >
                        {formatTime(reservation.start_time)}-{formatTime(reservation.end_time)} {reservation.topic || reservation.room}
                      </div>
                    ))}
                    {dayReservations.length > 4 ? <div className="px-1 text-[11px] font-semibold text-blue-500">+{dayReservations.length - 4} รายการ</div> : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="divide-y divide-blue-50 sm:hidden">
            {currentMonthDays.map((date) => {
              const dateKey = toDateKey(date);
              const dayReservations = reservationsByDate[dateKey] || [];
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(dateKey, dayReservations.length > 0)}
                  className={cn(
                    'flex w-full gap-3 px-3 py-3 text-left transition hover:bg-blue-50',
                    isSelected && 'bg-blue-50 ring-2 ring-inset ring-blue-300',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border text-sm font-semibold',
                      isToday
                        ? 'border-blue-600 bg-gradient-to-r from-blue-700 to-cyan-500 text-white shadow-md shadow-blue-500/20'
                        : 'border-blue-100 bg-white text-blue-900',
                    )}
                  >
                    <span className="text-[11px] leading-none">{weekdays[date.getDay()]}</span>
                    <span className="mt-1 text-base leading-none">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{formatThaiDate(dateKey)}</p>
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        {dayReservations.length} รายการ
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {dayReservations.length === 0 ? (
                        <p className="text-xs text-slate-400">ไม่มีการจอง</p>
                      ) : (
                        dayReservations.slice(0, 3).map((reservation) => (
                          <div key={reservation.id} className={cn('truncate rounded px-2 py-1 text-xs font-semibold', roomStyle(reservation.room).chip)}>
                            {formatTime(reservation.start_time)}-{formatTime(reservation.end_time)} {reservation.topic}
                          </div>
                        ))
                      )}
                      {dayReservations.length > 3 ? <p className="text-xs font-semibold text-blue-500">+{dayReservations.length - 3} รายการ</p> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 border-t border-blue-100 px-4 py-3">
            {roomCounts.map((item) => {
              const style = roomStyle(item.room);
              return (
                <div key={item.room} className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className={cn('h-2.5 w-2.5 rounded-full', style.stripe)}></span>
                  {item.room} · {loading ? '...' : item.count}
                </div>
              );
            })}
          </div>
        </section>

        <section id="meeting-room-reservation-list" className="scroll-mt-4 rounded-md border border-blue-100 bg-white shadow-lg shadow-blue-900/5">
            <div className="border-b border-blue-100 px-4 py-3">
              <h2 className="text-base font-semibold text-blue-900">รายการจอง</h2>
              <p className="mt-1 text-xs text-slate-500">{formatThaiDate(selectedDate)} · {selectedReservations.length} รายการ</p>
            </div>
            <div className="space-y-2 p-4">
              {selectedReservations.length === 0 ? (
                <div className="rounded-md border border-dashed border-blue-200 bg-blue-50/50 px-3 py-8 text-center text-sm text-slate-500">
                  ไม่มีการจองในวันนี้
                </div>
              ) : (
                selectedReservations.map((reservation) => {
                  const style = roomStyle(reservation.room);
                  return (
                    <article id={`meeting-room-reservation-${reservation.id}`} key={reservation.id} className={cn('flex gap-3 rounded-md border bg-slate-50 p-3 transition', highlightedReservationId === reservation.id ? 'border-sky-300 ring-2 ring-sky-100' : 'border-blue-50')}>
                      <div className={cn('w-1 shrink-0 rounded-full', style.stripe)}></div>
                      <div className="min-w-0 flex-1">
                        <div className={cn('inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold', style.chip)}>
                          {style.icon}
                          {reservation.room}
                        </div>
                        <h3 className="mt-2 break-words text-sm font-semibold text-slate-950 sm:truncate">{reservation.topic}</h3>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)} น.
                          </span>
                          <span>{reservation.booker_name}</span>
                          <span>{reservation.work_group}</span>
                          <span>{reservation.meeting_type}</span>
                        </div>
                        {reservation.online_meeting_url ? (
                          <a
                            href={reservation.online_meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex break-all text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            {reservation.online_meeting_url}
                          </a>
                        ) : null}
                        {reservation.details ? <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{reservation.details}</p> : null}
                      </div>
                      {canManageReservation(reservation) ? (
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(reservation)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 bg-white text-blue-600 transition hover:bg-blue-50"
                            aria-label="แก้ไขการจอง"
                          >
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingCancel(reservation)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
                            aria-label="ยกเลิกการจอง"
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
        </section>
      </div>

      {isBookingModalOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-room-booking-title"
          onClick={closeBookingModal}
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-md bg-white shadow-2xl shadow-slate-950/20"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-blue-100 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-blue-700 to-cyan-500 text-white">
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="meeting-room-booking-title" className="truncate text-base font-semibold text-blue-900">
                    {editingId ? 'แก้ไขการจอง' : 'จองห้องประชุม'}
                  </h2>
                  {editingId ? <p className="text-xs font-medium text-amber-700">กำลังแก้ไขรายการเดิม</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={closeBookingModal}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="ปิดหน้าต่างจองห้องประชุม"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {bookingForm}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={pendingDuplicate.length > 0}
        onClose={() => setPendingDuplicate([])}
        onConfirm={() => {
          setPendingDuplicate([]);
          void saveReservation(form);
        }}
        title="ช่วงเวลานี้มีการจองแล้ว"
        message={
          <div className="space-y-2 text-left">
            <p className="text-center text-slate-600">
              {form.room} · {formatThaiDate(form.reservationDate)} · {form.startTime} - {form.endTime} น.
            </p>
            {pendingDuplicate.map((reservation) => (
              <div key={reservation.id} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)} น. · {reservation.topic}
              </div>
            ))}
          </div>
        }
        confirmLabel="ยืนยันการจอง"
        cancelLabel="ยกเลิก"
        isLoading={submitting}
        variant="warning"
      />

      <ConfirmModal
        isOpen={Boolean(pendingCancel)}
        onClose={() => setPendingCancel(null)}
        onConfirm={() => void confirmCancel()}
        title="ยืนยันการยกเลิกการจอง"
        message={
          pendingCancel ? (
            <span>
              {pendingCancel.room} · {formatTime(pendingCancel.start_time)} - {formatTime(pendingCancel.end_time)} น. · {pendingCancel.topic}
            </span>
          ) : (
            ''
          )
        }
        confirmLabel="ยืนยันยกเลิก"
        cancelLabel="ยกเลิก"
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
