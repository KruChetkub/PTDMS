import { useState } from 'react';
import { FileCheck2, ImageUp, LoaderCircle } from 'lucide-react';
import { uploadPlanCoverImage } from '../../site-content/services/siteContent.assets';

type AdminCoverImageUploadProps = {
  disabled?: boolean;
  onUploaded: (imageUrl: string) => void;
  onError: (message: string) => void;
  onUploadingChange: (isUploading: boolean) => void;
};

export function AdminCoverImageUpload({ disabled = false, onUploaded, onError, onUploadingChange }: AdminCoverImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      setIsUploading(true);
      onUploadingChange(true);
      const imageUrl = await uploadPlanCoverImage(file);
      setFileName(file.name);
      onUploaded(imageUrl);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'อัปโหลดภาพหน้าปกไม่สำเร็จ');
    } finally {
      setIsUploading(false);
      onUploadingChange(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 ${disabled || isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageUp className="h-4 w-4" aria-hidden="true" />}
        {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดภาพหน้าปก'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || isUploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            void handleFile(file);
          }}
        />
      </label>
      {fileName ? (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
          <FileCheck2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="max-w-64 truncate">{fileName}</span>
        </span>
      ) : <span className="text-xs text-slate-500">สำหรับ Admin · ภาพไม่เกิน 5 MB</span>}
    </div>
  );
}
