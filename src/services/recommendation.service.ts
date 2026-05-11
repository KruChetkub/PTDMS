import { supabase } from '../lib/supabase';
import type { DevelopmentAnalysis, Profile, TrainingRecord } from '../types/database.types';
import { getCurrentThaiFiscalYear } from '../utils/thaiDate';

export type RecommendationPriority = 'high' | 'medium' | 'low';
export type InsightTone = 'positive' | 'warning' | 'critical' | 'neutral';

export type SkillGapRecommendation = {
  userId: string;
  fullName: string;
  position: string;
  workGroup: string;
  trainingCount: number;
  currentYearCount: number;
  lastTrainingDate: string | null;
  missingSkillGroups: string[];
  suggestedCourses: string[];
  priority: RecommendationPriority;
  reason: string;
};

export type CourseRecommendation = {
  course: string;
  category: string;
  skillGroup: string;
  trainedCount: number;
  audience: string;
  reason: string;
};

export type WorkGroupPlan = {
  workGroup: string;
  personnelCount: number;
  trainingCount: number;
  averageTrainingPerPerson: number;
  focusSkillGroups: string[];
  gapSkillGroups: string[];
  recommendedAction: string;
};

export type ExecutiveInsight = {
  title: string;
  value: string;
  detail: string;
  tone: InsightTone;
};

export type RecommendationData = {
  generatedAt: string;
  activePersonnelCount: number;
  trainingRecordCount: number;
  targetSkillGroups: string[];
  skillGaps: SkillGapRecommendation[];
  courseRecommendations: CourseRecommendation[];
  workGroupPlans: WorkGroupPlan[];
  executiveInsights: ExecutiveInsight[];
};

type CourseCandidate = {
  course: string;
  category: string;
  count: number;
};

const DEFAULT_TARGET_SKILLS = ['ทักษะดิจิทัล', 'ภาวะผู้นำ', 'การวิเคราะห์ข้อมูล'];
const currentFiscalYear = getCurrentThaiFiscalYear();

function normalizeLabel(value: string | null | undefined, fallback = 'ไม่ระบุ') {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topLabels(values: string[], limit: number) {
  return Object.entries(countBy(values))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function daysSince(date: string | null) {
  if (!date) return Number.POSITIVE_INFINITY;

  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;

  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}

function priorityRank(priority: RecommendationPriority) {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2;
}

function toneForCoverage(coverage: number): InsightTone {
  if (coverage >= 80) return 'positive';
  if (coverage >= 50) return 'warning';
  return 'critical';
}

function getRecordSkill(record: TrainingRecord, analysisByTraining: Map<string, DevelopmentAnalysis>) {
  const analysis = analysisByTraining.get(record.id);
  return normalizeLabel(analysis?.skill_group || record.category);
}

function buildCourseCandidates(records: TrainingRecord[], analysisByTraining: Map<string, DevelopmentAnalysis>) {
  const candidates = new Map<string, Map<string, CourseCandidate>>();

  records.forEach((record) => {
    const skillGroup = getRecordSkill(record, analysisByTraining);
    const courseKey = `${record.course}::${record.category}`;
    const skillCourses = candidates.get(skillGroup) || new Map<string, CourseCandidate>();
    const existing = skillCourses.get(courseKey);

    skillCourses.set(courseKey, {
      course: record.course,
      category: record.category,
      count: (existing?.count || 0) + 1,
    });

    candidates.set(skillGroup, skillCourses);
  });

  return candidates;
}

function getSuggestedCourses(
  missingSkillGroups: string[],
  userRecords: TrainingRecord[],
  courseCandidates: Map<string, Map<string, CourseCandidate>>,
) {
  const completedCourses = new Set(userRecords.map((record) => record.course));

  return unique(
    missingSkillGroups.map((skillGroup) => {
      const candidates = Array.from(courseCandidates.get(skillGroup)?.values() || [])
        .filter((candidate) => !completedCourses.has(candidate.course))
        .sort((a, b) => b.count - a.count || a.course.localeCompare(b.course));

      return candidates[0]?.course || `หลักสูตรด้าน${skillGroup}`;
    }),
  ).slice(0, 3);
}

function buildReason(records: TrainingRecord[], missingSkillGroups: string[], lastTrainingDate: string | null) {
  if (records.length === 0) {
    return 'ยังไม่มีประวัติการอบรม ควรเริ่มด้วยหลักสูตรพื้นฐานตามทักษะเป้าหมายขององค์กร';
  }

  if (daysSince(lastTrainingDate) > 365) {
    return 'ไม่มีประวัติการอบรมใน 12 เดือนล่าสุด ควรวางแผน refresh skill ให้ต่อเนื่อง';
  }

  if (missingSkillGroups.length > 0) {
    return `ยังไม่พบหลักฐานการพัฒนาในด้าน ${missingSkillGroups.slice(0, 2).join(', ')} เมื่อเทียบกับทักษะเป้าหมาย`;
  }

  return 'มีความครอบคลุมทักษะเป้าหมายดีแล้ว เหมาะกับหลักสูตรต่อยอดหรือบทบาท mentor';
}

function getPriority(records: TrainingRecord[], currentYearCount: number, missingSkillGroups: string[], lastTrainingDate: string | null) {
  if (records.length === 0 || daysSince(lastTrainingDate) > 365 || missingSkillGroups.length >= 3) {
    return 'high';
  }

  if (currentYearCount === 0 || missingSkillGroups.length >= 2) {
    return 'medium';
  }

  return 'low';
}

function buildCourseRecommendations(
  targetSkillGroups: string[],
  skillGaps: SkillGapRecommendation[],
  courseCandidates: Map<string, Map<string, CourseCandidate>>,
) {
  return targetSkillGroups
    .map((skillGroup) => {
      const candidates = Array.from(courseCandidates.get(skillGroup)?.values() || []).sort(
        (a, b) => b.count - a.count || a.course.localeCompare(b.course),
      );
      const missingPeople = skillGaps.filter((gap) => gap.missingSkillGroups.includes(skillGroup));
      const audience = topLabels(missingPeople.map((gap) => gap.workGroup), 1)[0] || 'หลายกลุ่มงาน';
      const candidate = candidates[0];

      return {
        course: candidate?.course || `หลักสูตรด้าน${skillGroup}`,
        category: candidate?.category || skillGroup,
        skillGroup,
        trainedCount: candidate?.count || 0,
        audience,
        reason:
          missingPeople.length > 0
            ? `เหมาะสำหรับปิดช่องว่างทักษะของบุคลากร ${missingPeople.length.toLocaleString()} คน`
            : 'เหมาะสำหรับต่อยอดจากแนวโน้มทักษะที่องค์กรใช้อยู่แล้ว',
      } satisfies CourseRecommendation;
    })
    .slice(0, 6);
}

function buildWorkGroupPlans(
  profiles: Profile[],
  records: TrainingRecord[],
  analysisByTraining: Map<string, DevelopmentAnalysis>,
  targetSkillGroups: string[],
) {
  const profilesByWorkGroup = groupBy(profiles, (profile) => normalizeLabel(profile.work_group));
  const recordsByUser = groupBy(records, (record) => record.user_id);
  const organizationAverage = profiles.length > 0 ? records.length / profiles.length : 0;

  return Object.entries(profilesByWorkGroup)
    .map(([workGroup, groupProfiles]) => {
      const groupRecords = groupProfiles.flatMap((profile) => recordsByUser[profile.user_id] || []);
      const groupSkills = unique(groupRecords.map((record) => getRecordSkill(record, analysisByTraining)));
      const gapSkillGroups = targetSkillGroups.filter((skill) => !groupSkills.includes(skill)).slice(0, 3);
      const averageTrainingPerPerson = groupProfiles.length > 0 ? groupRecords.length / groupProfiles.length : 0;

      const recommendedAction =
        gapSkillGroups.length > 0
          ? `จัด learning path ด้าน ${gapSkillGroups.slice(0, 2).join(', ')}`
          : averageTrainingPerPerson < organizationAverage
            ? 'เพิ่มจำนวนหลักสูตรต่อคนให้ใกล้ค่าเฉลี่ยองค์กร'
            : 'คงจังหวะการพัฒนาและเลือกหลักสูตรขั้นสูงเฉพาะทาง';

      return {
        workGroup,
        personnelCount: groupProfiles.length,
        trainingCount: groupRecords.length,
        averageTrainingPerPerson: Number(averageTrainingPerPerson.toFixed(1)),
        focusSkillGroups: topLabels(groupRecords.map((record) => getRecordSkill(record, analysisByTraining)), 3),
        gapSkillGroups,
        recommendedAction,
      } satisfies WorkGroupPlan;
    })
    .sort((a, b) => b.gapSkillGroups.length - a.gapSkillGroups.length || a.averageTrainingPerPerson - b.averageTrainingPerPerson);
}

function buildExecutiveInsights(
  profiles: Profile[],
  records: TrainingRecord[],
  targetSkillGroups: string[],
  skillGaps: SkillGapRecommendation[],
  workGroupPlans: WorkGroupPlan[],
) {
  const trainedUsers = new Set(records.map((record) => record.user_id)).size;
  const coverage = profiles.length > 0 ? Math.round((trainedUsers / profiles.length) * 100) : 0;
  const highPriorityCount = skillGaps.filter((gap) => gap.priority === 'high').length;
  const lowestGroup = [...workGroupPlans].sort((a, b) => a.averageTrainingPerPerson - b.averageTrainingPerPerson)[0];
  const topTargetSkill = targetSkillGroups[0] || '-';

  return [
    {
      title: 'Training Coverage',
      value: `${coverage}%`,
      detail: `มีบุคลากรที่มีประวัติอบรมแล้ว ${trainedUsers.toLocaleString()} จาก ${profiles.length.toLocaleString()} คน`,
      tone: toneForCoverage(coverage),
    },
    {
      title: 'Skill Gap Watch',
      value: highPriorityCount.toLocaleString(),
      detail: 'จำนวนบุคลากรที่ควรได้รับการวางแผนพัฒนาเป็นลำดับแรก',
      tone: highPriorityCount > 0 ? 'warning' : 'positive',
    },
    {
      title: 'Strategic Focus',
      value: topTargetSkill,
      detail: 'ทักษะเป้าหมายที่พบมากที่สุดจากข้อมูลการพัฒนาในระบบ',
      tone: 'neutral',
    },
    {
      title: 'Work Group Balance',
      value: lowestGroup?.workGroup || '-',
      detail: lowestGroup
        ? `ค่าเฉลี่ยอบรม ${lowestGroup.averageTrainingPerPerson.toLocaleString()} รายการต่อคน`
        : 'ยังไม่มีข้อมูลกลุ่มงานเพียงพอสำหรับวิเคราะห์',
      tone: lowestGroup && lowestGroup.averageTrainingPerPerson < 1 ? 'critical' : 'neutral',
    },
  ] satisfies ExecutiveInsight[];
}

export async function getRecommendationData(): Promise<RecommendationData> {
  const [profileResult, trainingResult, analysisResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('status', 'active').order('full_name'),
    supabase.from('training_records').select('*').order('date', { ascending: false }),
    supabase.from('development_analysis').select('*'),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (trainingResult.error) throw trainingResult.error;
  if (analysisResult.error) throw analysisResult.error;

  const profiles = (profileResult.data || []) as Profile[];
  const records = (trainingResult.data || []) as TrainingRecord[];
  const analysis = (analysisResult.data || []) as DevelopmentAnalysis[];
  const analysisByTraining = new Map(analysis.map((item) => [item.training_id, item]));
  const recordsByUser = groupBy(records, (record) => record.user_id);
  const targetSkillGroups =
    topLabels(records.map((record) => getRecordSkill(record, analysisByTraining)).filter((skill) => skill !== 'ไม่ระบุ'), 5) ||
    DEFAULT_TARGET_SKILLS;
  const resolvedTargetSkillGroups = targetSkillGroups.length > 0 ? targetSkillGroups : DEFAULT_TARGET_SKILLS;
  const courseCandidates = buildCourseCandidates(records, analysisByTraining);

  const skillGaps = profiles
    .map((profile) => {
      const userRecords = recordsByUser[profile.user_id] || [];
      const userSkillGroups = unique(userRecords.map((record) => getRecordSkill(record, analysisByTraining)));
      const missingSkillGroups = resolvedTargetSkillGroups.filter((skill) => !userSkillGroups.includes(skill)).slice(0, 3);
      const lastTrainingDate = userRecords[0]?.date || null;
      const currentYearCount = userRecords.filter((record) => record.year === currentFiscalYear).length;
      const priority = getPriority(userRecords, currentYearCount, missingSkillGroups, lastTrainingDate);

      return {
        userId: profile.user_id,
        fullName: profile.full_name,
        position: profile.position || '-',
        workGroup: normalizeLabel(profile.work_group),
        trainingCount: userRecords.length,
        currentYearCount,
        lastTrainingDate,
        missingSkillGroups,
        suggestedCourses: getSuggestedCourses(missingSkillGroups, userRecords, courseCandidates),
        priority,
        reason: buildReason(userRecords, missingSkillGroups, lastTrainingDate),
      } satisfies SkillGapRecommendation;
    })
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        b.missingSkillGroups.length - a.missingSkillGroups.length ||
        a.trainingCount - b.trainingCount ||
        a.fullName.localeCompare(b.fullName),
    );

  const courseRecommendations = buildCourseRecommendations(resolvedTargetSkillGroups, skillGaps, courseCandidates);
  const workGroupPlans = buildWorkGroupPlans(profiles, records, analysisByTraining, resolvedTargetSkillGroups);
  const executiveInsights = buildExecutiveInsights(profiles, records, resolvedTargetSkillGroups, skillGaps, workGroupPlans);

  return {
    generatedAt: new Date().toISOString(),
    activePersonnelCount: profiles.length,
    trainingRecordCount: records.length,
    targetSkillGroups: resolvedTargetSkillGroups,
    skillGaps,
    courseRecommendations,
    workGroupPlans,
    executiveInsights,
  };
}
