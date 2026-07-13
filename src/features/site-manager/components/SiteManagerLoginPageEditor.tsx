import { useState } from 'react';
import { ChevronDown, ChevronUp, Image, Save, Upload } from 'lucide-react';
import { uploadLoginPageBackgroundImage, uploadLoginPageImage } from '../../site-content/services/siteContent.assets';
import type { SiteContentLoginPage, SiteContentStatus } from '../../site-content/types/siteContent.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';

type SiteManagerLoginPageEditorProps = {
  loginPage: SiteContentLoginPage;
  onLoginPageChange: (loginPage: SiteContentLoginPage) => void;
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

export function SiteManagerLoginPageEditor({
  loginPage,
  onLoginPageChange,
  onSaveDraft,
  onResetDraft,
  isSaving = false,
  canResetDraft = false,
}: SiteManagerLoginPageEditorProps) {
  const [expandedItem, setExpandedItem] = useState<'side-image' | 'background' | 'panel-gradient' | null>(null);
  const [isUploadingSideImage, setIsUploadingSideImage] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateField = <Field extends keyof SiteContentLoginPage>(field: Field, value: SiteContentLoginPage[Field]) => {
    onLoginPageChange({ ...loginPage, [field]: value });
  };

  const togglePublish = () => {
    updateField('status', loginPage.status === 'published' ? 'draft' : 'published');
  };

  const toggleExpandedItem = (item: 'side-image' | 'background' | 'panel-gradient') => {
    setExpandedItem((current) => (current === item ? null : item));
  };

  const handleSideImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setIsUploadingSideImage(true);
      setUploadError(null);
      const imageUrl = await uploadLoginPageImage(file);
      onLoginPageChange({ ...loginPage, sideImageUrl: imageUrl, sideImageAlt: loginPage.sideImageAlt || file.name });
    } catch (error) {
      setUploadError(getSafeUserErrorMessage(error, 'อัปโหลดภาพไม่สำเร็จ'));
    } finally {
      setIsUploadingSideImage(false);
    }
  };

  const handleBackgroundImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setIsUploadingBackground(true);
      setUploadError(null);
      const imageUrl = await uploadLoginPageBackgroundImage(file);
      updateField('backgroundImageUrl', imageUrl);
    } catch (error) {
      setUploadError(getSafeUserErrorMessage(error, 'อัปโหลดภาพพื้นหลังไม่สำเร็จ'));
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const backgroundImageUrl = loginPage.backgroundImageUrl || '/SmartDSP.png';
  const isBackgroundImageEnabled = loginPage.backgroundImageEnabled !== false;
  const isPanelGradientEnabled = loginPage.loginPanelGradientEnabled !== false;
  const loginPanelGradient = `linear-gradient(135deg, ${loginPage.loginPanelGradientFrom}, ${loginPage.loginPanelGradientTo})`;

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">จัดการภาพหน้า Login</h2>
          <p className="mt-1 text-sm text-slate-500">กำหนดภาพประกอบฝั่งซ้ายและภาพพื้นหลังของหน้าเข้าสู่ระบบ บนจอเล็กระบบจะแสดงเฉพาะกล่อง Login</p>
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
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและใช้กับหน้า Login'}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">รายการที่ 1 - ภาพประกอบหน้า Login</p>
              <p className="mt-1 truncate text-xs text-slate-500">{loginPage.sideImageUrl || 'ยังไม่ได้กำหนดรูปภาพ'}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={togglePublish}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${getStatusClass(loginPage.status)}`}
                title={loginPage.status === 'published' ? 'กดเพื่อเปลี่ยนเป็นฉบับร่าง' : 'กดเพื่อเผยแพร่'}
              >
                <span className={`relative h-5 w-9 rounded-full transition ${loginPage.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${loginPage.status === 'published' ? 'left-4' : 'left-0.5'}`} />
                </span>
                {getStatusLabel(loginPage.status)}
              </button>
              <button
                type="button"
                onClick={() => toggleExpandedItem('side-image')}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-expanded={expandedItem === 'side-image'}
              >
                {expandedItem === 'side-image' ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                {expandedItem === 'side-image' ? 'ปิดรายละเอียด' : 'แก้ไข'}
              </button>
            </div>
          </div>

          {expandedItem === 'side-image' ? (
            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">URL รูปภาพ</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={loginPage.sideImageUrl}
                      onChange={(event) => updateField('sideImageUrl', event.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">คำอธิบายรูปภาพ</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={loginPage.sideImageAlt}
                      onChange={(event) => updateField('sideImageAlt', event.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">สถานะ</span>
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={loginPage.status}
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
                    {isUploadingSideImage ? 'กำลังอัปโหลด...' : 'เลือกไฟล์รูปภาพ'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={isUploadingSideImage}
                      onChange={(event) => {
                        void handleSideImageUpload(event.target.files?.[0] || null);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {uploadError ? <p className="text-sm font-medium text-red-600">{uploadError}</p> : null}
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  {loginPage.sideImageUrl ? (
                    <img src={loginPage.sideImageUrl} alt={loginPage.sideImageAlt || 'ภาพประกอบหน้า Login'} className="aspect-[4/3] w-full rounded-md object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-md bg-slate-100 text-slate-400">
                      <Image className="h-8 w-8" aria-hidden="true" />
                      <p className="mt-2 text-xs font-medium">ยังไม่มีภาพ</p>
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
              <p className="truncate text-sm font-semibold text-slate-950">รายการที่ 2 - ปรับแต่งภาพพื้นหลัง</p>
              <p className="mt-1 truncate text-xs text-slate-500">{backgroundImageUrl}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
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
                {isBackgroundImageEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </button>
              <button
                type="button"
                onClick={() => toggleExpandedItem('background')}
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
                      value={loginPage.backgroundImageUrl}
                      onChange={(event) => updateField('backgroundImageUrl', event.target.value)}
                      placeholder="/SmartDSP.png"
                    />
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
                      <label htmlFor="login-background-overlay" className="text-sm font-medium text-slate-700">
                        ปรับสีเงาดำ/สว่างของรูปภาพพื้นหลัง
                      </label>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{loginPage.backgroundOverlayOpacity}%</span>
                    </div>
                    <input
                      id="login-background-overlay"
                      type="range"
                      min="0"
                      max="90"
                      step="1"
                      value={loginPage.backgroundOverlayOpacity}
                      onChange={(event) => updateField('backgroundOverlayOpacity', Number(event.target.value))}
                      className="mt-3 w-full accent-brand-600"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>สว่างขึ้น</span>
                      <span>มืดขึ้น อ่านง่ายขึ้น</span>
                    </div>
                  </div>
                  {uploadError ? <p className="text-sm font-medium text-red-600">{uploadError}</p> : null}
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  {isBackgroundImageEnabled ? (
                    <div
                      className="aspect-[4/3] w-full rounded-md bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                      aria-label="ตัวอย่างภาพพื้นหลังหน้า Login"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-slate-300">
                      ปิดใช้งานภาพพื้นหลัง
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
              <p className="truncate text-sm font-semibold text-slate-950">รายการที่ 3 - ปรับแต่งสีหน้าต่าง Login</p>
              <p className="mt-1 truncate text-xs text-slate-500">{loginPage.loginPanelGradientFrom} → {loginPage.loginPanelGradientTo}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => updateField('loginPanelGradientEnabled', !isPanelGradientEnabled)}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                  isPanelGradientEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
                aria-pressed={isPanelGradientEnabled}
              >
                <span className={`relative h-5 w-9 rounded-full transition ${isPanelGradientEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${isPanelGradientEnabled ? 'left-4' : 'left-0.5'}`} />
                </span>
                {isPanelGradientEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </button>
              <button
                type="button"
                onClick={() => toggleExpandedItem('panel-gradient')}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-expanded={expandedItem === 'panel-gradient'}
              >
                {expandedItem === 'panel-gradient' ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                {expandedItem === 'panel-gradient' ? 'ปิดรายละเอียด' : 'แก้ไข'}
              </button>
            </div>
          </div>

          {expandedItem === 'panel-gradient' ? (
            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">สีเริ่มต้น</span>
                      <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                        <input
                          type="color"
                          value={loginPage.loginPanelGradientFrom}
                          onChange={(event) => updateField('loginPanelGradientFrom', event.target.value)}
                          className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0"
                          aria-label="เลือกสีเริ่มต้น"
                        />
                        <input
                          value={loginPage.loginPanelGradientFrom}
                          onChange={(event) => updateField('loginPanelGradientFrom', event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-sm uppercase text-slate-700 outline-none"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">สีปลายทาง</span>
                      <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                        <input
                          type="color"
                          value={loginPage.loginPanelGradientTo}
                          onChange={(event) => updateField('loginPanelGradientTo', event.target.value)}
                          className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0"
                          aria-label="เลือกสีปลายทาง"
                        />
                        <input
                          value={loginPage.loginPanelGradientTo}
                          onChange={(event) => updateField('loginPanelGradientTo', event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-sm uppercase text-slate-700 outline-none"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-sm font-medium text-slate-700">ตัวอย่างสี Gradient</p>
                    <div className="mt-3 h-20 rounded-md border border-white shadow-inner" style={{ background: loginPanelGradient }} />
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  {isPanelGradientEnabled ? (
                    <div className="flex aspect-[4/3] w-full flex-col justify-between rounded-md p-4 text-white" style={{ background: loginPanelGradient }}>
                      <div>
                        <p className="text-sm font-bold">Smart DSP</p>
                        <p className="mt-1 text-xs text-white/80">ตัวอย่างหน้าต่าง Login</p>
                      </div>
                      <div className="rounded-md bg-white/90 p-3 text-xs font-semibold text-slate-700">Login form</div>
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md bg-slate-950/35 text-xs font-semibold text-slate-500">
                      ปิดใช้งานสีหน้าต่าง Login
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
