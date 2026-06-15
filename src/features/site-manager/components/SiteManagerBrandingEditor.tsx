import { Upload } from 'lucide-react';
import { useState } from 'react';
import { uploadSiteLogo } from '../../site-content/services/siteContent.assets';
import type { SiteContentBrandSettings } from '../../site-content/types/siteContent.types';

type SiteManagerBrandingEditorProps = {
  brandSettings: SiteContentBrandSettings;
  onBrandSettingsChange: (brandSettings: SiteContentBrandSettings) => void;
  onSaveDraft: () => void;
  onResetDraft: () => void;
  isSaving?: boolean;
};

export function SiteManagerBrandingEditor({
  brandSettings,
  onBrandSettingsChange,
  onSaveDraft,
  onResetDraft,
  isSaving = false,
}: SiteManagerBrandingEditorProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLogoFileSelect = async (file: File | undefined) => {
    if (!file) return;

    setUploadingLogo(true);
    setUploadError(null);

    try {
      const logoUrl = await uploadSiteLogo(file);
      onBrandSettingsChange({ ...brandSettings, logoUrl });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'อัปโหลดโลโก้ไม่สำเร็จ');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">จัดการโลโก้และชื่อเว็บไซต์</h2>
          <p className="mt-1 text-sm text-slate-500">เปลี่ยนโลโก้ที่แสดงบนแถบ Header และ banner ศูนย์รวมแผน</p>
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
          <button
            type="button"
            onClick={onResetDraft}
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-fit"
          >
            คืนค่าเริ่มต้น
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-fit"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและใช้กับหน้า Home'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">ชื่อเว็บไซต์</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={brandSettings.siteName}
              onChange={(event) => onBrandSettingsChange({ ...brandSettings, siteName: event.target.value })}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">URL โลโก้</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={brandSettings.logoUrl}
              onChange={(event) => onBrandSettingsChange({ ...brandSettings, logoUrl: event.target.value })}
            />
          </label>

          <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Upload className="h-4 w-4" aria-hidden="true" />
              อัปโหลดโลโก้ไป Supabase Storage
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="mt-3 w-full text-sm text-slate-600"
              onChange={(event) => void handleLogoFileSelect(event.target.files?.[0])}
            />
            <span className="mt-2 block text-xs text-slate-500">
              {uploadingLogo ? 'กำลังอัปโหลด...' : 'รองรับ PNG, JPG, WEBP และ SVG'}
            </span>
            {uploadError ? <span className="mt-2 block text-xs font-medium text-red-600">{uploadError}</span> : null}
          </label>
        </div>

        <div className="grid gap-4">
          <div className="rounded-md border border-slate-200 bg-slate-950 p-4 text-white">
            <p className="text-sm font-semibold text-slate-300">Header preview</p>
            <div className="mt-3 flex items-center gap-3 border-b border-white/10 pb-3">
              <img src={brandSettings.logoUrl} alt={brandSettings.siteName} className="h-9 w-9 rounded-md bg-white p-1 object-contain" />
              <span className="text-sm font-semibold">{brandSettings.siteName}</span>
            </div>
          </div>

          <div className="rounded-md border border-emerald-100 bg-white p-5">
            <p className="text-sm font-semibold text-slate-500">Plan banner preview</p>
            <div className="mt-4 flex items-center gap-4">
              <img src={brandSettings.logoUrl} alt="กรมควบคุมโรค" className="h-20 w-20 rounded-md object-contain" />
              <div>
                <p className="text-xl font-bold text-sky-950">ศูนย์รวมแผนระดับต่าง ๆ</p>
                <p className="text-sm font-semibold text-emerald-700">ด้านการป้องกันควบคุมโรคและภัยสุขภาพของประเทศ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
