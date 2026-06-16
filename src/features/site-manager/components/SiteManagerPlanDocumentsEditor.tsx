import { ArrowDown, ArrowUp, FilePlus, Trash2, Upload } from 'lucide-react';
import type {
  SiteContentPlanCard,
  SiteContentPlanIconKey,
  SiteContentStatus,
} from '../../site-content/types/siteContent.types';

type SiteManagerPlanDocumentsEditorProps = {
  title: string;
  description: string;
  planCards: SiteContentPlanCard[];
  onPlanCardsChange: (planCards: SiteContentPlanCard[]) => void;
  onSaveDraft: () => void;
  onResetDraft: () => void;
  isSaving?: boolean;
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
}: SiteManagerPlanDocumentsEditorProps) {
  const updatePlanCard = (index: number, field: keyof SiteContentPlanCard, value: string) => {
    onPlanCardsChange(planCards.map((card, cardIndex) => (cardIndex === index ? { ...card, [field]: value } : card)));
  };

  const movePlanCard = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= planCards.length) return;

    const nextPlanCards = [...planCards];
    [nextPlanCards[index], nextPlanCards[targetIndex]] = [nextPlanCards[targetIndex], nextPlanCards[index]];
    onPlanCardsChange(nextPlanCards);
  };

  const removePlanCard = (index: number) => {
    onPlanCardsChange(planCards.filter((_, cardIndex) => cardIndex !== index));
  };

  const addPlanCard = () => {
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
        uploadedFileName: '',
        status: 'published',
      },
    ]);
  };

  const handleFileSelect = (index: number, file: File | undefined) => {
    if (!file) return;
    updatePlanCard(index, 'uploadedFileName', file.name);
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
          <button
            type="button"
            onClick={onResetDraft}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
          >
            คืนค่าเริ่มต้น
          </button>
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

      <div className="grid gap-4 p-5">
        {planCards.map((card, index) => (
          <article key={`${card.title}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700">รายการที่ {index + 1}</span>
              <div className="flex items-center gap-2">
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
                  onClick={() => removePlanCard(index)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                  title="ลบรายการ"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
          </article>
        ))}
      </div>
    </section>
  );
}
