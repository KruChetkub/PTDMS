import { Save } from 'lucide-react';
import type { SiteContentHeroBanner, SiteContentNewsItem, SiteContentStatus } from '../../site-content/types/siteContent.types';

type SiteManagerContentEditorProps = {
  banner: SiteContentHeroBanner;
  newsDrafts: SiteContentNewsItem[];
  onBannerChange: (banner: SiteContentHeroBanner) => void;
  onNewsChange: (newsDrafts: SiteContentNewsItem[]) => void;
  onSaveDraft: () => void;
  onResetDraft: () => void;
  isSaving?: boolean;
};

const statusOptions: SiteContentStatus[] = ['published', 'draft', 'scheduled'];
const clampOverlayOpacity = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 58));

export function SiteManagerContentEditor({
  banner,
  newsDrafts,
  onBannerChange,
  onNewsChange,
  onSaveDraft,
  onResetDraft,
  isSaving = false,
}: SiteManagerContentEditorProps) {
  const imageOverlayOpacity = clampOverlayOpacity(banner.imageOverlayOpacity);

  const updateBannerField = <Field extends keyof SiteContentHeroBanner>(field: Field, value: SiteContentHeroBanner[Field]) => {
    onBannerChange({ ...banner, [field]: value });
  };

  const updateNewsField = (index: number, field: keyof SiteContentNewsItem, value: string) => {
    onNewsChange(newsDrafts.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  };

  const addNewsDraft = () => {
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
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">แก้ไขเนื้อหา Home</h2>
          <p className="mt-1 text-sm text-slate-500">แก้ไขแบบร่างในหน้านี้ก่อนเชื่อมฐานข้อมูลจริง</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
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
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและใช้กับหน้า Home'}
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div>
            <h3 className="text-base font-semibold tracking-normal text-slate-950">ป้ายประชาสัมพันธ์หน้าแรก</h3>
            <p className="mt-1 text-sm text-slate-500">ข้อมูลนี้ใช้กับ hero banner เต็มจอของหน้า Home</p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">หัวข้อหลัก</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={banner.title}
              onChange={(event) => updateBannerField('title', event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">คำอธิบาย</span>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={banner.description}
              onChange={(event) => updateBannerField('description', event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">URL รูปภาพ</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={banner.imageUrl}
              onChange={(event) => updateBannerField('imageUrl', event.target.value)}
            />
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
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
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={banner.publishWindow}
                onChange={(event) => updateBannerField('publishWindow', event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">สถานะ</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-normal text-slate-950">ข่าวประชาสัมพันธ์</h3>
              <p className="mt-1 text-sm text-slate-500">เตรียมโครงสำหรับเพิ่มประกาศและหนังสือประชาสัมพันธ์</p>
            </div>
            <button
              type="button"
              onClick={addNewsDraft}
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
            >
              เพิ่มข่าว
            </button>
          </div>

          <div className="space-y-4">
            {newsDrafts.map((item, index) => (
              <article key={`${item.title}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3">
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
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
