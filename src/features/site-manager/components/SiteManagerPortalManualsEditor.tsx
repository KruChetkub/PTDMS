import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FilePlus, FileText, Trash2, Upload } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import { getSafeUserErrorMessage, reportClientError } from '../../../utils/errorHandling';
import {
  listPortalUserManualsForAdmin,
  savePortalUserManualSettings,
  uploadPortalUserManualPdf,
  type PortalManualDraft,
} from '../../portal/portalManuals.service';

function createNewManual(sortOrder: number): PortalManualDraft {
  return {
    title: '',
    description: '',
    pdfUrl: '',
    pdfPath: null,
    isActive: true,
    sortOrder,
  };
}

export function SiteManagerPortalManualsEditor() {
  const profile = useAuthStore((state) => state.profile);
  const [manuals, setManuals] = useState<PortalManualDraft[]>([]);
  const [deletedManualIds, setDeletedManualIds] = useState<string[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadManuals() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const data = await listPortalUserManualsForAdmin();
        if (!active) return;
        setManuals(data);
      } catch (error) {
        if (!active) return;
        void reportClientError('Failed to load portal user manuals:', error);
        setErrorMessage(getSafeUserErrorMessage(error, 'โหลดคู่มือการใช้งานไม่สำเร็จ'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadManuals();

    return () => {
      active = false;
    };
  }, []);

  const updateManual = (index: number, patch: Partial<PortalManualDraft>) => {
    setManuals((currentManuals) =>
      currentManuals.map((manual, manualIndex) => (manualIndex === index ? { ...manual, ...patch } : manual)),
    );
    setMessage(null);
    setErrorMessage(null);
  };

  const addManual = () => {
    const nextSortOrder = manuals.reduce((max, manual) => Math.max(max, manual.sortOrder || 0), 0) + 10;
    setManuals((currentManuals) => [...currentManuals, createNewManual(nextSortOrder)]);
    setExpandedIndex(manuals.length);
    setMessage(null);
    setErrorMessage(null);
  };

  const removeManual = (index: number) => {
    const targetManual = manuals[index];

    if (targetManual?.id) {
      setDeletedManualIds((currentIds) => [...currentIds, targetManual.id as string]);
    }

    setManuals((currentManuals) => currentManuals.filter((_, manualIndex) => manualIndex !== index));
    setExpandedIndex((currentIndex) => {
      if (currentIndex === null) return null;
      if (currentIndex === index) return null;
      return currentIndex > index ? currentIndex - 1 : currentIndex;
    });
    setMessage(null);
    setErrorMessage(null);
  };

  const handlePdfUpload = async (index: number, file: File | undefined) => {
    if (!file) return;

    setUploadingIndex(index);
    setErrorMessage(null);

    try {
      const uploadResult = await uploadPortalUserManualPdf(file);
      updateManual(index, {
        pdfUrl: uploadResult.pdfUrl,
        pdfPath: uploadResult.pdfPath,
      });
    } catch (error) {
      void reportClientError('Failed to upload portal user manual PDF:', error);
      setErrorMessage(getSafeUserErrorMessage(error, 'อัปโหลดไฟล์คู่มือไม่สำเร็จ'));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setErrorMessage(null);

    try {
      const savedManuals = await savePortalUserManualSettings({
        manuals,
        deletedManualIds,
        updatedBy: profile?.user_id ?? null,
      });
      setManuals(savedManuals);
      setDeletedManualIds([]);
      setExpandedIndex(null);
      setMessage('บันทึกคู่มือการใช้งานเรียบร้อย');
      setIsSaveModalOpen(false);
    } catch (error) {
      void reportClientError('Failed to save portal user manuals:', error);
      setErrorMessage(getSafeUserErrorMessage(error, 'บันทึกคู่มือการใช้งานไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">ตั้งค่าคู่มือการใช้งาน</h2>
          <p className="mt-1 text-sm text-slate-500">เพิ่มข้อความ ลิงก์ PDF หรืออัปโหลดไฟล์คู่มือ</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
          <button
            type="button"
            onClick={addManual}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
          >
            <FilePlus className="h-4 w-4" aria-hidden="true" />
            เพิ่มคู่มือ
          </button>
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={loading || saving}
            className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-fit"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
        {loading ? <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">กำลังโหลดคู่มือการใช้งาน...</p> : null}

        {!loading && manuals.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีคู่มือการใช้งาน</p>
            <p className="mt-1 text-sm text-slate-500">กดเพิ่มคู่มือเพื่อสร้างรายการแรกบนหน้า Portal</p>
          </div>
        ) : null}

        {manuals.map((manual, index) => {
          const isExpanded = expandedIndex === index;
          const hasPdfUrl = Boolean(manual.pdfUrl);

          return (
            <article key={manual.id || `new-manual-${index}`} className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
                    {manual.sortOrder || index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{manual.title || 'ยังไม่ระบุชื่อคู่มือ'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{manual.description || 'ยังไม่ระบุรายละเอียด'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => updateManual(index, { isActive: !manual.isActive })}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                      manual.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`relative h-5 w-9 rounded-full transition ${manual.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${manual.isActive ? 'left-4' : 'left-0.5'}`} />
                    </span>
                    {manual.isActive ? 'แสดง' : 'ซ่อน'}
                  </button>
                  {hasPdfUrl ? (
                    <a
                      href={manual.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      เปิด PDF
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    {isExpanded ? 'ปิดรายละเอียด' : 'แก้ไข'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeManual(index)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                    title="ลบคู่มือ"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="grid gap-4 border-t border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1fr_260px]">
                  <div className="grid gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ชื่อคู่มือ</span>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={manual.title}
                        onChange={(event) => updateManual(index, { title: event.target.value })}
                        placeholder="เช่น คู่มือการเข้าใช้งานระบบ PTDMS"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">รายละเอียดสั้น</span>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={manual.description || ''}
                        onChange={(event) => updateManual(index, { description: event.target.value })}
                        placeholder="ข้อความอธิบายที่จะแสดงใต้ชื่อคู่มือ"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ลิงก์ PDF</span>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={manual.pdfUrl}
                        onChange={(event) => updateManual(index, { pdfUrl: event.target.value, pdfPath: null })}
                        placeholder="https://.../manual.pdf"
                      />
                    </label>
                  </div>

                  <div className="grid content-start gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={manual.sortOrder}
                        onChange={(event) => updateManual(index, { sortOrder: Number(event.target.value) })}
                      />
                    </label>
                    <label className="block rounded-md border border-dashed border-slate-300 bg-white p-4">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        {uploadingIndex === index ? 'กำลังอัปโหลด PDF...' : 'อัปโหลด PDF'}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={uploadingIndex === index}
                        className="mt-3 w-full text-sm text-slate-600 disabled:opacity-60"
                        onChange={(event) => {
                          void handlePdfUpload(index, event.target.files?.[0]);
                          event.currentTarget.value = '';
                        }}
                      />
                      <span className="mt-2 block text-xs text-slate-500">รองรับ PDF ขนาดไม่เกิน 20 MB</span>
                    </label>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={handleConfirmSave}
        title="ยืนยันการบันทึกคู่มือการใช้งาน"
        message="ระบบจะบันทึกรายการคู่มือ ลิงก์ PDF สถานะการแสดงผล และรายการที่ลบออก"
        confirmLabel="บันทึก"
        cancelLabel="ยกเลิก"
        isLoading={saving}
        variant="info"
      />
    </section>
  );
}
