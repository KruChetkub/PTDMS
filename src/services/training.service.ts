import { supabase } from '../lib/supabase';
import { runSupabaseQuery } from '../lib/supabase-query';
import type { Profile, TrainingRecord, Certificate, DevelopmentAnalysis } from '../types/database.types';
import { getMonthFromDate, type TrainingFormValues } from '../features/self-service/training-form.schema';

export type TrainingRecordFilters = {
  search?: string;
  year?: number;
  month?: number;
  category?: string;
  department?: string;
};

export type TrainingRecordRow = TrainingRecord & {
  personnel_name: string;
  department: string;
};

export type CreateTrainingRecordInput = TrainingFormValues & {
  userId: string;
  actorId: string;
};

export type UpdateTrainingRecordInput = TrainingFormValues & {
};

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasCertificateContent(certificate: Pick<Certificate, 'certificate_name' | 'certificate_link' | 'file_path'> | null) {
  return Boolean(certificate?.certificate_name || certificate?.certificate_link || certificate?.file_path);
}

function hasDevelopmentContent(analysis: Pick<DevelopmentAnalysis, 'development_area' | 'skill_group' | 'target_direction'> | null) {
  return Boolean(analysis?.development_area || analysis?.skill_group || analysis?.target_direction);
}

export async function listTrainingRecords(filters: TrainingRecordFilters = {}): Promise<TrainingRecordRow[]> {
  let query = supabase
    .from('training_records')
    .select('id, user_id, course, category, subcategory, organizer, date, month, year, created_by, created_at, updated_at')
    .order('date', { ascending: false });

  if (filters.year) {
    query = query.eq('year', filters.year);
  }

  if (filters.month) {
    query = query.eq('month', filters.month);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.search?.trim()) {
    query = query.ilike('course', `%${filters.search.trim()}%`);
  }

  const { data } = await runSupabaseQuery(query, 'โหลดรายการอบรม');

  const records = (data || []) as TrainingRecord[];
  const userIds = [...new Set(records.map((record) => record.user_id))];

  if (userIds.length === 0) {
    return [];
  }

  const { data: profilesData } = await runSupabaseQuery(
    supabase
      .from('profiles')
      .select('user_id, full_name, department')
      .in('user_id', userIds),
    'โหลดข้อมูลบุคลากรของรายการอบรม',
  );

  const profiles = (profilesData || []) as Pick<Profile, 'user_id' | 'full_name' | 'department'>[];
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return records
    .map((record) => {
      const profile = profileByUser.get(record.user_id);

      return {
        ...record,
        personnel_name: profile?.full_name || '-',
        department: profile?.department || '-',
      };
    })
    .filter((record) => {
      if (filters.department && record.department !== filters.department) {
        return false;
      }

      if (filters.search?.trim()) {
        const search = filters.search.trim().toLowerCase();
        return (
          record.course.toLowerCase().includes(search) ||
          record.personnel_name.toLowerCase().includes(search) ||
          record.organizer.toLowerCase().includes(search)
        );
      }

      return true;
    });
}

export async function createTrainingRecord(input: CreateTrainingRecordInput): Promise<TrainingRecord> {
  const month = getMonthFromDate(input.date);

  if (!month) {
    throw new Error('วันที่อบรมไม่ถูกต้อง');
  }

  const now = new Date().toISOString();
  const subcategory = emptyToNull(input.subcategory);
  const certificateName = emptyToNull(input.certificateName);
  const certificateLink = emptyToNull(input.certificateLink);
  const developmentArea = emptyToNull(input.developmentArea);
  const skillGroup = emptyToNull(input.skillGroup);
  const targetDirection = emptyToNull(input.targetDirection);
  let trainingId = '';

  try {
    const { data } = await runSupabaseQuery(
      supabase.rpc('create_training_record_with_details', {
        p_user_id: input.userId,
        p_course: input.course.trim(),
        p_category: input.category.trim(),
        p_subcategory: subcategory,
        p_organizer: input.organizer.trim(),
        p_date: input.date,
        p_year: input.year,
        p_certificate_name: certificateName,
        p_certificate_link: certificateLink,
        p_development_area: developmentArea,
        p_skill_group: skillGroup,
        p_target_direction: targetDirection,
      }),
      'บันทึกข้อมูลอบรม',
    );

    trainingId = data || '';
  } catch (err) {
    if (err instanceof Error && /DUPLICATE_TRAINING_RECORD|duplicate key|unique|already exists|idx_training_records_unique_dedupe/i.test(err.message)) {
      throw new Error('พบรายการอบรมหลักสูตรนี้ในวันที่และผู้จัดเดียวกันแล้ว (ข้อมูลซ้ำ)');
    }

    if (err instanceof Error && /create_training_record_with_details|Could not find the function|PGRST202|schema cache/i.test(err.message)) {
      throw new Error('ยังไม่ได้ติดตั้งฟังก์ชันบันทึกข้อมูลอบรมใน Supabase กรุณารัน migration 202605110002_create_training_record_rpc.sql ก่อนใช้งาน');
    }

    throw err;
  }

  if (!trainingId) {
    throw new Error('บันทึกข้อมูลอบรมไม่สำเร็จ: Supabase ไม่ได้ส่งรหัสรายการกลับมา');
  }

  return {
    id: trainingId,
    user_id: input.userId,
    course: input.course.trim(),
    category: input.category.trim(),
    subcategory,
    organizer: input.organizer.trim(),
    date: input.date,
    month,
    year: input.year,
    created_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
}

export async function getTrainingRecordDetails(id: string) {
  const [{ data: record }, { data: certificates }, { data: analysisRows }] = await Promise.all([
    runSupabaseQuery(
      supabase
        .from('training_records')
        .select('*')
        .eq('id', id)
        .single(),
      'โหลดข้อมูลอบรม',
    ),
    runSupabaseQuery(
      supabase
        .from('certificates')
        .select('*')
        .eq('training_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      'โหลดข้อมูลใบประกาศ',
    ),
    runSupabaseQuery(
      supabase
        .from('development_analysis')
        .select('*')
        .eq('training_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      'โหลดข้อมูลวิเคราะห์การพัฒนา',
    ),
  ]);

  if (!record) {
    throw new Error('ไม่พบข้อมูลอบรมที่ต้องการแก้ไข');
  }

  const certificate = ((certificates || []) as Certificate[]).find(hasCertificateContent) || null;
  const analysis = ((analysisRows || []) as DevelopmentAnalysis[]).find(hasDevelopmentContent) || null;

  return {
    record: record as TrainingRecord,
    certificate: certificate as Certificate | null,
    analysis: analysis as DevelopmentAnalysis | null,
  };
}

export async function updateTrainingRecord(id: string, input: UpdateTrainingRecordInput): Promise<TrainingRecord> {
  const month = getMonthFromDate(input.date);
  if (!month) throw new Error('วันที่อบรมไม่ถูกต้อง');

  const { data: trainingRecord } = await runSupabaseQuery(
    supabase
      .from('training_records')
      .update({
        course: input.course.trim(),
        category: input.category.trim(),
        subcategory: emptyToNull(input.subcategory),
        organizer: input.organizer.trim(),
        date: input.date,
        month,
        year: input.year,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, user_id, course, category, subcategory, organizer, date, month, year, created_by, created_at, updated_at')
      .single(),
    'อัปเดตข้อมูลอบรม',
  );

  if (!trainingRecord) {
    throw new Error('ไม่พบข้อมูลอบรมที่ต้องการอัปเดต');
  }

  const record = trainingRecord as TrainingRecord;

  // Handle Certificate Update (Manual Upsert)
  const certificateName = emptyToNull(input.certificateName);
  const certificateLink = emptyToNull(input.certificateLink);

  const { data: existingCertificates } = await runSupabaseQuery(
    supabase
      .from('certificates')
      .select('id')
      .eq('training_id', id),
    'โหลดใบประกาศเดิม',
  );

  const hasExistingCertificate = (existingCertificates || []).length > 0;

  if (certificateName || certificateLink) {
    if (hasExistingCertificate) {
      await runSupabaseQuery(
        supabase
          .from('certificates')
          .update({
            certificate_name: certificateName,
            certificate_link: certificateLink,
          })
          .eq('training_id', id),
        'อัปเดตข้อมูลใบประกาศ',
      );
    } else {
      await runSupabaseQuery(
        supabase.from('certificates').insert({
          training_id: id,
          certificate_name: certificateName,
          certificate_link: certificateLink,
        }),
        'เพิ่มข้อมูลใบประกาศ',
      );
    }
  } else if (hasExistingCertificate) {
    await runSupabaseQuery(
      supabase
        .from('certificates')
        .update({
          certificate_name: null,
          certificate_link: null,
          file_path: null,
        })
        .eq('training_id', id),
      'ล้างข้อมูลใบประกาศ',
    );
  }

  // Handle Development Analysis Update (Manual Upsert)
  const developmentArea = emptyToNull(input.developmentArea);
  const skillGroup = emptyToNull(input.skillGroup);
  const targetDirection = emptyToNull(input.targetDirection);

  const { data: existingDevelopmentRows } = await runSupabaseQuery(
    supabase
      .from('development_analysis')
      .select('id')
      .eq('training_id', id),
    'โหลดข้อมูลวิเคราะห์เดิม',
  );

  const hasExistingDevelopment = (existingDevelopmentRows || []).length > 0;

  if (developmentArea || skillGroup || targetDirection) {
    if (hasExistingDevelopment) {
      await runSupabaseQuery(
        supabase
          .from('development_analysis')
          .update({
            development_area: developmentArea,
            skill_group: skillGroup,
            target_direction: targetDirection,
          })
          .eq('training_id', id),
        'อัปเดตข้อมูลวิเคราะห์การพัฒนา',
      );
    } else {
      await runSupabaseQuery(
        supabase.from('development_analysis').insert({
          training_id: id,
          user_id: record.user_id,
          development_area: developmentArea,
          skill_group: skillGroup,
          target_direction: targetDirection,
        }),
        'เพิ่มข้อมูลวิเคราะห์การพัฒนา',
      );
    }
  } else if (hasExistingDevelopment) {
    await runSupabaseQuery(
      supabase
        .from('development_analysis')
        .update({
          development_area: null,
          skill_group: null,
          target_direction: null,
        })
        .eq('training_id', id),
      'ล้างข้อมูลวิเคราะห์การพัฒนา',
    );
  }

  return record;
}

export async function deleteTrainingRecord(id: string): Promise<void> {
  await runSupabaseQuery(supabase.from('training_records').delete().eq('id', id), 'ลบข้อมูลอบรม');
}
