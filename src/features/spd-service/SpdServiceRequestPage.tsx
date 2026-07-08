import { FormEvent, PointerEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Headphones, ImageIcon, Loader2, Send, X, ZoomIn } from 'lucide-react';
import { createSpdServiceTicket, getSpdServiceCategories, getSpdServiceDigitalGuideSettings, notifySpdServiceTicketCreated, type SpdServiceDigitalGuide } from '../../services/spd-service.service';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../stores/auth.store';
import type { SpdServiceCategory, SpdServiceTicket, SpdServiceUrgency } from '../../types/database.types';
import { formatSpdServiceTicketNo } from './spdServiceTicketNo';

const urgencyOptions: Array<{ value: SpdServiceUrgency; label: string; hint: string }> = [
  { value: 'LOW', label: 'LOW', hint: 'ไม่เร่งด่วน' },
  { value: 'MEDIUM', label: 'MEDIUM', hint: 'ปกติ' },
  { value: 'HIGH', label: 'HIGH', hint: 'ควรรีบดำเนินการ' },
  { value: 'CRITICAL', label: 'CRITICAL', hint: 'กระทบงานสำคัญ' },
];

const otherCategoryId = '__other__';
const otherCategoryName = 'อื่นๆ';

const subjectOptionsByCategory: Record<string, string[]> = {
  'IT Support': ['แจ้งปัญหาการใช้งานเครื่องคอมพิวเตอร์', 'ขอใช้งาน Internet', 'แจ้ง Reset Password Internet', 'ขอความอนุเคราะห์เจ้าหน้า IT'],
  'Software Support': ['แจ้งใช้งาน AI ChatGPT'],
  'Information System Support': ['แจ้งปัญหาการใช้งานระบบ NAS'],
  'Digital Service': ['ขอใช้งาน Conference', 'ลงข้อมูลหน้า Website', 'ลงข่าวประชาสัมพันธ์'],
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

export function SpdServiceRequestPage() {
  useAuditPageAccess({ module: 'spd_service', action: 'spd_service_access', route: '/spd-service/request' });
  const { profile, user } = useAuthStore();
  const [categories, setCategories] = useState<SpdServiceCategory[]>([]);
  const [digitalGuides, setDigitalGuides] = useState<SpdServiceDigitalGuide[]>([]);
  const [requesterName, setRequesterName] = useState(profile?.full_name || '');
  const [requesterDepartment, setRequesterDepartment] = useState(profile?.work_group || profile?.department || '');
  const [categoryId, setCategoryId] = useState('');
  const [urgency, setUrgency] = useState<SpdServiceUrgency>('MEDIUM');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
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
    void (async () => {
      try {
        setIsLoadingCategories(true);
        setError(null);
        const [categoryData, guideData] = await Promise.all([getSpdServiceCategories(), getSpdServiceDigitalGuideSettings()]);
        setCategories(categoryData);
        setDigitalGuides(guideData);
        setCategoryId((current) => current || categoryData[0]?.id || otherCategoryId);
      } catch (loadError) {
        console.error('Failed to load DSP Service categories:', loadError);
        setError('ไม่สามารถโหลดประเภทบริการได้');
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
  const selectedCategory = useMemo(() => categoryOptions.find((category) => category.id === categoryId) || null, [categoryOptions, categoryId]);
  const isOtherCategory = selectedCategory?.name === otherCategoryName;
  const subjectOptions = selectedCategory ? subjectOptionsByCategory[selectedCategory.name] || [] : [];
  const selectedDigitalGuides = useMemo(
    () =>
      selectedCategory?.name === 'Digital Service'
        ? digitalGuides.filter((guide) => guide.enabled && guide.signedImageUrl && selectedSubjects.includes(guide.subject))
        : [],
    [digitalGuides, selectedCategory?.name, selectedSubjects],
  );
  const finalSubject = isOtherCategory ? otherCategoryName : selectedSubjects.join(', ');

  const resetIssueFields = () => {
    setUrgency('MEDIUM');
    setSelectedSubjects([]);
    setDescription('');
  };

  const toggleSubject = (option: string) => {
    setSelectedSubjects((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));
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

    try {
      setIsSubmitting(true);
      setError(null);
      setNotificationWarning(null);
      setCreatedTicket(null);
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
      });

      try {
        const notificationResult = await notifySpdServiceTicketCreated(ticket.id);

        if (!notificationResult.sent && !notificationResult.skipped) {
          setNotificationWarning('สร้างคำขอสำเร็จ แต่ยังส่ง Telegram ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า');
        }
      } catch (notificationError) {
        console.error('Failed to notify DSP Service Telegram:', notificationError);
        setNotificationWarning('สร้างคำขอสำเร็จ แต่ยังส่ง Telegram ไม่สำเร็จ กรุณาตรวจสอบ Edge Function และ Bot Token');
      }

      setCreatedTicket(ticket);
      resetIssueFields();
    } catch (submitError) {
      console.error('Failed to create DSP Service ticket:', submitError);
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
                onChange={(event) => setRequesterName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="ชื่อ-สกุล"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">หน่วยงาน / กลุ่มงาน</span>
              <input
                value={requesterDepartment}
                onChange={(event) => setRequesterDepartment(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="หน่วยงานหรือกลุ่มงาน"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">ประเภทบริการ</span>
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setSelectedSubjects([]);
                }}
                disabled={isLoadingCategories}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4">
            {!isOtherCategory ? (
              <div>
                <span className="text-sm font-medium text-slate-700">หัวข้อ</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {subjectOptions.map((option) => {
                    const isChecked = selectedSubjects.includes(option);

                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition ${
                          isChecked ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubject(option)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                        />
                        <span className="font-medium text-slate-800">{option}</span>
                      </label>
                    );
                  })}
                </div>
                {subjectOptions.length === 0 ? <p className="mt-2 text-sm text-slate-500">ยังไม่มีหัวข้อสำหรับประเภทบริการนี้</p> : null}
              </div>
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
