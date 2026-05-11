import { supabase } from '../lib/supabase';
import type { Profile, TrainingRecord } from '../types/database.types';

export type DashboardSummary = {
  personnelCount: number;
  trainingRecordCount: number;
  topCategory: string;
  topWorkGroup: string;
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

async function getExactCount(table: 'profiles' | 'training_records') {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [personnelCount, trainingRecordCount, trainingResult, profileResult] = await Promise.all([
    getExactCount('profiles'),
    getExactCount('training_records'),
    supabase.from('training_records').select('user_id, course, category, month, year'),
    supabase.from('profiles').select('user_id, work_group'),
  ]);

  if (trainingResult.error) {
    throw trainingResult.error;
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  const records = (trainingResult.data || []) as Pick<TrainingRecord, 'user_id' | 'course' | 'category' | 'month' | 'year'>[];
  const profiles = (profileResult.data || []) as Pick<Profile, 'user_id' | 'work_group'>[];
  const workGroupsByUser = new Map(profiles.map((profile) => [profile.user_id, profile.work_group || '-']));

  return {
    personnelCount,
    trainingRecordCount,
    topCategory: topValue(records.map((record) => record.category).filter(Boolean)),
    topWorkGroup: topValue(records.map((record) => workGroupsByUser.get(record.user_id) || '-').filter((value) => value !== '-')),
    monthlyTrend: countByLabel(records.map((record) => `${record.year}/${String(record.month).padStart(2, '0')}`)),
    yearlyTrend: countByLabel(records.map((record) => String(record.year))),
  };
}
