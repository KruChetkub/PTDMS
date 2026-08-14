import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clipboard, Edit3, ExternalLink, FilePlus2, FileText, Globe2, Link2, Save, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import { PublicRepositoryCategoryManager } from './PublicRepositoryCategoryManager';
import { findPublicRepositoryCategory, getDefaultRepositoryCategories, loadPublicRepositoryCategories, type PublicRepositoryCategory } from '../services/publicRepositoryCategories.service';
import {
  comparePublicWebPageItems,
  comparePublicWebPages,
  createPublicWebPage,
  createPublicWebPageItem,
  createSlugFromTitle,
  deletePublicWebPage,
  deletePublicWebPageItem,
  loadPublicWebPageItems,
  loadPublicWebPages,
  savePublicWebPage,
  savePublicWebPageItem,
  updatePublicWebPageItemStatus,
  updatePublicWebPageStatus,
  type PublicWebPage,
  type PublicWebPageItem,
  type PublicWebPageStatus,
} from '../services/publicWebPages.service';

type PageForm = {
  category: string;
  title: string;
  slug: string;
  description: string;
  status: PublicWebPageStatus;
};

type ItemForm = {
  category: string;
  title: string;
  description: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: 'portrait' | 'landscape';
  sortOrder: number;
  status: PublicWebPageStatus;
};

const defaultPageForm: PageForm = { category: 'general', title: '', slug: '', description: '', status: 'draft' };
const defaultItemForm: ItemForm = { category: 'general', title: '', description: '', pdfUrl: '', coverImageUrl: '', coverImageLayout: 'portrait', sortOrder: 10, status: 'draft' };

function getPublicPageUrl(slug: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/strategic-repository/pages/${slug}`;
}

function normalizeSortOrder(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 10;
}

function toPageForm(page: PublicWebPage): PageForm {
  return { category: page.category, title: page.title, slug: page.slug, description: page.description, status: page.status };
}

function toItemForm(item: PublicWebPageItem): ItemForm {
  return {
    category: item.category,
    title: item.title,
    description: item.description,
    pdfUrl: item.pdfUrl,
    coverImageUrl: item.coverImageUrl,
    coverImageLayout: item.coverImageLayout,
    sortOrder: item.sortOrder,
    status: item.status,
  };
}

export function PublicWebPagesManager() {
  const { user, profile } = useAuthStore();
  const canManage = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [pages, setPages] = useState<PublicWebPage[]>([]);
  const [items, setItems] = useState<PublicWebPageItem[]>([]);
  const [categories, setCategories] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('web-page'));
  const [itemCategories, setItemCategories] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('web-page-item'));
  const [pageForm, setPageForm] = useState<PageForm>(defaultPageForm);
  const [itemForm, setItemForm] = useState<ItemForm>(defaultItemForm);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [deletePageTarget, setDeletePageTarget] = useState<PublicWebPage | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<PublicWebPageItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPage = selectedPageId ? pages.find((page) => page.id === selectedPageId) || null : null;
  const editingPage = editingPageId ? pages.find((page) => page.id === editingPageId) || null : null;
  const editingItem = editingItemId ? items.find((item) => item.id === editingItemId) || null : null;
  const categoryOrder = useMemo(() => new Map(categories.map((category, index) => [category.key, index])), [categories]);
  const itemCategoryOrder = useMemo(() => new Map(itemCategories.map((category, index) => [category.key, index])), [itemCategories]);
  const sortedPages = useMemo(() => [...pages].sort((first, second) => {
    const categoryCompare = (categoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER) - (categoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER);
    return categoryCompare || comparePublicWebPages(first, second);
  }), [pages, categoryOrder]);
  const sortedItems = useMemo(() => [...items].sort((first, second) => {
    const categoryCompare = (itemCategoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER) - (itemCategoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER);
    return categoryCompare || comparePublicWebPageItems(first, second);
  }), [items, itemCategoryOrder]);
  const activeCategories = categories.filter((category) => category.isActive || category.key === pageForm.category);
  const activeItemCategories = itemCategories.filter((category) => category.isActive || category.key === itemForm.category);

  useEffect(() => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    void Promise.all([loadPublicWebPages(), loadPublicRepositoryCategories('web-page'), loadPublicRepositoryCategories('web-page-item')])
      .then(([loadedPages, loadedCategories, loadedItemCategories]) => {
        if (!isMounted) return;
        const nextCategories = loadedCategories.length ? loadedCategories : getDefaultRepositoryCategories('web-page');
        const nextItemCategories = loadedItemCategories.length ? loadedItemCategories : getDefaultRepositoryCategories('web-page-item');
        setPages(loadedPages);
        setCategories(nextCategories);
        setItemCategories(nextItemCategories);
        setItemForm((current) => nextItemCategories.some((category) => category.key === current.category && category.isActive)
          ? current
          : { ...current, category: nextItemCategories.find((category) => category.isActive)?.key || 'general' });
        if (loadedPages[0]) setSelectedPageId(loadedPages[0].id);
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
    if (!selectedPageId) {
      setItems([]);
      return;
    }
    let isMounted = true;
    void loadPublicWebPageItems(selectedPageId).then((loadedItems) => {
      if (isMounted) setItems(loadedItems);
    }).catch(() => {
      if (isMounted) setError('ไม่สามารถโหลดรายการในหน้าเว็บไซต์ได้');
    });
    return () => {
      isMounted = false;
    };
  }, [selectedPageId]);

  const updatePageForm = <K extends keyof PageForm>(key: K, value: PageForm[K]) => {
    setPageForm((current) => {
      if (key === 'title' && !editingPageId && !current.slug) return { ...current, title: value as string, slug: createSlugFromTitle(value as string) };
      return { ...current, [key]: value };
    });
    setError(null);
  };

  const updateItemForm = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => {
    setItemForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const resetPageForm = () => {
    setPageForm(defaultPageForm);
    setEditingPageId(null);
    setError(null);
  };

  const resetItemForm = () => {
    setItemForm(defaultItemForm);
    setEditingItemId(null);
    setError(null);
  };

  const getNextItemSortOrder = (category: string) => {
    const categoryItems = sortedItems.filter((item) => item.category === category && item.id !== editingItemId);
    return categoryItems.reduce((maxOrder, item) => Math.max(maxOrder, item.sortOrder), 0) + 10;
  };

  const getItemsInCategory = (category: string) => sortedItems.filter((item) => item.category === category);

  const handleItemCategoriesChange = (nextCategories: PublicRepositoryCategory[]) => {
    setItemCategories(nextCategories);
    setItemForm((current) => nextCategories.some((category) => category.key === current.category && (category.isActive || Boolean(editingItemId)))
      ? current
      : { ...current, category: nextCategories.find((category) => category.isActive)?.key || 'general' });
  };

  const openItemModal = (page: PublicWebPage) => {
    if (selectedPageId !== page.id) setItems([]);
    setSelectedPageId(page.id);
    resetItemForm();
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    resetItemForm();
  };

  const handleEditPage = (page: PublicWebPage) => {
    setSelectedPageId(page.id);
    setEditingPageId(page.id);
    setPageForm(toPageForm(page));
    document.getElementById('public-web-page-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEditItem = (item: PublicWebPageItem) => {
    setEditingItemId(item.id);
    setItemForm(toItemForm(item));
    setIsItemModalOpen(true);
  };

  const handleSavePage = async () => {
    if (!user || !canManage) return;
    if (!pageForm.title.trim()) {
      setError('กรุณาระบุชื่อหน้าเว็บไซต์');
      return;
    }
    if (!pageForm.slug.trim()) {
      setError('กรุณาระบุ slug สำหรับลิงก์');
      return;
    }

    const input = {
      category: pageForm.category,
      slug: pageForm.slug,
      title: pageForm.title,
      description: pageForm.description,
      status: pageForm.status,
      createdBy: editingPage?.createdBy || user.id,
      updatedBy: user.id,
    };
    const page = editingPage ? { ...editingPage, ...input, updatedAt: new Date().toISOString() } : createPublicWebPage(input);

    try {
      setIsSaving(true);
      const savedPage = await savePublicWebPage(page);
      setPages((current) => [savedPage, ...current.filter((entry) => entry.id !== savedPage.id)].sort(comparePublicWebPages));
      setSelectedPageId(savedPage.id);
      setSuccessMessage(editingPage ? 'แก้ไขหน้าเว็บไซต์เรียบร้อย' : 'สร้างหน้าเว็บไซต์เรียบร้อย');
      resetPageForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกหน้าเว็บไซต์ไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async () => {
    if (!user || !canManage || !selectedPage) return;
    if (!itemForm.title.trim()) {
      setError('กรุณาระบุชื่อแผน/เอกสาร');
      return;
    }

    const nextSortOrder = normalizeSortOrder(itemForm.sortOrder || getNextItemSortOrder(itemForm.category));
    const input = {
      pageId: selectedPage.id,
      category: itemForm.category,
      title: itemForm.title,
      description: itemForm.description,
      pdfUrl: itemForm.pdfUrl,
      coverImageUrl: itemForm.coverImageUrl,
      coverImageLayout: itemForm.coverImageLayout,
      sortOrder: nextSortOrder,
      status: itemForm.status,
      createdBy: editingItem?.createdBy || user.id,
      updatedBy: user.id,
    };
    const item = editingItem ? { ...editingItem, ...input, updatedAt: new Date().toISOString() } : createPublicWebPageItem(input);

    try {
      const wasEditingItem = Boolean(editingItem);
      setIsSaving(true);
      const savedItem = await savePublicWebPageItem(item);
      setItems((current) => [savedItem, ...current.filter((entry) => entry.id !== savedItem.id)].sort(comparePublicWebPageItems));
      setSuccessMessage(wasEditingItem ? 'แก้ไขรายการเรียบร้อย' : 'เพิ่มรายการในหน้าเว็บไซต์เรียบร้อย');
      resetItemForm();
      if (wasEditingItem) setIsItemModalOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกรายการไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePageStatus = async (page: PublicWebPage) => {
    if (!user) return;
    const nextStatus: PublicWebPageStatus = page.status === 'published' ? 'draft' : 'published';
    const savedPage = await updatePublicWebPageStatus(page.id, nextStatus, user.id);
    setPages((current) => current.map((entry) => entry.id === savedPage.id ? savedPage : entry));
  };

  const handleToggleItemStatus = async (item: PublicWebPageItem) => {
    if (!user) return;
    const nextStatus: PublicWebPageStatus = item.status === 'published' ? 'draft' : 'published';
    const savedItem = await updatePublicWebPageItemStatus(item.id, nextStatus, user.id);
    setItems((current) => current.map((entry) => entry.id === savedItem.id ? savedItem : entry).sort(comparePublicWebPageItems));
  };

  const handleMoveItem = async (item: PublicWebPageItem, direction: -1 | 1) => {
    if (!user) return;
    const categoryItems = getItemsInCategory(item.category);
    const index = categoryItems.findIndex((entry) => entry.id === item.id);
    const target = categoryItems[index + direction];
    if (!target) return;
    const now = new Date().toISOString();
    const [savedItem, savedTarget] = await Promise.all([
      savePublicWebPageItem({ ...item, sortOrder: target.sortOrder, updatedBy: user.id, updatedAt: now }),
      savePublicWebPageItem({ ...target, sortOrder: item.sortOrder, updatedBy: user.id, updatedAt: now }),
    ]);
    setItems((current) => current.map((entry) => {
      if (entry.id === savedItem.id) return savedItem;
      if (entry.id === savedTarget.id) return savedTarget;
      return entry;
    }).sort(comparePublicWebPageItems));
  };

  const handleDeletePage = async () => {
    if (!deletePageTarget) return;
    await deletePublicWebPage(deletePageTarget.id);
    setPages((current) => current.filter((page) => page.id !== deletePageTarget.id));
    if (selectedPageId === deletePageTarget.id) {
      setSelectedPageId(null);
      setIsItemModalOpen(false);
    }
    setDeletePageTarget(null);
    setSuccessMessage('ลบหน้าเว็บไซต์เรียบร้อย');
  };

  const handleDeleteItem = async () => {
    if (!deleteItemTarget) return;
    await deletePublicWebPageItem(deleteItemTarget.id);
    setItems((current) => current.filter((item) => item.id !== deleteItemTarget.id));
    setDeleteItemTarget(null);
    setSuccessMessage('ลบรายการเรียบร้อย');
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
            <p className="mt-1 text-sm text-slate-600">สร้าง 1 ลิงก์เว็บไซต์ แล้วเพิ่มแผน/เอกสารได้หลายรายการในลิงก์นั้น</p>
          </div>
        </div>

        <div id="public-web-page-form" className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-950">{editingPage ? 'แก้ไขหน้าเว็บไซต์' : 'ข้อมูลหน้าเว็บไซต์'}</h2>
            {editingPage ? <button type="button" onClick={resetPageForm} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600"><X className="h-4 w-4" /></button> : null}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block"><span className="text-sm font-medium text-slate-700">หัวข้อหน้าเว็บไซต์</span><select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={pageForm.category} onChange={(event) => updatePageForm('category', event.target.value)}>{activeCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>
                <PublicRepositoryCategoryManager repositoryType="web-page" title="หัวข้อหน้าเว็บไซต์" userId={user.id} categories={categories} onCategoriesChange={setCategories} />
              </div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ชื่อหน้าเว็บไซต์</span><input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={pageForm.title} onChange={(event) => updatePageForm('title', event.target.value)} /></label>
            </div>
            <div className="grid gap-3">
              <label className="block"><span className="text-sm font-medium text-slate-700">Slug สำหรับลิงก์</span><div className="mt-1 flex overflow-hidden rounded-md border border-slate-300 bg-white"><span className="hidden shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 sm:flex">/strategic-repository/pages/</span><input className="h-10 min-w-0 flex-1 px-3 text-sm outline-none" value={pageForm.slug} onChange={(event) => updatePageForm('slug', event.target.value)} /></div></label>
              <div className="block"><span className="text-sm font-medium text-slate-700">สถานะหน้าเว็บไซต์</span><button type="button" onClick={() => updatePageForm('status', pageForm.status === 'published' ? 'draft' : 'published')} className={`mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${pageForm.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}><span className={`h-2.5 w-2.5 rounded-full ${pageForm.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{pageForm.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></div>
            </div>
          </div>
          <label className="mt-4 block"><span className="text-sm font-medium text-slate-700">รายละเอียดหน้าเว็บไซต์</span><textarea rows={3} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={pageForm.description} onChange={(event) => updatePageForm('description', event.target.value)} /></label>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Link2 className="h-4 w-4 text-brand-700" /><span>ลิงก์สาธารณะ</span></div><p className="mt-2 break-all rounded-md bg-slate-50 p-3 text-xs text-slate-600">{pageForm.slug ? getPublicPageUrl(pageForm.slug) : '-'}</p></div>
          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
          <button type="button" onClick={() => void handleSavePage()} disabled={isSaving} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? 'กำลังบันทึก...' : editingPage ? 'บันทึกหน้าเว็บไซต์' : 'สร้างหน้าเว็บไซต์'}</button>
        </div>

        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-950">หน้าเว็บไซต์ที่สร้างแล้ว</h2><p className="mt-1 text-sm text-slate-500">เลือกหน้าเว็บไซต์เพื่อเพิ่มแผน/เอกสารหลายรายการในลิงก์เดียวกัน</p></div><p className="text-sm font-semibold text-slate-600">ทั้งหมด {sortedPages.length} หน้า</p></div>
          {isLoading ? <p className="mt-4 p-6 text-sm text-slate-500">กำลังโหลดข้อมูล...</p> : null}
          {!isLoading && sortedPages.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">ยังไม่มีหน้าเว็บไซต์</p> : null}
          {sortedPages.length > 0 ? <div className="mt-4 overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><th className="w-16 px-3 py-3">ลำดับ</th><th className="min-w-56 px-3 py-3">ชื่อหน้าเว็บไซต์</th><th className="min-w-44 px-3 py-3">หัวข้อ</th><th className="w-32 px-3 py-3">ผู้เข้าชม</th><th className="w-32 px-3 py-3">สถานะ</th><th className="min-w-72 px-3 py-3">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{sortedPages.map((page, index) => <tr key={page.id} className={selectedPageId === page.id ? 'bg-brand-50/70' : undefined}><td className="px-3 py-3 font-semibold text-slate-700">{index + 1}</td><td className="px-3 py-3"><p className="font-semibold text-slate-950">{page.title}</p><p className="mt-1 text-xs text-slate-500">{page.slug}</p></td><td className="px-3 py-3 text-slate-600">{findPublicRepositoryCategory(categories, page.category)?.label || page.category}</td><td className="px-3 py-3 text-slate-600">{page.viewCount.toLocaleString('th-TH')}</td><td className="px-3 py-3"><button type="button" onClick={() => void handleTogglePageStatus(page)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${page.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{page.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openItemModal(page)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><FilePlus2 className="h-4 w-4" />เพิ่มรายการ</button><button type="button" onClick={() => void handleCopy(page.slug)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700" title="คัดลอกลิงก์"><Clipboard className="h-4 w-4" /></button><a href={getPublicPageUrl(page.slug)} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700" title="เปิดลิงก์"><ExternalLink className="h-4 w-4" /></a><button type="button" onClick={() => handleEditPage(page)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><Edit3 className="h-4 w-4" />แก้ไข</button><button type="button" onClick={() => setDeletePageTarget(page)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div> : null}
        </div>
      </div>

      {isItemModalOpen && selectedPage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{editingItem ? 'แก้ไขแผน/เอกสาร' : 'เพิ่มแผน/เอกสารในหน้าเว็บไซต์'}</h2>
                <p className="mt-1 text-sm text-slate-500">หน้า: {selectedPage.title}</p>
              </div>
              <button type="button" onClick={closeItemModal} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="ปิด">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto p-4 sm:p-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h3>
                    <p className="mt-1 text-sm text-slate-500">เพิ่มแผน/เอกสารได้หลายรายการในลิงก์เดียวกัน</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div className="grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-end">
                      <label className="block min-w-0"><span className="text-sm font-medium text-slate-700">หัวข้อแผน/เอกสาร</span><select className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm" value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value, sortOrder: getNextItemSortOrder(event.target.value) }))}>{activeItemCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>
                      <PublicRepositoryCategoryManager repositoryType="web-page-item" title="หัวข้อแผน/เอกสารในหน้าเว็บไซต์" buttonLabel="จัดการหัวข้อ" userId={user.id} categories={itemCategories} onCategoriesChange={handleItemCategoriesChange} onSuccess={setSuccessMessage} />
                    </div>
                    <label className="block"><span className="text-sm font-medium text-slate-700">ชื่อแผน/เอกสาร</span><input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={itemForm.title} onChange={(event) => updateItemForm('title', event.target.value)} /></label>
                    <label className="block"><span className="text-sm font-medium text-slate-700">รายละเอียด</span><textarea rows={4} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={itemForm.description} onChange={(event) => updateItemForm('description', event.target.value)} /></label>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={itemForm.pdfUrl} onChange={(event) => updateItemForm('pdfUrl', event.target.value)} placeholder="https://.../document.pdf" /></label>
                      <AdminPublicPdfUpload userId={user.id} folder="web-pages" disabled={isSaving || isUploadingCover} onUploadingChange={setIsUploadingPdf} onError={setError} onUploaded={(upload) => { setItemForm((current) => ({ ...current, pdfUrl: upload.pdfUrl, coverImageUrl: current.coverImageUrl.trim() ? current.coverImageUrl : upload.coverImageUrl })); setError(null); }} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span><input type="url" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={itemForm.coverImageUrl} onChange={(event) => updateItemForm('coverImageUrl', event.target.value)} placeholder="https://.../cover.jpg" /></label>
                      <AdminCoverImageUpload disabled={isSaving || isUploadingPdf} onUploadingChange={setIsUploadingCover} onError={setError} onUploaded={(imageUrl) => updateItemForm('coverImageUrl', imageUrl)} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span><input type="number" min={1} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={itemForm.sortOrder} onChange={(event) => updateItemForm('sortOrder', normalizeSortOrder(Number(event.target.value)))} /></label>
                      <div className="block"><span className="text-sm font-medium text-slate-700">สถานะ</span><button type="button" onClick={() => updateItemForm('status', itemForm.status === 'published' ? 'draft' : 'published')} className={`mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${itemForm.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}><span className={`h-2.5 w-2.5 rounded-full ${itemForm.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{itemForm.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => updateItemForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${itemForm.coverImageLayout === 'portrait' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>360 x 640 px<br />ภาพแนวตั้ง</button>
                      <button type="button" onClick={() => updateItemForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${itemForm.coverImageLayout === 'landscape' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>640 x 360 px<br />ภาพแนวนอน</button>
                    </div>
                  </div>
                </div>
                <div className="mt-4"><CoverImagePreview imageUrl={itemForm.coverImageUrl} pdfUrl={itemForm.pdfUrl} layout={itemForm.coverImageLayout} title={itemForm.title} /></div>
                {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
                {editingItem ? (
                  <div className="mt-4 flex justify-end gap-3">
                    <button type="button" onClick={closeItemModal} disabled={isSaving || isUploadingPdf || isUploadingCover} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">ยกเลิก</button>
                    <button type="button" onClick={() => void handleSaveItem()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" />บันทึกการแก้ไข</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => void handleSaveItem()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" />เพิ่มรายการในหน้านี้</button>
                )}
              </div>

              <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">รายการที่นำเข้าแล้ว</h3>
                    <p className="mt-1 text-sm text-slate-500">หน้า: {selectedPage.title}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">ทั้งหมด {sortedItems.length} รายการ</p>
                </div>
                {sortedItems.length ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><th className="w-16 px-3 py-3">ลำดับ</th><th className="min-w-64 px-3 py-3">ชื่อแผน/เอกสาร</th><th className="min-w-36 px-3 py-3">หัวข้อ</th><th className="w-28 px-3 py-3">ลำดับแสดงผล</th><th className="w-32 px-3 py-3">สถานะ</th><th className="min-w-56 px-3 py-3">จัดการ</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {sortedItems.map((item, index) => {
                          const categoryItems = getItemsInCategory(item.category);
                          const categoryIndex = categoryItems.findIndex((entry) => entry.id === item.id);
                          return (
                            <tr key={item.id} className={editingItemId === item.id ? 'bg-brand-50/70' : undefined}>
                              <td className="px-3 py-3 font-semibold text-slate-700">{index + 1}</td>
                              <td className="px-3 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white"><FileText className="h-4 w-4" /></span><div><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{item.description || '-'}</p></div></div></td>
                              <td className="px-3 py-3 text-slate-600">{findPublicRepositoryCategory(itemCategories, item.category)?.label || item.category}</td>
                              <td className="px-3 py-3 font-semibold text-slate-700">{item.sortOrder}</td>
                              <td className="px-3 py-3"><button type="button" onClick={() => void handleToggleItemStatus(item)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${item.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{item.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></td>
                              <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button type="button" disabled={categoryIndex <= 0 || isSaving} onClick={() => void handleMoveItem(item, -1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={categoryIndex === -1 || categoryIndex === categoryItems.length - 1 || isSaving} onClick={() => void handleMoveItem(item, 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => handleEditItem(item)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><Edit3 className="h-4 w-4" />แก้ไข</button><button type="button" onClick={() => setDeleteItemTarget(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">ยังไม่มีรายการในหน้านี้</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal isOpen={Boolean(successMessage)} onClose={() => setSuccessMessage(null)} onConfirm={() => setSuccessMessage(null)} title="ดำเนินการสำเร็จ" message={successMessage || ''} confirmLabel="ตกลง" showCancelButton={false} variant="success" />
      <ConfirmModal isOpen={Boolean(deletePageTarget)} onClose={() => setDeletePageTarget(null)} onConfirm={() => void handleDeletePage()} title="ยืนยันการลบ" message={`ต้องการลบหน้าเว็บไซต์ "${deletePageTarget?.title || ''}" และรายการทั้งหมดในหน้านี้หรือไม่`} confirmLabel="ลบ" cancelLabel="ยกเลิก" variant="danger" />
      <ConfirmModal isOpen={Boolean(deleteItemTarget)} onClose={() => setDeleteItemTarget(null)} onConfirm={() => void handleDeleteItem()} title="ยืนยันการลบ" message={`ต้องการลบรายการ "${deleteItemTarget?.title || ''}" หรือไม่`} confirmLabel="ลบ" cancelLabel="ยกเลิก" variant="danger" />
    </section>
  );
}
