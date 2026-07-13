import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  getRecommendationData,
  type ExecutiveInsight,
  type RecommendationData,
  type RecommendationPriority,
} from '../../services/recommendation.service';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const priorityLabels: Record<RecommendationPriority, string> = {
  high: 'เร่งด่วน',
  medium: 'ควรวางแผน',
  low: 'ต่อยอด',
};

const priorityStyles: Record<RecommendationPriority, string> = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

function insightStyle(tone: ExecutiveInsight['tone']) {
  if (tone === 'positive') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (tone === 'critical') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function RecommendationsPage() {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getRecommendationData();
      setData(result);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลคำแนะนำได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const highPriorityCount = useMemo(
    () => data?.skillGaps.filter((item) => item.priority === 'high').length || 0,
    [data],
  );
  const mediumPriorityCount = useMemo(
    () => data?.skillGaps.filter((item) => item.priority === 'medium').length || 0,
    [data],
  );

  if (loading) {
    return <div className="py-20 text-center text-slate-500">กำลังวิเคราะห์ข้อมูลคำแนะนำ...</div>;
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error || 'ไม่พบข้อมูลคำแนะนำ'}</p>
        <button
          type="button"
          onClick={() => void loadData()}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="หลักสูตรสำหรับบุคคลากรกองยุทธศาสตร์และแผนงาน"
          description="หลักสูตรและแผนพัฒนารายกลุ่มงาน"
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
              <p className="text-sm text-slate-500">บุคลากร Active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.activePersonnelCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-brand-50 p-3 text-brand-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">ต้องดูแลเร่งด่วน</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{highPriorityCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-red-50 p-3 text-red-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">ควรวางแผน</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{mediumPriorityCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-700">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">หลักสูตรที่แนะนำ</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.courseRecommendations.length}</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-700">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Executive Insight Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">อัปเดตล่าสุด {formatDateTime(data.generatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.targetSkillGroups.map((skill) => (
              <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.executiveInsights.map((insight) => (
            <div key={insight.title} className={`rounded-md border p-4 ${insightStyle(insight.tone)}`}>
              <p className="text-xs font-semibold uppercase">{insight.title}</p>
              <p className="mt-2 truncate text-xl font-bold">{insight.value}</p>
              <p className="mt-1 text-sm opacity-90">{insight.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <BrainCircuit className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Skill Gap Recommendations
          </h2>
          <span className="text-sm text-slate-500">{data.skillGaps.length.toLocaleString()} คน</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-500">
                <th className="px-5 py-3">บุคลากร</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3">Skill Gap</th>
                <th className="px-5 py-3">หลักสูตรที่ควรพิจารณา</th>
                <th className="px-5 py-3">เหตุผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.skillGaps.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                    ยังไม่มีข้อมูลเพียงพอสำหรับสร้างคำแนะนำ
                  </td>
                </tr>
              ) : (
                data.skillGaps.slice(0, 12).map((item) => (
                  <tr key={item.userId} className="align-top transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link to={`/personnel/${item.userId}`} className="font-semibold text-brand-700 hover:underline">
                        {item.fullName}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">{item.position}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.workGroup}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${priorityStyles[item.priority]}`}>
                        {priorityLabels[item.priority]}
                      </span>
                      <div className="mt-2 text-xs text-slate-500">
                        อบรมทั้งหมด {item.trainingCount.toLocaleString()} รายการ
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        ปีนี้ {item.currentYearCount.toLocaleString()} รายการ
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {item.missingSkillGroups.length > 0 ? (
                          item.missingSkillGroups.map((skill) => (
                            <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            ครอบคลุมทักษะเป้าหมาย
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-xs space-y-1">
                        {item.suggestedCourses.length > 0 ? (
                          item.suggestedCourses.map((course) => (
                            <div key={course} className="text-sm text-slate-700">
                              {course}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-sm text-sm text-slate-600">{item.reason}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Recommended Course Portfolio
          </h2>
          <div className="space-y-3">
            {data.courseRecommendations.map((course) => (
              <div key={`${course.skillGroup}-${course.course}`} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{course.course}</h3>
                    <p className="mt-1 text-sm text-slate-500">{course.category}</p>
                  </div>
                  <span className="w-fit rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                    {course.skillGroup}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">เคยอบรม {course.trainedCount.toLocaleString()} ครั้ง</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">กลุ่มเป้าหมาย: {course.audience}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{course.reason}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <TrendingUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Work Group Development Plan
          </h2>
          <div className="space-y-3">
            {data.workGroupPlans.slice(0, 8).map((plan) => (
              <div key={plan.workGroup} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{plan.workGroup}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {plan.personnelCount.toLocaleString()} คน · {plan.trainingCount.toLocaleString()} รายการ · เฉลี่ย{' '}
                      {plan.averageTrainingPerPerson.toLocaleString()} ต่อคน
                    </p>
                  </div>
                  <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">{plan.recommendedAction}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(plan.gapSkillGroups.length > 0 ? plan.gapSkillGroups : plan.focusSkillGroups).map((skill) => (
                    <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
