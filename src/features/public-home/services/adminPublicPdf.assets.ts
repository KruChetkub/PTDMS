import { supabase } from '../../../lib/supabase';
import { validateUploadFile } from '../../../utils/inputSecurity';
import { createUuid } from '../../../utils/uuid';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const ASSETS_BUCKET = 'site-content-assets';
const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;
const PDF_WORKER_URL = `${pdfWorkerUrl}?v=20260810-1`;

export type AdminPublicPdfFolder = 'plans' | 'performance-results' | 'research';

export type AdminPublicPdfUploadResult = {
  pdfUrl: string;
  coverImageUrl: string;
  fileName: string;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createFirstPageCover(file: File) {
  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });

  try {
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);
    const initialViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, 960 / initialViewport.width) });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) throw new Error('ไม่สามารถเตรียมภาพหน้าปกได้');

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('ไม่สามารถสร้างภาพหน้าปกจาก PDF ได้'));
      }, 'image/jpeg', 0.86);
    });
  } finally {
    await loadingTask.destroy();
  }
}

export async function uploadAdminPublicPdf(file: File, userId: string, folder: AdminPublicPdfFolder): Promise<AdminPublicPdfUploadResult> {
  validateUploadFile(file, {
    allowedTypes: ['application/pdf'],
    maxSizeBytes: MAX_PDF_SIZE_BYTES,
    label: 'ไฟล์เอกสาร PDF',
  });

  const safeName = sanitizeFileName(file.name) || 'document.pdf';
  const uniqueName = `${Date.now()}-${createUuid()}`;
  const basePath = `public-home-documents/${userId}/${folder}/${uniqueName}`;
  const pdfPath = `${basePath}-${safeName}`;
  const coverPath = `${basePath}-cover.jpg`;
  const coverBlob = await createFirstPageCover(file);

  const { error: pdfError } = await supabase.storage.from(ASSETS_BUCKET).upload(pdfPath, file, {
    cacheControl: '3600',
    contentType: 'application/pdf',
    upsert: false,
  });

  if (pdfError) throw new Error(`อัปโหลดไฟล์ PDF ไม่สำเร็จ: ${pdfError.message}`);

  const { error: coverError } = await supabase.storage.from(ASSETS_BUCKET).upload(coverPath, coverBlob, {
    cacheControl: '31536000',
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (coverError) throw new Error(`อัปโหลดภาพหน้าปกไม่สำเร็จ: ${coverError.message}`);

  return {
    pdfUrl: supabase.storage.from(ASSETS_BUCKET).getPublicUrl(pdfPath).data.publicUrl,
    coverImageUrl: supabase.storage.from(ASSETS_BUCKET).getPublicUrl(coverPath).data.publicUrl,
    fileName: file.name,
  };
}
