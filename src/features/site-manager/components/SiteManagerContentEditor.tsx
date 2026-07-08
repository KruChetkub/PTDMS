import { useState } from 'react';
import { ChevronDown, ChevronUp, FilePlus, Save } from 'lucide-react';
import type { SiteContentFaqItem, SiteContentHeroBanner, SiteContentNewsItem, SiteContentStatus } from '../../site-content/types/siteContent.types';

type SiteManagerContentEditorProps = {
  banner: SiteContentHeroBanner;
  newsDrafts: SiteContentNewsItem[];
  faqDrafts: SiteContentFaqItem[];
  onBannerChange: (banner: SiteContentHeroBanner) => void;
  onNewsChange: (newsDrafts: SiteContentNewsItem[]) => void;
  onFaqChange: (faqDrafts: SiteContentFaqItem[]) => void;
  onSaveDraft: () => void;
  onResetDraft: () => void;
  isSaving?: boolean;
  canResetDraft?: boolean;
};

type ExpandedContentKey = 'banner' | `news-${number}` | `faq-${number}` | null;

const statusOptions: SiteContentStatus[] = ['published', 'draft', 'scheduled'];
const clampOverlayOpacity = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 58));

function getStatusLabel(status: SiteContentStatus) {
  if (status === 'published') return 'เผยแพร่';
  if (status === 'scheduled') return 'รอเผยแพร่';
  return 'ฉบับร่าง';
}

function getStatusClass(status: SiteContentStatus) {
  if (status === 'published') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'scheduled') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function SiteManagerContentEditor({
  banner,
  newsDrafts,
  faqDrafts,
  onBannerChange,
  onNewsChange,
  onFaqChange,
  onSaveDraft,
  onResetDraft,
  isSaving = false,
  canResetDraft = false,
}: SiteManagerContentEditorProps) {
  const imageOverlayOpacity = clampOverlayOpacity(banner.imageOverlayOpacity);
  const [expandedContentKey, setExpandedContentKey] = useState<ExpandedContentKey>(null);

  const updateBannerField = <Field extends keyof SiteContentHeroBanner>(field: Field, value: SiteContentHeroBanner[Field]) => {
    onBannerChange({ ...banner, [field]: value });
  };

  const updateNewsField = (index: number, field: keyof SiteContentNewsItem, value: string) => {
    onNewsChange(newsDrafts.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  };

  const updateFaqField = (index: number, field: keyof SiteContentFaqItem, value: string) => {
    onFaqChange(faqDrafts.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  };

  const addNewsDraft = () => {
    const newIndex = newsDrafts.length;

    onNewsChange([
      ...newsDrafts,
      {
        title: 'หัวข้อข่าวใหม่',
        category: 'ข่าวสาร',
        dateLabel: '15 มิ.ย. 2569',
        description: 'รายละเอียดข่าวประชาสัมพันธ์',
        status: 'draft',
      },
    ]);
    setExpandedContentKey(`news-${newIndex}`);
  };

  const addFaqDraft = () => {
    const newIndex = faqDrafts.length;

    onFaqChange([
      ...faqDrafts,
      {
        question: 'คำถามใหม่',
        answer: 'คำตอบสำหรับคำถามนี้',
        status: 'draft',
      },
    ]);
    setExpandedContentKey(`faq-${newIndex}`);
  };

  const toggleBannerPublish = () => {
    updateBannerField('status', banner.status === 'published' ? 'draft' : 'published');
  };

  const toggleNewsPublish = (index: number) => {
    updateNewsField(index, 'status', newsDrafts[index]?.status === 'published' ? 'draft' : 'published');
  };

  const toggleFaqPublish = (index: number) => {
    updateFaqField(index, 'status', faqDrafts[index]?.status === 'published' ? 'draft' : 'published');
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">แก้ไขเนื้อหา Home</h2>
          <p className="mt-1 text-sm text-slate-500">แก้ไขแบบร่างในหน้านี้ก่อนเชื่อมฐานข้อมูลจริง</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
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
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและใช้กับหน้า Home'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">รายการที่ 1 - ป้ายประชาสัมพันธ์หน้าแรก</p>
              <p className="mt-1 truncate text-xs text-slate-500">{banner.title || 'ยังไม่ระบุหัวข้อหลัก'}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={toggleBannerPublish}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${getStatusClass(banner.status)}`}
                title={banner.status === 'published' ? 'กดเพื่อเปลี่ยนเป็นฉบับร่าง' : 'กดเพื่อเผยแพร่'}
              >
                <span className={`relative h-5 w-9 rounded-full transition ${banner.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${banner.status === 'published' ? 'left-4' : 'left-0.5'}`} />
                </span>
                {getStatusLabel(banner.status)}
              </button>
              <button
                type="button"
                onClick={() => setExpandedContentKey(expandedContentKey === 'banner' ? null : 'banner')}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-expanded={expandedContentKey === 'banner'}
              >
                {expandedContentKey === 'banner' ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                {expandedContentKey === 'banner' ? 'ปิดรายละเอียด' : 'แก้ไข'}
              </button>
            </div>
          </div>

          {expandedContentKey === 'banner' ? (
            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">หัวข้อหลัก</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={banner.title}
                  onChange={(event) => updateBannerField('title', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">คำอธิบาย</span>
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={banner.description}
                  onChange={(event) => updateBannerField('description', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">URL รูปภาพ</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={banner.imageUrl}
                  onChange={(event) => updateBannerField('imageUrl', event.target.value)}
                />
              </label>

              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label htmlFor="hero-image-overlay" className="text-sm font-medium text-slate-700">
                      ปรับสีเงาดำ/สว่างของรูปภาพ
                    </label>
                    <p className="mt-1 text-xs text-slate-500">ค่าน้อยภาพจะสว่างขึ้น ค่ามากภาพจะมืดขึ้นเพื่อให้อ่านตัวอักษรง่าย</p>
                  </div>
                  <input
                    className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    type="number"
                    min={0}
                    max={100}
                    value={imageOverlayOpacity}
                    onChange={(event) => updateBannerField('imageOverlayOpacity', clampOverlayOpacity(Number(event.target.value)))}
                  />
                </div>
                <input
                  id="hero-image-overlay"
                  className="mt-4 w-full accent-brand-600"
                  type="range"
                  min={0}
                  max={100}
                  value={imageOverlayOpacity}
                  onChange={(event) => updateBannerField('imageOverlayOpacity', clampOverlayOpacity(Number(event.target.value)))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">ช่วงเผยแพร่</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={banner.publishWindow}
                    onChange={(event) => updateBannerField('publishWindow', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">สถานะ</span>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={banner.status}
                    onChange={(event) => updateBannerField('status', event.target.value as SiteContentStatus)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}
        </article>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-normal text-slate-950">ข่าวประชาสัมพันธ์</h3>
              <p className="mt-1 text-sm text-slate-500">เตรียมโครงสำหรับเพิ่มประกาศและหนังสือประชาสัมพันธ์</p>
            </div>
            <button
              type="button"
              onClick={addNewsDraft}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
            >
              <FilePlus className="h-4 w-4" aria-hidden="true" />
              เพิ่มข่าว
            </button>
          </div>

          <div className="grid gap-3 p-4">
            {newsDrafts.map((item, index) => {
              const newsKey = `news-${index}` as const;
              const isExpanded = expandedContentKey === newsKey;

              return (
                <article key={`news-item-${index}`} className="rounded-md border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        รายการที่ {index + 1} - {item.title || 'ยังไม่ระบุหัวข้อข่าว'}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.category || 'ยังไม่ระบุหมวด'} · {item.dateLabel || 'ยังไม่ระบุวันที่'}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleNewsPublish(index)}
                        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${getStatusClass(item.status)}`}
                        title={item.status === 'published' ? 'กดเพื่อเปลี่ยนเป็นฉบับร่าง' : 'กดเพื่อเผยแพร่'}
                      >
                        <span className={`relative h-5 w-9 rounded-full transition ${item.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${item.status === 'published' ? 'left-4' : 'left-0.5'}`} />
                        </span>
                        {getStatusLabel(item.status)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedContentKey(isExpanded ? null : newsKey)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                        {isExpanded ? 'ปิดรายละเอียด' : 'แก้ไข'}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">หัวข้อข่าว</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={item.title}
                          onChange={(event) => updateNewsField(index, 'title', event.target.value)}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">หมวด</span>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={item.category}
                            onChange={(event) => updateNewsField(index, 'category', event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">วันที่</span>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={item.dateLabel}
                            onChange={(event) => updateNewsField(index, 'dateLabel', event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">สถานะ</span>
                          <select
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={item.status}
                            onChange={(event) => updateNewsField(index, 'status', event.target.value as SiteContentStatus)}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">รายละเอียด</span>
                        <textarea
                          rows={3}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={item.description}
                          onChange={(event) => updateNewsField(index, 'description', event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-normal text-slate-950">คำถามที่พบบ่อย</h3>
              <p className="mt-1 text-sm text-slate-500">เพิ่มและแก้ไข FAQ ที่แสดงในหน้าแรก</p>
            </div>
            <button
              type="button"
              onClick={addFaqDraft}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
            >
              <FilePlus className="h-4 w-4" aria-hidden="true" />
              เพิ่ม FAQ
            </button>
          </div>

          <div className="grid gap-3 p-4">
            {faqDrafts.map((item, index) => {
              const faqKey = `faq-${index}` as const;
              const isExpanded = expandedContentKey === faqKey;

              return (
                <article key={`faq-item-${index}`} className="rounded-md border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        รายการที่ {index + 1} - {item.question || 'ยังไม่ระบุคำถาม'}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.answer || 'ยังไม่ระบุคำตอบ'}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFaqPublish(index)}
                        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${getStatusClass(item.status)}`}
                        title={item.status === 'published' ? 'กดเพื่อเปลี่ยนเป็นฉบับร่าง' : 'กดเพื่อเผยแพร่'}
                      >
                        <span className={`relative h-5 w-9 rounded-full transition ${item.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${item.status === 'published' ? 'left-4' : 'left-0.5'}`} />
                        </span>
                        {getStatusLabel(item.status)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedContentKey(isExpanded ? null : faqKey)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                        {isExpanded ? 'ปิดรายละเอียด' : 'แก้ไข'}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">คำถาม</span>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={item.question}
                          onChange={(event) => updateFaqField(index, 'question', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">คำตอบ</span>
                        <textarea
                          rows={3}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={item.answer}
                          onChange={(event) => updateFaqField(index, 'answer', event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">สถานะ</span>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={item.status}
                          onChange={(event) => updateFaqField(index, 'status', event.target.value as SiteContentStatus)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
