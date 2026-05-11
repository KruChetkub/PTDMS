import { supabase } from '../lib/supabase';

export type CategoryAnalysis = {
  category: string;
  count: number;
};

export type WorkGroupAnalysis = {
  workGroup: string;
  count: number;
};

export type DevelopmentStats = {
  label: string;
  count: number;
};

export type AnalyticsData = {
  categories: CategoryAnalysis[];
  workGroups: WorkGroupAnalysis[];
  developmentAreas: DevelopmentStats[];
  skillGroups: DevelopmentStats[];
};

export async function getAnalyticsData(): Promise<AnalyticsData> {
  // ดึงข้อมูลแยกกันเพื่อความเสถียรและป้องกัน Error เรื่อง Ambiguous Join
  const [trainingResult, profileResult, analysisResult] = await Promise.all([
    supabase.from('training_records').select('user_id, category'),
    supabase.from('profiles').select('user_id, work_group'),
    supabase.from('development_analysis').select('development_area, skill_group'),
  ]);

  if (trainingResult.error) throw trainingResult.error;
  if (profileResult.error) throw profileResult.error;
  if (analysisResult.error) throw analysisResult.error;

  const records = trainingResult.data || [];
  const profiles = profileResult.data || [];
  const analysis = analysisResult.data || [];

  // สร้างแผนผังกลุ่มงานจากโปรไฟล์ (ใช้ค่าเริ่มต้นเป็น 'ไม่ระบุ')
  const workGroupsByUser = new Map();
  profiles.forEach(p => {
    workGroupsByUser.set(p.user_id, (p.work_group || '').trim() || 'ไม่ระบุ');
  });

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

  // Development Area Analysis
  const areaCounts = analysis.reduce<Record<string, number>>((acc, a) => {
    if (a.development_area) {
      acc[a.development_area] = (acc[a.development_area] || 0) + 1;
    }
    return acc;
  }, {});

  // Skill Group Analysis
  const skillCounts = analysis.reduce<Record<string, number>>((acc, a) => {
    if (a.skill_group) {
      acc[a.skill_group] = (acc[a.skill_group] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    categories: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    workGroups: Object.entries(workGroupCounts).map(([workGroup, count]) => ({ workGroup, count })).sort((a, b) => b.count - a.count),
    developmentAreas: Object.entries(areaCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    skillGroups: Object.entries(skillCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };
}
