import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import {
  createPublicRepositoryCategory,
  deletePublicRepositoryCategory,
  repositoryCategoryPalette,
  savePublicRepositoryCategory,
  type PublicRepositoryCategory,
  type PublicRepositoryCategoryTone,
  type PublicRepositoryType,
} from '../services/publicRepositoryCategories.service';

type Props = {
  repositoryType: PublicRepositoryType;
  title: string;
  userId: string;
  categories: PublicRepositoryCategory[];
  onCategoriesChange: (categories: PublicRepositoryCategory[]) => void;
  onSuccess?: (message: string) => void;
};

type CategoryForm = {
  id: string | null;
  label: string;
  color: string;
  tone: PublicRepositoryCategoryTone;
};

const initialForm: CategoryForm = {
  id: null,
  label: '',
  color: repositoryCategoryPalette[0].color,
  tone: repositoryCategoryPalette[0].tone,
};

function sortCategories(categories: PublicRepositoryCategory[]) {
  return [...categories].sort((first, second) => first.sortOrder - second.sortOrder || first.label.localeCompare(second.label, 'th'));
}

export function PublicRepositoryCategoryManager({
  repositoryType,
  title,
  userId,
  categories,
  onCategoriesChange,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PublicRepositoryCategory | null>(null);
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);

  const resetForm = () => {
    setForm(initialForm);
    setError(null);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsOpen(false);
    resetForm();
  };

  const startEdit = (category: PublicRepositoryCategory) => {
    setForm({ id: category.id, label: category.label, color: category.color, tone: category.tone });
    setError(null);
  };

  const handleSave = async () => {
    const label = form.label.trim();
    if (!label) {
      setError(`กรุณาระบุ${title}`);
      return;
    }
    if (label.length > 120) {
      setError(`${title}ต้องมีความยาวไม่เกิน 120 ตัวอักษร`);
      return;
    }
    if (categories.some((category) => category.id !== form.id && category.label.trim().toLocaleLowerCase('th') === label.toLocaleLowerCase('th'))) {
      setError(`${title}นี้มีอยู่แล้ว`);
      return;
    }

    const existing = form.id ? categories.find((category) => category.id === form.id) : null;
    const nextCategory = existing
      ? { ...existing, label, color: form.color, tone: form.tone }
      : createPublicRepositoryCategory(
          repositoryType,
          label,
          form.color,
          form.tone,
          (sortedCategories[sortedCategories.length - 1]?.sortOrder || 0) + 10,
        );

    try {
      setIsSaving(true);
      setError(null);
      const saved = await savePublicRepositoryCategory(nextCategory, userId);
      onCategoriesChange(sortCategories([saved, ...categories.filter((category) => category.id !== saved.id)]));
      resetForm();
      onSuccess?.(existing ? `แก้ไข${title}เรียบร้อย` : `เพิ่ม${title}เรียบร้อย`);
    } catch {
      setError(`ไม่สามารถบันทึก${title}ได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (category: PublicRepositoryCategory, direction: -1 | 1) => {
    const index = sortedCategories.findIndex((item) => item.id === category.id);
    const target = sortedCategories[index + direction];
    if (!target) return;

    try {
      setIsSaving(true);
      setError(null);
      const [savedCategory, savedTarget] = await Promise.all([
        savePublicRepositoryCategory({ ...category, sortOrder: target.sortOrder }, userId),
        savePublicRepositoryCategory({ ...target, sortOrder: category.sortOrder }, userId),
      ]);
      const changed = new Map([[savedCategory.id, savedCategory], [savedTarget.id, savedTarget]]);
      onCategoriesChange(sortCategories(categories.map((item) => changed.get(item.id) || item)));
      onSuccess?.(`จัดลำดับ${title}เรียบร้อย`);
    } catch {
      setError(`ไม่สามารถจัดลำดับ${title}ได้`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (category: PublicRepositoryCategory) => {
    try {
      setIsSaving(true);
      setError(null);
      const saved = await savePublicRepositoryCategory({ ...category, isActive: !category.isActive }, userId);
      onCategoriesChange(sortCategories(categories.map((item) => item.id === saved.id ? saved : item)));
      onSuccess?.(saved.isActive ? `เปิดใช้งาน${title}แล้ว` : `ซ่อน${title}แล้ว`);
    } catch {
      setError(`ไม่สามารถเปลี่ยนการแสดงผล${title}ได้`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsSaving(true);
      setError(null);
      await deletePublicRepositoryCategory(pendingDelete.id);
      onCategoriesChange(categories.filter((category) => category.id !== pendingDelete.id));
      if (form.id === pendingDelete.id) resetForm();
      setPendingDelete(null);
      onSuccess?.(`ลบ${title}เรียบร้อย`);
    } catch {
      setPendingDelete(null);
      setError(`ลบ${title}ไม่ได้ เนื่องจากยังมีรายการใช้งานอยู่ กรุณาย้ายรายการไป${title}อื่นก่อน`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        จัดการ{title}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={`${repositoryType}-category-manager-title`}>
          <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={closeModal} aria-label="ปิดหน้าต่าง" />
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id={`${repositoryType}-category-manager-title`} className="text-lg font-bold text-slate-950">จัดการ{title}</h2>
                <p className="mt-1 text-xs text-slate-500">เพิ่ม แก้ไข จัดลำดับ ซ่อน หรือลบรายการที่ยังไม่ถูกใช้งาน</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="ปิด">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
              <div className="grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">ชื่อ{title}</span>
                  <input
                    value={form.label}
                    maxLength={120}
                    onChange={(event) => { setForm((current) => ({ ...current, label: event.target.value })); setError(null); }}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  />
                </label>
                <div>
                  <span className="block text-sm font-medium text-slate-700">สี</span>
                  <div className="mt-1 flex h-10 items-center gap-1 rounded-md border border-slate-300 bg-white px-2">
                    {repositoryCategoryPalette.map((palette) => (
                      <button
                        key={palette.color}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, color: palette.color, tone: palette.tone }))}
                        className={`h-6 w-6 rounded-full ${palette.color} ${form.color === palette.color ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                        title={palette.label}
                        aria-label={`เลือกสี${palette.label}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {form.id ? <button type="button" onClick={resetForm} disabled={isSaving} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">ยกเลิก</button> : null}
                  <button type="button" onClick={() => void handleSave()} disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                    {form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {form.id ? 'บันทึก' : 'เพิ่มรายการ'}
                  </button>
                </div>
              </div>

              {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
                {sortedCategories.map((category, index) => (
                  <div key={category.id} className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                    <span className="text-center text-sm font-semibold text-slate-500">{index + 1}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-4 w-4 shrink-0 rounded-full ${category.color}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{category.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{category.isActive ? 'กำลังแสดงในช่องเลือก' : 'ซ่อนจากช่องเลือก'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => void handleMove(category, -1)} disabled={isSaving || index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-35" title="เลื่อนขึ้น"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void handleMove(category, 1)} disabled={isSaving || index === sortedCategories.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-35" title="เลื่อนลง"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void handleToggleActive(category)} disabled={isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600" title={category.isActive ? 'ซ่อนรายการ' : 'เปิดใช้งาน'}>{category.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                      <button type="button" onClick={() => startEdit(category)} disabled={isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600" title="แก้ไข"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setPendingDelete(category)} disabled={isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600" title="ลบ"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
        title={`ยืนยันการลบ${title}`}
        message={`ต้องการลบ “${pendingDelete?.label || ''}” ใช่หรือไม่ หากมีรายการใช้งานอยู่ ระบบจะไม่อนุญาตให้ลบ`}
        confirmLabel="ลบรายการ"
        isLoading={isSaving}
        variant="danger"
        zIndexClassName="z-[80]"
      />
    </>
  );
}
