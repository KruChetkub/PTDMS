import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { createUuid } from '../../../utils/uuid';

export type PublicRepositoryType = 'plan' | 'performance' | 'research' | 'home';
export type PublicRepositoryCategoryTone = 'blue' | 'emerald' | 'violet' | 'orange' | 'rose';

export type PublicRepositoryCategory = {
  id: string;
  repositoryType: PublicRepositoryType;
  key: string;
  label: string;
  color: string;
  tone: PublicRepositoryCategoryTone;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategoryRow = {
  id: string;
  repository_type: PublicRepositoryType;
  category_key: string;
  label: string;
  color: string;
  tone: PublicRepositoryCategoryTone;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseFrom = (table: string) => any;
type SupabaseDataResult<T> = { data: T; error: unknown | null };

export const repositoryCategoryPalette = [
  { color: 'bg-blue-600', tone: 'blue', label: 'น้ำเงิน' },
  { color: 'bg-sky-600', tone: 'blue', label: 'ฟ้า' },
  { color: 'bg-cyan-600', tone: 'blue', label: 'ฟ้าอมเขียว' },
  { color: 'bg-teal-600', tone: 'emerald', label: 'เขียวอมฟ้า' },
  { color: 'bg-emerald-600', tone: 'emerald', label: 'เขียว' },
  { color: 'bg-violet-600', tone: 'violet', label: 'ม่วง' },
  { color: 'bg-orange-500', tone: 'orange', label: 'ส้ม' },
  { color: 'bg-rose-500', tone: 'rose', label: 'ชมพู' },
] as const;

const defaultCategoryRows: Record<PublicRepositoryType, ReadonlyArray<readonly [string, string, string, PublicRepositoryCategoryTone]>> = {
  plan: [
    ['plan-level-1', 'แผนระดับ 1', 'bg-blue-600', 'blue'],
    ['plan-level-2', 'แผนระดับ 2', 'bg-emerald-600', 'emerald'],
    ['plan-level-3', 'แผนระดับ 3', 'bg-violet-600', 'violet'],
    ['executive-policy', 'นโยบายผู้บริหาร', 'bg-orange-500', 'orange'],
    ['annual-budget-document', 'เอกสารงบประมาณรายจ่ายประจำปี', 'bg-cyan-600', 'blue'],
    ['action-plan', 'แผนปฏิบัติราชการ', 'bg-teal-600', 'emerald'],
    ['other', 'อื่น ๆ', 'bg-rose-500', 'rose'],
  ],
  performance: [
    ['key-result', 'ผลการดำเนินงานสำคัญ', 'bg-sky-600', 'blue'],
    ['annual-report', 'รายงานประจำปี', 'bg-emerald-600', 'emerald'],
    ['achievement-report', 'รายงานผลสัมฤทธิ์', 'bg-cyan-600', 'blue'],
    ['risk-management-report', 'รายงานแผนบริหารความเสี่ยง', 'bg-orange-500', 'orange'],
    ['indicator-report', 'รายงานตัวชี้วัด', 'bg-violet-600', 'violet'],
    ['other', 'อื่น ๆ', 'bg-rose-500', 'rose'],
  ],
  research: [
    ['r2r', 'งานวิจัยจากงานประจำ (R2R)', 'bg-emerald-600', 'emerald'],
    ['innovation', 'นวัตกรรมและการพัฒนางาน', 'bg-sky-600', 'blue'],
    ['evaluation', 'การประเมินผล', 'bg-violet-600', 'violet'],
    ['other', 'งานวิจัยอื่น ๆ', 'bg-rose-500', 'rose'],
  ],
  home: [
    ['plan', 'แผนระดับต่าง ๆ', 'bg-emerald-600', 'emerald'],
    ['policy', 'นโยบายและการดำเนินงาน', 'bg-blue-600', 'blue'],
  ],
};

export function getDefaultRepositoryCategories(type: PublicRepositoryType) {
  return defaultCategoryRows[type].map(([key, label, color, tone], index) => ({
    id: `${type}-${key}`,
    repositoryType: type,
    key,
    label,
    color,
    tone,
    sortOrder: (index + 1) * 10,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }));
}

function categoriesTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_repository_categories');
}

function mapRow(row: CategoryRow): PublicRepositoryCategory {
  return {
    id: row.id,
    repositoryType: row.repository_type,
    key: row.category_key,
    label: row.label,
    color: row.color,
    tone: row.tone,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const selectColumns = 'id, repository_type, category_key, label, color, tone, sort_order, is_active, created_at, updated_at';

export async function loadPublicRepositoryCategories(type: PublicRepositoryType) {
  const { data } = await runSupabaseQuery<SupabaseDataResult<CategoryRow[]>>(
    categoriesTable()
      .select(selectColumns)
      .eq('repository_type', type)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    'โหลดหมวดหมู่คลังข้อมูลจาก Supabase',
  );
  return ((data || []) as CategoryRow[]).map(mapRow);
}

export async function savePublicRepositoryCategory(
  category: PublicRepositoryCategory,
  userId: string,
) {
  const commonRow = {
    repository_type: category.repositoryType,
    category_key: category.key,
    label: category.label.trim(),
    color: category.color,
    tone: category.tone,
    sort_order: Math.max(1, Math.round(category.sortOrder)),
    is_active: category.isActive,
    updated_by: userId,
  };

  if (category.createdAt) {
    const { data } = await runSupabaseQuery<SupabaseDataResult<CategoryRow>>(
      categoriesTable().update(commonRow).eq('id', category.id).select(selectColumns).single(),
      'แก้ไขหมวดหมู่',
    );
    return mapRow(data);
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(category.id)) {
    const { data } = await runSupabaseQuery<SupabaseDataResult<CategoryRow>>(
      categoriesTable()
        .update(commonRow)
        .eq('repository_type', category.repositoryType)
        .eq('category_key', category.key)
        .select(selectColumns)
        .single(),
      'แก้ไขหมวดหมู่',
    );
    return mapRow(data);
  }

  const { data } = await runSupabaseQuery<SupabaseDataResult<CategoryRow>>(
    categoriesTable()
      .insert({ id: category.id, ...commonRow, created_by: userId })
      .select(selectColumns)
      .single(),
    'เพิ่มหมวดหมู่',
  );
  return mapRow(data);
}

export function createPublicRepositoryCategory(
  type: PublicRepositoryType,
  label: string,
  color: string,
  tone: PublicRepositoryCategoryTone,
  sortOrder: number,
): PublicRepositoryCategory {
  const id = createUuid();
  return {
    id,
    repositoryType: type,
    key: `custom-${id.toLowerCase()}`,
    label: label.trim(),
    color,
    tone,
    sortOrder,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
}

export async function deletePublicRepositoryCategory(id: string) {
  await runSupabaseQuery<SupabaseDataResult<null>>(
    categoriesTable().delete().eq('id', id),
    'ลบหมวดหมู่',
  );
}

export function findPublicRepositoryCategory(
  categories: PublicRepositoryCategory[],
  key: string,
) {
  return categories.find((category) => category.key === key);
}
