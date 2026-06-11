import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Headphones, Loader2, Send } from 'lucide-react';
import { createSpdServiceTicket, getSpdServiceCategories, notifySpdServiceTicketCreated } from '../../services/spd-service.service';
import { useAuthStore } from '../../stores/auth.store';
import type { SpdServiceCategory, SpdServiceTicket, SpdServiceUrgency } from '../../types/database.types';

const urgencyOptions: Array<{ value: SpdServiceUrgency; label: string; hint: string }> = [
  { value: 'LOW', label: 'LOW', hint: 'ไม่เร่งด่วน' },
  { value: 'MEDIUM', label: 'MEDIUM', hint: 'ปกติ' },
  { value: 'HIGH', label: 'HIGH', hint: 'ควรรีบดำเนินการ' },
  { value: 'CRITICAL', label: 'CRITICAL', hint: 'กระทบงานสำคัญ' },
];

const subjectOptions = [
  'ขอใช้งาน Conference',
  'แจ้งปัญหาการใช้งานเครื่องคอมพิวเตอร์',
  'ลงข้อมูลหน้า Website',
  'ขอใช้งาน Internet',
  'แจ้งปัญหาการใช้งานระบบ NAS',
  'แจ้ง Reset Password Internet',
  'ขอความอนุเคราะห์เจ้าหน้าที่',
  'ลงข่าวประชาสัมพันธ์',
  'อื่นๆ',
];

export function SpdServiceRequestPage() {
  const { profile, user } = useAuthStore();
  const [categories, setCategories] = useState<SpdServiceCategory[]>([]);
  const [requesterName, setRequesterName] = useState(profile?.full_name || '');
  const [requesterDepartment, setRequesterDepartment] = useState(profile?.work_group || profile?.department || '');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [urgency, setUrgency] = useState<SpdServiceUrgency>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<SpdServiceTicket | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoadingCategories(true);
        setError(null);
        const data = await getSpdServiceCategories();
        setCategories(data);
        setCategoryId((current) => current || data[0]?.id || '');
      } catch (loadError) {
        console.error('Failed to load SPD Service categories:', loadError);
        setError('ไม่สามารถโหลดประเภทบริการได้');
      } finally {
        setIsLoadingCategories(false);
      }
    })();
  }, []);

  const selectedCategory = useMemo(() => categories.find((category) => category.id === categoryId) || null, [categories, categoryId]);
  const finalSubject = subject === 'อื่นๆ' ? customSubject.trim() : subject.trim();

  const resetIssueFields = () => {
    setUrgency('MEDIUM');
    setSubject('');
    setCustomSubject('');
    setDescription('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id || !profile?.user_id) {
      setError('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (!requesterName.trim() || !requesterPhone.trim() || !selectedCategory || !finalSubject || !description.trim()) {
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
        requesterPhone: requesterPhone.trim(),
        categoryId: selectedCategory.id,
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
        console.error('Failed to notify SPD Service Telegram:', notificationError);
        setNotificationWarning('สร้างคำขอสำเร็จ แต่ยังส่ง Telegram ไม่สำเร็จ กรุณาตรวจสอบ Edge Function และ Bot Token');
      }

      setCreatedTicket(ticket);
      resetIssueFields();
    } catch (submitError) {
      console.error('Failed to create SPD Service ticket:', submitError);
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
            <h1 className="truncate text-2xl font-semibold text-slate-950">แจ้งคำขอรับบริการ SPD Service</h1>
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
            สร้างคำขอสำเร็จ เลขคำขอ <span className="font-mono font-semibold">{createdTicket.ticket_no}</span>
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
              <span className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์</span>
              <input
                value={requesterPhone}
                onChange={(event) => setRequesterPhone(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="เบอร์ที่ติดต่อกลับได้"
                inputMode="tel"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">ประเภทบริการ</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={isLoadingCategories}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
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

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">หัวข้อปัญหา</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">เลือกหัวข้อปัญหา</option>
                {subjectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {subject === 'อื่นๆ' ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">ระบุหัวข้อปัญหา</span>
                <input
                  value={customSubject}
                  onChange={(event) => setCustomSubject(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="กรอกหัวข้อปัญหาอื่นๆ"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">รายละเอียดปัญหา</span>
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
    </div>
  );
}
