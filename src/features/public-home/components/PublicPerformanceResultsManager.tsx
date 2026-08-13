import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Edit3, FileText, Save, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import type { SiteContentPlanCoverLayout, SiteContentStatus } from '../../site-content/types/siteContent.types';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import { PublicRepositoryEditModal } from './PublicRepositoryEditModal';
import { PublicRepositoryCategoryManager } from './PublicRepositoryCategoryManager';
import {
  findPublicRepositoryCategory,
  getDefaultRepositoryCategories,
  loadPublicRepositoryCategories,
  type PublicRepositoryCategory,
} from '../services/publicRepositoryCategories.service';
import {
  createPublicPerformanceResult,
  getPerformanceCategory,
  loadPublicPerformanceResults,
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

const PAGE_SIZE = 10;

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
  const [categories, setCategories] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('performance'));
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManagePublicContent = profile?.role === 'admin' || profile?.role === 'super_admin';
  const canUploadPdf = canManagePublicContent;
  const categoryOrder = useMemo(() => new Map(categories.map((category, index) => [category.key, index])), [categories]);
  const compareResults = (first: PublicPerformanceResult, second: PublicPerformanceResult) => {
    if (first.fiscalYear !== second.fiscalYear) return second.fiscalYear - first.fiscalYear;
    const categoryCompare = (categoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER)
      - (categoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER);
    return categoryCompare || first.sortOrder - second.sortOrder || second.updatedAt.localeCompare(first.updatedAt);
  };
  const myResults = useMemo(
    () => canManagePublicContent ? [...results].sort(compareResults) : [],
    [canManagePublicContent, results, categoryOrder],
  );
  const activeCategories = categories.filter((category) => category.isActive || category.key === form.category);
  const selectedCategory = findPublicRepositoryCategory(categories, form.category);
  const currentCategory = selectedCategory || getPerformanceCategory(form.category);
  const totalPages = Math.max(1, Math.ceil(myResults.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pagedResults = myResults.slice(safeCurrentPage * PAGE_SIZE, safeCurrentPage * PAGE_SIZE + PAGE_SIZE);
  const editingResult = myResults.find((result) => result.id === editingId) || null;

  useEffect(() => {
    if (!canManagePublicContent) {
      setResults([]);
      return;
    }

    let mounted = true;
    Promise.all([loadPublicPerformanceResults(), loadPublicRepositoryCategories('performance')])
      .then(([items, loadedCategories]) => { if (mounted) {
        setResults(items);
        setCategories(loadedCategories);
        setForm((current) => loadedCategories.some((category) => category.key === current.category && category.isActive)
          ? current
          : { ...current, category: loadedCategories.find((category) => category.isActive)?.key || current.category });
      } })
      .catch(() => { if (mounted) setError('ไม่สามารถโหลดข้อมูลจาก Supabase ได้ กรุณาตรวจสอบ migration และการเชื่อมต่อ'); });
    return () => { mounted = false; };
  }, [canManagePublicContent]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

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
  };

  const handleCategoriesChange = (nextCategories: PublicRepositoryCategory[]) => {
    setCategories(nextCategories);
    setForm((current) => nextCategories.some((category) => category.key === current.category && (category.isActive || Boolean(editingId)))
      ? current
      : { ...current, category: nextCategories.find((category) => category.isActive)?.key || 'other' });
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

    const category = currentCategory;
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
      setResults((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort(compareResults));
      setForm(defaultForm);
      setEditingId(null);
      if (!editingResult) setCurrentPage(0);
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
      setResults((current) => current.map((item) => item.id === saved.id ? saved : item).sort(compareResults));
      setMessage(nextStatus === 'published' ? 'เผยแพร่รายการเรียบร้อย' : 'เปลี่ยนรายการเป็นฉบับร่างแล้ว');
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const getResultsInGroup = (result: PublicPerformanceResult) => myResults.filter(
    (item) => item.category === result.category && item.fiscalYear === result.fiscalYear,
  );

  const canMoveResult = (result: PublicPerformanceResult, direction: -1 | 1) => {
    const group = getResultsInGroup(result);
    const index = group.findIndex((item) => item.id === result.id);
    return index >= 0 && Boolean(group[index + direction]);
  };

  const moveResult = async (result: PublicPerformanceResult, direction: -1 | 1) => {
    if (!user || !canManagePublicContent) return;
    const group = getResultsInGroup(result);
    const index = group.findIndex((item) => item.id === result.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= group.length) return;

    const reordered = [...group];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    try {
      setIsSaving(true);
      setError(null);
      const savedItems = await Promise.all(reordered.map((item, itemIndex) => savePublicPerformanceResult({
        ...item,
        sortOrder: (itemIndex + 1) * 10,
        updatedAt: new Date().toISOString(),
      })));
      const savedById = new Map(savedItems.map((item) => [item.id, item]));
      setResults((current) => current.map((item) => savedById.get(item.id) || item).sort(compareResults));
      setMessage('ย้ายลำดับผลการดำเนินงานเรียบร้อย');
    } catch {
      setError('ไม่สามารถย้ายลำดับผลการดำเนินงานได้');
    } finally {
      setIsSaving(false);
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
                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block"><span className="text-sm font-medium text-slate-700">หมวดข้อมูล</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value as PerformanceResultCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{activeCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>{user ? <PublicRepositoryCategoryManager repositoryType="performance" title="หมวดข้อมูล" userId={user.id} categories={categories} onCategoriesChange={handleCategoriesChange} /> : null}</div>
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
                <div className="block"><span className="text-sm font-medium text-slate-700">สถานะ</span><button type="button" aria-pressed={form.status === 'published'} onClick={() => updateForm('status', form.status === 'published' ? 'draft' : 'published')} className={`mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${form.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}><span className={`h-2.5 w-2.5 rounded-full ${form.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />{form.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></div>
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

        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950">รายการที่นำเข้าแล้ว</h2><p className="mt-1 text-sm text-slate-500">แสดงครั้งละ 10 รายการ เรียงตามปี หมวดข้อมูล และลำดับการแสดงผล</p></div>
            <p className="text-sm font-semibold text-slate-600">ทั้งหมด {myResults.length} รายการ</p>
          </div>
          {myResults.length ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500"><tr><th className="w-16 px-3 py-3">ลำดับ</th><th className="min-w-56 px-3 py-3">ชื่อผลการดำเนินงาน</th><th className="min-w-44 px-3 py-3">หมวดข้อมูล</th><th className="w-28 px-3 py-3">ปีงบประมาณ</th><th className="w-28 px-3 py-3">ลำดับแสดงผล</th><th className="min-w-28 px-3 py-3">สถานะ</th><th className="min-w-48 px-3 py-3">จัดการ</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedResults.map((result, index) => (
                      <tr key={result.id} className={editingId === result.id ? 'bg-brand-50/70' : undefined}>
                        <td className="px-3 py-3 font-semibold text-slate-700">{safeCurrentPage * PAGE_SIZE + index + 1}</td>
                        <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white ${findPublicRepositoryCategory(categories, result.category)?.color || result.color}`}><FileText className="h-4 w-4" /></span><div className="min-w-0"><p className="max-w-md truncate font-semibold text-slate-950">{result.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{result.subtitle || '-'}</p></div></div></td>
                        <td className="px-3 py-3 text-slate-600">{findPublicRepositoryCategory(categories, result.category)?.label || result.category}</td>
                        <td className="px-3 py-3 text-slate-600">{result.fiscalYear}</td>
                        <td className="px-3 py-3 font-semibold text-slate-700">{result.sortOrder}</td>
                        <td className="px-3 py-3"><button type="button" onClick={() => void toggleStatus(result)} className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${result.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{result.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></td>
                        <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void moveResult(result, -1)} disabled={!canMoveResult(result, -1) || isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40" title="เลื่อนขึ้นในหมวดและปีเดียวกัน"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => void moveResult(result, 1)} disabled={!canMoveResult(result, 1) || isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40" title="เลื่อนลงในหมวดและปีเดียวกัน"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => startEdit(result)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><Edit3 className="h-4 w-4" />แก้ไข</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">หน้า {safeCurrentPage + 1} จาก {totalPages}</p><div className="flex gap-2"><button type="button" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={safeCurrentPage === 0} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={safeCurrentPage >= totalPages - 1} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">ถัดไป<ChevronRight className="h-4 w-4" /></button></div></div>
            </>
          ) : <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">ยังไม่มีผลการดำเนินงานที่นำเข้า</div>}
        </div>
      </div>
      <PublicRepositoryEditModal
        isOpen={Boolean(editingResult)}
        title="แก้ไขผลการดำเนินงาน"
        onClose={resetForm}
        onSave={() => void handleSave()}
        isSaving={isSaving}
        saveDisabled={isUploadingPdf || isUploadingCover}
        error={error}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block"><span className="text-sm font-medium text-slate-700">หมวดข้อมูล</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value as PerformanceResultCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{activeCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>{user ? <PublicRepositoryCategoryManager repositoryType="performance" title="หมวดข้อมูล" userId={user.id} categories={categories} onCategoriesChange={handleCategoriesChange} /> : null}</div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ปีงบประมาณ</span><input type="number" min={2500} max={2700} value={form.fiscalYear} onChange={(event) => updateForm('fiscalYear', Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            </div>
            <label className="block"><span className="text-sm font-medium text-slate-700">ชื่อผลการดำเนินงาน</span><input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">รายละเอียด</span><textarea rows={5} value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
          </div>
          <div className="grid content-start gap-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {user ? <AdminPublicPdfUpload userId={user.id} folder="performance-results" disabled={isSaving || isUploadingCover} onUploadingChange={setIsUploadingPdf} onError={setError} onUploaded={(upload) => setForm((current) => ({ ...current, pdfUrl: upload.pdfUrl, coverImageUrl: current.coverImageUrl.trim() && !current.coverImageUrl.includes('/public-home-documents/') ? current.coverImageUrl : upload.coverImageUrl }))} /> : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span><input value={form.coverImageUrl} onChange={(event) => updateForm('coverImageUrl', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <AdminCoverImageUpload disabled={isSaving || isUploadingPdf} onUploadingChange={setIsUploadingCover} onError={setError} onUploaded={(imageUrl) => updateForm('coverImageUrl', imageUrl)} />
            </div>
            <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span><input type="number" min={1} value={form.sortOrder} onChange={(event) => updateForm('sortOrder', Math.max(1, Number(event.target.value)))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => updateForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${form.coverImageLayout === 'portrait' ? 'border-cyan-600 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600'}`}>360 x 640 px<br />ภาพแนวตั้ง</button>
              <button type="button" onClick={() => updateForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${form.coverImageLayout === 'landscape' ? 'border-cyan-600 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600'}`}>640 x 360 px<br />ภาพแนวนอน</button>
            </div>
          </div>
        </div>
        <div className="mt-4"><CoverImagePreview imageUrl={form.coverImageUrl} pdfUrl={form.pdfUrl} layout={form.coverImageLayout} title={form.title} /></div>
      </PublicRepositoryEditModal>
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
