import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, ChevronRight, RefreshCw, Search, Users, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  listCourseAttendees,
  listCourseDirectory,
  type CourseDirectoryAttendee,
  type CourseDirectoryData,
  type CourseDirectorySection,
} from '../../services/course.service';
import { formatThaiDate } from '../../utils/thaiDate';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

function getVisibleSections(data: CourseDirectoryData | null, search: string): CourseDirectorySection[] {
  if (!data) return [];

  const query = search.trim().toLowerCase();

  if (!query) {
    return data.sections;
  }

  return data.sections
    .map((section) => ({
      ...section,
      courses: section.courses.filter(
        (course) =>
          section.category.toLowerCase().includes(query) ||
          course.course.toLowerCase().includes(query),
      ),
    }))
    .filter((section) => section.category.toLowerCase().includes(query) || section.courses.length > 0);
}

export function CourseListPage() {
  const [data, setData] = useState<CourseDirectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<{
    category: string;
    course: string;
    attendeeCount: number;
    latestDate: string;
  } | null>(null);
  const [attendees, setAttendees] = useState<CourseDirectoryAttendee[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listCourseDirectory();
      setData(result);
      setExpandedCategories({});

    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดคลังหลักสูตรได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const visibleSections = useMemo(() => getVisibleSections(data, search), [data, search]);
  const rankedSections = useMemo(
    () => [...visibleSections].sort((a, b) => b.attendeeCount - a.attendeeCount || a.category.localeCompare(b.category, 'th')),
    [visibleSections],
  );

  const openCourseDrawer = async (course: { category: string; course: string; attendeeCount: number; latestDate: string }) => {
    setSelectedCourse(course);
    setDrawerLoading(true);
    setDrawerError(null);
    setAttendees([]);

    try {
      const result = await listCourseAttendees(course.course);
      setAttendees(result);
    } catch (err) {
      setDrawerError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดรายชื่อผู้เรียนได้'));
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedCourse(null);
    setAttendees([]);
    setDrawerLoading(false);
    setDrawerError(null);
  };

  const totalVisibleCourses = visibleSections.reduce((sum, section) => sum + section.courses.length, 0);
  const totalVisibleAttendees = visibleSections.reduce(
    (sum, section) => sum + section.courses.reduce((courseSum, course) => courseSum + course.attendeeCount, 0),
    0,
  );
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="คลังหลักสูตร"
          description="รายการหลักสูตรทั้งหมดแยกตามหมวดหมู่ พร้อมเปิดดูรายชื่อผู้เรียนในแต่ละหลักสูตรได้"
        />
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">หมวดหมู่ทั้งหมด</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {loading ? '...' : data?.totalCategories.toLocaleString() || '0'}
              </p>
            </div>
            <div className="rounded-md bg-brand-50 p-3 text-brand-700">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">หลักสูตรทั้งหมด</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {loading ? '...' : totalVisibleCourses.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md bg-slate-100 p-3 text-slate-700">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">ผู้เรียนทั้งหมด</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {loading ? '...' : data?.totalAttendees.toLocaleString() || '0'}
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">รายการอบรมที่พบ</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {loading ? '...' : data?.totalTrainingRecords.toLocaleString() || '0'}
              </p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-700">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              placeholder="ค้นหาหมวดหมู่ หรือชื่อหลักสูตร"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="hidden text-xs text-slate-500 sm:block">
              แสดง {rankedSections.length.toLocaleString()} หมวด · {totalVisibleCourses.toLocaleString()} หลักสูตร ·{' '}
              {totalVisibleAttendees.toLocaleString()} ผู้เรียน
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">รายการหมวดหลักสูตร</h2>
            <p className="mt-1 text-xs text-slate-500">กดที่หมวดเพื่อดูหลักสูตรย่อยตามลำดับรายการ</p>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="animate-pulse px-4 py-4">
                <div className="h-4 w-2/5 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-1/4 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : rankedSections.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            ไม่พบหลักสูตรตามคำค้นหา
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[72px_minmax(0,1.7fr)_140px_140px_120px_40px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span>ลำดับที่</span>
              <span>หมวดหลักสูตร</span>
              <span>หลักสูตร</span>
              <span>ผู้เรียน</span>
              <span>สถานะ</span>
              <span></span>
            </div>
            <div className="divide-y divide-slate-100">
              {rankedSections.map((section, sectionIndex) => {
                const isExpanded = expandedCategories[section.category];

                return (
                  <div key={section.category}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(section.category)}
                      className="grid w-full grid-cols-[48px_minmax(0,1fr)_32px] items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[72px_minmax(0,1.7fr)_140px_140px_120px_40px] lg:gap-4"
                    >
                      <div className="text-sm font-semibold text-slate-500">
                        {(sectionIndex + 1).toLocaleString('th-TH')}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900 lg:text-base">{section.category}</h3>
                        <p className="mt-1 text-xs text-slate-500 lg:hidden">
                          {section.courseCount.toLocaleString()} หลักสูตร · {section.attendeeCount.toLocaleString()} ผู้เรียน
                        </p>
                      </div>
                      <div className="hidden text-sm text-slate-700 lg:block">
                        {section.courseCount.toLocaleString()} หลักสูตร
                      </div>
                      <div className="hidden text-sm text-slate-700 lg:block">
                        {section.attendeeCount.toLocaleString()} ผู้เรียน
                      </div>
                      <div className="hidden lg:block">
                        <span
                          className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                            section.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                          }`}
                        >
                          {section.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 justify-self-end text-slate-500 transition ${isExpanded ? 'rotate-90' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                        {section.courses.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                            ยังไม่มีหลักสูตรในหมวดหมู่นี้
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                            <div className="hidden grid-cols-[88px_minmax(0,1fr)_120px_140px_40px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                              <span>ลำดับย่อย</span>
                              <span>หลักสูตร</span>
                              <span>ผู้เรียน</span>
                              <span>อบรมล่าสุด</span>
                              <span></span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {section.courses.map((course, courseIndex) => (
                                <button
                                  key={`${section.category}-${course.course}`}
                                  type="button"
                                  onClick={() =>
                                    void openCourseDrawer({
                                      category: section.category,
                                      course: course.course,
                                      attendeeCount: course.attendeeCount,
                                      latestDate: course.latestDate,
                                    })
                                  }
                                  className="grid w-full grid-cols-[64px_minmax(0,1fr)_32px] items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/40 md:grid-cols-[88px_minmax(0,1fr)_120px_140px_40px] md:gap-4"
                                >
                                  <span className="text-xs font-semibold text-slate-500">
                                    {`${sectionIndex + 1}.${courseIndex + 1}`}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{course.course}</p>
                                    <p className="mt-1 text-xs text-slate-500 md:hidden">
                                      {course.attendeeCount.toLocaleString()} คน · ล่าสุด {formatThaiDate(course.latestDate)}
                                    </p>
                                  </div>
                                  <span className="hidden text-sm font-medium text-slate-700 md:block">
                                    {course.attendeeCount.toLocaleString()} คน
                                  </span>
                                  <span className="hidden text-sm text-slate-600 md:block">{formatThaiDate(course.latestDate)}</span>
                                  <ChevronRight className="h-4 w-4 justify-self-end text-slate-400" aria-hidden="true" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
      {selectedCourse && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="ปิดรายละเอียดหลักสูตร"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">รายชื่อผู้เรียน</p>
                <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">{selectedCourse.course}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCourse.category} · {selectedCourse.attendeeCount.toLocaleString()} คน · ล่าสุด{' '}
                  {formatThaiDate(selectedCourse.latestDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="ปิด"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">หมวดหมู่</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCourse.category}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">ผู้เรียน</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCourse.attendeeCount.toLocaleString()} คน</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">อบรมล่าสุด</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatThaiDate(selectedCourse.latestDate)}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {drawerLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-md border border-slate-200 p-4">
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                      <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : drawerError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {drawerError}
                </div>
              ) : attendees.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  ไม่พบรายชื่อผู้เรียนในหลักสูตรนี้
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                        <th className="px-4 py-3">หน่วยงาน</th>
                        <th className="px-4 py-3">วันที่อบรม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {attendees.map((attendee) => (
                        <tr key={attendee.userId} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900">{attendee.fullName}</td>
                          <td className="px-4 py-3 text-slate-600">{attendee.department || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatThaiDate(attendee.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

