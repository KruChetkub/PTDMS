import { supabase } from '../lib/supabase';
import { runSupabaseQuery } from '../lib/supabase-query';
import type { CourseCategory, Profile, TrainingRecord } from '../types/database.types';

export type CourseDirectoryAttendee = {
  trainingId: string;
  userId: string;
  fullName: string;
  department: string;
  date: string;
  course: string;
  category: string;
  organizer: string;
};

export type CourseDirectoryCourse = {
  course: string;
  attendeeCount: number;
  latestDate: string;
};

export type CourseDirectorySection = {
  category: string;
  active: boolean;
  courseCount: number;
  attendeeCount: number;
  courses: CourseDirectoryCourse[];
};

export type CourseDirectoryData = {
  sections: CourseDirectorySection[];
  totalCategories: number;
  totalCourses: number;
  totalAttendees: number;
  totalTrainingRecords: number;
};

type CourseRecord = Pick<TrainingRecord, 'id' | 'user_id' | 'course' | 'category' | 'date' | 'organizer' | 'created_at'>;
type CourseProfile = Pick<Profile, 'user_id' | 'full_name' | 'department'>;
type CourseCategoryRow = Pick<CourseCategory, 'category' | 'active'>;

type CourseAggregation = {
  course: string;
  category: string;
  attendeeIds: Set<string>;
  latestDate: string;
};

export async function listCourseDirectory(): Promise<CourseDirectoryData> {
  const [categoriesResult, recordsResult] = await Promise.all([
    runSupabaseQuery(
      supabase
        .from('course_categories')
        .select('category, active')
        .order('category', { ascending: true }),
      'โหลดหมวดหมู่หลักสูตร',
    ),
    runSupabaseQuery(
      supabase
        .from('training_records')
        .select('id, user_id, course, category, date, organizer, created_at')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      'โหลดข้อมูลหลักสูตร',
    ),
  ]);

  const categories = (categoriesResult.data || []) as CourseCategoryRow[];
  const records = (recordsResult.data || []) as CourseRecord[];

  const groupedCourses = new Map<string, Map<string, CourseAggregation>>();
  const allCategories = new Map<string, boolean>();
  const uniqueUsers = new Set<string>();

  categories.forEach((category) => {
    allCategories.set(category.category, (allCategories.get(category.category) || false) || category.active);
  });

  for (const record of records) {
    uniqueUsers.add(record.user_id);

    const categoryName = record.category.trim() || 'ไม่ระบุหมวดหมู่';
    const courseName = record.course.trim();

    if (!allCategories.has(categoryName)) {
      allCategories.set(categoryName, true);
    }

    if (!groupedCourses.has(categoryName)) {
      groupedCourses.set(categoryName, new Map());
    }

    const categoryCourses = groupedCourses.get(categoryName)!;
    const existing = categoryCourses.get(courseName);

    if (!existing) {
      categoryCourses.set(courseName, {
        course: courseName,
        category: categoryName,
        attendeeIds: new Set([record.user_id]),
        latestDate: record.date,
      });
      continue;
    }

    existing.attendeeIds.add(record.user_id);

    if (record.date > existing.latestDate) {
      existing.latestDate = record.date;
    }
  }

  const orderedCategories = Array.from(allCategories.entries())
    .map(([category, active]) => ({
      category,
      active,
      courses: groupedCourses.get(category) || new Map<string, CourseAggregation>(),
    }))
    .sort((left, right) => left.category.localeCompare(right.category, 'th'));

  const sections: CourseDirectorySection[] = orderedCategories.map((entry) => {
    const courses = Array.from(entry.courses.values())
      .map((course) => ({
        course: course.course,
        attendeeCount: course.attendeeIds.size,
        latestDate: course.latestDate,
      }))
      .sort((left, right) => {
        if (right.attendeeCount !== left.attendeeCount) {
          return right.attendeeCount - left.attendeeCount;
        }

        return left.course.localeCompare(right.course, 'th');
      });

    return {
      category: entry.category,
      active: entry.active,
      courseCount: courses.length,
      attendeeCount: courses.reduce((sum, course) => sum + course.attendeeCount, 0),
      courses,
    };
  });

  return {
    sections,
    totalCategories: sections.length,
    totalCourses: sections.reduce((sum, section) => sum + section.courseCount, 0),
    totalAttendees: uniqueUsers.size,
    totalTrainingRecords: records.length,
  };
}

export async function listCourseAttendees(courseName: string): Promise<CourseDirectoryAttendee[]> {
  const targetCourse = courseName.trim();

  if (!targetCourse) {
    return [];
  }

  const [{ data: records }, { data: profiles }] = await Promise.all([
    runSupabaseQuery(
      supabase
        .from('training_records')
        .select('id, user_id, course, category, date, organizer, created_at')
        .eq('course', targetCourse)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      'โหลดรายชื่อผู้เรียน',
    ),
    runSupabaseQuery(
      supabase.from('profiles').select('user_id, full_name, department'),
      'โหลดข้อมูลโปรไฟล์ผู้เรียน',
    ),
  ]);

  const trainingRecords = (records || []) as CourseRecord[];
  const profileByUser = new Map(((profiles || []) as CourseProfile[]).map((profile) => [profile.user_id, profile]));
  const latestByUser = new Map<string, CourseDirectoryAttendee>();

  for (const record of trainingRecords) {
    const profile = profileByUser.get(record.user_id);
    const attendee: CourseDirectoryAttendee = {
      trainingId: record.id,
      userId: record.user_id,
      fullName: profile?.full_name || '-',
      department: profile?.department || '-',
      date: record.date,
      course: record.course,
      category: record.category,
      organizer: record.organizer,
    };

    const existing = latestByUser.get(record.user_id);
    if (!existing || record.date > existing.date) {
      latestByUser.set(record.user_id, attendee);
    }
  }

  return Array.from(latestByUser.values()).sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return left.fullName.localeCompare(right.fullName, 'th');
  });
}
