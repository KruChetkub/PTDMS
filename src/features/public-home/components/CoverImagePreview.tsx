import { useState } from 'react';
import { Image as ImageIcon, ImageOff } from 'lucide-react';
import type { SiteContentPlanCoverLayout } from '../../site-content/types/siteContent.types';
import { PdfFirstPageCover } from './PdfFirstPageCover';

type CoverImagePreviewProps = {
  imageUrl: string;
  pdfUrl?: string;
  layout: SiteContentPlanCoverLayout;
  title?: string;
};

type PreviewImageProps = Required<Pick<CoverImagePreviewProps, 'imageUrl' | 'layout'>> & {
  alt: string;
};

function PreviewImage({ imageUrl, layout, alt }: PreviewImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const frameClass = layout === 'portrait'
    ? 'h-44 aspect-[9/16]'
    : 'w-full max-w-sm aspect-[16/9]';

  return (
    <div className={`relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${frameClass}`}>
      {status === 'loading' ? (
        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs font-medium text-slate-500">
          กำลังโหลดภาพ...
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-xs font-medium text-red-600">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
          ไม่สามารถโหลดภาพได้
        </div>
      ) : null}
      <img
        src={imageUrl}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={`h-full w-full object-contain transition-opacity ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export function CoverImagePreview({ imageUrl, pdfUrl = '', layout, title }: CoverImagePreviewProps) {
  const normalizedUrl = imageUrl.trim();
  const normalizedPdfUrl = pdfUrl.trim();

  return (
    <div className="rounded-md border border-slate-200 bg-slate-100/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">ตัวอย่างภาพปก</span>
        <span className="text-xs font-medium text-slate-500">
          {layout === 'portrait' ? '360 x 640 px' : '640 x 360 px'}
        </span>
      </div>
      <div className="mt-3 flex h-48 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50 p-2">
        {normalizedUrl ? (
          <PreviewImage
            key={`${normalizedUrl}-${layout}`}
            imageUrl={normalizedUrl}
            layout={layout}
            alt={title?.trim() ? `ตัวอย่างภาพปก ${title.trim()}` : 'ตัวอย่างภาพปก'}
          />
        ) : normalizedPdfUrl ? (
          <div className={`overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${layout === 'portrait' ? 'h-44 aspect-[9/16]' : 'w-full max-w-sm aspect-[16/9]'}`}>
            <PdfFirstPageCover
              key={`${normalizedPdfUrl}-${layout}`}
              pdfUrl={normalizedPdfUrl}
              title={title?.trim() || 'เอกสาร'}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-xs font-medium text-slate-500">
            <ImageIcon className="h-7 w-7" aria-hidden="true" />
            ยังไม่ได้ระบุภาพปก
          </div>
        )}
      </div>
    </div>
  );
}
