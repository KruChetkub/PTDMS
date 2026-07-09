import { supabase } from '../../../lib/supabase';

const SITE_CONTENT_ASSETS_BUCKET = 'site-content-assets';

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uploadSiteLogo(file: File) {
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
  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `plan-cover.${extension}`;
  const filePath = `plan-covers/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`อัปโหลดภาพหน้าปกไม่สำเร็จ: ${error.message}`);
  }

  const { data } = supabase.storage.from(SITE_CONTENT_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadLoginPageImage(file: File) {
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
