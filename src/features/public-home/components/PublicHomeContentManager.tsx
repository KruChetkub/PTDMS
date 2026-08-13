import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Edit3, Save, Settings2, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import { AdminHomeLogoUpload } from './AdminHomeLogoUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import {
  createPublicHomeContent,
  loadPublicHomeContent,
  savePublicHomeContent,
  updatePublicHomeContentStatus,
  type PublicHomeColorKey,
  type PublicHomeContentItem,
  type PublicHomeContentSection,
  type PublicHomeContentStatus,
  type PublicHomeIconKey,
  type PublicHomeTargetView,
} from '../services/publicHomeContent.service';
import { PublicRepositoryCategoryManager } from './PublicRepositoryCategoryManager';
import {
  findPublicRepositoryCategory,
  getDefaultRepositoryCategories,
  loadPublicRepositoryCategories,
  type PublicRepositoryCategory,
} from '../services/publicRepositoryCategories.service';

type FormState = {
  section: PublicHomeContentSection;
  title: string;
  description: string;
  actionLabel: string;
  targetView: PublicHomeTargetView;
  iconKey: PublicHomeIconKey;
  colorKey: PublicHomeColorKey;
  logoUrl: string;
  pdfUrl: string;
  sortOrder: number;
  status: PublicHomeContentStatus;
};

const PAGE_SIZE = 10;

const defaultForm: FormState = {
  section: 'plan',
  title: '',
  description: '',
  actionLabel: 'รายละเอียด',
  targetView: 'plans',
  iconKey: 'file-chart',
  colorKey: 'blue',
  logoUrl: '',
  pdfUrl: '',
  sortOrder: 10,
  status: 'draft',
};

const iconOptions: Array<{ value: PublicHomeIconKey; label: string }> = [
  { value: 'landmark', label: 'ยุทธศาสตร์/หน่วยงาน' },
  { value: 'target', label: 'เป้าหมาย' },
  { value: 'file-chart', label: 'แผนและรายงาน' },
  { value: 'briefcase', label: 'นโยบายผู้บริหาร' },
  { value: 'shield', label: 'การป้องกันควบคุมโรค' },
  { value: 'clipboard', label: 'ผลการดำเนินงาน' },
  { value: 'coins', label: 'งบประมาณ' },
  { value: 'microscope', label: 'งานวิจัย' },
];

const colorOptions: Array<{ value: PublicHomeColorKey; label: string; swatch: string }> = [
  { value: 'blue', label: 'น้ำเงิน', swatch: 'bg-blue-600' },
  { value: 'emerald', label: 'เขียว', swatch: 'bg-emerald-600' },
  { value: 'violet', label: 'ม่วง', swatch: 'bg-violet-600' },
  { value: 'orange', label: 'ส้ม', swatch: 'bg-orange-500' },
  { value: 'rose', label: 'ชมพู', swatch: 'bg-rose-500' },
  { value: 'teal', label: 'เขียวอมฟ้า', swatch: 'bg-teal-600' },
];

function toForm(item: PublicHomeContentItem): FormState {
  return {
    section: item.section,
    title: item.title,
    description: item.description,
    actionLabel: item.actionLabel,
    targetView: item.targetView,
    iconKey: item.iconKey,
    colorKey: item.colorKey,
    logoUrl: item.logoUrl,
    pdfUrl: item.pdfUrl,
    sortOrder: item.sortOrder,
    status: item.status,
  };
}

export function PublicHomeContentManager() {
  const { user, profile } = useAuthStore();
  const canManage = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [items, setItems] = useState<PublicHomeContentItem[]>([]);
  const [sections, setSections] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('home'));
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const editingItem = editingId ? items.find((item) => item.id === editingId) || null : null;
  const sectionOrder = useMemo(() => new Map(sections.map((section, index) => [section.key, index])), [sections]);
  const compareItems = (first: PublicHomeContentItem, second: PublicHomeContentItem) => {
    const sectionCompare = (sectionOrder.get(first.section) ?? Number.MAX_SAFE_INTEGER) - (sectionOrder.get(second.section) ?? Number.MAX_SAFE_INTEGER);
    return sectionCompare || first.sortOrder - second.sortOrder || first.title.localeCompare(second.title, 'th');
  };
  const sortedItems = useMemo(() => [...items].sort(compareItems), [items, sectionOrder]);
  const activeSections = sections.filter((section) => section.isActive || section.key === form.section);
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pagedItems = sortedItems.slice(safeCurrentPage * PAGE_SIZE, safeCurrentPage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void Promise.all([loadPublicHomeContent(), loadPublicRepositoryCategories('home')])
      .then(([loadedItems, loadedSections]) => {
        if (isMounted) {
          setItems(loadedItems);
          setSections(loadedSections);
          setForm((current) => loadedSections.some((section) => section.key === current.section && section.isActive)
            ? current
            : { ...current, section: loadedSections.find((section) => section.isActive)?.key || 'plan' });
        }
      })
      .catch(() => {
        if (isMounted) setError('ไม่สามารถโหลดข้อมูลตั้งค่าหน้า Home ได้ กรุณาตรวจสอบ migration และสิทธิ์ Supabase');
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
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setError(null);
  };

  const handleSectionsChange = (nextSections: PublicRepositoryCategory[]) => {
    setSections(nextSections);
    setForm((current) => nextSections.some((section) => section.key === current.section && (section.isActive || Boolean(editingId)))
      ? current
      : { ...current, section: nextSections.find((section) => section.isActive)?.key || 'plan' });
  };

  const handleEdit = (item: PublicHomeContentItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setError(null);
    document.getElementById('home-content-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = async () => {
    if (!user || !canManage) {
      setError('เฉพาะ Admin และ Super Admin เท่านั้นที่จัดการหน้า Home ได้');
      return;
    }
    if (!form.title.trim()) {
      setError('กรุณาระบุหัวข้อที่ต้องการแสดง');
      return;
    }

    const input = {
      section: form.section,
      title: form.title.trim(),
      description: form.description.trim(),
      actionLabel: form.actionLabel.trim() || 'รายละเอียด',
      targetView: form.targetView,
      iconKey: form.iconKey,
      colorKey: form.colorKey,
      logoUrl: form.logoUrl.trim(),
      pdfUrl: form.pdfUrl.trim(),
      sortOrder: Math.max(1, Math.round(form.sortOrder || 10)),
      status: form.status,
      createdBy: editingItem?.createdBy || user.id,
      updatedBy: user.id,
    };
    const item = editingItem
      ? { ...editingItem, ...input, updatedAt: new Date().toISOString() }
      : createPublicHomeContent(input);

    try {
      setIsSaving(true);
      setError(null);
      const savedItem = await savePublicHomeContent(item);
      setItems((current) => [savedItem, ...current.filter((entry) => entry.id !== savedItem.id)].sort(compareItems));
      setSuccessMessage(editingItem ? 'แก้ไขข้อมูลหน้า Home เรียบร้อย' : 'เพิ่มข้อมูลหน้า Home เรียบร้อย');
      resetForm();
    } catch {
      setError('บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบ migration และสิทธิ์ของบัญชี');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item: PublicHomeContentItem) => {
    if (!user || !canManage) return;
    const nextStatus: PublicHomeContentStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      const savedItem = await updatePublicHomeContentStatus(item.id, nextStatus, user.id);
      setItems((current) => current.map((entry) => entry.id === savedItem.id ? savedItem : entry));
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะการเผยแพร่ได้');
    }
  };

  const handleMove = async (item: PublicHomeContentItem, direction: -1 | 1) => {
    if (!user || !canManage) return;
    const sectionItems = sortedItems.filter((entry) => entry.section === item.section);
    const index = sectionItems.findIndex((entry) => entry.id === item.id);
    const target = sectionItems[index + direction];
    if (!target) return;

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const [savedItem, savedTarget] = await Promise.all([
        savePublicHomeContent({ ...item, sortOrder: target.sortOrder, updatedBy: user.id, updatedAt: now }),
        savePublicHomeContent({ ...target, sortOrder: item.sortOrder, updatedBy: user.id, updatedAt: now }),
      ]);
      setItems((current) => current.map((entry) => {
        if (entry.id === savedItem.id) return savedItem;
        if (entry.id === savedTarget.id) return savedTarget;
        return entry;
      }).sort(compareItems));
    } catch {
      setError('ไม่สามารถปรับลำดับการแสดงผลได้');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !canManage) {
    return <section className="min-h-[calc(100vh-4rem)] bg-white p-8 text-sm text-slate-600">เฉพาะ Admin และ Super Admin เท่านั้นที่เข้าถึงหน้าตั้งค่า Home ได้</section>;
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-brand-700" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">ตั้งค่าหน้า Home</h1>
            <p className="mt-1 text-sm text-slate-600">เพิ่มและจัดลำดับข้อมูลที่แสดงในหน้าหลักนโยบายและยุทธศาสตร์</p>
          </div>
        </div>

        <div id="home-content-form" className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-950">{editingItem ? 'แก้ไขข้อมูลหน้า Home' : 'ข้อมูลหน้า Home'}</h2>
            {editingItem ? <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600" title="ยกเลิกการแก้ไข"><X className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <label className="text-sm font-medium text-slate-700">ส่วนที่แสดง
                    <select value={form.section} onChange={(event) => updateForm('section', event.target.value as PublicHomeContentSection)} className="mt-1 h-10 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3">
                      {activeSections.map((section) => <option key={section.id} value={section.key}>{section.label}</option>)}
                    </select>
                  </label>
                  <PublicRepositoryCategoryManager repositoryType="home" title="ส่วนที่แสดง" userId={user.id} categories={sections} onCategoriesChange={handleSectionsChange} onSuccess={setSuccessMessage} />
                </div>
                <label className="block text-sm font-medium text-slate-700">ลำดับการแสดงผล
                  <input type="number" min={1} value={form.sortOrder} onChange={(event) => updateForm('sortOrder', Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">หัวข้อที่แสดงบนหน้า Home
                <input value={form.title} maxLength={160} onChange={(event) => updateForm('title', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" />
              </label>
              <label className="block text-sm font-medium text-slate-700">รายละเอียด
                <textarea value={form.description} maxLength={1000} onChange={(event) => updateForm('description', event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" />
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF
                  <input type="url" value={form.pdfUrl} maxLength={2048} onChange={(event) => updateForm('pdfUrl', event.target.value)} placeholder="https://.../document.pdf" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" />
                </label>
                <div className="mt-2">
                  <AdminPublicPdfUpload
                    userId={user.id}
                    folder="home-content"
                    disabled={isSaving || isUploadingLogo}
                    onUploadingChange={setIsUploadingPdf}
                    onError={setError}
                    onUploaded={(upload) => updateForm('pdfUrl', upload.pdfUrl)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">หน้าปลายทาง
                  <select value={form.targetView} onChange={(event) => updateForm('targetView', event.target.value as PublicHomeTargetView)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">
                    <option value="plans">ยุทธศาสตร์/แผน</option><option value="performance">ผลการดำเนินงาน</option><option value="research">งานวิจัย</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">ข้อความบนปุ่ม
                  <input value={form.actionLabel} maxLength={80} onChange={(event) => updateForm('actionLabel', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">ไอคอน
                  <select value={form.iconKey} onChange={(event) => updateForm('iconKey', event.target.value as PublicHomeIconKey)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">
                    {iconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <div>
                  <span className="text-sm font-medium text-slate-700">สถานะ</span>
                  <button
                    type="button"
                    onClick={() => updateForm('status', form.status === 'draft' ? 'published' : 'draft')}
                    className={`mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold transition ${form.status === 'published' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                    aria-label={`สถานะปัจจุบัน ${form.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'} กดเพื่อเปลี่ยนสถานะ`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${form.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                    {form.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                  </button>
                </div>
              </div>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">สีรายการ</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {colorOptions.map((option) => <button key={option.value} type="button" onClick={() => updateForm('colorKey', option.value)} className={`flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm ${form.colorKey === option.value ? 'border-brand-600 ring-1 ring-brand-600' : 'border-slate-200'}`}><span className={`h-4 w-4 rounded-sm ${option.swatch}`} />{option.label}</button>)}
                </div>
              </fieldset>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem] sm:items-end">
                  <label className="text-sm font-medium text-slate-700">ลิงก์โลโก้แบบกลม
                    <input type="url" value={form.logoUrl} maxLength={2048} onChange={(event) => updateForm('logoUrl', event.target.value)} placeholder="https://.../logo.png" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" />
                  </label>
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50">
                    {form.logoUrl ? <img src={form.logoUrl} alt="ตัวอย่างโลโก้" className="h-full w-full object-cover" /> : <span className="px-2 text-center text-[10px] text-slate-400">ตัวอย่างโลโก้</span>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <AdminHomeLogoUpload disabled={isSaving} onUploadingChange={setIsUploadingLogo} onError={setError} onUploaded={(imageUrl) => updateForm('logoUrl', imageUrl)} />
                  {form.logoUrl ? <button type="button" onClick={() => updateForm('logoUrl', '')} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">ใช้ไอคอนเดิม</button> : null}
                </div>
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
          <button type="button" onClick={handleSave} disabled={isSaving || isUploadingLogo || isUploadingPdf} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"><Save className="h-4 w-4" />{isUploadingPdf ? 'กำลังอัปโหลด PDF...' : isUploadingLogo ? 'กำลังอัปโหลดโลโก้...' : isSaving ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}</button>
        </div>

        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950">รายการที่เพิ่มแล้ว</h2><p className="mt-1 text-sm text-slate-500">แสดงครั้งละ 10 รายการ เรียงตามส่วนและลำดับการแสดงผล</p></div>
            <p className="text-sm font-semibold text-slate-600">ทั้งหมด {sortedItems.length} รายการ</p>
          </div>
          {isLoading ? <p className="mt-4 p-6 text-sm text-slate-500">กำลังโหลดข้อมูล...</p> : null}
          {!isLoading && sortedItems.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">ยังไม่มีข้อมูลหน้า Home</p> : null}
          {!isLoading && sortedItems.length > 0 ? <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500"><tr>
                  <th className="w-16 px-3 py-3">ลำดับ</th><th className="min-w-64 px-3 py-3">หัวข้อ</th><th className="min-w-48 px-3 py-3">ส่วนที่แสดง</th><th className="w-28 px-3 py-3">ลำดับแสดงผล</th><th className="min-w-28 px-3 py-3">สถานะ</th><th className="min-w-48 px-3 py-3">จัดการ</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pagedItems.map((item, index) => {
                    const sectionItems = sortedItems.filter((entry) => entry.section === item.section);
                    const sectionIndex = sectionItems.findIndex((entry) => entry.id === item.id);
                    const absoluteIndex = safeCurrentPage * PAGE_SIZE + index + 1;
                    return <tr key={item.id} className={editingId === item.id ? 'bg-brand-50/70' : undefined}>
                      <td className="px-3 py-3 font-semibold text-slate-700">{absoluteIndex}</td>
                      <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-3">{item.logoUrl ? <img src={item.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover" /> : <span className={`h-9 w-9 shrink-0 rounded-full ${colorOptions.find((option) => option.value === item.colorKey)?.swatch || 'bg-blue-600'}`} />}<div className="min-w-0"><p className="max-w-md truncate font-semibold text-slate-950">{item.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{item.description || '-'}</p></div></div></td>
                      <td className="px-3 py-3 text-slate-600">{findPublicRepositoryCategory(sections, item.section)?.label || item.section}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{item.sortOrder}</td>
                      <td className="px-3 py-3"><button type="button" disabled={isSaving} onClick={() => void handleToggleStatus(item)} className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${item.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{item.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></td>
                      <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-2">
                        <button type="button" disabled={sectionIndex === 0 || isSaving} onClick={() => void handleMove(item, -1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" title="เลื่อนขึ้นในส่วนเดียวกัน"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" disabled={sectionIndex === sectionItems.length - 1 || isSaving} onClick={() => void handleMove(item, 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" title="เลื่อนลงในส่วนเดียวกัน"><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleEdit(item)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Edit3 className="h-4 w-4" />แก้ไข</button>
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">หน้า {safeCurrentPage + 1} จาก {totalPages}</p><div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={safeCurrentPage === 0} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={safeCurrentPage >= totalPages - 1} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">ถัดไป<ChevronRight className="h-4 w-4" /></button>
            </div></div>
          </> : null}
        </div>
      </div>

      <ConfirmModal isOpen={Boolean(successMessage)} onClose={() => setSuccessMessage(null)} onConfirm={() => setSuccessMessage(null)} title="ดำเนินการสำเร็จ" message={successMessage || ''} confirmLabel="ตกลง" showCancelButton={false} variant="success" />
    </section>
  );
}
