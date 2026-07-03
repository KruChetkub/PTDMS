import { supabase } from '../lib/supabase';

export type CategoryAnalysis = {
  category: string;
  count: number;
};

export type WorkGroupAnalysis = {
  workGroup: string;
  count: number;
};

export type WorkGroupTrainingDetail = {
  id: string;
  userId: string;
  fullName: string;
  workGroup: string;
  course: string;
  category: string;
  organizer: string;
  date: string;
  year: number | null;
};

export type DevelopmentStats = {
  label: string;
  count: number;
  personnelCount: number;
};

export type AnalyticsData = {
  categories: CategoryAnalysis[];
  workGroups: WorkGroupAnalysis[];
  workGroupTrainingDetails: WorkGroupTrainingDetail[];
  developmentAreas: DevelopmentStats[];
  skillGroups: DevelopmentStats[];
  developmentAreaDetails: DevelopmentAreaDetail[];
  developmentAreaFilterOptions: DevelopmentAreaFilterOptions;
};

export type DevelopmentAreaDetail = {
  label: string;
  userId: string;
  fullName: string;
  department: string;
  workGroup: string;
  year: number | null;
};

export type DevelopmentAreaFilterOptions = {
  departments: string[];
  workGroups: string[];
  years: number[];
};

const INVALID_ANALYTICS_LABELS = new Set(['-', 'n/a', 'na', 'null', 'undefined']);

function normalizeAnalyticsLabel(value: string | null | undefined) {
  const normalized = (value || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (INVALID_ANALYTICS_LABELS.has(normalized.toLowerCase())) return null;
  return normalized;
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  // ดึงข้อมูลแยกกันเพื่อความเสถียรและป้องกัน Error เรื่อง Ambiguous Join
  const [trainingResult, trainingYearResult, profileResult, analysisResult] = await Promise.all([
    supabase.from('training_records').select('id, user_id, course, category, organizer, date, year'),
    supabase.from('training_records').select('id, year'),
    supabase.from('profiles').select('user_id, full_name, department, work_group, role'),
    supabase.from('development_analysis').select('training_id, user_id, development_area, skill_group'),
  ]);

  if (trainingResult.error) throw trainingResult.error;
  if (trainingYearResult.error) throw trainingYearResult.error;
  if (profileResult.error) throw profileResult.error;
  if (analysisResult.error) throw analysisResult.error;

  const allRecords = trainingResult.data || [];
  const trainingYears = trainingYearResult.data || [];
  const allProfiles = profileResult.data || [];
  const allAnalysis = analysisResult.data || [];
  const profiles = allProfiles.filter((profile) => profile.role !== 'super_admin');
  const includedUserIds = new Set(profiles.map((profile) => profile.user_id));
  const records = allRecords.filter((record) => includedUserIds.has(record.user_id));
  const analysis = allAnalysis.filter((item) => item.user_id && includedUserIds.has(item.user_id));

  // สร้างแผนผังกลุ่มงานจากโปรไฟล์ (ใช้ค่าเริ่มต้นเป็น 'ไม่ระบุ')
  const workGroupsByUser = new Map<string, string>();
  const profileByUser = new Map<string, { fullName: string; department: string; workGroup: string }>();
  profiles.forEach(p => {
    const workGroup = (p.work_group || '').trim() || 'ไม่ระบุ';
    const department = (p.department || '').trim() || 'ไม่ระบุ';
    const fullName = (p.full_name || '').trim() || p.user_id;
    workGroupsByUser.set(p.user_id, workGroup);
    profileByUser.set(p.user_id, { fullName, department, workGroup });
  });
  const yearByTrainingId = new Map<string, number | null>(trainingYears.map((item) => [item.id, item.year ?? null]));

  // Category Analysis
  const categoryCounts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  // Work Group Analysis (นับจากการจับคู่ User ID)
  const workGroupCounts = records.reduce<Record<string, number>>((acc, r) => {
    const group = workGroupsByUser.get(r.user_id) || 'ไม่ระบุ';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  const workGroupTrainingDetails = records
    .map((record) => {
      const profile = profileByUser.get(record.user_id);
      return {
        id: record.id,
        userId: record.user_id,
        fullName: profile?.fullName || record.user_id,
        workGroup: workGroupsByUser.get(record.user_id) || 'ไม่ระบุ',
        course: record.course || '-',
        category: record.category || '-',
        organizer: record.organizer || '-',
        date: record.date || '',
        year: typeof record.year === 'number' ? record.year : null,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.fullName.localeCompare(b.fullName, 'th'));

  // Development Area Analysis
  const areaStats = analysis.reduce<Record<string, { count: number; users: Set<string> }>>((acc, a) => {
    const label = normalizeAnalyticsLabel(a.development_area);
    if (!label) return acc;
    if (!acc[label]) {
      acc[label] = { count: 0, users: new Set<string>() };
    }
    acc[label].count += 1;
    if (a.user_id) {
      acc[label].users.add(a.user_id);
    }
    return acc;
  }, {});

  // Skill Group Analysis
  const skillStats = analysis.reduce<Record<string, { count: number; users: Set<string> }>>((acc, a) => {
    const label = normalizeAnalyticsLabel(a.skill_group);
    if (!label) return acc;
    if (!acc[label]) {
      acc[label] = { count: 0, users: new Set<string>() };
    }
    acc[label].count += 1;
    if (a.user_id) {
      acc[label].users.add(a.user_id);
    }
    return acc;
  }, {});

  const developmentAreaDetails = analysis.reduce<DevelopmentAreaDetail[]>((acc, item) => {
    const label = normalizeAnalyticsLabel(item.development_area);
    if (!label || !item.user_id) return acc;
    const profile = profileByUser.get(item.user_id);
    const year = item.training_id ? (yearByTrainingId.get(item.training_id) ?? null) : null;
    acc.push({
      label,
      userId: item.user_id,
      fullName: profile?.fullName || item.user_id,
      department: profile?.department || 'ไม่ระบุ',
      workGroup: profile?.workGroup || 'ไม่ระบุ',
      year,
    });
    return acc;
  }, []);

  const departments = Array.from(
    new Set(
      profiles.map((item) => (item.department || '').trim() || 'ไม่ระบุ'),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const workGroups = Array.from(
    new Set(
      profiles.map((item) => (item.work_group || '').trim() || 'ไม่ระบุ'),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const years = Array.from(new Set(developmentAreaDetails.map((item) => item.year).filter((year): year is number => typeof year === 'number'))).sort((a, b) => b - a);

  return {
    categories: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    workGroups: Object.entries(workGroupCounts).map(([workGroup, count]) => ({ workGroup, count })).sort((a, b) => b.count - a.count),
    workGroupTrainingDetails,
    developmentAreas: Object.entries(areaStats)
      .map(([label, value]) => ({ label, count: value.count, personnelCount: value.users.size }))
      .sort((a, b) => b.count - a.count || b.personnelCount - a.personnelCount)
      .slice(0, 10),
    skillGroups: Object.entries(skillStats)
      .map(([label, value]) => ({ label, count: value.count, personnelCount: value.users.size }))
      .sort((a, b) => b.count - a.count || b.personnelCount - a.personnelCount),
    developmentAreaDetails,
    developmentAreaFilterOptions: {
      departments,
      workGroups,
      years,
    },
  };
}

