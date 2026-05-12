import { supabase } from '../lib/supabase';
import { trainingTypeOptions } from '../features/self-service/training-form.schema';
import type { Profile, TrainingRecord } from '../types/database.types';

export type DashboardSummary = {
  personnelCount: number;
  trainingRecordCount: number;
  topCategory: string;
  topWorkGroup: string;
  categoryBreakdown: Array<{
    label: string;
    count: number;
    percentage: number;
    topCourse: string;
  }>;
  monthlyTrend: Array<{ label: string; count: number }>;
  yearlyTrend: Array<{ label: string; count: number }>;
};

function topValue(items: string[]) {
  if (items.length === 0) {
    return '-';
  }

  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
}

function countByLabel(items: string[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function topCourseByCategory(records: Pick<TrainingRecord, 'course' | 'category'>[], category: string) {
  const counts = records
    .filter((record) => record.category === category)
    .reduce<Record<string, number>>((acc, record) => {
      acc[record.course] = (acc[record.course] || 0) + 1;
      return acc;
    }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '-';
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [trainingResult, profileResult] = await Promise.all([
    supabase.from('training_records').select('user_id, course, category, month, year'),
    supabase.from('profiles').select('user_id, work_group, role'),
  ]);

  if (trainingResult.error) {
    throw trainingResult.error;
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  const records = (trainingResult.data || []) as Pick<TrainingRecord, 'user_id' | 'course' | 'category' | 'month' | 'year'>[];
  const profiles = (profileResult.data || []) as Pick<Profile, 'user_id' | 'work_group' | 'role'>[];
  const includedProfiles = profiles.filter((profile) => profile.role !== 'super_admin');
  const includedUserIds = new Set(includedProfiles.map((profile) => profile.user_id));
  const includedRecords = records.filter((record) => includedUserIds.has(record.user_id));
  const personnelCount = includedProfiles.length;
  const trainingRecordCount = includedRecords.length;
  const workGroupsByUser = new Map(includedProfiles.map((profile) => [profile.user_id, profile.work_group || '-']));
  const totalCategorized = includedRecords.filter((record) => trainingTypeOptions.includes(record.category as (typeof trainingTypeOptions)[number])).length;
  const categoryBreakdown = trainingTypeOptions.map((label) => {
    const count = includedRecords.filter((record) => record.category === label).length;
    return {
      label,
      count,
      percentage: totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0,
      topCourse: topCourseByCategory(includedRecords, label),
    };
  });

  return {
    personnelCount,
    trainingRecordCount,
    topCategory: topValue(includedRecords.map((record) => record.category).filter(Boolean)),
    topWorkGroup: topValue(includedRecords.map((record) => workGroupsByUser.get(record.user_id) || '-').filter((value) => value !== '-')),
    categoryBreakdown,
    monthlyTrend: countByLabel(includedRecords.map((record) => `${record.year}/${String(record.month).padStart(2, '0')}`)),
    yearlyTrend: countByLabel(includedRecords.map((record) => String(record.year))),
  };
}
