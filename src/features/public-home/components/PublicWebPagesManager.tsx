import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clipboard, Edit3, ExternalLink, FileText, Globe2, Link2, Save, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import { PublicRepositoryCategoryManager } from './PublicRepositoryCategoryManager';
import { findPublicRepositoryCategory, getDefaultRepositoryCategories, loadPublicRepositoryCategories, type PublicRepositoryCategory } from '../services/publicRepositoryCategories.service';
import {
  comparePublicWebPages,
  createPublicWebPage,
  createSlugFromTitle,
  deletePublicWebPage,
  loadPublicWebPages,
  savePublicWebPage,
  updatePublicWebPageStatus,
  type PublicWebPage,
  type PublicWebPageStatus,
} from '../services/publicWebPages.service';

type FormState = {
  category: string;
  title: string;
  slug: string;
  description: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: 'portrait' | 'landscape';
  sortOrder: number;
  status: PublicWebPageStatus;
};

const PAGE_SIZE = 10;
const defaultForm: FormState = { category: 'general', title: '', slug: '', description: '', pdfUrl: '', coverImageUrl: '', coverImageLayout: 'portrait', sortOrder: 10, status: 'draft' };

function getPublicPageUrl(slug: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/strategic-repository/pages/${slug}`;
}

function normalizeSortOrder(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 10;
}

function toForm(page: PublicWebPage): FormState {
  return {
    category: page.category,
    title: page.title,
    slug: page.slug,
    description: page.description,
    pdfUrl: page.pdfUrl,
    coverImageUrl: page.coverImageUrl,
    coverImageLayout: page.coverImageLayout,
    sortOrder: page.sortOrder,
    status: page.status,
  };
}

export function PublicWebPagesManager() {
  const { user, profile } = useAuthStore();
  const canManage = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [pages, setPages] = useState<PublicWebPage[]>([]);
  const [categories, setCategories] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('web-page'));
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicWebPage | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const editingPage = editingId ? pages.find((page) => page.id === editingId) || null : null;
  const categoryOrder = useMemo(() => new Map(categories.map((category, index) => [category.key, index])), [categories]);
  const sortedPages = useMemo(() => [...pages].sort((first, second) => {
    const categoryCompare = (categoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER) - (categoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER);
    return categoryCompare || comparePublicWebPages(first, second);
  }), [pages, categoryOrder]);
  const activeCategories = categories.filter((category) => category.isActive || category.key === form.category);
  const totalPages = Math.max(1, Math.ceil(sortedPages.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pagedPages = sortedPages.slice(safeCurrentPage * PAGE_SIZE, safeCurrentPage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    void Promise.all([loadPublicWebPages(), loadPublicRepositoryCategories('web-page')])
      .then(([loadedPages, loadedCategories]) => {
        if (!isMounted) return;
        const nextCategories = loadedCategories.length > 0 ? loadedCategories : getDefaultRepositoryCategories('web-page');
        setPages(loadedPages);
        setCategories(nextCategories);
        setForm((current) => nextCategories.some((category) => category.key === current.category && category.isActive)
          ? current
          : { ...current, category: nextCategories.find((category) => category.isActive)?.key || 'general' });
      })
      .catch(() => {
        if (isMounted) setError('ไม่สามารถโหลดหน้าเว็บไซต์เพิ่มเติมได้ กรุณาตรวจสอบ migration และสิทธิ์ Supabase');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [canManage]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      if (key === 'title' && !editingId && !current.slug) return { ...current, title: value as string, slug: createSlugFromTitle(value as string) };
      return { ...current, [key]: value };
    });
    setError(null);
  };

  const getNextSortOrder = (category: string) => {
    const categoryPages = sortedPages.filter((page) => page.category === category && page.id !== editingId);
    return categoryPages.reduce((maxOrder, page) => Math.max(maxOrder, page.sortOrder), 0) + 10;
  };
  const getPagesInCategory = (category: string) => sortedPages.filter((page) => page.category === category);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setError(null);
  };

  const handleCategoriesChange = (nextCategories: PublicRepositoryCategory[]) => {
    setCategories(nextCategories);
    setForm((current) => nextCategories.some((category) => category.key === current.category && (category.isActive || Boolean(editingId)))
      ? current
      : { ...current, category: nextCategories.find((category) => category.isActive)?.key || 'general' });
  };

  const handleEdit = (page: PublicWebPage) => {
    setEditingId(page.id);
    setForm(toForm(page));
    setError(null);
    document.getElementById('public-web-page-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = async () => {
    if (!user || !canManage) {
      setError('เฉพาะ Admin และ Super Admin เท่านั้นที่จัดการหน้าเว็บไซต์ได้');
      return;
    }
    if (!form.title.trim()) {
      setError('กรุณาระบุชื่อหน้าเว็บไซต์');
      return;
    }
    if (!form.slug.trim()) {
      setError('กรุณาระบุ slug สำหรับลิงก์');
      return;
    }

    const input = {
      category: form.category,
      slug: form.slug,
      title: form.title,
      description: form.description,
      pdfUrl: form.pdfUrl,
      coverImageUrl: form.coverImageUrl,
      coverImageLayout: form.coverImageLayout,
      sortOrder: normalizeSortOrder(form.sortOrder || getNextSortOrder(form.category)),
      status: form.status,
      createdBy: editingPage?.createdBy || user.id,
      updatedBy: user.id,
    };
    const page = editingPage ? { ...editingPage, ...input, updatedAt: new Date().toISOString() } : createPublicWebPage(input);

    try {
      setIsSaving(true);
      const savedPage = await savePublicWebPage(page);
      setPages((current) => [savedPage, ...current.filter((entry) => entry.id !== savedPage.id)].sort(comparePublicWebPages));
      setSuccessMessage(editingPage ? 'แก้ไขหน้าเว็บไซต์เรียบร้อย' : 'สร้างหน้าเว็บไซต์เรียบร้อย');
      resetForm();
      if (!editingPage) setCurrentPage(0);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกหน้าเว็บไซต์ไม่สำเร็จ กรุณาตรวจสอบ slug ซ้ำหรือสิทธิ์ของบัญชี');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (page: PublicWebPage) => {
    if (!user || !canManage) return;
    const nextStatus: PublicWebPageStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      const savedPage = await updatePublicWebPageStatus(page.id, nextStatus, user.id);
      setPages((current) => current.map((entry) => entry.id === savedPage.id ? savedPage : entry).sort(comparePublicWebPages));
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะหน้าเว็บไซต์ได้');
    }
  };

  const handleMove = async (page: PublicWebPage, direction: -1 | 1) => {
    if (!user || !canManage) return;
    const categoryPages = getPagesInCategory(page.category);
    const pageIndex = categoryPages.findIndex((entry) => entry.id === page.id);
    const target = categoryPages[pageIndex + direction];
    if (!target) return;

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const [savedPage, savedTarget] = await Promise.all([
        savePublicWebPage({ ...page, sortOrder: target.sortOrder, updatedBy: user.id, updatedAt: now }),
        savePublicWebPage({ ...target, sortOrder: page.sortOrder, updatedBy: user.id, updatedAt: now }),
      ]);
      setPages((current) => current.map((entry) => {
        if (entry.id === savedPage.id) return savedPage;
        if (entry.id === savedTarget.id) return savedTarget;
        return entry;
      }).sort(comparePublicWebPages));
    } catch {
      setError('ไม่สามารถปรับลำดับได้ กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canManage) return;
    try {
      await deletePublicWebPage(deleteTarget.id);
      setPages((current) => current.filter((page) => page.id !== deleteTarget.id));
      setSuccessMessage('ลบหน้าเว็บไซต์เรียบร้อย');
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) resetForm();
    } catch {
      setError('ไม่สามารถลบหน้าเว็บไซต์ได้');
    }
  };

  const handleCopy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(getPublicPageUrl(slug));
      setSuccessMessage('คัดลอกลิงก์เรียบร้อย');
    } catch {
      setError('ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  if (!user || !canManage) return <section className="min-h-[calc(100vh-4rem)] bg-white p-8 text-sm text-slate-600">เฉพาะ Admin และ Super Admin เท่านั้นที่เข้าถึงหน้าจัดการเว็บไซต์ได้</section>;

  return (
    <section id="public-web-pages-manager" className="min-h-[calc(100vh-4rem)] bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Globe2 className="h-7 w-7 text-brand-700" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">เพิ่มหน้าเว็บไซต์</h1>
            <p className="mt-1 text-sm text-slate-600">สร้างรายการหน้าเว็บไซต์และลิงก์สาธารณะสำหรับนำไปใช้งานในระบบ</p>
          </div>
        </div>

        <div id="public-web-page-form" className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold tracking-normal text-slate-950">{editingPage ? 'แก้ไขหน้าเว็บไซต์' : 'ข้อมูลหน้าเว็บไซต์'}</h2>
            {editingPage ? <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" title="ยกเลิกแก้ไข"><X className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block"><span className="text-sm font-medium text-slate-700">หัวข้อหน้าเว็บไซต์</span><select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.category} onChange={(event) => updateForm('category', event.target.value)}>{activeCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>
                <PublicRepositoryCategoryManager repositoryType="web-page" title="หัวข้อหน้าเว็บไซต์" userId={user.id} categories={categories} onCategoriesChange={handleCategoriesChange} />
              </div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ชื่อหน้าเว็บไซต์</span><input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.title} onChange={(event) => updateForm('title', event.target.value)} /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">Slug สำหรับลิงก์</span><div className="mt-1 flex min-w-0 overflow-hidden rounded-md border border-slate-300 bg-white"><span className="hidden shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 sm:flex">/strategic-repository/pages/</span><input className="h-10 min-w-0 flex-1 px-3 text-sm outline-none" value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} /></div></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">รายละเอียด</span><textarea rows={4} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} placeholder="https://.../document.pdf" /></label>
                <AdminPublicPdfUpload userId={user.id} folder="web-pages" disabled={isSaving || isUploadingCover} onUploadingChange={setIsUploadingPdf} onError={setError} onUploaded={(upload) => { setForm((current) => ({ ...current, pdfUrl: upload.pdfUrl, coverImageUrl: current.coverImageUrl.trim() && !current.coverImageUrl.includes('/public-home-documents/') ? current.coverImageUrl : upload.coverImageUrl })); setError(null); }} />
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span><input type="url" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.coverImageUrl} onChange={(event) => updateForm('coverImageUrl', event.target.value)} placeholder="https://.../cover.jpg" /></label>
                <AdminCoverImageUpload disabled={isSaving || isUploadingPdf} onUploadingChange={setIsUploadingCover} onError={setError} onUploaded={(imageUrl) => updateForm('coverImageUrl', imageUrl)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span><input type="number" min={1} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.sortOrder} onChange={(event) => updateForm('sortOrder', normalizeSortOrder(Number(event.target.value)))} /></label>
                <div className="block"><span className="text-sm font-medium text-slate-700">สถานะ</span><button type="button" onClick={() => updateForm('status', form.status === 'published' ? 'draft' : 'published')} className={`mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${form.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}><span className={`h-2.5 w-2.5 rounded-full ${form.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />{form.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'portrait' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">360 x 640 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวตั้ง</span></button>
                <button type="button" onClick={() => updateForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'landscape' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">640 x 360 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวนอน</span></button>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Link2 className="h-4 w-4 text-brand-700" aria-hidden="true" /><span>ลิงก์สาธารณะ</span></div><p className="mt-2 break-all rounded-md bg-slate-50 p-3 text-xs text-slate-600">{form.slug ? getPublicPageUrl(form.slug) : '-'}</p></div>
            </div>
          </div>

          <div className="mt-4"><CoverImagePreview imageUrl={form.coverImageUrl} pdfUrl={form.pdfUrl} layout={form.coverImageLayout} title={form.title} /></div>
          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
          <button type="button" onClick={() => void handleSave()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{isUploadingPdf ? 'กำลังอัปโหลด PDF...' : isUploadingCover ? 'กำลังอัปโหลดภาพ...' : isSaving ? 'กำลังบันทึก...' : editingPage ? 'บันทึกการแก้ไข' : 'บันทึกหน้าเว็บไซต์'}</button>
        </div>

        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-950">รายการที่นำเข้าแล้ว</h2><p className="mt-1 text-sm text-slate-500">แสดงครั้งละ 10 รายการ เรียงตามหัวข้อหน้าเว็บไซต์และลำดับการแสดงผล</p></div><p className="text-sm font-semibold text-slate-600">ทั้งหมด {sortedPages.length} รายการ</p></div>
          {isLoading ? <p className="mt-4 p-6 text-sm text-slate-500">กำลังโหลดข้อมูล...</p> : null}
          {!isLoading && sortedPages.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">ยังไม่มีรายการที่นำเข้า</p> : null}
          {!isLoading && sortedPages.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500"><tr><th className="w-16 px-3 py-3">ลำดับ</th><th className="min-w-52 px-3 py-3">ชื่อหน้าเว็บไซต์</th><th className="min-w-44 px-3 py-3">หัวข้อ</th><th className="w-28 px-3 py-3">ลำดับแสดงผล</th><th className="w-32 px-3 py-3">ผู้เข้าชม</th><th className="min-w-28 px-3 py-3">สถานะ</th><th className="min-w-56 px-3 py-3">จัดการ</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedPages.map((page, index) => {
                      const absoluteIndex = safeCurrentPage * PAGE_SIZE + index + 1;
                      const categoryPages = getPagesInCategory(page.category);
                      const categoryIndex = categoryPages.findIndex((entry) => entry.id === page.id);
                      return <tr key={page.id} className={editingId === page.id ? 'bg-brand-50/70' : undefined}>
                        <td className="px-3 py-3 font-semibold text-slate-700">{absoluteIndex}</td>
                        <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white"><FileText className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="max-w-md truncate font-semibold text-slate-950">{page.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{page.slug}</p></div></div></td>
                        <td className="px-3 py-3 text-slate-600">{findPublicRepositoryCategory(categories, page.category)?.label || page.category}</td>
                        <td className="px-3 py-3 font-semibold text-slate-700">{page.sortOrder}</td>
                        <td className="px-3 py-3 text-slate-600">{page.viewCount.toLocaleString('th-TH')}</td>
                        <td className="px-3 py-3"><button type="button" disabled={isSaving} onClick={() => void handleToggleStatus(page)} className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${page.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{page.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></td>
                        <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={categoryIndex === 0 || isSaving} onClick={() => void handleMove(page, -1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" title="เลื่อนขึ้นในหัวข้อเดียวกัน"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={categoryIndex === categoryPages.length - 1 || isSaving} onClick={() => void handleMove(page, 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" title="เลื่อนลงในหัวข้อเดียวกัน"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => void handleCopy(page.slug)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50" title="คัดลอกลิงก์"><Clipboard className="h-4 w-4" /></button><a href={getPublicPageUrl(page.slug)} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50" title="เปิดลิงก์"><ExternalLink className="h-4 w-4" /></a><button type="button" onClick={() => handleEdit(page)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Edit3 className="h-4 w-4" />แก้ไข</button><button type="button" onClick={() => setDeleteTarget(page)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100" title="ลบ"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">หน้า {safeCurrentPage + 1} จาก {totalPages}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={safeCurrentPage === 0} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">ก่อนหน้า</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={safeCurrentPage >= totalPages - 1} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">ถัดไป</button></div></div>
            </>
          ) : null}
        </div>
      </div>
      <ConfirmModal isOpen={Boolean(successMessage)} onClose={() => setSuccessMessage(null)} onConfirm={() => setSuccessMessage(null)} title="ดำเนินการสำเร็จ" message={successMessage || ''} confirmLabel="ตกลง" showCancelButton={false} variant="success" />
      <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} title="ยืนยันการลบ" message={`ต้องการลบหน้าเว็บไซต์ "${deleteTarget?.title || ''}" หรือไม่`} confirmLabel="ลบ" cancelLabel="ยกเลิก" variant="danger" />
    </section>
  );
}
