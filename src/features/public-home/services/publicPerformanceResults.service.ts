import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import type { SiteContentPlanCoverLayout, SiteContentPlanIconKey, SiteContentStatus } from '../../site-content/types/siteContent.types';

export type PerformanceResultCategory = 'key-result' | 'annual-report' | 'indicator-report' | 'other';

export type PublicPerformanceResult = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerWorkGroup: string | null;
  category: PerformanceResultCategory;
  fiscalYear: number;
  sortOrder: number;
  title: string;
  subtitle: string;
  description: string;
  iconKey: SiteContentPlanIconKey;
  color: string;
  actionLabel: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: SiteContentPlanCoverLayout;
  status: SiteContentStatus;
  createdAt: string;
  updatedAt: string;
};

export const performanceCategoryOptions: Array<{
  value: PerformanceResultCategory;
  label: string;
  color: string;
  tone: 'blue' | 'emerald' | 'violet' | 'rose';
}> = [
  { value: 'key-result', label: 'ผลการดำเนินงานสำคัญ', color: 'bg-sky-600', tone: 'blue' },
  { value: 'annual-report', label: 'รายงานผลประจำปี', color: 'bg-emerald-600', tone: 'emerald' },
  { value: 'indicator-report', label: 'รายงานตัวชี้วัด', color: 'bg-violet-600', tone: 'violet' },
  { value: 'other', label: 'อื่น ๆ', color: 'bg-rose-500', tone: 'rose' },
];

type PerformanceResultRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_work_group: string | null;
  category: string;
  fiscal_year: number;
  sort_order: number;
  title: string;
  subtitle: string;
  description: string;
  icon_key: string;
  color: string;
  action_label: string;
  pdf_url: string;
  cover_image_url: string;
  cover_image_layout: string;
  status: SiteContentStatus;
  created_at: string;
  updated_at: string;
};

const selectColumns = 'id, owner_user_id, owner_name, owner_work_group, category, fiscal_year, sort_order, title, subtitle, description, icon_key, color, action_label, pdf_url, cover_image_url, cover_image_layout, status, created_at, updated_at';

type SupabaseFrom = (table: string) => any;

type SupabaseDataResult<T> = {
  data: T;
  error: unknown | null;
};

function performanceResultsTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_performance_results');
}

function normalizeCategory(value: string): PerformanceResultCategory {
  return performanceCategoryOptions.some((option) => option.value === value) ? value as PerformanceResultCategory : 'other';
}

export function getPerformanceCategory(category: PerformanceResultCategory) {
  return performanceCategoryOptions.find((option) => option.value === category) || performanceCategoryOptions[3];
}

function mapRow(row: PerformanceResultRow): PublicPerformanceResult {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    ownerWorkGroup: row.owner_work_group,
    category: normalizeCategory(row.category),
    fiscalYear: row.fiscal_year,
    sortOrder: row.sort_order,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    iconKey: (row.icon_key || 'growth') as SiteContentPlanIconKey,
    color: row.color,
    actionLabel: row.action_label,
    pdfUrl: row.pdf_url,
    coverImageUrl: row.cover_image_url,
    coverImageLayout: row.cover_image_layout === 'portrait' ? 'portrait' : 'landscape',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(result: PublicPerformanceResult) {
  return {
    id: result.id,
    owner_user_id: result.ownerUserId,
    owner_name: result.ownerName,
    owner_work_group: result.ownerWorkGroup,
    category: result.category,
    fiscal_year: result.fiscalYear,
    sort_order: result.sortOrder,
    title: result.title.trim(),
    subtitle: result.subtitle.trim(),
    description: result.description.trim(),
    icon_key: result.iconKey,
    color: getPerformanceCategory(result.category).color,
    action_label: result.actionLabel.trim() || 'ดูผลการดำเนินงาน',
    pdf_url: result.pdfUrl.trim(),
    cover_image_url: result.coverImageUrl.trim(),
    cover_image_layout: result.coverImageLayout,
    status: result.status === 'published' ? 'published' : 'draft',
  };
}

export function comparePerformanceResults(first: PublicPerformanceResult, second: PublicPerformanceResult) {
  if (first.fiscalYear !== second.fiscalYear) return second.fiscalYear - first.fiscalYear;
  const categoryIndex = (category: PerformanceResultCategory) => performanceCategoryOptions.findIndex((option) => option.value === category);
  const categoryCompare = categoryIndex(first.category) - categoryIndex(second.category);
  return categoryCompare || first.sortOrder - second.sortOrder || second.updatedAt.localeCompare(first.updatedAt);
}

export async function loadPublicPerformanceResults() {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow[]>>(
    performanceResultsTable().select(selectColumns)
      .order('fiscal_year', { ascending: false })
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true }),
    'โหลดผลการดำเนินงานสำคัญจาก Supabase',
  );
  return ((data || []) as PerformanceResultRow[]).map(mapRow).sort(comparePerformanceResults);
}

export async function savePublicPerformanceResult(result: PublicPerformanceResult) {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow>>(
    performanceResultsTable().upsert(toRow(result), { onConflict: 'id' }).select(selectColumns).single(),
    'บันทึกผลการดำเนินงานสำคัญไป Supabase',
  );
  return mapRow(data as PerformanceResultRow);
}

export async function updatePublicPerformanceResultStatus(id: string, ownerUserId: string, status: 'published' | 'draft') {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow>>(
    performanceResultsTable().update({ status }).eq('id', id).eq('owner_user_id', ownerUserId).select(selectColumns).single(),
    'อัปเดตสถานะผลการดำเนินงานสำคัญ',
  );
  return mapRow(data as PerformanceResultRow);
}

export function createPublicPerformanceResult(input: Omit<PublicPerformanceResult, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } satisfies PublicPerformanceResult;
}
