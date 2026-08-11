import { supabase } from '../../../lib/supabase';
import { validateUploadFile } from '../../../utils/inputSecurity';
import { createUuid } from '../../../utils/uuid';

const SITE_CONTENT_ASSETS_BUCKET = 'site-content-assets';
const SITE_CONTENT_ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const SITE_CONTENT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uploadSiteLogo(file: File) {
  validateUploadFile(file, { allowedTypes: SITE_CONTENT_ALLOWED_IMAGE_TYPES, maxSizeBytes: SITE_CONTENT_MAX_IMAGE_SIZE_BYTES, label: 'ไฟล์โลโก้' });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `logo.${extension}`;
  const filePath = `logos/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`อัปโหลดโลโก้ไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadPlanCoverImage(file: File) {
  validateUploadFile(file, { allowedTypes: SITE_CONTENT_ALLOWED_IMAGE_TYPES, maxSizeBytes: SITE_CONTENT_MAX_IMAGE_SIZE_BYTES, label: 'ภาพหน้าปก' });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `plan-cover.${extension}`;
  const filePath = `plan-covers/${Date.now()}-${createUuid()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(`อัปโหลดภาพหน้าปกไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadLoginPageImage(file: File) {
  validateUploadFile(file, { allowedTypes: SITE_CONTENT_ALLOWED_IMAGE_TYPES, maxSizeBytes: SITE_CONTENT_MAX_IMAGE_SIZE_BYTES, label: 'ภาพหน้า Login' });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `login-image.${extension}`;
  const filePath = `login-page/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`อัปโหลดภาพหน้า Login ไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
export async function uploadLoginPageBackgroundImage(file: File) {
  validateUploadFile(file, { allowedTypes: SITE_CONTENT_ALLOWED_IMAGE_TYPES, maxSizeBytes: SITE_CONTENT_MAX_IMAGE_SIZE_BYTES, label: 'ภาพพื้นหลังหน้า Login' });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `login-background.${extension}`;
  const filePath = `login-backgrounds/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`อัปโหลดภาพพื้นหลังหน้า Login ไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
export async function uploadPortalPageBackgroundImage(file: File) {
  validateUploadFile(file, { allowedTypes: SITE_CONTENT_ALLOWED_IMAGE_TYPES, maxSizeBytes: SITE_CONTENT_MAX_IMAGE_SIZE_BYTES, label: 'ภาพพื้นหลังหน้า Portal' });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `portal-background.${extension}`;
  const filePath = `portal-backgrounds/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`อัปโหลดภาพพื้นหลังหน้า Portal ไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
export async function uploadPortalHeaderBackgroundImage(file: File) {
  validateUploadFile(file, { allowedTypes: SITE_CONTENT_ALLOWED_IMAGE_TYPES, maxSizeBytes: SITE_CONTENT_MAX_IMAGE_SIZE_BYTES, label: 'ภาพพื้นหลัง Header หน้า Portal' });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `portal-header-background.${extension}`;
  const filePath = `portal-header-backgrounds/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`อัปโหลดภาพพื้นหลัง Header หน้า Portal ไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
