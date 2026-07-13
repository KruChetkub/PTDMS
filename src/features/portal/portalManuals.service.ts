import { supabase } from '../../lib/supabase';
import type { Database, PortalUserManual } from '../../types/database.types';
import { optionalPlainTextInput, sanitizePlainTextInput, sanitizeUrlInput, validateUploadFile } from '../../utils/inputSecurity';

const SITE_CONTENT_ASSETS_BUCKET = 'site-content-assets';
const PORTAL_MANUAL_ALLOWED_PDF_TYPES = ['application/pdf'];
const PORTAL_MANUAL_MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

export type PortalManualDraft = {
  id?: string;
  title: string;
  description?: string | null;
  pdfUrl: string;
  pdfPath?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type PortalManualInsert = Database['public']['Tables']['portal_user_manuals']['Insert'];
type PortalManualUpdate = Database['public']['Tables']['portal_user_manuals']['Update'];

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeManualDraft(manual: PortalManualDraft, updatedBy: string | null): PortalManualInsert {
  const title = sanitizePlainTextInput(manual.title, { fieldName: 'ชื่อคู่มือ', maxLength: 160, allowNewlines: false });
  const pdfUrl = sanitizeUrlInput(manual.pdfUrl, { fieldName: 'ลิงก์ PDF', maxLength: 1000 });

  if (!title) {
    throw new Error('กรุณากรอกชื่อคู่มือ');
  }

  if (!pdfUrl) {
    throw new Error('กรุณากรอกลิงก์ PDF หรืออัปโหลดไฟล์ PDF');
  }

  return {
    id: manual.id,
    title,
    description: optionalPlainTextInput(manual.description, { fieldName: 'รายละเอียดคู่มือ', maxLength: 300, allowNewlines: false }),
    pdf_url: pdfUrl,
    pdf_path: optionalPlainTextInput(manual.pdfPath, { fieldName: 'ที่เก็บไฟล์ PDF', maxLength: 500, allowNewlines: false }),
    is_active: manual.isActive,
    sort_order: Number.isFinite(manual.sortOrder) ? manual.sortOrder : 10,
    updated_by: updatedBy,
  };
}

function toManualDraft(row: PortalUserManual): PortalManualDraft {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pdfUrl: row.pdf_url,
    pdfPath: row.pdf_path,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function listActivePortalUserManuals() {
  const { data, error } = await supabase
    .from('portal_user_manuals')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(`โหลดคู่มือการใช้งานไม่สำเร็จ: ${error.message}`);
  }

  return (data || []) as PortalUserManual[];
}

export async function listPortalUserManualsForAdmin() {
  const { data, error } = await supabase
    .from('portal_user_manuals')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(`โหลดการตั้งค่าคู่มือไม่สำเร็จ: ${error.message}`);
  }

  return ((data || []) as PortalUserManual[]).map(toManualDraft);
}

export async function savePortalUserManualSettings(input: {
  manuals: PortalManualDraft[];
  deletedManualIds: string[];
  updatedBy: string | null;
}) {
  if (input.deletedManualIds.length > 0) {
    const { error } = await supabase.from('portal_user_manuals').delete().in('id', input.deletedManualIds);

    if (error) {
      throw new Error(`ลบคู่มือไม่สำเร็จ: ${error.message}`);
    }
  }

  const normalizedManuals = input.manuals.map((manual) => normalizeManualDraft(manual, input.updatedBy));

  for (const manual of normalizedManuals) {
    if (manual.id) {
      const updatePayload: PortalManualUpdate = {
        title: manual.title,
        description: manual.description ?? null,
        pdf_url: manual.pdf_url,
        pdf_path: manual.pdf_path ?? null,
        is_active: manual.is_active,
        sort_order: manual.sort_order,
        updated_by: manual.updated_by ?? null,
      };
      const { error } = await supabase.from('portal_user_manuals').update(updatePayload).eq('id', manual.id);

      if (error) {
        throw new Error(`บันทึกคู่มือไม่สำเร็จ: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from('portal_user_manuals').insert(manual);

      if (error) {
        throw new Error(`เพิ่มคู่มือไม่สำเร็จ: ${error.message}`);
      }
    }
  }

  return listPortalUserManualsForAdmin();
}

export async function uploadPortalUserManualPdf(file: File) {
  validateUploadFile(file, {
    allowedTypes: PORTAL_MANUAL_ALLOWED_PDF_TYPES,
    maxSizeBytes: PORTAL_MANUAL_MAX_PDF_SIZE_BYTES,
    label: 'ไฟล์คู่มือ PDF',
  });

  const extension = file.name.split('.').pop() || 'pdf';
  const safeName = sanitizeFileName(file.name) || `portal-manual.${extension}`;
  const filePath = `portal-manuals/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'application/pdf',
  });

  if (error) {
    throw new Error(`อัปโหลดไฟล์คู่มือไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return {
    pdfUrl: data.publicUrl,
    pdfPath: filePath,
  };
}
