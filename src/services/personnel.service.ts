import { supabase } from '../lib/supabase';
import { runSupabaseQuery } from '../lib/supabase-query';
import type { Profile, TrainingRecord, Certificate, DevelopmentAnalysis } from '../types/database.types';
import { getCurrentThaiFiscalYear } from '../utils/thaiDate';

export type PersonnelSummary = Profile & {
  training_count: number;
  current_year_training_count: number;
  last_training_date: string | null;
  top_category: string | null;
};

const currentFiscalYear = getCurrentThaiFiscalYear();

function topValue(values: string[]) {
  if (values.length === 0) return null;

  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

function hasCertificateContent(certificate: Certificate) {
  return Boolean(certificate.certificate_name || certificate.certificate_link || certificate.file_path);
}

function hasDevelopmentContent(analysis: DevelopmentAnalysis) {
  return Boolean(analysis.development_area || analysis.skill_group || analysis.target_direction);
}

export async function listPersonnel(): Promise<PersonnelSummary[]> {
  const [profileResult, trainingResult] = await Promise.all([
    runSupabaseQuery(supabase.from('profiles').select('*').order('full_name'), 'โหลดรายชื่อบุคลากร'),
    runSupabaseQuery(supabase.from('training_records').select('user_id, category, date, year'), 'โหลดสถิติอบรมของบุคลากร'),
  ]);

  const recordsByUser = ((trainingResult.data || []) as Pick<TrainingRecord, 'user_id' | 'category' | 'date' | 'year'>[])
    .reduce<Record<string, Pick<TrainingRecord, 'user_id' | 'category' | 'date' | 'year'>[]>>((acc, record) => {
      acc[record.user_id] = acc[record.user_id] || [];
      acc[record.user_id].push(record);
      return acc;
    }, {});

  return ((profileResult.data || []) as Profile[]).map((profile) => {
    const userRecords = recordsByUser[profile.user_id] || [];
    const sortedByDate = [...userRecords].sort((a, b) => b.date.localeCompare(a.date));

    return {
      ...profile,
      training_count: userRecords.length,
      current_year_training_count: userRecords.filter((record) => record.year === currentFiscalYear).length,
      last_training_date: sortedByDate[0]?.date || null,
      top_category: topValue(userRecords.map((record) => record.category).filter(Boolean)),
    };
  });
}

export async function getPersonnelDetails(userId: string) {
  // Use Promise.all to fetch profile and records in parallel
  const [profileRes, recordsRes] = await Promise.all([
    runSupabaseQuery(
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      'โหลดโปรไฟล์บุคลากร',
    ),
    runSupabaseQuery(
      supabase
        .from('training_records')
        .select('*, certificates(*), development_analysis(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false }),
      'โหลดประวัติการอบรมของบุคลากร',
    ),
  ]);

  const profile = profileRes.data as Profile;
  const rawRecords = recordsRes.data || [];
  
  // Extract records, certificates and analysis from the joined result
  const records: TrainingRecord[] = [];
  const certificatesByTrainingId = new Map<string, Certificate>();
  const analysisByTrainingId = new Map<string, DevelopmentAnalysis>();

  rawRecords.forEach((item: any) => {
    // Separate the joined data back into the format the UI expects
    const { certificates: certs, development_analysis: devAn, ...record } = item;
    records.push(record);
    (certs || [])
      .filter(hasCertificateContent)
      .forEach((certificate: Certificate) => certificatesByTrainingId.set(certificate.training_id, certificate));
    (devAn || [])
      .filter(hasDevelopmentContent)
      .forEach((development: DevelopmentAnalysis) => analysisByTrainingId.set(development.training_id, development));
  });

  // Calculate stats for charts
  const statsPerYear = records.reduce((acc: Record<number, number>, curr) => {
    acc[curr.year] = (acc[curr.year] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statsPerYear)
    .map(([year, count]) => ({
      year: parseInt(year),
      count,
    }))
    .sort((a, b) => a.year - b.year);

  return {
    profile,
    records,
    certificates: [...certificatesByTrainingId.values()],
    analysis: [...analysisByTrainingId.values()],
    chartData,
  };
}

export async function updatePersonnelProfile(
  userId: string,
  data: {
    position?: string | null;
    department?: string | null;
    work_group?: string | null;
    gender?: 'male' | 'female' | null;
    education?: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
    birth_date?: string | null;
    employment_type?: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
  },
) {
  await runSupabaseQuery(
    supabase
      .from('profiles')
      .update({
        position: data.position,
        department: data.department,
        work_group: data.work_group,
        gender: data.gender,
        education: data.education,
        birth_date: data.birth_date,
        employment_type: data.employment_type,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId),
    'อัปเดตโปรไฟล์บุคลากร',
  );
}

export async function updateOwnProfileDetails(data: {
  employee_code?: string | null;
  full_name?: string | null;
  position?: string | null;
  department?: string | null;
  work_group?: string | null;
  gender?: 'male' | 'female' | null;
  education?: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
  birth_date?: string | null;
  start_work_date?: string | null;
  employment_type?: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
}) {
  await runSupabaseQuery(
    supabase.rpc('update_own_profile_details', {
      p_employee_code: data.employee_code || '',
      p_full_name: data.full_name || '',
      p_position: data.position || '',
      p_department: data.department || '',
      p_work_group: data.work_group || '',
      p_gender: data.gender ?? null,
      p_education: data.education ?? null,
      p_birth_date: data.birth_date ?? null,
      p_start_work_date: data.start_work_date ?? null,
      p_employment_type: data.employment_type ?? null,
    }),
    'อัปเดตข้อมูลส่วนบุคคล',
  );
}
