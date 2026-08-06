import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  FileText,
  Landmark,
  Target,
  Puzzle,
  TrendingUp,
  HeartPulse,
  Activity,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { SiteContentPlanCard, SiteContentPlanIconKey, SiteContentStatus } from '../../site-content/types/siteContent.types';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import {
  comparePublicUserPlans,
  createPublicUserPlan,
  loadPublicUserPlans,
  PUBLIC_USER_PLANS_UPDATED_EVENT,
  savePublicUserPlan,
  updatePublicUserPlanStatus,
  getPublicUserPlanCategoryColor,
  type PublicUserPlan,
  type PublicUserPlanCategory,
} from '../services/publicUserPlans.service';

const PAGE_SIZE = 10;

const planIconMap = {
  landmark: Landmark,
  goal: Target,
  puzzle: Puzzle,
  growth: TrendingUp,
  heart: HeartPulse,
  health: Activity,
  'shield-users': ShieldCheck,
  file: FileText,
} satisfies Record<SiteContentPlanIconKey, typeof Landmark>;

const categoryOptions: Array<{ value: PublicUserPlanCategory; label: string; colorLabel: string }> = [
  { value: 'plan-level-1', label: 'แผนระดับ 1', colorLabel: 'น้ำเงิน' },
  { value: 'plan-level-2', label: 'แผนระดับ 2', colorLabel: 'เขียว' },
  { value: 'plan-level-3', label: 'แผนระดับ 3', colorLabel: 'ม่วง' },
  { value: 'executive-policy', label: 'นโยบายผู้บริหาร', colorLabel: 'ส้ม' },
  { value: 'other', label: 'อื่นๆ', colorLabel: 'ชมพู' },
];


type PublicUserPlanFormState = {
  category: PublicUserPlanCategory;
  sortOrder: number;
  title: string;
  subtitle: string;
  description: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: 'portrait' | 'landscape';
  iconKey: SiteContentPlanIconKey;
  actionLabel: string;
  status: SiteContentStatus;
};

const defaultFormState: PublicUserPlanFormState = {
  category: 'plan-level-1',
  sortOrder: 10,
  title: '',
  subtitle: '',
  description: '',
  pdfUrl: '',
  coverImageUrl: '',
  coverImageLayout: 'portrait',
  iconKey: 'file',
  actionLabel: 'รายละเอียด',
  status: 'draft',
};

function getCategoryLabel(category: PublicUserPlanCategory) {
  return categoryOptions.find((option) => option.value === category)?.label || category;
}

function normalizeSortOrder(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 10;
}

function toPlanCard(form: PublicUserPlanFormState): SiteContentPlanCard {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    iconKey: form.iconKey,
    color: getPublicUserPlanCategoryColor(form.category),
    actionLabel: form.actionLabel.trim() || 'รายละเอียด',
    pdfUrl: form.pdfUrl.trim(),
    coverImageUrl: form.coverImageUrl.trim(),
    coverImageLayout: form.coverImageLayout,
    uploadedFileName: '',
    status: form.status === 'published' ? 'published' : 'draft',
  };
}

function toFormState(plan: PublicUserPlan): PublicUserPlanFormState {
  return {
    category: plan.category,
    sortOrder: plan.sortOrder,
    title: plan.card.title,
    subtitle: plan.card.subtitle,
    description: plan.card.description || '',
    pdfUrl: plan.card.pdfUrl || '',
    coverImageUrl: plan.card.coverImageUrl || '',
    coverImageLayout: plan.card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait',
    iconKey: plan.card.iconKey || 'file',
    actionLabel: plan.card.actionLabel || 'รายละเอียด',
    status: plan.card.status === 'published' ? 'published' : 'draft',
  };
}

export function PublicUserPlansSection() {
  const { user, profile } = useAuthStore();
  const [plans, setPlans] = useState<PublicUserPlan[]>([]);
  const [form, setForm] = useState<PublicUserPlanFormState>(defaultFormState);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManagePublicContent = profile?.role === 'admin' || profile?.role === 'super_admin';
  const canUploadPdf = canManagePublicContent;
  const myPlans = useMemo(
    () => canManagePublicContent ? [...plans].sort(comparePublicUserPlans) : [],
    [canManagePublicContent, plans],
  );
  const totalPages = Math.max(1, Math.ceil(myPlans.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pagedMyPlans = myPlans.slice(safeCurrentPage * PAGE_SIZE, safeCurrentPage * PAGE_SIZE + PAGE_SIZE);
  const editingPlan = editingPlanId ? myPlans.find((plan) => plan.id === editingPlanId) || null : null;

  useEffect(() => {
    if (!canManagePublicContent) {
      setPlans([]);
      return;
    }

    let isMounted = true;

    const loadPlans = async () => {
      const document = await loadPublicUserPlans();
      if (isMounted) {
        setPlans(document.plans);
      }
    };

    const handlePlansUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ plans: PublicUserPlan[] }>;
      setPlans(customEvent.detail?.plans || []);
    };

    window.addEventListener(PUBLIC_USER_PLANS_UPDATED_EVENT, handlePlansUpdated);
    void loadPlans();

    return () => {
      isMounted = false;
      window.removeEventListener(PUBLIC_USER_PLANS_UPDATED_EVENT, handlePlansUpdated);
    };
  }, [canManagePublicContent]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);

  const updateForm = (field: keyof PublicUserPlanFormState, value: PublicUserPlanFormState[keyof PublicUserPlanFormState]) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setMessage(null);
    setError(null);
  };

  const getNextSortOrder = (category: PublicUserPlanCategory) => {
    const categoryPlans = myPlans.filter((plan) => plan.category === category && plan.id !== editingPlanId);
    const maxSortOrder = categoryPlans.reduce((maxOrder, plan) => Math.max(maxOrder, plan.sortOrder), 0);
    return maxSortOrder + 10;
  };

  const getPlansInCategory = (category: PublicUserPlanCategory) => myPlans.filter((plan) => plan.category === category).sort(comparePublicUserPlans);

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingPlanId(null);
    setMessage(null);
    setError(null);
  };

  const handleEditPlan = (plan: PublicUserPlan) => {
    setForm(toFormState(plan));
    setEditingPlanId(plan.id);
    setMessage(null);
    setError(null);
    window.setTimeout(() => {
      document.getElementById('my-plan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleSave = async () => {
    if (!user || !canManagePublicContent) {
      setError('เฉพาะ Admin และ Super Admin เท่านั้นที่เพิ่มหรือแก้ไขแผนได้');
      return;
    }

    if (!form.title.trim()) {
      setError('กรุณาระบุชื่อแผน');
      return;
    }

    const nextSortOrder = normalizeSortOrder(form.sortOrder || getNextSortOrder(form.category));

    try {
      setIsSaving(true);
      setError(null);
      const plan = editingPlan
        ? {
            ...editingPlan,
            category: form.category,
            sortOrder: nextSortOrder,
            card: toPlanCard(form),
            updatedAt: new Date().toISOString(),
          }
        : createPublicUserPlan({
            ownerUserId: user.id,
            ownerName: profile?.full_name || user.email || 'ผู้ใช้งานระบบ',
            ownerWorkGroup: profile?.work_group || profile?.department || null,
            category: form.category,
            sortOrder: nextSortOrder,
            card: toPlanCard(form),
          });
      const result = await savePublicUserPlan(plan);
      const savedPlan = result.plan;
      setPlans((currentPlans) => [savedPlan, ...currentPlans.filter((currentPlan) => currentPlan.id !== savedPlan.id)].sort(comparePublicUserPlans));
      setForm(defaultFormState);
      setEditingPlanId(null);
      setCurrentPage(0);
      const actionLabel = editingPlan ? 'แก้ไขรายการเรียบร้อย' : 'บันทึกแผนของฉันเรียบร้อย';
      setMessage(result.source === 'supabase' ? actionLabel : `${actionLabel}ในเครื่อง หากต้องการให้ทุกคนเห็น กรุณาตรวจสอบสิทธิ์ Supabase`);
    } catch {
      setError('ไม่สามารถบันทึกแผนได้ กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMyPlan = async (plan: PublicUserPlan) => {
    if (!user || !canManagePublicContent) return;

    const nextStatus: SiteContentStatus = plan.card.status === 'published' ? 'draft' : 'published';
    const result = await updatePublicUserPlanStatus(plan.id, nextStatus);
    setPlans((currentPlans) =>
      currentPlans
        .map((currentPlan) =>
          currentPlan.id === plan.id
            ? result.plan || { ...currentPlan, updatedAt: new Date().toISOString(), card: { ...currentPlan.card, status: nextStatus } }
            : currentPlan,
        )
        .sort(comparePublicUserPlans),
    );
  };

  const handleMovePlan = async (plan: PublicUserPlan, direction: -1 | 1) => {
    if (!user || !canManagePublicContent) return;

    const categoryPlans = getPlansInCategory(plan.category);
    const planIndex = categoryPlans.findIndex((currentPlan) => currentPlan.id === plan.id);
    const targetPlan = categoryPlans[planIndex + direction];
    if (!targetPlan) return;

    try {
      setIsSaving(true);
      setError(null);
      const now = new Date().toISOString();
      const currentWithTargetOrder = { ...plan, sortOrder: targetPlan.sortOrder, updatedAt: now };
      const targetWithCurrentOrder = { ...targetPlan, sortOrder: plan.sortOrder, updatedAt: now };
      const [currentResult, targetResult] = await Promise.all([
        savePublicUserPlan(currentWithTargetOrder),
        savePublicUserPlan(targetWithCurrentOrder),
      ]);
      const movedPlans = [currentResult.plan, targetResult.plan];

      setPlans((currentPlans) =>
        currentPlans
          .map((currentPlan) => movedPlans.find((movedPlan) => movedPlan.id === currentPlan.id) || currentPlan)
          .sort(comparePublicUserPlans),
      );
      setMessage('ปรับลำดับการแสดงผลเรียบร้อย');
    } catch {
      setError('ไม่สามารถปรับลำดับได้ กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !canManagePublicContent) {
    return (
      <section className="min-h-[calc(100vh-4rem)] bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-700">My Plan Publishing</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">เพิ่มแผนของฉัน</h1>
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            เฉพาะ Admin และ Super Admin เท่านั้นที่เข้าถึงหน้าจัดการแผนได้
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="my-plan-submission" className="min-h-[calc(100vh-4rem)] bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">เพิ่มแผนของฉัน</h1>
          </div>
        </div>

        <div id="my-plan-form" className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                {editingPlan ? 'แก้ไขแผนของฉัน' : 'ข้อมูลแผนของฉัน'}
              </h2>
            </div>
            {editingPlan ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                title="ยกเลิกแก้ไข"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="grid gap-3">
              <div className="block">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">หัวข้อแผน</span>
                  <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.category} onChange={(event) => updateForm('category', event.target.value as PublicUserPlanCategory)}>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="hidden">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">สถานะ</span>
                  <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.status} onChange={(event) => updateForm('status', event.target.value as SiteContentStatus)}>
                    <option value="draft">ฉบับร่าง</option>
                    <option value="published">เผยแพร่</option>
                  </select>
                </label>
                <div className="block">
                  <span className="text-sm font-medium text-slate-700">ตัวอย่างการเรียง</span>
                  <div className="mt-1 flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">
                    {getCategoryLabel(form.category)} / ลำดับ {form.sortOrder || getNextSortOrder(form.category)}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">ชื่อแผน</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
              </label>

              <label className="hidden"><span className="text-sm font-medium text-slate-700">หัวข้อรอง</span><input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.subtitle} onChange={(event) => updateForm('subtitle', event.target.value)} /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">รายละเอียด</span><textarea rows={4} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span>
                <input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} placeholder="https://.../document.pdf" />
              </label>
              {canUploadPdf && user ? (
                <AdminPublicPdfUpload
                  userId={user.id}
                  folder="plans"
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
              <label className="block">
                <span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span>
                <input type="url" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.coverImageUrl} onChange={(event) => updateForm('coverImageUrl', event.target.value)} placeholder="https://.../cover.jpg" />
              </label>
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
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    value={form.sortOrder}
                    onChange={(event) => updateForm('sortOrder', normalizeSortOrder(Number(event.target.value)))}
                  />
                </label>
                <div className="block">
                  <span className="text-sm font-medium text-slate-700">สีการ์ดอัตโนมัติ</span>
                  <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                    <span className={`h-4 w-4 rounded-full ${getPublicUserPlanCategoryColor(form.category)}`} aria-hidden="true" />
                    {categoryOptions.find((option) => option.value === form.category)?.colorLabel}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'portrait' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">360 x 640 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวตั้ง</span></button>
                <button type="button" onClick={() => updateForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'landscape' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">640 x 360 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวนอน</span></button>
              </div>

            </div>
          </div>
          <div className="mt-4">
              <CoverImagePreview
                imageUrl={form.coverImageUrl}
                pdfUrl={form.pdfUrl}
                layout={form.coverImageLayout}
                title={form.title}
              />
          </div>

          <button type="button" onClick={() => void handleSave()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? 'กำลังบันทึก...' : editingPlan ? 'บันทึกการแก้ไข' : 'บันทึกแผนของฉัน'}
              </button>

          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        </div>

        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">รายการที่นำเข้าแล้ว</h2>
              <p className="mt-1 text-sm text-slate-500">แสดงครั้งละ 10 รายการ เรียงตามหัวข้อแผนและลำดับการแสดงผล</p>
            </div>
            <p className="text-sm font-semibold text-slate-600">ทั้งหมด {myPlans.length} รายการ</p>
          </div>

          {myPlans.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                    <tr>
                      <th className="w-16 px-3 py-3">ลำดับ</th>
                      <th className="min-w-52 px-3 py-3">ชื่อแผน</th>
                      <th className="min-w-44 px-3 py-3">หัวข้อ</th>
                      <th className="w-28 px-3 py-3">ลำดับแสดงผล</th>
                      <th className="min-w-28 px-3 py-3">สถานะ</th>
                      <th className="min-w-48 px-3 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedMyPlans.map((plan, index) => {
                      const absoluteIndex = safeCurrentPage * PAGE_SIZE + index + 1;
                      const Icon = planIconMap[plan.card.iconKey] || FileText;
                      const categoryPlans = getPlansInCategory(plan.category);
                      const categoryIndex = categoryPlans.findIndex((currentPlan) => currentPlan.id === plan.id);
                      const canMoveUp = categoryIndex > 0;
                      const canMoveDown = categoryIndex >= 0 && categoryIndex < categoryPlans.length - 1;

                      return (
                        <tr key={plan.id} className={editingPlanId === plan.id ? 'bg-brand-50/70' : undefined}>
                          <td className="px-3 py-3 font-semibold text-slate-700">{absoluteIndex}</td>
                          <td className="px-3 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${plan.card.color} text-white`}>
                                <Icon className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-md truncate font-semibold text-slate-950">{plan.card.title}</p>
                                <p className="mt-1 max-w-md truncate text-xs text-slate-500">{plan.card.subtitle || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{getCategoryLabel(plan.category)}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700">{plan.sortOrder}</td>
                          <td className="px-3 py-3">
                            <button type="button" onClick={() => void handleToggleMyPlan(plan)} className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${plan.card.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                              {plan.card.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => void handleMovePlan(plan, -1)} disabled={!canMoveUp || isSaving} title="เลื่อนขึ้นในหัวข้อเดียวกัน" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => void handleMovePlan(plan, 1)} disabled={!canMoveDown || isSaving} title="เลื่อนลงในหัวข้อเดียวกัน" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => handleEditPlan(plan)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                <Edit3 className="h-4 w-4" aria-hidden="true" />
                                แก้ไข
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  หน้า {safeCurrentPage + 1} จาก {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={safeCurrentPage === 0} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    ก่อนหน้า
                  </button>
                  <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={safeCurrentPage >= totalPages - 1} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                    ถัดไป
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              ยังไม่มีรายการที่นำเข้า
            </div>
          )}
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