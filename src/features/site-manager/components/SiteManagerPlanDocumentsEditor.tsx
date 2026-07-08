import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Eye, FilePlus, ImageIcon, Trash2, Upload, X } from 'lucide-react';
import { uploadPlanCoverImage } from '../../site-content/services/siteContent.assets';
import type {
  SiteContentPlanCard,
  SiteContentPlanIconKey,
  SiteContentStatus,
} from '../../site-content/types/siteContent.types';

type PlanFocusTarget = {
  index: number;
  requestId: number;
};

type SiteManagerPlanDocumentsEditorProps = {
  title: string;
  description: string;
  planCards: SiteContentPlanCard[];
  onPlanCardsChange: (planCards: SiteContentPlanCard[]) => void;
  onSaveDraft: () => void;
  onResetDraft: () => void;
  isSaving?: boolean;
  focusTarget?: PlanFocusTarget | null;
  canResetDraft?: boolean;
};

type CoverPreviewState = {
  title: string;
  imageUrl: string;
};

const statusOptions: SiteContentStatus[] = ['published', 'draft', 'scheduled'];
const iconOptions: Array<{ value: SiteContentPlanIconKey; label: string }> = [
  { value: 'landmark', label: 'อาคาร/ยุทธศาสตร์' },
  { value: 'goal', label: 'เป้าหมาย' },
  { value: 'puzzle', label: 'แผนบูรณาการ' },
  { value: 'growth', label: 'การเติบโต' },
  { value: 'heart', label: 'สุขภาพ' },
  { value: 'health', label: 'สาธารณสุข' },
  { value: 'shield-users', label: 'นโยบาย/ผู้บริหาร' },
  { value: 'file', label: 'เอกสาร' },
];
const colorOptions = [
  { value: 'bg-blue-600', label: 'น้ำเงิน' },
  { value: 'bg-teal-600', label: 'เขียวอมฟ้า' },
  { value: 'bg-emerald-600', label: 'เขียว' },
  { value: 'bg-rose-500', label: 'ชมพู' },
  { value: 'bg-sky-600', label: 'ฟ้า' },
  { value: 'bg-violet-600', label: 'ม่วง' },
  { value: 'bg-orange-500', label: 'ส้ม' },
  { value: 'bg-red-500', label: 'แดง' },
  { value: 'bg-amber-500', label: 'เหลือง' },
];

export function SiteManagerPlanDocumentsEditor({
  title,
  description,
  planCards,
  onPlanCardsChange,
  onSaveDraft,
  onResetDraft,
  isSaving = false,
  focusTarget = null,
  canResetDraft = false,
}: SiteManagerPlanDocumentsEditorProps) {
  const [uploadingCoverIndex, setUploadingCoverIndex] = useState<number | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<CoverPreviewState | null>(null);
  const [expandedPlanIndex, setExpandedPlanIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!focusTarget || focusTarget.index < 0 || focusTarget.index >= planCards.length) return;

    setExpandedPlanIndex(focusTarget.index);
    window.setTimeout(() => {
      document.getElementById(`site-manager-plan-card-${focusTarget.index}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, [focusTarget?.index, focusTarget?.requestId, planCards.length]);

  const updatePlanCard = (index: number, field: keyof SiteContentPlanCard, value: string) => {
    onPlanCardsChange(planCards.map((card, cardIndex) => (cardIndex === index ? { ...card, [field]: value } : card)));
  };

  const movePlanCard = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= planCards.length) return;

    const nextPlanCards = [...planCards];
    [nextPlanCards[index], nextPlanCards[targetIndex]] = [nextPlanCards[targetIndex], nextPlanCards[index]];
    onPlanCardsChange(nextPlanCards);
    setExpandedPlanIndex((currentIndex) => {
      if (currentIndex === index) return targetIndex;
      if (currentIndex === targetIndex) return index;
      return currentIndex;
    });
  };

  const removePlanCard = (index: number) => {
    onPlanCardsChange(planCards.filter((_, cardIndex) => cardIndex !== index));
    setExpandedPlanIndex((currentIndex) => {
      if (currentIndex === null) return null;
      if (currentIndex === index) return null;
      return currentIndex > index ? currentIndex - 1 : currentIndex;
    });
  };

  const addPlanCard = () => {
    const newPlanIndex = planCards.length;

    onPlanCardsChange([
      ...planCards,
      {
        title: 'ชื่อแผนใหม่',
        subtitle: 'พ.ศ. .... - ....',
        description: '',
        iconKey: 'goal',
        color: 'bg-teal-600',
        actionLabel: 'รายละเอียด',
        pdfUrl: '',
        coverImageUrl: '',
        coverImageLayout: 'portrait',
        uploadedFileName: '',
        status: 'published',
      },
    ]);
    setExpandedPlanIndex(newPlanIndex);
  };

  const handleFileSelect = (index: number, file: File | undefined) => {
    if (!file) return;
    updatePlanCard(index, 'uploadedFileName', file.name);
  };

  const togglePlanCardPublish = (index: number) => {
    updatePlanCard(index, 'status', planCards[index]?.status === 'published' ? 'draft' : 'published');
  };

  const handleCoverFileSelect = async (index: number, file: File | undefined) => {
    if (!file) return;

    setCoverUploadError(null);
    setUploadingCoverIndex(index);

    try {
      const imageUrl = await uploadPlanCoverImage(file);
      updatePlanCard(index, 'coverImageUrl', imageUrl);
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : 'อัปโหลดภาพหน้าปกไม่สำเร็จ');
    } finally {
      setUploadingCoverIndex(null);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
          <button
            type="button"
            onClick={addPlanCard}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
          >
            <FilePlus className="h-4 w-4" aria-hidden="true" />
            เพิ่มรายการ
          </button>
          {canResetDraft ? (
            <button
              type="button"
              onClick={onResetDraft}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
            >
              คืนค่าเริ่มต้น
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-fit"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและใช้กับหน้า Home'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        {coverUploadError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{coverUploadError}</p> : null}

        {planCards.map((card, index) => {
          const isExpanded = expandedPlanIndex === index;
          const isPublished = card.status === 'published';
          const coverImageLayout = card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait';
          const coverAspectClass = coverImageLayout === 'landscape' ? 'aspect-[16/9]' : 'aspect-[9/16]';

          return (
            <article id={`site-manager-plan-card-${index}`} key={`plan-card-${index}`} className="scroll-mt-24 rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      รายการที่ {index + 1} - {card.title || 'ยังไม่ระบุชื่อแผน'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{card.subtitle || 'ยังไม่ระบุช่วงปี/คำอธิบายสั้น'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => togglePlanCardPublish(index)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                      isPublished
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                    title={isPublished ? 'กดเพื่อเปลี่ยนเป็นยังไม่เผยแพร่' : 'กดเพื่อเผยแพร่'}
                  >
                    <span className={`relative h-5 w-9 rounded-full transition ${isPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                          isPublished ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    {isPublished ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlanCard(index, -1)}
                    disabled={index === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlanCard(index, 1)}
                    disabled={index === planCards.length - 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedPlanIndex(isExpanded ? null : index)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    {isExpanded ? 'ปิดรายละเอียด' : 'แก้ไข'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlanCard(index)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                    title="ลบรายการ"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="grid gap-4 border-t border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ชื่อแผน</span>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={card.title}
                        onChange={(event) => updatePlanCard(index, 'title', event.target.value)}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">ช่วงปี/คำอธิบายสั้น</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={card.subtitle}
                          onChange={(event) => updatePlanCard(index, 'subtitle', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">รายละเอียดเสริม</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={card.description || ''}
                          onChange={(event) => updatePlanCard(index, 'description', event.target.value)}
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ลิงก์ PDF</span>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={card.pdfUrl}
                        onChange={(event) => updatePlanCard(index, 'pdfUrl', event.target.value)}
                        placeholder="https://.../document.pdf"
                      />
                    </label>

                    <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-[140px_1fr]">
                      <button
                        type="button"
                        onClick={() => card.coverImageUrl && setCoverPreview({ title: card.title, imageUrl: card.coverImageUrl })}
                        disabled={!card.coverImageUrl}
                        className={`group ${coverAspectClass} w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 text-slate-400 transition hover:border-brand-300 disabled:cursor-default disabled:hover:border-slate-200`}
                        title={card.coverImageUrl ? 'ดูภาพหน้าปกขนาดใหญ่' : 'ยังไม่มีภาพหน้าปก'}
                      >
                        {card.coverImageUrl ? (
                          <span className="relative block h-full w-full">
                            <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
                              <Eye className="h-6 w-6 text-white" aria-hidden="true" />
                            </span>
                          </span>
                        ) : (
                          <span className="flex h-full flex-col items-center justify-center gap-2 px-3 text-xs font-medium">
                            <ImageIcon className="h-7 w-7" aria-hidden="true" />
                            ภาพหน้าปก
                          </span>
                        )}
                      </button>
                      <div className="grid content-start gap-3">
                        <div className="grid gap-2">
                          <span className="text-sm font-medium text-slate-700">ขนาดภาพหน้าปก</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updatePlanCard(index, 'coverImageLayout', 'portrait')}
                              className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                                coverImageLayout === 'portrait'
                                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              360 × 640 px
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePlanCard(index, 'coverImageLayout', 'landscape')}
                              className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                                coverImageLayout === 'landscape'
                                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              640 × 360 px
                            </button>
                          </div>
                        </div>

                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">
                            ภาพหน้าปก {coverImageLayout === 'landscape' ? '640 × 360 px' : '360 × 640 px'}
                          </span>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={card.coverImageUrl || ''}
                            onChange={(event) => updatePlanCard(index, 'coverImageUrl', event.target.value)}
                            placeholder="https://.../cover.jpg"
                          />
                        </label>
                        <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Upload className="h-4 w-4" aria-hidden="true" />
                            {uploadingCoverIndex === index ? 'กำลังอัปโหลดภาพ...' : 'อัปโหลดภาพหน้าปก'}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={uploadingCoverIndex === index}
                            className="mt-3 w-full text-sm text-slate-600 disabled:opacity-60"
                            onChange={(event) => {
                              void handleCoverFileSelect(index, event.target.files?.[0]);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">ไอคอน</span>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={card.iconKey}
                          onChange={(event) => updatePlanCard(index, 'iconKey', event.target.value as SiteContentPlanIconKey)}
                        >
                          {iconOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">สีการ์ด</span>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={card.color}
                          onChange={(event) => updatePlanCard(index, 'color', event.target.value)}
                        >
                          {colorOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">ข้อความปุ่ม</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={card.actionLabel}
                          onChange={(event) => updatePlanCard(index, 'actionLabel', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">สถานะ</span>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={card.status}
                          onChange={(event) => updatePlanCard(index, 'status', event.target.value as SiteContentStatus)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block rounded-md border border-dashed border-slate-300 bg-white p-4">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        เตรียมอัปโหลดไฟล์ PDF
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="mt-3 w-full text-sm text-slate-600"
                        onChange={(event) => handleFileSelect(index, event.target.files?.[0])}
                      />
                      <span className="mt-2 block text-xs text-slate-500">
                        {card.uploadedFileName || 'ยังไม่เลือกไฟล์ ระบบยังไม่อัปโหลดไป Drive/Storage ในขั้นนี้'}
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {coverPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
          <div className="relative flex max-h-full w-full max-w-4xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-white">
              <h3 className="text-base font-semibold tracking-normal">{coverPreview.title}</h3>
              <button
                type="button"
                onClick={() => setCoverPreview(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20"
                title="ปิด"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[82vh] overflow-auto rounded-md bg-white p-2 shadow-2xl">
              <img src={coverPreview.imageUrl} alt={`ภาพหน้าปก ${coverPreview.title}`} className="mx-auto h-auto max-w-full rounded-sm" />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
