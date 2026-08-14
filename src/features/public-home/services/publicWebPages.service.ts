import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { sanitizePlainTextInput, sanitizeUrlInput } from '../../../utils/inputSecurity';
import { createUuid } from '../../../utils/uuid';
import type { PublicRepositoryCategoryTone } from './publicRepositoryCategories.service';

export type PublicWebPageStatus = 'draft' | 'published';

export type PublicWebPage = {
  id: string;
  category: string;
  slug: string;
  title: string;
  description: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: 'portrait' | 'landscape';
  sortOrder: number;
  status: PublicWebPageStatus;
  viewCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type PublicWebPageRow = {
  id: string;
  category: string;
  slug: string;
  title: string;
  description: string;
  pdf_url: string;
  cover_image_url: string;
  cover_image_layout: 'portrait' | 'landscape';
  sort_order: number;
  status: PublicWebPageStatus;
  view_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseFrom = (table: string) => any;
type SupabaseRpc = (fn: string, args?: Record<string, unknown>) => any;
type SupabaseResult<T> = { data: T; error: unknown | null };

export const PUBLIC_WEB_PAGES_UPDATED_EVENT = 'smartdsp-public-web-pages-updated';

const selectColumns = 'id, category, slug, title, description, pdf_url, cover_image_url, cover_image_layout, sort_order, status, view_count, created_by, updated_by, created_at, updated_at';

function pagesTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_web_pages');
}

function mapRow(row: PublicWebPageRow): PublicWebPage {
  return {
    id: row.id,
    category: row.category || 'general',
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    pdfUrl: row.pdf_url || '',
    coverImageUrl: row.cover_image_url || '',
    coverImageLayout: row.cover_image_layout === 'landscape' ? 'landscape' : 'portrait',
    sortOrder: row.sort_order || 10,
    status: row.status,
    viewCount: row.view_count || 0,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function createSlugFromTitle(title: string) {
  return normalizeSlug(title) || `page-${createUuid().slice(0, 8)}`;
}

function mapToRow(page: PublicWebPage) {
  const title = sanitizePlainTextInput(page.title, { fieldName: 'ชื่อหน้าเว็บไซต์', maxLength: 160, allowNewlines: false });
  const description = sanitizePlainTextInput(page.description, { fieldName: 'รายละเอียด', maxLength: 4000, allowNewlines: true });
  const slug = normalizeSlug(page.slug);

  if (!slug) {
    throw new Error('กรุณาระบุ slug สำหรับลิงก์หน้าเว็บไซต์');
  }

  return {
    id: page.id,
    category: page.category,
    slug,
    title,
    description,
    pdf_url: sanitizeUrlInput(page.pdfUrl, { fieldName: 'ลิงก์เอกสาร PDF', maxLength: 2048 }) || '',
    cover_image_url: sanitizeUrlInput(page.coverImageUrl, { fieldName: 'ลิงก์ภาพหน้าปก', maxLength: 2048 }) || '',
    cover_image_layout: page.coverImageLayout,
    sort_order: Math.max(1, Math.round(page.sortOrder || 10)),
    status: page.status,
    created_by: page.createdBy,
    updated_by: page.updatedBy,
  };
}

export function comparePublicWebPages(first: PublicWebPage, second: PublicWebPage) {
  return first.category.localeCompare(second.category, 'th') || first.sortOrder - second.sortOrder || second.updatedAt.localeCompare(first.updatedAt);
}

export async function loadPublicWebPages() {
  const { data } = await runSupabaseQuery<SupabaseResult<PublicWebPageRow[]>>(
    pagesTable().select(selectColumns).order('updated_at', { ascending: false }),
    'โหลดหน้าเว็บไซต์เพิ่มเติม',
  );
  return ((data || []) as PublicWebPageRow[]).map(mapRow).sort(comparePublicWebPages);
}

export async function loadPublishedPublicWebPage(slug: string) {
  const { data } = await runSupabaseQuery<SupabaseResult<PublicWebPageRow | null>>(
    pagesTable().select(selectColumns).eq('slug', normalizeSlug(slug)).eq('status', 'published').maybeSingle(),
    'โหลดหน้าเว็บไซต์สาธารณะ',
  );
  return data ? mapRow(data) : null;
}

export function getPublicWebPageCategoryTone(category: string): PublicRepositoryCategoryTone {
  if (category === 'policy') return 'emerald';
  if (category === 'document') return 'violet';
  return 'blue';
}

export async function savePublicWebPage(page: PublicWebPage) {
  const row = mapToRow(page);
  const { data: updatedData } = await runSupabaseQuery<SupabaseResult<PublicWebPageRow | null>>(
    pagesTable().update(row).eq('id', page.id).select(selectColumns).maybeSingle(),
    'แก้ไขหน้าเว็บไซต์เพิ่มเติม',
  );

  const savedRow = updatedData || (await runSupabaseQuery<SupabaseResult<PublicWebPageRow>>(
    pagesTable().insert(row).select(selectColumns).single(),
    'เพิ่มหน้าเว็บไซต์เพิ่มเติม',
  )).data;
  const savedPage = mapRow(savedRow);
  window.dispatchEvent(new CustomEvent(PUBLIC_WEB_PAGES_UPDATED_EVENT, { detail: savedPage }));
  return savedPage;
}

export async function updatePublicWebPageStatus(id: string, status: PublicWebPageStatus, userId: string) {
  const { data } = await runSupabaseQuery<SupabaseResult<PublicWebPageRow>>(
    pagesTable().update({ status, updated_by: userId }).eq('id', id).select(selectColumns).single(),
    'เปลี่ยนสถานะหน้าเว็บไซต์เพิ่มเติม',
  );
  const savedPage = mapRow(data);
  window.dispatchEvent(new CustomEvent(PUBLIC_WEB_PAGES_UPDATED_EVENT, { detail: savedPage }));
  return savedPage;
}

export async function deletePublicWebPage(id: string) {
  await runSupabaseQuery<SupabaseResult<null>>(
    pagesTable().delete().eq('id', id),
    'ลบหน้าเว็บไซต์เพิ่มเติม',
  );
  window.dispatchEvent(new CustomEvent(PUBLIC_WEB_PAGES_UPDATED_EVENT));
}

export async function incrementPublicWebPageViewCount(id: string) {
  await (supabase.rpc as unknown as SupabaseRpc)('increment_public_web_page_view_count', { p_page_id: id }).then(() => undefined, () => undefined);
}

export function createPublicWebPage(input: Omit<PublicWebPage, 'id' | 'viewCount' | 'createdAt' | 'updatedAt'>): PublicWebPage {
  const now = new Date().toISOString();
  return { ...input, id: createUuid(), viewCount: 0, createdAt: now, updatedAt: now };
}
