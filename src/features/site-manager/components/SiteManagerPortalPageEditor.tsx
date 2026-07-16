import { useState } from 'react';
import { ChevronDown, ChevronUp, Image, Save, Upload } from 'lucide-react';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import { uploadPortalHeaderBackgroundImage, uploadPortalPageBackgroundImage } from '../../site-content/services/siteContent.assets';
import type { SiteContentPortalPage, SiteContentStatus } from '../../site-content/types/siteContent.types';

type SiteManagerPortalPageEditorProps = {
  portalPage: SiteContentPortalPage;
  onPortalPageChange: (portalPage: SiteContentPortalPage) => void;
  onSaveDraft: () => void;
  onResetDraft: () => void;
  isSaving?: boolean;
  canResetDraft?: boolean;
};

const statusOptions: SiteContentStatus[] = ['published', 'draft', 'scheduled'];

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

export function SiteManagerPortalPageEditor({
  portalPage,
  onPortalPageChange,
  onSaveDraft,
  onResetDraft,
  isSaving = false,
  canResetDraft = false,
}: SiteManagerPortalPageEditorProps) {
  const [expandedItem, setExpandedItem] = useState<'background' | 'header' | null>('background');
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateField = <Field extends keyof SiteContentPortalPage>(field: Field, value: SiteContentPortalPage[Field]) => {
    onPortalPageChange({ ...portalPage, [field]: value });
  };

  const togglePublish = () => {
    updateField('status', portalPage.status === 'published' ? 'draft' : 'published');
  };

  const handleBackgroundImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setIsUploadingBackground(true);
      setUploadError(null);
      const imageUrl = await uploadPortalPageBackgroundImage(file);
      onPortalPageChange({
        ...portalPage,
        backgroundImageUrl: imageUrl,
        backgroundImageEnabled: true,
        status: 'published',
      });
    } catch (error) {
      setUploadError(getSafeUserErrorMessage(error, 'อัปโหลดภาพพื้นหลังหน้า Portal ไม่สำเร็จ'));
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const handleHeaderImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setIsUploadingHeader(true);
      setUploadError(null);
      const imageUrl = await uploadPortalHeaderBackgroundImage(file);
      onPortalPageChange({
        ...portalPage,
        headerBackgroundImageUrl: imageUrl,
        headerBackgroundImageEnabled: true,
        status: 'published',
      });
    } catch (error) {
      setUploadError(getSafeUserErrorMessage(error, 'อัปโหลดภาพพื้นหลัง Header หน้า Portal ไม่สำเร็จ'));
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const backgroundImageUrl = portalPage.backgroundImageUrl || '/SmartDSP.png';
  const isBackgroundImageEnabled = portalPage.backgroundImageEnabled !== false;
  const headerBackgroundImageUrl = portalPage.headerBackgroundImageUrl || '';
  const isHeaderBackgroundImageEnabled = portalPage.headerBackgroundImageEnabled !== false && Boolean(headerBackgroundImageUrl);
  const headerOverlayColor = portalPage.headerOverlayColor || '#ffffff';
  const headerOverlayOpacity = Math.min(100, Math.max(0, portalPage.headerOverlayOpacity));

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">จัดการภาพหน้า Portal</h2>
          <p className="mt-1 text-sm text-slate-500">กำหนดภาพพื้นหลังหน้า Portal และ Header background โดยปรับภาพ สี overlay และความเข้มได้ในหน้าเดียวกัน</p>
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
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและใช้กับหน้า Portal'}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">รายการที่ 1 - ปรับแต่งภาพพื้นหลังหน้า Portal</p>
              <p className="mt-1 truncate text-xs text-slate-500">{backgroundImageUrl}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={togglePublish}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${getStatusClass(portalPage.status)}`}
                title={portalPage.status === 'published' ? 'กดเพื่อเปลี่ยนเป็นฉบับร่าง' : 'กดเพื่อเผยแพร่'}
              >
                <span className={`relative h-5 w-9 rounded-full transition ${portalPage.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${portalPage.status === 'published' ? 'left-4' : 'left-0.5'}`} />
                </span>
                {getStatusLabel(portalPage.status)}
              </button>
              <button
                type="button"
                onClick={() => updateField('backgroundImageEnabled', !isBackgroundImageEnabled)}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                  isBackgroundImageEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
                aria-pressed={isBackgroundImageEnabled}
              >
                <span className={`relative h-5 w-9 rounded-full transition ${isBackgroundImageEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${isBackgroundImageEnabled ? 'left-4' : 'left-0.5'}`} />
                </span>
                {isBackgroundImageEnabled ? 'เปิดภาพพื้นหลัง' : 'ปิดภาพพื้นหลัง'}
              </button>
              <button
                type="button"
                onClick={() => setExpandedItem((current) => (current === 'background' ? null : 'background'))}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-expanded={expandedItem === 'background'}
              >
                {expandedItem === 'background' ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                {expandedItem === 'background' ? 'ปิดรายละเอียด' : 'แก้ไข'}
              </button>
            </div>
          </div>

          {expandedItem === 'background' ? (
            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">URL รูปภาพพื้นหลัง</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={portalPage.backgroundImageUrl}
                      onChange={(event) => updateField('backgroundImageUrl', event.target.value)}
                      placeholder="/SmartDSP.png"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">สถานะ</span>
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={portalPage.status}
                      onChange={(event) => updateField('status', event.target.value as SiteContentStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {isUploadingBackground ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ภาพพื้นหลัง'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={isUploadingBackground}
                      onChange={(event) => {
                        void handleBackgroundImageUpload(event.target.files?.[0] || null);
                        event.target.value = '';
                      }}
                    />
                  </label>

                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="portal-background-overlay" className="text-sm font-medium text-slate-700">
                        ปรับสี overlay ของรูปภาพพื้นหลัง
                      </label>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{portalPage.backgroundOverlayOpacity}%</span>
                    </div>
                    <input
                      id="portal-background-overlay"
                      type="range"
                      min="0"
                      max="90"
                      step="1"
                      value={portalPage.backgroundOverlayOpacity}
                      onChange={(event) => updateField('backgroundOverlayOpacity', Number(event.target.value))}
                      className="mt-3 w-full accent-brand-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>เห็นภาพชัดขึ้น</span>
                      <span>อ่านเนื้อหาง่ายขึ้น</span>
                    </div>
                  </div>
                  {uploadError ? <p className="text-sm font-medium text-red-600">{uploadError}</p> : null}
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  {isBackgroundImageEnabled ? (
                    <div
                      className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                      aria-label="ตัวอย่างภาพพื้นหลังหน้า Portal"
                    >
                      <div className="absolute inset-0 bg-slate-950" style={{ opacity: portalPage.backgroundOverlayOpacity / 100 }} />
                      <div className="relative flex h-full items-end p-3">
                        <div className="rounded-md bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm">Portal preview</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-md bg-slate-100 text-slate-400">
                      <Image className="h-8 w-8" aria-hidden="true" />
                      <p className="mt-2 text-xs font-medium">ปิดใช้งานภาพพื้นหลัง</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </article>

        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">รายการที่ 2 - ปรับพื้นหลัง Header background</p>
              <p className="mt-1 truncate text-xs text-slate-500">{headerBackgroundImageUrl || 'ยังไม่ได้กำหนดรูปภาพ ใช้สี overlay เป็นพื้นหลังได้'}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => updateField('headerBackgroundImageEnabled', !isHeaderBackgroundImageEnabled)}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                  isHeaderBackgroundImageEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
                aria-pressed={isHeaderBackgroundImageEnabled}
              >
                <span className={`relative h-5 w-9 rounded-full transition ${isHeaderBackgroundImageEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${isHeaderBackgroundImageEnabled ? 'left-4' : 'left-0.5'}`} />
                </span>
                {isHeaderBackgroundImageEnabled ? 'เปิดภาพ Header' : 'ปิดภาพ Header'}
              </button>
              <button
                type="button"
                onClick={() => setExpandedItem((current) => (current === 'header' ? null : 'header'))}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-expanded={expandedItem === 'header'}
              >
                {expandedItem === 'header' ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                {expandedItem === 'header' ? 'ปิดรายละเอียด' : 'แก้ไข'}
              </button>
            </div>
          </div>

          {expandedItem === 'header' ? (
            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">URL รูปภาพ Header background</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={portalPage.headerBackgroundImageUrl}
                      onChange={(event) => updateField('headerBackgroundImageUrl', event.target.value)}
                      placeholder="ใส่ URL รูปภาพขนาดกว้างตาม Header"
                    />
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {isUploadingHeader ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ภาพ Header'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={isUploadingHeader}
                      onChange={(event) => {
                        void handleHeaderImageUpload(event.target.files?.[0] || null);
                        event.target.value = '';
                      }}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">สี overlay</span>
                      <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                        <input
                          type="color"
                          value={headerOverlayColor}
                          onChange={(event) => updateField('headerOverlayColor', event.target.value)}
                          className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0"
                          aria-label="เลือกสี overlay Header"
                        />
                        <input
                          value={headerOverlayColor}
                          onChange={(event) => updateField('headerOverlayColor', event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-sm uppercase text-slate-700 outline-none"
                        />
                      </div>
                    </label>

                    <div className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="portal-header-overlay" className="text-sm font-medium text-slate-700">
                          ความเข้ม overlay Header background
                        </label>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{headerOverlayOpacity}%</span>
                      </div>
                      <input
                        id="portal-header-overlay"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={headerOverlayOpacity}
                        onChange={(event) => updateField('headerOverlayOpacity', Number(event.target.value))}
                        className="mt-3 w-full accent-brand-600"
                      />
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>โปร่งใส</span>
                        <span>สีชัดขึ้น</span>
                      </div>
                    </div>
                  </div>
                  {uploadError ? <p className="text-sm font-medium text-red-600">{uploadError}</p> : null}
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div
                    className="relative h-24 w-full overflow-hidden rounded-md border border-slate-200 bg-white bg-cover bg-center"
                    style={{ backgroundImage: isHeaderBackgroundImageEnabled ? `url(${headerBackgroundImageUrl})` : undefined }}
                    aria-label="ตัวอย่าง Header background หน้า Portal"
                  >
                    <div className="absolute inset-0" style={{ backgroundColor: headerOverlayColor, opacity: headerOverlayOpacity / 100 }} />
                    <div className="relative flex h-full items-center justify-between px-4">
                      <div className="h-12 w-12 rounded-full bg-white/90 shadow-sm" />
                      <div className="h-10 w-32 rounded-full border border-slate-200 bg-white/90 shadow-sm" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">ตัวอย่างใช้สัดส่วนแถบ Header เพื่อช่วยเลือกภาพแนวนอนให้พอดีกับพื้นที่จริง</p>
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}