import { useEffect, useMemo, useState } from 'react';
import { Edit3, FileText, Save, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import type { SiteContentPlanCoverLayout, SiteContentStatus } from '../../site-content/types/siteContent.types';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import {
  createPublicPerformanceResult,
  getPerformanceCategory,
  loadPublicPerformanceResults,
  performanceCategoryOptions,
  savePublicPerformanceResult,
  updatePublicPerformanceResultStatus,
  type PerformanceResultCategory,
  type PublicPerformanceResult,
} from '../services/publicPerformanceResults.service';

type FormState = {
  category: PerformanceResultCategory;
  fiscalYear: number;
  sortOrder: number;
  title: string;
  subtitle: string;
  description: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: SiteContentPlanCoverLayout;
  status: SiteContentStatus;
};

const currentThaiYear = new Date().getFullYear() + 543;

const defaultForm: FormState = {
  category: 'key-result',
  fiscalYear: currentThaiYear,
  sortOrder: 10,
  title: '',
  subtitle: '',
  description: '',
  pdfUrl: '',
  coverImageUrl: '',
  coverImageLayout: 'landscape',
  status: 'draft',
};

function toForm(result: PublicPerformanceResult): FormState {
  return {
    category: result.category,
    fiscalYear: result.fiscalYear,
    sortOrder: result.sortOrder,
    title: result.title,
    subtitle: result.subtitle,
    description: result.description,
    pdfUrl: result.pdfUrl,
    coverImageUrl: result.coverImageUrl,
    coverImageLayout: result.coverImageLayout,
    status: result.status,
  };
}

function isSafeOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function PublicPerformanceResultsManager() {
  const { user, profile } = useAuthStore();
  const [results, setResults] = useState<PublicPerformanceResult[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManagePublicContent = profile?.role === 'admin' || profile?.role === 'super_admin';
  const canUploadPdf = canManagePublicContent;
  const myResults = useMemo(() => canManagePublicContent ? results : [], [canManagePublicContent, results]);
  const editingResult = myResults.find((result) => result.id === editingId) || null;

  useEffect(() => {
    if (!canManagePublicContent) {
      setResults([]);
      return;
    }

    let mounted = true;
    loadPublicPerformanceResults()
      .then((items) => { if (mounted) setResults(items); })
      .catch(() => { if (mounted) setError('ไม่สามารถโหลดข้อมูลจาก Supabase ได้ กรุณาตรวจสอบ migration และการเชื่อมต่อ'); });
    return () => { mounted = false; };
  }, [canManagePublicContent]);

  const updateForm = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setMessage(null);
    setError(null);
  };

  const startEdit = (result: PublicPerformanceResult) => {
    setEditingId(result.id);
    setForm(toForm(result));
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!user || !canManagePublicContent) return;
    if (!form.title.trim()) {
      setError('กรุณาระบุชื่อผลการดำเนินงาน');
      return;
    }
    if (form.fiscalYear < 2500 || form.fiscalYear > 2700) {
      setError('ปีงบประมาณต้องอยู่ระหว่าง พ.ศ. 2500-2700');
      return;
    }
    if (!isSafeOptionalUrl(form.pdfUrl) || !isSafeOptionalUrl(form.coverImageUrl)) {
      setError('ลิงก์เอกสารและภาพปกต้องเป็น http:// หรือ https:// เท่านั้น');
      return;
    }

    const category = getPerformanceCategory(form.category);
    const nextResult = editingResult
      ? {
          ...editingResult,
          ...form,
          iconKey: form.category === 'key-result' ? 'growth' as const : 'file' as const,
          color: category.color,
          actionLabel: 'ดูผลการดำเนินงาน',
        }
      : createPublicPerformanceResult({
          ownerUserId: user.id,
          ownerName: profile?.full_name || user.email || 'ผู้ใช้งานระบบ',
          ownerWorkGroup: profile?.work_group || profile?.department || null,
          ...form,
          iconKey: form.category === 'key-result' ? 'growth' : 'file',
          color: category.color,
          actionLabel: 'ดูผลการดำเนินงาน',
        });

    try {
      setIsSaving(true);
      setError(null);
      const saved = await savePublicPerformanceResult(nextResult);
      setResults((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setForm(defaultForm);
      setEditingId(null);
      setMessage(editingResult ? 'แก้ไขข้อมูลเรียบร้อย และบันทึกประวัติไว้แล้ว' : 'เพิ่มผลการดำเนินงานลง Supabase เรียบร้อย');
    } catch {
      setError('บันทึกไม่สำเร็จ ข้อมูลยังไม่ถูกยืนยันลง Supabase กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (result: PublicPerformanceResult) => {
    if (!user || !canManagePublicContent) return;
    const nextStatus = result.status === 'published' ? 'draft' : 'published';
    try {
      const saved = await updatePublicPerformanceResultStatus(result.id, nextStatus);
      setResults((current) => current.map((item) => item.id === saved.id ? saved : item));
      setMessage(nextStatus === 'published' ? 'เผยแพร่รายการเรียบร้อย' : 'เปลี่ยนรายการเป็นฉบับร่างแล้ว');
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  if (!user || !canManagePublicContent) {
    return <section className="min-h-[calc(100vh-4rem)] bg-white p-8 text-sm text-slate-600">เฉพาะ Admin และ Super Admin เท่านั้นที่เข้าถึงหน้าจัดการผลการดำเนินงานได้</section>;
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">เพิ่มผลการดำเนินงานของฉัน</h1>

        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{editingResult ? 'แก้ไขผลการดำเนินงาน' : 'ข้อมูลผลการดำเนินงาน'}</h2>
            </div>
            {editingResult ? <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600" title="ยกเลิกแก้ไข"><X className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-1"><span className="text-sm font-medium text-slate-700">หมวดข้อมูล</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value as PerformanceResultCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{performanceCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">ปีงบประมาณ</span><input type="number" min={2500} max={2700} value={form.fiscalYear} onChange={(event) => updateForm('fiscalYear', Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              </div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ชื่อผลการดำเนินงาน</span><input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">รายละเอียด</span><textarea rows={4} value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
            </div>

            <div className="grid content-start gap-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input type="url" value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {canUploadPdf ? (
                <AdminPublicPdfUpload
                  userId={user.id}
                  folder="performance-results"
                  disabled={isSaving || isUploadingCover}
                  onUploadingChange={(uploading) => {
                    setIsUploadingPdf(uploading);
                    if (uploading) setError(null);
                  }}
                  onError={setError}
                  onUploaded={(upload) => {
                    setForm((current) => ({ ...current, pdfUrl: upload.pdfUrl, coverImageUrl: current.coverImageUrl.trim() && !current.coverImageUrl.includes('/public-home-documents/') ? current.coverImageUrl : upload.coverImageUrl }));
                    setError(null);
                  }}
                />
              ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span><input type="url" value={form.coverImageUrl} onChange={(event) => updateForm('coverImageUrl', event.target.value)} placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {canUploadPdf ? (
                <AdminCoverImageUpload
                  disabled={isSaving || isUploadingPdf}
                  onUploadingChange={(uploading) => {
                    setIsUploadingCover(uploading);
                    if (uploading) setError(null);
                  }}
                  onError={setError}
                  onUploaded={(imageUrl) => {
                    setForm((current) => ({ ...current, coverImageUrl: imageUrl }));
                    setError(null);
                  }}
                />
              ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span><input type="number" min={1} value={form.sortOrder} onChange={(event) => updateForm('sortOrder', Math.max(1, Number(event.target.value)))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
                <div className="block"><span className="text-sm font-medium text-slate-700">สีการ์ดอัตโนมัติ</span><div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"><span className={`h-4 w-4 rounded-full ${getPerformanceCategory(form.category).color}`} aria-hidden="true" />{getPerformanceCategory(form.category).label}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'portrait' ? 'border-cyan-600 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">360 x 640 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวตั้ง</span></button>
                <button type="button" onClick={() => updateForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'landscape' ? 'border-cyan-600 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">640 x 360 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวนอน</span></button>
              </div>
              <label className="hidden">
                <span>สถานะ</span>
                <select value={form.status} onChange={(event) => updateForm('status', event.target.value as SiteContentStatus)}>
                  <option value="draft">ฉบับร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mt-4">
            <CoverImagePreview imageUrl={form.coverImageUrl} pdfUrl={form.pdfUrl} layout={form.coverImageLayout} title={form.title} />
          </div>
          <button type="button" onClick={() => void handleSave()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? 'กำลังบันทึก...' : editingResult ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}</button>
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="font-semibold text-slate-950">รายการที่นำเข้าแล้ว ({myResults.length})</h2></div>
          {myResults.length ? <div className="divide-y divide-slate-200">{myResults.map((result) => <div key={result.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white ${getPerformanceCategory(result.category).color}`}><FileText className="h-5 w-5" /></span><div className="min-w-0"><p className="font-semibold text-slate-900">{result.title}</p><p className="mt-1 text-xs text-slate-500">พ.ศ. {result.fiscalYear} · {getPerformanceCategory(result.category).label} · {result.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => startEdit(result)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600" title="แก้ไข"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void toggleStatus(result)} className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">{result.status === 'published' ? 'เก็บเป็นร่าง' : 'เผยแพร่'}</button></div></div>)}</div> : <p className="p-6 text-sm text-slate-500">ยังไม่มีผลการดำเนินงานที่นำเข้า</p>}
        </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(message)}
        onClose={() => setMessage(null)}
        onConfirm={() => setMessage(null)}
        title="ดำเนินการสำเร็จ"
        message={message || ''}
        confirmLabel="ตกลง"
        variant="success"
        showCancelButton={false}
      />
    </section>
  );
}
