import { FilePlus, Upload } from 'lucide-react';
import type { SiteContentPlanCard, SiteContentStatus } from '../../site-content/types/siteContent.types';

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
        status: 'draft',
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
