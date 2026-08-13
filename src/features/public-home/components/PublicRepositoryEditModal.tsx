import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type PublicRepositoryEditModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveDisabled?: boolean;
  error?: string | null;
  children: ReactNode;
};

export function PublicRepositoryEditModal({
  isOpen,
  title,
  onClose,
  onSave,
  isSaving,
  saveDisabled = false,
  error,
  children,
}: PublicRepositoryEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="public-repository-edit-title">
      <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-label="ปิดหน้าต่างแก้ไข" />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2 id="public-repository-edit-title" className="text-lg font-bold text-slate-950 sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} disabled={isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50" title="ปิด">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {children}
          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">ยกเลิก</button>
          <button type="button" onClick={onSave} disabled={isSaving || saveDisabled} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
}
