import { supabase } from '../lib/supabase';
import { trainingTypeOptions } from '../constants/training';
import type { Profile, TrainingRecord } from '../types/database.types';

export type DashboardSummary = {
  personnelCount: number;
  trainingRecordCount: number;
  topCategory: string;
  topWorkGroup: string;
  demographics: {
    genderBreakdown: Array<{ label: string; count: number }>;
    educationBreakdown: Array<{ label: string; count: number }>;
    generationBreakdown: Array<{ label: string; count: number }>;
    employmentTypeBreakdown: Array<{ label: string; count: number }>;
    averageAge: number | null;
  };
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

function countByLabelDesc(items: string[]) {
  return countByLabel(items).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'th'));
}

function limitGroups(items: Array<{ label: string; count: number }>, maxGroups: number) {
  if (items.length <= maxGroups) {
    return items;
  }

  const visibleGroups = items.slice(0, maxGroups - 1);
  const otherCount = items.slice(maxGroups - 1).reduce((sum, item) => sum + item.count, 0);

  return otherCount > 0 ? [...visibleGroups, { label: 'อื่น ๆ', count: otherCount }] : visibleGroups;
}

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
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
    supabase.from('profiles').select('user_id, work_group, gender, education, birth_date, generation, employment_type, role'),
  ]);

  if (trainingResult.error) {
    throw trainingResult.error;
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  const records = (trainingResult.data || []) as Pick<TrainingRecord, 'user_id' | 'course' | 'category' | 'month' | 'year'>[];
  const profiles = (profileResult.data || []) as Pick<
    Profile,
    'user_id' | 'work_group' | 'gender' | 'education' | 'birth_date' | 'generation' | 'employment_type' | 'role'
  >[];
  const includedProfiles = profiles.filter((profile) => profile.role !== 'super_admin');
  const includedUserIds = new Set(includedProfiles.map((profile) => profile.user_id));
  const includedRecords = records.filter((record) => includedUserIds.has(record.user_id));
  const personnelCount = includedProfiles.length;
  const trainingRecordCount = includedRecords.length;
  const workGroupsByUser = new Map(includedProfiles.map((profile) => [profile.user_id, profile.work_group || '-']));
  const ages = includedProfiles
    .map((profile) => (profile.birth_date ? calculateAge(profile.birth_date) : null))
    .filter((age): age is number => age !== null);
  const averageAge = ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : null;
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
    demographics: {
      genderBreakdown: countByLabelDesc(
        includedProfiles.map((profile) => (profile.gender === 'male' ? 'ชาย' : profile.gender === 'female' ? 'หญิง' : 'ไม่ระบุ')),
      ),
      educationBreakdown: countByLabelDesc(includedProfiles.map((profile) => profile.education || 'ไม่ระบุ')),
      generationBreakdown: limitGroups(countByLabelDesc(includedProfiles.map((profile) => profile.generation || 'ไม่ระบุ')), 3),
      employmentTypeBreakdown: countByLabelDesc(includedProfiles.map((profile) => profile.employment_type || 'ไม่ระบุ')),
      averageAge,
    },
    categoryBreakdown,
    monthlyTrend: countByLabel(includedRecords.map((record) => `${record.year}/${String(record.month).padStart(2, '0')}`)),
    yearlyTrend: countByLabel(includedRecords.map((record) => String(record.year))),
  };
}
