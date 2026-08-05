import { useEffect, useMemo, useState } from 'react';
import { Edit3, FileText, Save, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import type { SiteContentPlanCoverLayout, SiteContentStatus } from '../../site-content/types/siteContent.types';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import {
  createPublicResearchItem,
  getResearchCategory,
  loadPublicResearchItems,
  researchCategoryOptions,
  savePublicResearchItem,
  updatePublicResearchItemStatus,
  type PublicResearchItem,
  type ResearchCategory,
} from '../services/publicResearchItems.service';

type FormState = {
  category: ResearchCategory;
  publicationYear: number;
  sortOrder: number;
  title: string;
  researcherNames: string;
  organization: string;
  abstract: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: SiteContentPlanCoverLayout;
  status: SiteContentStatus;
};

const currentThaiYear = new Date().getFullYear() + 543;
const defaultForm: FormState = {
  category: 'r2r',
  publicationYear: currentThaiYear,
  sortOrder: 10,
  title: '',
  researcherNames: '',
  organization: '',
  abstract: '',
  pdfUrl: '',
  coverImageUrl: '',
  coverImageLayout: 'portrait',
  status: 'draft',
};

function toForm(item: PublicResearchItem): FormState {
  return {
    category: item.category,
    publicationYear: item.publicationYear,
    sortOrder: item.sortOrder,
    title: item.title,
    researcherNames: item.researcherNames,
    organization: item.organization,
    abstract: item.abstract,
    pdfUrl: item.pdfUrl,
    coverImageUrl: item.coverImageUrl,
    coverImageLayout: item.coverImageLayout,
    status: item.status,
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

export function PublicResearchItemsManager() {
  const { user, profile } = useAuthStore();
  const [items, setItems] = useState<PublicResearchItem[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canUploadPdf = profile?.role === 'admin' || profile?.role === 'super_admin';
  const myItems = useMemo(() => items.filter((item) => item.ownerUserId === user?.id), [items, user?.id]);
  const editingItem = myItems.find((item) => item.id === editingId) || null;

  useEffect(() => {
    let mounted = true;
    loadPublicResearchItems()
      .then((loadedItems) => { if (mounted) setItems(loadedItems); })
      .catch(() => { if (mounted) setError('ไม่สามารถโหลดข้อมูลงานวิจัยจาก Supabase ได้ กรุณาตรวจสอบ migration และการเชื่อมต่อ'); });
    return () => { mounted = false; };
  }, []);

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

  const startEdit = (item: PublicResearchItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      setError('กรุณาระบุชื่องานวิจัย');
      return;
    }
    if (form.publicationYear < 2400 || form.publicationYear > 2700) {
      setError('ปีที่เผยแพร่ต้องอยู่ระหว่าง พ.ศ. 2400-2700');
      return;
    }
    if (!isSafeOptionalUrl(form.pdfUrl) || !isSafeOptionalUrl(form.coverImageUrl)) {
      setError('ลิงก์เอกสารและภาพปกต้องเป็น http:// หรือ https:// เท่านั้น');
      return;
    }

    const category = getResearchCategory(form.category);
    const nextItem = editingItem
      ? {
          ...editingItem,
          ...form,
          ownerName: profile?.full_name || user.email || editingItem.ownerName,
          ownerWorkGroup: profile?.work_group || profile?.department || null,
          color: category.color,
          actionLabel: 'เปิดเอกสารงานวิจัย',
        }
      : createPublicResearchItem({
          ownerUserId: user.id,
          ownerName: profile?.full_name || user.email || 'ผู้ใช้งานระบบ',
          ownerWorkGroup: profile?.work_group || profile?.department || null,
          ...form,
          color: category.color,
          actionLabel: 'เปิดเอกสารงานวิจัย',
        });

    try {
      setIsSaving(true);
      setError(null);
      const saved = await savePublicResearchItem(nextItem);
      setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setForm(defaultForm);
      setEditingId(null);
      setMessage(editingItem ? 'แก้ไขงานวิจัยเรียบร้อย และบันทึกประวัติไว้แล้ว' : 'เพิ่มงานวิจัยลง Supabase เรียบร้อย');
    } catch {
      setError('บันทึกไม่สำเร็จ ข้อมูลยังไม่ถูกยืนยันลง Supabase กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: PublicResearchItem) => {
    if (!user) return;
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      const saved = await updatePublicResearchItemStatus(item.id, user.id, nextStatus);
      setItems((current) => current.map((currentItem) => currentItem.id === saved.id ? saved : currentItem));
      setMessage(nextStatus === 'published' ? 'เผยแพร่งานวิจัยเรียบร้อย' : 'เปลี่ยนงานวิจัยเป็นฉบับร่างแล้ว');
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะงานวิจัยได้');
    }
  };

  if (!user) {
    return <section className="min-h-[calc(100vh-4rem)] bg-white p-8 text-sm text-slate-600">กรุณาเข้าสู่ระบบก่อนเพิ่มงานวิจัย</section>;
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-emerald-700">Research Publishing</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">เพิ่มงานวิจัยของฉัน</h1>

        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div><h2 className="text-lg font-semibold text-slate-950">{editingItem ? 'แก้ไขงานวิจัย' : 'ข้อมูลงานวิจัย'}</h2><p className="mt-1 text-sm text-slate-500">ข้อมูลจะบันทึกลง Supabase และเก็บประวัติทุกครั้งที่แก้ไข</p></div>
            {editingItem ? <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600" title="ยกเลิกแก้ไข"><X className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block"><span className="text-sm font-medium text-slate-700">ประเภทงานวิจัย</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value as ResearchCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{researchCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">ปีที่เผยแพร่</span><input type="number" min={2400} max={2700} value={form.publicationYear} onChange={(event) => updateForm('publicationYear', Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับ</span><input type="number" min={1} value={form.sortOrder} onChange={(event) => updateForm('sortOrder', Math.max(1, Number(event.target.value)))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              </div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ชื่องานวิจัย</span><input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">ผู้วิจัย/ผู้จัดทำ</span><input value={form.researcherNames} onChange={(event) => updateForm('researcherNames', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">หน่วยงาน</span><input value={form.organization} onChange={(event) => updateForm('organization', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">บทคัดย่อ/รายละเอียด</span><textarea rows={4} value={form.abstract} onChange={(event) => updateForm('abstract', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
            </div>

            <div className="grid content-start gap-3">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input type="url" value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {canUploadPdf ? (
                <AdminPublicPdfUpload
                  userId={user.id}
                  folder="research"
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
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-sm font-medium text-slate-700">รูปแบบภาพ</span><select value={form.coverImageLayout} onChange={(event) => updateForm('coverImageLayout', event.target.value as SiteContentPlanCoverLayout)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="portrait">แนวตั้ง</option><option value="landscape">แนวนอน</option></select></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">สถานะ</span><select value={form.status} onChange={(event) => updateForm('status', event.target.value as SiteContentStatus)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="draft">ฉบับร่าง</option><option value="published">เผยแพร่</option></select></label>
              </div>
              <CoverImagePreview imageUrl={form.coverImageUrl} pdfUrl={form.pdfUrl} layout={form.coverImageLayout} title={form.title} />
              <button type="button" onClick={() => void handleSave()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มงานวิจัย'}</button>
            </div>
          </div>
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="font-semibold text-slate-950">งานวิจัยของฉัน ({myItems.length})</h2></div>
          {myItems.length ? <div className="divide-y divide-slate-200">{myItems.map((item) => <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white ${getResearchCategory(item.category).color}`}><FileText className="h-5 w-5" /></span><div className="min-w-0"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">พ.ศ. {item.publicationYear} · {getResearchCategory(item.category).label} · {item.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => startEdit(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600" title="แก้ไข"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void toggleStatus(item)} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{item.status === 'published' ? 'เก็บเป็นร่าง' : 'เผยแพร่'}</button></div></div>)}</div> : <p className="p-6 text-sm text-slate-500">ยังไม่มีงานวิจัยที่คุณเพิ่ม</p>}
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
