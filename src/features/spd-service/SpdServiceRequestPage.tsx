import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Headphones, ImageIcon, Loader2, Send, X, ZoomIn } from 'lucide-react';
import {
  createSpdServiceTicket,
  getSpdServiceAiChatGptBookings,
  getSpdServiceCategories,
  getSpdServiceDigitalGuidesForSubjects,
  getSpdServiceRequestSubjects,
  notifySpdServiceTicketCreated,
  type SpdServiceAiBooking,
  type SpdServiceDigitalGuide,
  type SpdServiceRequestSubjectRow,
} from '../../services/spd-service.service';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../stores/auth.store';
import type { SpdServiceCategory, SpdServiceTicket, SpdServiceUrgency } from '../../types/database.types';
import { formatSpdServiceTicketNo } from './spdServiceTicketNo';
import { reportClientError } from '../../utils/errorHandling';

const urgencyOptions: Array<{ value: SpdServiceUrgency; label: string; hint: string }> = [
  { value: 'LOW', label: 'LOW', hint: 'ถึงหน้างานภายใน 60 นาที เป็นต้นไป' },
  { value: 'MEDIUM', label: 'MEDIUM', hint: 'ถึงหน้างานภายใน 30 นาที' },
  { value: 'HIGH', label: 'HIGH', hint: 'ถึงหน้างานภายใน 15 นาที' },
  { value: 'CRITICAL', label: 'CRITICAL', hint: 'ถึงหน้างานภายใน 5 นาที' },
];

const otherCategoryId = '__other__';
const otherCategoryName = 'อื่นๆ';

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

const subjectOptionsByCategory: Record<string, string[]> = {
  'IT Support': ['แจ้งปัญหาการใช้งานเครื่องคอมพิวเตอร์', 'ขอใช้งาน Internet', 'แจ้ง Reset Password Internet', 'ขอความอนุเคราะห์เจ้าหน้า IT'],
  'Software Support': ['แจ้งใช้งาน AI ChatGPT'],
  'Information System Support': ['แจ้งปัญหาการใช้งานระบบ NAS'],
  'Digital Service': ['ขอใช้งาน Conference', 'ลงข้อมูลหน้า Website', 'ลงข่าวประชาสัมพันธ์'],
};

type ServiceSubjectOption = {
  id?: string;
  categoryId: string;
  categoryName: string;
  subject: string;
  requiresBookingDate: boolean;
  sortOrder: number;
};

type GuideImagePreview = {
  subject: string;
  imageUrl: string;
};

type GuideImageDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
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

export function SpdServiceRequestPage() {
  useAuditPageAccess({ module: 'spd_service', action: 'spd_service_access', route: '/spd-service/request' });
  const { profile, user } = useAuthStore();
  const [categories, setCategories] = useState<SpdServiceCategory[]>([]);
  const [requestSubjects, setRequestSubjects] = useState<SpdServiceRequestSubjectRow[]>([]);
  const [hasLoadedRequestSubjects, setHasLoadedRequestSubjects] = useState(false);
  const [digitalGuides, setDigitalGuides] = useState<SpdServiceDigitalGuide[]>([]);
  const [requesterName, setRequesterName] = useState(profile?.full_name || '');
  const [requesterDepartment, setRequesterDepartment] = useState(profile?.work_group || profile?.department || '');
  const [categoryId, setCategoryId] = useState('');
  const [urgency, setUrgency] = useState<SpdServiceUrgency>('MEDIUM');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [requestedServiceDate, setRequestedServiceDate] = useState('');
  const [aiCalendarMonth, setAiCalendarMonth] = useState(() => new Date());
  const [aiBookings, setAiBookings] = useState<SpdServiceAiBooking[]>([]);
  const [selectedAiBookingDate, setSelectedAiBookingDate] = useState<string | null>(null);
  const [isLoadingAiBookings, setIsLoadingAiBookings] = useState(false);
  const [aiBookingError, setAiBookingError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<SpdServiceTicket | null>(null);
  const [selectedGuideImage, setSelectedGuideImage] = useState<GuideImagePreview | null>(null);
  const [guideImagePan, setGuideImagePan] = useState({ x: 0, y: 0 });
  const [guideImageDrag, setGuideImageDrag] = useState<GuideImageDragState | null>(null);

  useEffect(() => {
    setRequesterName(profile?.full_name || '');
    setRequesterDepartment(profile?.work_group || profile?.department || '');
  }, [profile?.full_name, profile?.work_group, profile?.department]);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoadingCategories(true);
        setHasLoadedRequestSubjects(false);
        setError(null);
        const [categoryData, subjectData] = await Promise.all([
          getSpdServiceCategories(),
          getSpdServiceRequestSubjects({ activeOnly: true }),
        ]);
        setCategories(categoryData);
        setRequestSubjects(subjectData);
        setHasLoadedRequestSubjects(true);
        setDigitalGuides([]);
        setCategoryId((current) => current);
      } catch (loadError) {
        void reportClientError('Failed to load DSP Service categories:', loadError);
        setError('ไม่สามารถโหลดงานบริการได้');
      } finally {
        setIsLoadingCategories(false);
      }
    })();
  }, []);

  const categoryOptions = useMemo(() => {
    if (categories.some((category) => category.name === otherCategoryName)) {
      return categories;
    }

    return [
      ...categories,
      {
        id: otherCategoryId,
        name: otherCategoryName,
        description: null,
        is_active: true,
        sort_order: 50,
        created_at: '',
        updated_at: '',
      },
    ];
  }, [categories]);
  const serviceSubjectOptions = useMemo<ServiceSubjectOption[]>(() => {
    const options = hasLoadedRequestSubjects
      ? requestSubjects.map((subject) => ({
          id: subject.id,
          categoryId: subject.category_id,
          categoryName: subject.category_name || categoryOptions.find((category) => category.id === subject.category_id)?.name || '',
          subject: subject.subject,
          requiresBookingDate: subject.requires_booking_date || subject.subject === 'แจ้งใช้งาน AI ChatGPT',
          sortOrder: subject.sort_order,
        }))
      : categoryOptions.flatMap((category) => {
          if (category.name === otherCategoryName) {
            return [];
          }

          return (subjectOptionsByCategory[category.name] || []).map((subject, index) => ({
            categoryId: category.id,
            categoryName: category.name,
            subject,
            requiresBookingDate: subject === 'แจ้งใช้งาน AI ChatGPT',
            sortOrder: index + 1,
          }));
        });

    return [
      ...options,
      {
        categoryId: otherCategoryId,
        categoryName: otherCategoryName,
        subject: otherCategoryName,
        requiresBookingDate: false,
        sortOrder: 9999,
      },
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.subject.localeCompare(b.subject, 'th'));
  }, [categoryOptions, hasLoadedRequestSubjects, requestSubjects]);
  const selectedCategory = useMemo(() => categoryOptions.find((category) => category.id === categoryId) || null, [categoryOptions, categoryId]);
  const isOtherCategory = selectedCategory?.name === otherCategoryName;
  const selectedDigitalGuides = useMemo(
    () =>
      selectedCategory?.name === 'Digital Service'
        ? digitalGuides.filter((guide) => guide.enabled && guide.signedImageUrl && selectedSubjects.includes(guide.subject))
        : [],
    [digitalGuides, selectedCategory?.name, selectedSubjects],
  );
  const finalSubject = isOtherCategory ? otherCategoryName : selectedSubjects.join(', ');
  const selectedServiceSubject = useMemo(
    () => serviceSubjectOptions.find((option) => categoryId === option.categoryId && (option.categoryName === otherCategoryName || selectedSubjects.includes(option.subject))) || null,
    [categoryId, selectedSubjects, serviceSubjectOptions],
  );
  const shouldShowBookingCalendar = Boolean(selectedServiceSubject?.requiresBookingDate);
  const aiCalendarDays = useMemo(() => getCalendarDays(aiCalendarMonth), [aiCalendarMonth]);
  const aiCalendarMonthLabel = `${thaiMonths[aiCalendarMonth.getMonth()]} ${aiCalendarMonth.getFullYear() + 543}`;
  const aiBookingsByDate = useMemo(() => {
    return aiBookings.reduce<Record<string, SpdServiceAiBooking[]>>((acc, booking) => {
      if (!booking.requested_service_date) return acc;
      acc[booking.requested_service_date] = [...(acc[booking.requested_service_date] || []), booking];
      return acc;
    }, {});
  }, [aiBookings]);
  const selectedAiBookings = selectedAiBookingDate ? aiBookingsByDate[selectedAiBookingDate] || [] : [];
  useEffect(() => {
    const shouldLoadGuides = selectedCategory?.name === 'Digital Service' && selectedSubjects.length > 0;

    if (!shouldLoadGuides) {
      setDigitalGuides([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const guides = await getSpdServiceDigitalGuidesForSubjects(selectedSubjects);
        if (!cancelled) {
          setDigitalGuides(guides);
        }
      } catch (guideError) {
        void reportClientError('Failed to load DSP Service guide images:', guideError);
        if (!cancelled) {
          setDigitalGuides([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory?.name, selectedSubjects]);

  const loadAiBookings = useCallback(async (monthDate: Date) => {
    const days = getCalendarDays(monthDate);
    const start = toDateKey(days[0]);
    const end = toDateKey(days[days.length - 1]);

    try {
      setIsLoadingAiBookings(true);
      setAiBookingError(null);
      const data = await getSpdServiceAiChatGptBookings(start, end);
      setAiBookings(data);
      return data;
    } catch (bookingError) {
      void reportClientError('Failed to load AI ChatGPT bookings:', bookingError);
      setAiBookingError('ไม่สามารถโหลดรายการจอง AI ChatGPT ได้ กรุณาตรวจสอบสิทธิ์หรือ migration ฐานข้อมูล');
      setAiBookings([]);
      return [];
    } finally {
      setIsLoadingAiBookings(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldShowBookingCalendar) {
      setRequestedServiceDate('');
      setSelectedAiBookingDate(null);
      return;
    }

    void loadAiBookings(aiCalendarMonth);
  }, [aiCalendarMonth, loadAiBookings, shouldShowBookingCalendar]);

  const resetIssueFields = () => {
    setCategoryId('');
    setUrgency('MEDIUM');
    setSelectedSubjects([]);
    setRequestedServiceDate('');
    setSelectedAiBookingDate(null);
    setDescription('');
  };

  const selectServiceSubject = (option: ServiceSubjectOption) => {
    const isCurrentSelection =
      categoryId === option.categoryId && (option.categoryName === otherCategoryName || selectedSubjects.includes(option.subject));

    if (isCurrentSelection) {
      setCategoryId('');
      setSelectedSubjects([]);
      return;
    }

    setCategoryId(option.categoryId);
    setSelectedSubjects(option.categoryName === otherCategoryName ? [] : [option.subject]);
  };

  const openGuideImage = (guide: SpdServiceDigitalGuide) => {
    setSelectedGuideImage({ subject: guide.subject, imageUrl: guide.signedImageUrl });
    setGuideImagePan({ x: 0, y: 0 });
    setGuideImageDrag(null);
  };

  const closeGuideImage = () => {
    setSelectedGuideImage(null);
    setGuideImageDrag(null);
  };

  const handleGuideImagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setGuideImageDrag({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: guideImagePan.x,
      originY: guideImagePan.y,
    });
  };

  const handleGuideImagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!guideImageDrag || guideImageDrag.pointerId !== event.pointerId) {
      return;
    }

    setGuideImagePan({
      x: guideImageDrag.originX + event.clientX - guideImageDrag.startX,
      y: guideImageDrag.originY + event.clientY - guideImageDrag.startY,
    });
  };

  const handleGuideImagePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGuideImageDrag(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id || !profile?.user_id) {
      setError('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (!requesterName.trim() || !selectedCategory || (!isOtherCategory && !finalSubject) || !description.trim()) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (shouldShowBookingCalendar && !requestedServiceDate) {
      setError('กรุณาเลือกวันที่ต้องการจองใช้งาน AI ChatGPT');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setNotificationWarning(null);
      setCreatedTicket(null);
      const submittedAiBookingDate = shouldShowBookingCalendar ? requestedServiceDate : '';
      const ticket = await createSpdServiceTicket({
        requesterId: profile.user_id,
        requesterName: requesterName.trim(),
        requesterDepartment: requesterDepartment.trim() || null,
        requesterPhone: '-',
        categoryId: isOtherCategory ? null : selectedCategory.id,
        categoryName: selectedCategory.name,
        urgency,
        subject: finalSubject,
        description: description.trim(),
        requestedServiceDate: submittedAiBookingDate || null,
      });

      try {
        const notificationResult = await notifySpdServiceTicketCreated(ticket.id);

        if (!notificationResult.sent && !notificationResult.skipped) {
          setNotificationWarning('สร้างคำขอสำเร็จ แต่ยังส่ง Telegram ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า');
        }
      } catch (notificationError) {
        void reportClientError('Failed to notify DSP Service Telegram:', notificationError);
        setNotificationWarning('สร้างคำขอสำเร็จ แต่ยังส่ง Telegram ไม่สำเร็จ กรุณาตรวจสอบ Edge Function และ Bot Token');
      }

      setCreatedTicket(ticket);
      if (submittedAiBookingDate) {
        setUrgency('MEDIUM');
        setDescription('');
        setRequestedServiceDate(submittedAiBookingDate);
        await loadAiBookings(aiCalendarMonth);
        setSelectedAiBookingDate(submittedAiBookingDate);
      } else {
        resetIssueFields();
      }
    } catch (submitError) {
      void reportClientError('Failed to create DSP Service ticket:', submitError);
      setError('ไม่สามารถสร้างคำขอได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link to="/portal" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับ Portal
            </Link>
            <h1 className="truncate text-2xl font-semibold text-slate-950">แจ้งคำขอรับบริการ DSP Service</h1>
          </div>
          <div className="hidden rounded-md bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100 sm:block">
            <Headphones className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {createdTicket ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
            สร้างคำขอสำเร็จ เลขคำขอ <span className="font-mono font-semibold">{formatSpdServiceTicketNo(createdTicket.ticket_no)}</span>
            <Link to="/spd-service/my-requests" className="ml-3 font-semibold underline underline-offset-2">
              ดูคำขอของฉัน
            </Link>
          </div>
        ) : null}

        {notificationWarning ? (
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {notificationWarning}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ชื่อผู้แจ้ง</span>
              <input
                value={requesterName}
                readOnly
                aria-readonly="true"
                className="mt-1 w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
                placeholder="ชื่อ-สกุล"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">หน่วยงาน / กลุ่มงาน</span>
              <input
                value={requesterDepartment}
                readOnly
                aria-readonly="true"
                className="mt-1 w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
                placeholder="หน่วยงานหรือกลุ่มงาน"
              />
            </label>

          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <span className="text-sm font-medium text-slate-700">งานบริการ</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {serviceSubjectOptions.map((option) => {
                  const isChecked = categoryId === option.categoryId && (option.categoryName === otherCategoryName || selectedSubjects.includes(option.subject));

                  return (
                    <label
                      key={`${option.categoryId}-${option.subject}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition ${
                        isChecked ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => selectServiceSubject(option)}
                        disabled={isLoadingCategories}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">{option.subject}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {serviceSubjectOptions.length === 0 ? <p className="mt-2 text-sm text-slate-500">ยังไม่มีงานบริการให้เลือก</p> : null}
            </div>

            {shouldShowBookingCalendar ? (
              <section className="rounded-md border border-teal-100 bg-teal-50/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      ปฏิทินจองใช้งาน AI ChatGPT
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">เลือกวันที่ต้องการจอง และกดวันที่ที่มีรายการเพื่อดูผู้จอง</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAiCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-teal-200 bg-white text-teal-700 transition hover:bg-teal-50"
                      aria-label="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-36 text-center text-sm font-semibold text-slate-900">{aiCalendarMonthLabel}</span>
                    <button
                      type="button"
                      onClick={() => setAiCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-teal-200 bg-white text-teal-700 transition hover:bg-teal-50"
                      aria-label="เดือนถัดไป"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 rounded-t-md border border-teal-100 bg-white text-center text-xs font-semibold text-slate-500">
                  {weekdays.map((day) => (
                    <div key={day} className="py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 overflow-hidden rounded-b-md border-x border-b border-teal-100 bg-white">
                  {aiCalendarDays.map((date) => {
                    const dateKey = toDateKey(date);
                    const dayBookings = aiBookingsByDate[dateKey] || [];
                    const isCurrentMonth = date.getMonth() === aiCalendarMonth.getMonth();
                    const isSelected = requestedServiceDate === dateKey;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setRequestedServiceDate(dateKey)}
                        className={`min-h-24 border-r border-t border-teal-50 p-1.5 text-left text-xs transition hover:bg-teal-50 ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white'} ${isSelected ? 'ring-2 ring-inset ring-teal-500' : ''}`}
                      >
                        <span className="font-semibold">{date.getDate()}</span>
                        {dayBookings.length > 0 ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedAiBookingDate(dateKey);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedAiBookingDate(dateKey);
                              }
                            }}
                            className="mt-2 block space-y-0.5 rounded bg-teal-100 px-1.5 py-1 text-[11px] text-teal-800"
                          >
                            <span className="block truncate font-semibold">{dayBookings[0].requester_name}</span>
                            <span className="block truncate text-[10px] font-medium text-teal-700">{dayBookings[0].requester_department || 'ไม่ระบุกลุ่มงาน'}</span>
                            {dayBookings.length > 1 ? <span className="block text-[10px] font-semibold">+{dayBookings.length - 1} รายการ</span> : null}
                          </span>
                        ) : (
                          <span className="mt-2 block text-[11px] text-slate-400">ว่าง</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {isLoadingAiBookings ? <p className="mt-2 text-xs text-slate-500">กำลังโหลดรายการจอง...</p> : null}
                {aiBookingError ? <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">{aiBookingError}</p> : null}
                {requestedServiceDate ? <p className="mt-2 text-xs font-medium text-teal-800">วันที่เลือก: {formatThaiDate(requestedServiceDate)}</p> : null}
              </section>
            ) : null}
            {selectedDigitalGuides.length > 0 ? (
              <div className="grid gap-4">
                {selectedDigitalGuides.map((guide) => (
                  <section key={guide.subject} className="overflow-hidden rounded-md border border-teal-100 bg-teal-50/40">
                    <div className="flex items-center gap-2 border-b border-teal-100 bg-white px-4 py-3 text-sm font-semibold text-teal-800">
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                      {guide.subject}
                    </div>
                    <button
                      type="button"
                      onClick={() => openGuideImage(guide)}
                      className="group relative block w-full bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                      aria-label={`เปิดภาพคำแนะนำ ${guide.subject} แบบขนาดใหญ่`}
                    >
                      <img src={guide.signedImageUrl} alt={`คำแนะนำ ${guide.subject}`} className="max-h-[560px] w-full object-contain" />
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-white opacity-100 shadow-sm transition group-hover:bg-slate-950 sm:opacity-0 sm:group-hover:opacity-100">
                        <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                        ดูภาพใหญ่
                      </span>
                    </button>
                  </section>
                ))}
              </div>
            ) : null}

            <div>
              <span className="text-sm font-medium text-slate-700">ระดับความเร่งด่วน</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {urgencyOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-md border px-3 py-2 transition ${
                      urgency === option.value ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={option.value}
                      checked={urgency === option.value}
                      onChange={() => setUrgency(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-slate-950">{option.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{option.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">รายละเอียด</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-36 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="อธิบายอาการ ปัญหา หรือสิ่งที่ต้องการให้ช่วยดำเนินการ"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/spd-service/my-requests"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              คำขอของฉัน
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCategories}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              ส่งคำขอ
            </button>
          </div>
        </form>
      </main>

      {selectedAiBookingDate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setSelectedAiBookingDate(null)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-md bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-teal-700">AI ChatGPT Booking</p>
                <h2 className="truncate text-base font-semibold text-slate-950">{formatThaiDate(selectedAiBookingDate)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedAiBookingDate(null)} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              {selectedAiBookings.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">ยังไม่มีรายการจองในวันนี้</div>
              ) : (
                selectedAiBookings.map((booking) => (
                  <article key={booking.id} className="rounded-md border border-teal-100 bg-teal-50/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-950">{booking.subject}</h3>
                      </div>
                      <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">จองแล้ว</span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">ชื่อผู้จอง</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">{booking.requester_name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">กลุ่มงาน</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">{booking.requester_department || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">วันที่จอง</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">{booking.requested_service_date ? formatThaiDate(booking.requested_service_date) : '-'}</dd>
                      </div>
                    </dl>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
      {selectedGuideImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={closeGuideImage}>
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-teal-700">ภาพคำแนะนำ</p>
                <h2 className="truncate text-base font-semibold text-slate-950">{selectedGuideImage.subject}</h2>
              </div>
              <button type="button" onClick={closeGuideImage} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div
              className={`min-h-0 flex-1 overflow-hidden bg-slate-100 p-3 ${guideImageDrag ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerDown={handleGuideImagePointerDown}
              onPointerMove={handleGuideImagePointerMove}
              onPointerUp={handleGuideImagePointerEnd}
              onPointerCancel={handleGuideImagePointerEnd}
              style={{ touchAction: 'none' }}
            >
              <img
                src={selectedGuideImage.imageUrl}
                alt={`คำแนะนำ ${selectedGuideImage.subject}`}
                draggable={false}
                className="mx-auto h-auto max-w-none select-none rounded bg-white object-contain shadow-sm"
                style={{ transform: `translate(${guideImagePan.x}px, ${guideImagePan.y}px)` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
