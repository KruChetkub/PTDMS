import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, ClipboardCheck, CopyPlus, Download, Gauge, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import type { SmartDspSurveyAdditionalContextField, SmartDspSurveyCustomContextAnswer, SmartDspSurveyQuestion, SmartDspSurveyRatingOption, SmartDspSurveyStatus } from '../../../types/database.types';
import { cn } from '../../../utils/cn';
import { getSafeUserErrorMessage, reportClientError } from '../../../utils/errorHandling';
import {
  cloneSurveyRound,
  clearSurveyRoundData,
  deleteSurveyResponse,
  listSurveysForAdmin,
  loadSurveyDashboard,
  loadSurveyForAdmin,
  saveSurveyQuestions,
  saveSurveyContextSettings,
  saveSurveyRatingOptions,
  saveSurveySettings,
  SMARTDSP_SURVEY_LONG_TEXT_MAX_LENGTH,
  type SatisfactionSurveyAdminBundle,
  type SatisfactionSurveyDashboardData,
} from '../../surveys/satisfactionSurvey.service';
import { getSurveyOptionLabel, SURVEY_RESPONDENT_ROLE_OPTIONS, SURVEY_SERVICE_OPTIONS, SURVEY_USAGE_FREQUENCY_OPTIONS } from '../../surveys/satisfactionSurvey.constants';

type View = 'settings' | 'questions' | 'results' | 'dashboard';
type LikertView = 'question_order' | 'improvement_priority' | 'strength';

const RESPONSES_PER_PAGE = 10;
const SCORE_COLORS = ['#dc2626', '#ea580c', '#d97706', '#0d9488', '#047857'];
const LIKERT_COLORS = ['#dc2626', '#f97316', '#eab308', '#14b8a6', '#047857'];

type LikertChartDatum = {
  name: string;
  fullName: string;
  position: number;
  total: number;
  average: number;
  averageDisplay: string;
  [key: string]: string | number;
};

const statusLabels: Record<SmartDspSurveyStatus, string> = {
  draft: 'ฉบับร่าง',
  active: 'เปิดใช้งาน',
  closed: 'ปิดรับคำตอบ',
  archived: 'จัดเก็บ',
};

function toLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function createContextKey(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function formatSurveyDateTime(value: string | null) {
  if (!value) return 'ไม่กำหนด';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function CharacterCounter({ value }: { value: string }) {
  const count = value.length;

  return (
    <span
      className={cn('mt-1 block text-right text-xs font-normal', count >= SMARTDSP_SURVEY_LONG_TEXT_MAX_LENGTH ? 'text-red-600' : 'text-slate-500')}
      aria-live="polite"
    >
      {count.toLocaleString('th-TH')} / {SMARTDSP_SURVEY_LONG_TEXT_MAX_LENGTH.toLocaleString('th-TH')} ตัวอักษร
    </span>
  );
}

function safeExcelText(value: string | null | undefined) {
  const text = value || '';
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function mergeSurveyDetails(description: string, instructions: string) {
  const details = description.trim();
  const guidance = instructions.trim();
  if (!guidance) return details;
  if (!details) return guidance;
  if (details.includes(guidance)) return details;
  return `${details}\n\n${guidance}`;
}

function countLabels(values: string[], labelOrder: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  const ordered = labelOrder.map((name) => ({ name, total: counts.get(name) || 0 }));
  const additional = [...counts.entries()]
    .filter(([name]) => !labelOrder.includes(name))
    .map(([name, total]) => ({ name, total }));
  return [...ordered, ...additional];
}

function addDistributionPercentage(items: Array<{ name: string; total: number }>, respondentCount: number) {
  return items.map((item) => {
    const percentage = respondentCount > 0 ? item.total / respondentCount * 100 : 0;
    const percentageLabel = Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1);
    return { ...item, percentage, display: `${item.total} คน (${percentageLabel}%)` };
  });
}

function formatDistributionValue(value: unknown, respondentCount: number) {
  const total = Number(value);
  const percentage = respondentCount > 0 ? total / respondentCount * 100 : 0;
  const percentageLabel = Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1);
  return `${total} คน (${percentageLabel}%)`;
}

function getCustomContextLabels(field: SmartDspSurveyAdditionalContextField, answer: SmartDspSurveyCustomContextAnswer | undefined) {
  if (field.selection_type === 'rating_5') return typeof answer === 'number' ? [`${answer} คะแนน`] : [];
  if (field.selection_type === 'open_text') return [];
  return Array.isArray(answer) ? answer.map((value) => getSurveyOptionLabel(field.options, value)) : [];
}

function formatCustomContextAnswer(field: SmartDspSurveyAdditionalContextField, answer: SmartDspSurveyCustomContextAnswer | undefined) {
  if (field.selection_type === 'rating_5') return typeof answer === 'number' ? `${answer} คะแนน` : '';
  if (field.selection_type === 'open_text') return typeof answer === 'string' ? answer.trim() : '';
  return getCustomContextLabels(field, answer).join(', ');
}

function ServiceAxisTick({ y = 0, payload }: { y?: number; payload?: { value?: string } }) {
  const label = payload?.value || '';
  const displayLabel = label.length > 48 ? `${label.slice(0, 47)}…` : label;

  return (
    <text x={8} y={y} dy={5} textAnchor="start" fill="#334155" fontSize={13} fontWeight={500}>
      <title>{label}</title>
      {displayLabel}
    </text>
  );
}

function LikertAxisTick({ y = 0, payload }: { y?: number; payload?: { value?: string } }) {
  const label = payload?.value || '';

  return (
    <foreignObject x={8} y={y - 19} width={405} height={40}>
      <div
        title={label}
        style={{
          color: '#334155',
          display: '-webkit-box',
          fontSize: '12px',
          fontWeight: 500,
          lineHeight: '17px',
          overflow: 'hidden',
          overflowWrap: 'break-word',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
        }}
      >
        {label}
      </div>
    </foreignObject>
  );
}

function LikertTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: string | number;
    dataKey?: string | number;
    payload?: LikertChartDatum;
  }>;
}) {
  const data = payload?.[0]?.payload;
  if (!active || !data) return null;

  return (
    <div className="max-w-sm rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold leading-5 text-slate-900">{data.fullName}</p>
      <div className="mt-2 space-y-1">
        {(payload || []).filter((item) => Number(item.value) > 0).map((item) => {
          const dataKey = String(item.dataKey || '');
          const count = Number(data[`${dataKey}Count`] || 0);
          return <p key={dataKey} className="text-slate-600">{item.name}: {count} คน ({Number(item.value).toFixed(1)}%)</p>;
        })}
      </div>
      <p className="mt-2 border-t border-slate-100 pt-2 font-semibold text-slate-800">{data.averageDisplay} จากผู้ตอบ {data.total} คน</p>
    </div>
  );
}

type SiteManagerSatisfactionSurveyEditorProps = {
  surveyCode?: string;
  heading?: string;
  description?: string;
};

export function SiteManagerSatisfactionSurveyEditor({
  surveyCode,
  heading = 'แบบสำรวจความพึงพอใจ SmartDSP',
  description = 'กำหนดช่วงเวลา คำถาม เกณฑ์คะแนน และตรวจผลประเมินแต่ละรอบ',
}: SiteManagerSatisfactionSurveyEditorProps) {
  const profile = useAuthStore((state) => state.profile);
  const [surveys, setSurveys] = useState<Awaited<ReturnType<typeof listSurveysForAdmin>>>([]);
  const [selectedId, setSelectedId] = useState('');
  const [bundle, setBundle] = useState<SatisfactionSurveyAdminBundle | null>(null);
  const [dashboardData, setDashboardData] = useState<SatisfactionSurveyDashboardData>({ surveys: [], responses: [], answers: [] });
  const [questions, setQuestions] = useState<SmartDspSurveyQuestion[]>([]);
  const [options, setOptions] = useState<SmartDspSurveyRatingOption[]>([]);
  const [view, setView] = useState<View>('settings');
  const [responsePage, setResponsePage] = useState(0);
  const [dashboardStartDate, setDashboardStartDate] = useState('');
  const [dashboardEndDate, setDashboardEndDate] = useState('');
  const [likertView, setLikertView] = useState<LikertView>('question_order');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [deleteResponseId, setDeleteResponseId] = useState<string | null>(null);
  const [clearSurveyId, setClearSurveyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (surveyId?: string) => {
    setLoading(true);
    try {
      const surveyList = await listSurveysForAdmin(surveyCode);
      const nextId = surveyId || (surveyList.some((survey) => survey.id === selectedId) ? selectedId : surveyList[0]?.id) || '';
      const [nextBundle, nextDashboardData] = await Promise.all([
        loadSurveyForAdmin(nextId, surveyCode),
        loadSurveyDashboard(surveyCode),
      ]);
      setSurveys(surveyList);
      setDashboardData(nextDashboardData);
      setSelectedId(nextBundle?.survey.id || '');
      setBundle(nextBundle ? {
        ...nextBundle,
        survey: {
          ...nextBundle.survey,
          description: mergeSurveyDetails(nextBundle.survey.description, nextBundle.survey.instructions),
          instructions: '',
        },
      } : null);
      setQuestions(nextBundle?.questions || []);
      setOptions(nextBundle?.ratingOptions || []);
      setResponsePage(0);
    } catch (error) {
      void reportClientError('Failed to load survey management', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถโหลดข้อมูลแบบสำรวจได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedId('');
    void load();
  }, [surveyCode]);

  const profileById = useMemo(() => new Map((bundle?.respondents || []).map((profile) => [profile.user_id, profile])), [bundle?.respondents]);
  const responseCountBySurvey = useMemo(() => {
    const counts = new Map<string, number>();
    for (const response of dashboardData.responses) counts.set(response.survey_id, (counts.get(response.survey_id) || 0) + 1);
    return counts;
  }, [dashboardData.responses]);
  const contextByResponse = useMemo(() => new Map((bundle?.respondentContexts || []).map((context) => [context.response_id, context])), [bundle?.respondentContexts]);
  const roleOptions = bundle?.contextSettings.role_options || SURVEY_RESPONDENT_ROLE_OPTIONS;
  const frequencyOptions = bundle?.contextSettings.frequency_options || SURVEY_USAGE_FREQUENCY_OPTIONS;
  const serviceOptions = bundle?.contextSettings.service_options || SURVEY_SERVICE_OPTIONS;
  const answersByResponse = useMemo(() => {
    const grouped = new Map<string, SatisfactionSurveyAdminBundle['answers']>();
    for (const answer of bundle?.answers || []) grouped.set(answer.response_id, [...(grouped.get(answer.response_id) || []), answer]);
    return grouped;
  }, [bundle?.answers]);
  const ratingAnswers = (bundle?.answers || []).filter((answer) => answer.rating_value !== null);
  const average = ratingAnswers.length ? ratingAnswers.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / ratingAnswers.length : 0;
  const satisfactionRate = ratingAnswers.length ? (ratingAnswers.filter((answer) => (answer.rating_value || 0) >= 4).length / ratingAnswers.length) * 100 : 0;
  const structureLocked = Boolean(bundle?.responses.length);
  const canManageQuestions = profile?.role === 'admin' || profile?.role === 'super_admin';
  const deleteQuestion = questions.find((question) => question.id === deleteQuestionId) || null;
  const totalResponsePages = Math.max(1, Math.ceil((bundle?.responses.length || 0) / RESPONSES_PER_PAGE));
  const pagedResponses = (bundle?.responses || []).slice(
    responsePage * RESPONSES_PER_PAGE,
    responsePage * RESPONSES_PER_PAGE + RESPONSES_PER_PAGE,
  );
  const filteredDashboardResponses = (dashboardData.responses || []).filter((response) => {
    if (response.survey_id !== bundle?.survey.id) return false;
    const submittedAt = new Date(response.submitted_at).getTime();
    if (dashboardStartDate && submittedAt < new Date(`${dashboardStartDate}T00:00:00`).getTime()) return false;
    if (dashboardEndDate && submittedAt > new Date(`${dashboardEndDate}T23:59:59.999`).getTime()) return false;
    return true;
  });
  const filteredResponseIds = new Set(filteredDashboardResponses.map((response) => response.id));
  const filteredContexts = (bundle?.respondentContexts || []).filter((context) => filteredResponseIds.has(context.response_id));
  const filteredRatingAnswers = dashboardData.answers.filter((answer) => filteredResponseIds.has(answer.response_id) && answer.rating_value !== null);
  const dashboardAverage = filteredRatingAnswers.length
    ? filteredRatingAnswers.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / filteredRatingAnswers.length
    : 0;
  const dashboardSatisfactionRate = filteredRatingAnswers.length
    ? filteredRatingAnswers.filter((answer) => (answer.rating_value || 0) >= 4).length / filteredRatingAnswers.length * 100
    : 0;
  const scoreDistribution = Array.from({ length: 5 }, (_, index) => {
    const score = index + 1;
    const total = filteredRatingAnswers.filter((answer) => answer.rating_value === score).length;
    const percentage = filteredRatingAnswers.length > 0 ? total / filteredRatingAnswers.length * 100 : 0;
    const percentageLabel = Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1);
    return { name: `${score} คะแนน`, score, total, display: total > 0 ? `${percentageLabel}%` : '' };
  });
  const questionChartData = questions.filter((question) => question.question_type === 'rating_5').map((question) => {
    const values = filteredRatingAnswers.filter((answer) => answer.question_id === question.id);
    return {
      name: `ข้อ ${question.position}`,
      fullName: question.prompt,
      average: values.length ? Number((values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / values.length).toFixed(2)) : 0,
      averageLabel: values.length ? (values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / values.length).toFixed(2) : '',
      total: values.length,
    };
  });
  const likertChartData: LikertChartDatum[] = questions.filter((question) => question.question_type === 'rating_5').map((question) => {
    const values = filteredRatingAnswers.filter((answer) => answer.question_id === question.id);
    const total = values.length;
    const averageValue = total ? values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / total : 0;
    const datum: LikertChartDatum = {
      name: `ข้อ ${question.position}: ${question.prompt}`,
      fullName: `ข้อ ${question.position}: ${question.prompt}`,
      position: question.position,
      total,
      average: averageValue,
      averageDisplay: total ? `เฉลี่ย ${averageValue.toFixed(2)}` : 'ยังไม่มีคำตอบ',
    };

    for (let score = 1; score <= 5; score += 1) {
      const count = values.filter((answer) => answer.rating_value === score).length;
      const percentage = total > 0 ? count / total * 100 : 0;
      datum[`score${score}`] = percentage;
      datum[`score${score}Count`] = count;
      datum[`score${score}Label`] = percentage >= 8 ? `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%` : '';
    }

    return datum;
  });
  const displayedLikertChartData = likertChartData
    .slice()
    .sort((left, right) => {
      if (likertView === 'improvement_priority') {
        const negativeDifference = Number(right.score1) + Number(right.score2) - Number(left.score1) - Number(left.score2);
        return negativeDifference || left.average - right.average || left.position - right.position;
      }
      if (likertView === 'strength') {
        const positiveDifference = Number(right.score4) + Number(right.score5) - Number(left.score4) - Number(left.score5);
        return positiveDifference || right.average - left.average || left.position - right.position;
      }
      return left.position - right.position;
    })
    .map((item, index) => ({
      ...item,
      name: likertView === 'question_order' ? item.name : `อันดับ ${index + 1} · ${item.name}`,
    }));
  const dimensionGroups = new Map<string, number[]>();
  for (const answer of filteredRatingAnswers) {
    const dimension = answer.dimension || 'ไม่ระบุมิติ';
    dimensionGroups.set(dimension, [...(dimensionGroups.get(dimension) || []), answer.rating_value || 0]);
  }
  const dimensionChartData = [...dimensionGroups.entries()].map(([name, values]) => ({
    name,
    average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    averageLabel: (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  }));
  const trendData = dashboardData.surveys.slice().sort((left, right) => left.version - right.version).map((survey) => {
    const responseIds = new Set(dashboardData.responses.filter((response) => response.survey_id === survey.id).map((response) => response.id));
    const values = dashboardData.answers.filter((answer) => responseIds.has(answer.response_id) && answer.rating_value !== null);
    return {
      name: `รอบ ${survey.version}`,
      average: values.length ? Number((values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / values.length).toFixed(2)) : 0,
      respondents: responseIds.size,
    };
  });
  const roleLabelOrder = roleOptions.map((option) => option.label);
  const frequencyLabelOrder = frequencyOptions.map((option) => option.label);
  const serviceLabelOrder = serviceOptions.map((option) => option.label);
  const resultRoleDistribution = countLabels((bundle?.respondentContexts || []).map((context) => getSurveyOptionLabel(roleOptions, context.respondent_role)), roleLabelOrder);
  const resultFrequencyDistribution = countLabels((bundle?.respondentContexts || []).map((context) => getSurveyOptionLabel(frequencyOptions, context.usage_frequency)), frequencyLabelOrder);
  const resultServiceDistribution = countLabels((bundle?.respondentContexts || []).flatMap((context) => context.used_services.map((service) => getSurveyOptionLabel(serviceOptions, service))), serviceLabelOrder);
  const additionalResultDistributions = (bundle?.contextSettings.additional_fields || [])
    .filter((field) => field.is_active && field.selection_type !== 'open_text')
    .map((field) => ({
      title: field.prompt,
      data: countLabels(
        (bundle?.respondentContexts || []).flatMap((context) =>
          getCustomContextLabels(field, context.custom_answers?.[field.id]),
        ),
        field.selection_type === 'rating_5' ? [1, 2, 3, 4, 5].map((score) => `${score} คะแนน`) : field.options.map((option) => option.label),
      ),
    }));
  const contextMissingCount = Math.max(0, (bundle?.responses.length || 0) - (bundle?.respondentContexts.length || 0));
  const roleDistribution = addDistributionPercentage(countLabels(filteredContexts.map((context) => getSurveyOptionLabel(roleOptions, context.respondent_role)), roleLabelOrder), filteredContexts.length);
  const frequencyDistribution = addDistributionPercentage(countLabels(filteredContexts.map((context) => getSurveyOptionLabel(frequencyOptions, context.usage_frequency)), frequencyLabelOrder), filteredContexts.length);
  const serviceDistribution = addDistributionPercentage(countLabels(filteredContexts.flatMap((context) => context.used_services.map((service) => getSurveyOptionLabel(serviceOptions, service))), serviceLabelOrder), filteredContexts.length);
  const additionalDashboardDistributions = (bundle?.contextSettings.additional_fields || [])
    .filter((field) => field.is_active && field.selection_type !== 'open_text')
    .map((field) => ({
      title: field.prompt,
      data: addDistributionPercentage(
        countLabels(
          filteredContexts.flatMap((context) =>
            getCustomContextLabels(field, context.custom_answers?.[field.id]),
          ),
          field.selection_type === 'rating_5' ? [1, 2, 3, 4, 5].map((score) => `${score} คะแนน`) : field.options.map((option) => option.label),
        ),
        filteredContexts.length,
      ),
    }));
  const additionalResultTextAnswers = (bundle?.contextSettings.additional_fields || [])
    .filter((field) => field.is_active && field.selection_type === 'open_text')
    .map((field) => ({
      title: field.prompt,
      answers: (bundle?.respondentContexts || []).map((context) => formatCustomContextAnswer(field, context.custom_answers?.[field.id])).filter(Boolean),
    }));
  const additionalDashboardTextAnswers = (bundle?.contextSettings.additional_fields || [])
    .filter((field) => field.is_active && field.selection_type === 'open_text')
    .map((field) => ({
      title: field.prompt,
      answers: filteredContexts.map((context) => formatCustomContextAnswer(field, context.custom_answers?.[field.id])).filter(Boolean),
    }));
  const openTextQuestions = questions
    .filter((question) => question.question_type === 'open_text')
    .sort((left, right) => left.position - right.position);
  const latestCommentRows = filteredDashboardResponses
    .map((response) => {
      const answers = new Map(
        dashboardData.answers
          .filter((answer) => answer.response_id === response.id && answer.question_type === 'open_text' && answer.text_value)
          .map((answer) => [answer.question_id, answer.text_value || '']),
      );
      return { response, answers };
    })
    .filter((row) => row.answers.size > 0)
    .sort((left, right) => new Date(right.response.submitted_at).getTime() - new Date(left.response.submitted_at).getTime())
    .slice(0, 5);
  const deleteResponse = bundle?.responses.find((response) => response.id === deleteResponseId) || null;
  const deleteRespondent = deleteResponse ? profileById.get(deleteResponse.respondent_id) : null;
  const clearSurvey = surveys.find((survey) => survey.id === clearSurveyId) || null;

  const exportDashboard = async () => {
    if (!bundle) return;
    const currentSurvey = bundle.survey;
    setExporting(true);
    setMessage(null);
    try {
      const XLSX = await import('xlsx');
      const responseAnswerMap = new Map<string, SatisfactionSurveyDashboardData['answers']>();
      for (const answer of dashboardData.answers) {
        if (!filteredResponseIds.has(answer.response_id)) continue;
        responseAnswerMap.set(answer.response_id, [...(responseAnswerMap.get(answer.response_id) || []), answer]);
      }

      const summaryRows = [
        ['รายงาน', heading],
        ['รอบแบบสำรวจ', currentSurvey.version],
        ['ชื่อแบบสำรวจ', safeExcelText(currentSurvey.title)],
        ['ช่วงวันที่เริ่มต้น', dashboardStartDate || 'ทั้งหมด'],
        ['ช่วงวันที่สิ้นสุด', dashboardEndDate || 'ทั้งหมด'],
        ['จำนวนผู้ตอบ', filteredDashboardResponses.length],
        ['คะแนนเฉลี่ยรวม', Number(dashboardAverage.toFixed(2))],
        ['ร้อยละความพึงพอใจระดับ 4–5', Number(dashboardSatisfactionRate.toFixed(2))],
        [],
        ['ข้อ', 'มิติที่วัด', 'คำถาม', 'คะแนนเฉลี่ย', 'จำนวนคำตอบ'],
        ...questionChartData.map((item) => {
          const question = questions.find((candidate) => `ข้อ ${candidate.position}` === item.name);
          return [item.name, safeExcelText(question?.dimension), safeExcelText(item.fullName), item.average, item.total];
        }),
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 80 }, { wch: 16 }, { wch: 16 }];

      const responseRows = filteredDashboardResponses.map((response, index) => {
        const profile = profileById.get(response.respondent_id);
        const context = contextByResponse.get(response.id);
        const row: Record<string, string | number> = {
          ลำดับ: index + 1,
          'รหัสคำตอบ': response.id,
          'รอบแบบสำรวจ': currentSurvey.version,
          'วันเวลาที่ตอบ': new Date(response.submitted_at).toLocaleString('th-TH'),
          'รหัสบุคลากร': safeExcelText(profile?.employee_code),
          'ชื่อผู้ตอบ': safeExcelText(profile?.full_name || 'ไม่พบข้อมูลผู้ตอบ'),
          ตำแหน่ง: safeExcelText(profile?.position),
          กลุ่มงาน: safeExcelText(profile?.work_group),
          ฝ่าย: safeExcelText(profile?.department),
          สิทธิ์ผู้ใช้: profile?.role || '',
          [bundle.contextSettings.role_prompt]: context ? getSurveyOptionLabel(roleOptions, context.respondent_role) : '',
          'บทบาทอื่น ๆ': safeExcelText(context?.respondent_role_other),
          [bundle.contextSettings.frequency_prompt]: context ? getSurveyOptionLabel(frequencyOptions, context.usage_frequency) : '',
          [bundle.contextSettings.services_prompt]: context ? context.used_services.map((service) => getSurveyOptionLabel(serviceOptions, service)).join(', ') : '',
          'ส่วนงานหรือบริการอื่น ๆ': safeExcelText(context?.used_services_other),
        };
        for (const field of bundle.contextSettings.additional_fields.filter((item) => item.is_active)) {
          row[field.prompt] = context ? safeExcelText(formatCustomContextAnswer(field, context.custom_answers?.[field.id])) : '';
        }
        for (const answer of responseAnswerMap.get(response.id) || []) {
          row[`ข้อ ${answer.question_position}`] = answer.rating_value ?? safeExcelText(answer.text_value);
        }
        return row;
      });
      const responsesSheet = XLSX.utils.json_to_sheet(responseRows.length > 0 ? responseRows : [{ หมายเหตุ: 'ไม่มีข้อมูลในช่วงวันที่ที่เลือก' }]);
      responsesSheet['!cols'] = [{ wch: 8 }, { wch: 38 }, { wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 28 }, { wch: 24 }, { wch: 70 }, { wch: 40 }, ...bundle.contextSettings.additional_fields.filter((field) => field.is_active).map(() => ({ wch: 36 })), ...questions.map(() => ({ wch: 24 }))];

      const answerRows = filteredDashboardResponses.flatMap((response) => {
        const profile = profileById.get(response.respondent_id);
        return (responseAnswerMap.get(response.id) || []).map((answer) => ({
          'รหัสคำตอบ': response.id,
          'ชื่อผู้ตอบ': safeExcelText(profile?.full_name || 'ไม่พบข้อมูลผู้ตอบ'),
          'วันเวลาที่ตอบ': new Date(response.submitted_at).toLocaleString('th-TH'),
          ข้อ: answer.question_position,
          'มิติที่วัด': safeExcelText(answer.dimension),
          คำถาม: safeExcelText(answer.question_prompt),
          ประเภท: answer.question_type === 'rating_5' ? 'คะแนน 1–5' : 'ข้อความ',
          คะแนน: answer.rating_value ?? '',
          คำตอบข้อความ: safeExcelText(answer.text_value),
        }));
      });
      const answersSheet = XLSX.utils.json_to_sheet(answerRows.length > 0 ? answerRows : [{ หมายเหตุ: 'ไม่มีข้อมูลในช่วงวันที่ที่เลือก' }]);
      answersSheet['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 24 }, { wch: 8 }, { wch: 24 }, { wch: 80 }, { wch: 14 }, { wch: 10 }, { wch: 80 }];

      const questionRows = questions.map((question) => ({
        ข้อ: question.position,
        ประเภท: question.question_type === 'rating_5' ? 'คะแนน 1–5' : 'ข้อความ',
        'มิติที่วัด': safeExcelText(question.dimension),
        คำถาม: safeExcelText(question.prompt),
        คำอธิบาย: safeExcelText(question.help_text),
        บังคับตอบ: question.is_required ? 'ใช่' : 'ไม่ใช่',
        เปิดใช้งาน: question.is_active ? 'ใช่' : 'ไม่ใช่',
      }));
      const questionSheet = XLSX.utils.json_to_sheet(questionRows);
      XLSX.utils.sheet_add_aoa(questionSheet, [[], ['เกณฑ์คะแนน', 'ชื่อระดับ', 'ความหมาย'], ...options.map((option) => [option.rating_value, safeExcelText(option.label), safeExcelText(option.description)])], { origin: -1 });
      questionSheet['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 80 }, { wch: 60 }, { wch: 14 }, { wch: 14 }];

      const roundsSheet = XLSX.utils.json_to_sheet(trendData.map((round) => ({
        รอบ: round.name,
        'คะแนนเฉลี่ย': round.average,
        'จำนวนผู้ตอบ': round.respondents,
      })));
      roundsSheet['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุป KPI');
      XLSX.utils.book_append_sheet(workbook, responsesSheet, 'คำตอบรายบุคคล');
      XLSX.utils.book_append_sheet(workbook, answersSheet, 'คำตอบแบบรายการ');
      XLSX.utils.book_append_sheet(workbook, questionSheet, 'คำถามและเกณฑ์');
      XLSX.utils.book_append_sheet(workbook, roundsSheet, 'สรุปแต่ละรอบ');

      const datePart = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `SmartDSP-satisfaction-round-${currentSurvey.version}-${datePart}.xlsx`);
      setMessage(`Export ข้อมูลรอบที่ ${currentSurvey.version} จำนวน ${filteredDashboardResponses.length} รายการเรียบร้อย`);
    } catch (error) {
      void reportClientError('Failed to export satisfaction survey', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถ Export ข้อมูลแบบสำรวจได้'));
    } finally {
      setExporting(false);
    }
  };

  const confirmDeleteResponse = async () => {
    if (!deleteResponseId || profile?.role !== 'super_admin') return;
    setDeleting(true);
    setMessage(null);
    try {
      await deleteSurveyResponse(deleteResponseId);
      setDeleteResponseId(null);
      setMessage('ลบคำตอบรายบุคคลออกจากฐานข้อมูลเรียบร้อย');
      await load(selectedId);
    } catch (error) {
      void reportClientError('Failed to delete satisfaction survey response', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถลบคำตอบได้ กรุณาตรวจสอบสิทธิ์แล้วลองใหม่'));
    } finally {
      setDeleting(false);
    }
  };

  const confirmClearSurveyData = async () => {
    if (!clearSurveyId || profile?.role !== 'super_admin') return;
    setDeleting(true);
    setMessage(null);
    try {
      await clearSurveyRoundData(clearSurveyId);
      setClearSurveyId(null);
      setMessage('ล้างคำตอบและผลประเมินของรอบแบบสำรวจเรียบร้อย โดยคงแม่แบบและการตั้งค่าไว้');
      await load(selectedId);
    } catch (error) {
      void reportClientError('Failed to clear satisfaction survey round data', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถล้างข้อมูลรอบแบบสำรวจได้ กรุณาตรวจสอบสิทธิ์แล้วลองใหม่'));
    } finally {
      setDeleting(false);
    }
  };

  const saveSettings = async () => {
    if (!bundle) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveSurveySettings(bundle.survey);
      await load(bundle.survey.id);
      setSaveSuccessMessage('บันทึกการตั้งค่าแบบสำรวจเรียบร้อยแล้ว');
    } catch (error) {
      void reportClientError('Failed to save survey settings', error);
      setMessage(getSafeUserErrorMessage(error, 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาตรวจสอบช่วงเวลาและสถานะของรอบอื่น'));
    } finally {
      setSaving(false);
    }
  };

  const saveStructure = async () => {
    if (!bundle || structureLocked) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveSurveyQuestions(bundle.survey.id, questions);
      await saveSurveyRatingOptions(options);
      await saveSurveyContextSettings(bundle.contextSettings);
      await load(bundle.survey.id);
      setSaveSuccessMessage('บันทึกคำถาม เกณฑ์คะแนน และข้อมูลเกี่ยวกับการใช้งานระบบเรียบร้อยแล้ว');
    } catch (error) {
      void reportClientError('Failed to save survey structure', error);
      setMessage(getSafeUserErrorMessage(error, 'บันทึกคำถามไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  const addSurveyQuestion = () => {
    if (!bundle || structureLocked || !canManageQuestions || questions.length >= 100) return;
    const now = new Date().toISOString();
    setQuestions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        survey_id: bundle.survey.id,
        position: current.length + 1,
        question_type: 'rating_5',
        prompt: 'คำถามใหม่',
        dimension: null,
        help_text: null,
        is_required: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  };

  const confirmDeleteQuestion = () => {
    if (!deleteQuestionId || structureLocked || !canManageQuestions) return;
    setQuestions((current) => current
      .filter((question) => question.id !== deleteQuestionId)
      .map((question, index) => ({ ...question, position: index + 1 })));
    setDeleteQuestionId(null);
  };

  const updateContextOptionLabel = (
    field: 'role_options' | 'frequency_options' | 'service_options',
    index: number,
    label: string,
  ) => {
    if (!bundle) return;
    const nextOptions = bundle.contextSettings[field].map((option, optionIndex) => (
      optionIndex === index ? { ...option, label } : option
    ));
    setBundle({
      ...bundle,
      contextSettings: { ...bundle.contextSettings, [field]: nextOptions },
    });
  };

  const addContextOption = (field: 'role_options' | 'frequency_options' | 'service_options') => {
    if (!bundle || structureLocked) return;
    setBundle({
      ...bundle,
      contextSettings: {
        ...bundle.contextSettings,
        [field]: [...bundle.contextSettings[field], { value: createContextKey('option'), label: 'ตัวเลือกใหม่' }],
      },
    });
  };

  const removeContextOption = (field: 'role_options' | 'frequency_options' | 'service_options', index: number) => {
    if (!bundle || structureLocked || bundle.contextSettings[field].length <= 1) return;
    setBundle({
      ...bundle,
      contextSettings: {
        ...bundle.contextSettings,
        [field]: bundle.contextSettings[field].filter((_, optionIndex) => optionIndex !== index),
      },
    });
  };

  const addAdditionalContextField = () => {
    if (!bundle || structureLocked) return;
    setBundle({
      ...bundle,
      contextSettings: {
        ...bundle.contextSettings,
        additional_fields: [
          ...bundle.contextSettings.additional_fields,
          {
            id: createContextKey('field'),
            prompt: 'หัวข้อใหม่',
            selection_type: 'single',
            is_required: true,
            is_active: true,
            options: [{ value: createContextKey('option'), label: 'ตัวเลือกใหม่' }],
          },
        ],
      },
    });
  };

  const updateAdditionalContextField = (index: number, updates: Partial<SatisfactionSurveyAdminBundle['contextSettings']['additional_fields'][number]>) => {
    if (!bundle || structureLocked) return;
    setBundle({
      ...bundle,
      contextSettings: {
        ...bundle.contextSettings,
        additional_fields: bundle.contextSettings.additional_fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...updates } : field),
      },
    });
  };

  const removeAdditionalContextField = (index: number) => {
    if (!bundle || structureLocked) return;
    setBundle((current) => current ? {
      ...current,
      contextSettings: {
        ...current.contextSettings,
        additional_fields: current.contextSettings.additional_fields.filter((_, fieldIndex) => fieldIndex !== index),
      },
    } : current);
  };

  const createRound = async () => {
    if (!bundle) return;
    setSaving(true);
    setMessage(null);
    try {
      const id = await cloneSurveyRound(bundle.survey.id);
      setView('settings');
      setMessage('สร้างรอบใหม่เป็นฉบับร่างเรียบร้อย ข้อมูลคำตอบรอบเดิมยังคงอยู่');
      await load(id);
    } catch (error) {
      void reportClientError('Failed to clone survey round', error);
      setMessage(getSafeUserErrorMessage(error, 'สร้างรอบแบบสำรวจใหม่ไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !bundle) return <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">กำลังโหลดแบบสำรวจ...</div>;
  if (!bundle) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">ไม่พบข้อมูลแบบสำรวจ</div>;

  return (
    <section className="space-y-5">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{heading}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <button type="button" onClick={() => void createRound()} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
            <CopyPlus className="h-4 w-4" aria-hidden="true" /> สร้างรอบใหม่
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-64 text-sm font-medium text-slate-700">
            รอบแบบสำรวจ
            <select value={selectedId} onChange={(event) => void load(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              {surveys.map((survey) => <option key={survey.id} value={survey.id}>รอบที่ {survey.version} - {statusLabels[survey.status]}</option>)}
            </select>
          </label>
          <span className={`rounded-md px-3 py-2 text-xs font-semibold ${bundle.survey.is_enabled && bundle.survey.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {bundle.survey.is_enabled && bundle.survey.status === 'active' ? 'แสดงที่หน้า Portal' : 'ไม่แสดงที่หน้า Portal'}
          </span>
        </div>
      </div>

      {message ? <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{message}</div> : null}

      <div className="flex gap-2 border-b border-slate-200">
        {([
          ['settings', 'ตั้งค่า', Settings2],
          ['questions', 'คำถามและคะแนน', ClipboardCheck],
          ['results', 'ผลการประเมิน', BarChart3],
          ['dashboard', 'แดชบอร์ด', Gauge],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setView(id)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold ${view === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {view === 'settings' ? (
        <div className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 md:col-span-2">ชื่อแบบสำรวจ<input value={bundle.survey.title} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, title: event.target.value } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              รายละเอียด
              <textarea rows={6} maxLength={SMARTDSP_SURVEY_LONG_TEXT_MAX_LENGTH} value={bundle.survey.description} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, description: event.target.value, instructions: '' } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              <CharacterCounter value={bundle.survey.description} />
            </label>
            <label className="text-sm font-medium text-slate-700">สถานะ<select value={bundle.survey.status} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, status: event.target.value as SmartDspSurveyStatus } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="flex items-center gap-3 self-end rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={bundle.survey.is_enabled} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, is_enabled: event.target.checked } })} className="h-4 w-4" /> แสดงแบบสำรวจที่หน้า Portal</label>
            <label className="text-sm font-medium text-slate-700">เริ่มรับคำตอบ<input type="datetime-local" value={toLocalDateTime(bundle.survey.starts_at)} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, starts_at: toIso(event.target.value) } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">สิ้นสุดการรับคำตอบ<input type="datetime-local" value={toLocalDateTime(bundle.survey.ends_at)} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, ends_at: toIso(event.target.value) } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            </div>
            <p className="mt-4 text-xs text-slate-500">การแสดงหน้า Portal ต้องเลือกสถานะ “เปิดใช้งาน” และเปิดสวิตช์แสดงแบบสำรวจ โดยแต่ละระบบเปิดใช้งานได้ครั้งละหนึ่งรอบ</p>
            <button type="button" onClick={() => void saveSettings()} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" /> บันทึกการตั้งค่า</button>
          </div>

          {profile?.role === 'super_admin' ? (
            <section className="rounded-md border border-red-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-950">จัดการข้อมูลรอบแบบสำรวจทั้งหมด</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">เฉพาะ Super Admin เท่านั้นที่สามารถล้างคำตอบและผลประเมินของแต่ละรอบได้ โดยแม่แบบ คำถาม และการตั้งค่าจะยังคงอยู่</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-5 py-3">รอบ</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">ช่วงรับคำตอบ</th>
                      <th className="px-4 py-3 text-center">ผู้ตอบ</th>
                      <th className="px-5 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {surveys.map((survey) => (
                      <tr key={survey.id} className={cn(survey.id === selectedId && 'bg-brand-50/50')}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">รอบที่ {survey.version}</p>
                          <p className="mt-0.5 max-w-80 truncate text-xs text-slate-500" title={survey.title}>{survey.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-semibold', survey.status === 'active' && survey.is_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>{statusLabels[survey.status]}</span>
                        </td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-600">
                          <span className="block">{formatSurveyDateTime(survey.starts_at)}</span>
                          <span className="block">ถึง {formatSurveyDateTime(survey.ends_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800">{(responseCountBySurvey.get(survey.id) || 0).toLocaleString('th-TH')}</td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={() => setClearSurveyId(survey.id)} title={`ล้างข้อมูลรอบที่ ${survey.version}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {view === 'questions' ? (
        <div className="space-y-5">
          {structureLocked ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">รอบนี้มีผู้ตอบแล้ว จึงล็อกคำถามและเกณฑ์คะแนน กรุณาสร้างรอบใหม่เมื่อต้องการแก้ไข</div> : null}
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">ความหมายของคะแนน 1–5</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {options.map((option, index) => <div key={option.id} className="rounded-md border border-slate-200 p-3"><div className="text-lg font-bold text-brand-700">{option.rating_value}</div><input disabled={structureLocked} value={option.label} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50" /><textarea disabled={structureLocked} rows={4} value={option.description} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-50" /></div>)}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="font-semibold text-slate-900">ข้อมูลเกี่ยวกับการใช้งานระบบ</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">แก้ไขข้อความหัวข้อและชื่อตัวเลือกที่แสดงต่อผู้ตอบ รหัสภายในของตัวเลือกจะคงเดิมเพื่อรักษาความถูกต้องของข้อมูลเก่า</p>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {([
                {
                  title: 'บทบาทของผู้ตอบแบบสำรวจ',
                  promptField: 'role_prompt',
                  optionsField: 'role_options',
                },
                {
                  title: 'ความถี่ในการเข้าใช้งานระบบ',
                  promptField: 'frequency_prompt',
                  optionsField: 'frequency_options',
                },
                {
                  title: 'ส่วนงานหรือบริการที่เคยใช้งาน',
                  promptField: 'services_prompt',
                  optionsField: 'service_options',
                },
              ] as const).map((group) => (
                <section key={group.promptField} className={cn('rounded-md border border-slate-200 bg-slate-50/60 p-4', group.optionsField === 'service_options' && 'xl:col-span-2')}>
                  <h4 className="text-sm font-semibold text-slate-900">{group.title}</h4>
                  <label className="mt-3 block text-xs font-medium text-slate-600">
                    ข้อความหัวข้อ
                    <textarea
                      disabled={structureLocked}
                      rows={2}
                      value={bundle.contextSettings[group.promptField]}
                      onChange={(event) => setBundle({
                        ...bundle,
                        contextSettings: { ...bundle.contextSettings, [group.promptField]: event.target.value },
                      })}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </label>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-600">ชื่อตัวเลือก</p>
                    <div className={cn('mt-2 grid gap-2', group.optionsField === 'service_options' && 'sm:grid-cols-2 sm:gap-x-4')}>
                      {bundle.contextSettings[group.optionsField].map((option, index) => (
                        <div key={option.value} className="flex min-w-0 items-center gap-2">
                          <input
                            disabled={structureLocked}
                            value={option.label}
                            onChange={(event) => updateContextOptionLabel(group.optionsField, index, event.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                          />
                          {!structureLocked ? <button type="button" onClick={() => removeContextOption(group.optionsField, index)} disabled={bundle.contextSettings[group.optionsField].length <= 1} title="ลบตัวเลือก" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
                        </div>
                      ))}
                    </div>
                    {!structureLocked ? <button type="button" onClick={() => addContextOption(group.optionsField)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" aria-hidden="true" /> เพิ่มตัวเลือก</button> : null}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">หัวข้อข้อมูลผู้ตอบเพิ่มเติม</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">เพิ่มหัวข้อแบบตัวเลือก คะแนน 1–5 หรือข้อความ รหัสภายในจะสร้างอัตโนมัติและไม่แสดงบนหน้าจอ</p>
                </div>
                {!structureLocked ? <button type="button" onClick={addAdditionalContextField} className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"><Plus className="h-4 w-4" aria-hidden="true" /> เพิ่มหัวข้อใหม่</button> : null}
              </div>

              <div className="mt-4 space-y-4">
                {bundle.contextSettings.additional_fields.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีหัวข้อเพิ่มเติม</div> : null}
                {bundle.contextSettings.additional_fields.map((field, fieldIndex) => (
                  <section key={field.id} className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_auto]">
                      <label className="text-xs font-medium text-slate-600">ชื่อหัวข้อ<input disabled={structureLocked} value={field.prompt} onChange={(event) => updateAdditionalContextField(fieldIndex, { prompt: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100" /></label>
                      <label className="text-xs font-medium text-slate-600">รูปแบบคำตอบ<select disabled={structureLocked} value={field.selection_type} onChange={(event) => { const selectionType = event.target.value as SmartDspSurveyAdditionalContextField['selection_type']; updateAdditionalContextField(fieldIndex, { selection_type: selectionType, options: (selectionType === 'single' || selectionType === 'multiple') && field.options.length === 0 ? [{ value: createContextKey('option'), label: 'ตัวเลือกใหม่' }] : field.options }); }} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"><option value="single">เลือกหนึ่งข้อ</option><option value="multiple">เลือกได้หลายข้อ</option><option value="rating_5">คะแนน 1–5</option><option value="open_text">ข้อเสนอแนะข้อความ</option></select></label>
                      {!structureLocked ? <button type="button" onClick={() => removeAdditionalContextField(fieldIndex)} title="ลบหัวข้อ" className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-600">
                      <label className="flex items-center gap-2"><input type="checkbox" disabled={structureLocked} checked={field.is_required} onChange={(event) => updateAdditionalContextField(fieldIndex, { is_required: event.target.checked })} /> บังคับตอบ</label>
                      <label className="flex items-center gap-2"><input type="checkbox" disabled={structureLocked} checked={field.is_active} onChange={(event) => updateAdditionalContextField(fieldIndex, { is_active: event.target.checked })} /> เปิดใช้งาน</label>
                    </div>
                    {field.selection_type === 'single' || field.selection_type === 'multiple' ? <><div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {field.options.map((option, optionIndex) => (
                        <div key={option.value} className="flex min-w-0 items-center gap-2">
                          <input disabled={structureLocked} value={option.label} onChange={(event) => updateAdditionalContextField(fieldIndex, { options: field.options.map((item, index) => index === optionIndex ? { ...item, label: event.target.value } : item) })} className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100" />
                          {!structureLocked ? <button type="button" disabled={field.options.length <= 1} onClick={() => updateAdditionalContextField(fieldIndex, { options: field.options.filter((_, index) => index !== optionIndex) })} title="ลบตัวเลือก" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
                        </div>
                      ))}
                    </div>
                    {!structureLocked ? <button type="button" onClick={() => updateAdditionalContextField(fieldIndex, { options: [...field.options, { value: createContextKey('option'), label: 'ตัวเลือกใหม่' }] })} className="mt-3 inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" aria-hidden="true" /> เพิ่มตัวเลือก</button> : null}</> : <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">{field.selection_type === 'rating_5' ? 'ผู้ตอบจะเลือกคะแนนตั้งแต่ 1 ถึง 5' : 'ผู้ตอบจะกรอกข้อความได้ไม่เกิน 4,000 ตัวอักษร'}</p>}
                  </section>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-slate-900">คำถามแบบสำรวจ</h3><p className="mt-1 text-xs text-slate-500">เพิ่ม แก้ไข หรือลบคำถาม แล้วกดบันทึกด้านล่าง</p></div>
            {canManageQuestions && !structureLocked ? <button type="button" onClick={addSurveyQuestion} disabled={questions.length >= 100} className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" /> เพิ่มคำถามใหม่</button> : null}
          </div>
          <div className="space-y-3">
            {questions.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีคำถาม กด “เพิ่มคำถามใหม่” เพื่อเริ่มสร้างคำถาม</div> : null}
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[64px_1fr_220px]">
                  <div className="text-sm font-bold text-brand-700">ข้อ {question.position}</div>
                  <textarea disabled={structureLocked || !canManageQuestions} rows={2} value={question.prompt} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" />
                  <input disabled={structureLocked || !canManageQuestions} value={question.dimension || ''} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dimension: event.target.value || null } : item))} placeholder="มิติที่วัด" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 pl-0 text-xs text-slate-600 md:pl-16">
                  <select disabled={structureLocked || !canManageQuestions} value={question.question_type} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, question_type: event.target.value === 'open_text' ? 'open_text' : 'rating_5' } : item))} aria-label={`รูปแบบคำตอบข้อ ${question.position}`} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-50"><option value="rating_5">คะแนน 1–5</option><option value="open_text">ข้อเสนอแนะข้อความ</option></select>
                  <label className="flex items-center gap-2"><input type="checkbox" disabled={structureLocked || !canManageQuestions} checked={question.is_required} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_required: event.target.checked } : item))} /> บังคับตอบ</label>
                  <label className="flex items-center gap-2"><input type="checkbox" disabled={structureLocked || !canManageQuestions} checked={question.is_active} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_active: event.target.checked } : item))} /> เปิดใช้คำถาม</label>
                  {canManageQuestions && !structureLocked ? <button type="button" onClick={() => setDeleteQuestionId(question.id)} title={`ลบคำถามข้อ ${question.position}`} aria-label={`ลบคำถามข้อ ${question.position}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}
                </div>
              </div>
            ))}
          </div>
          {canManageQuestions && !structureLocked ? <button type="button" onClick={() => void saveStructure()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" /> บันทึกคำถามและคะแนน</button> : null}
        </div>
      ) : null}

      {view === 'results' ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ผู้ตอบทั้งหมด</p><p className="mt-1 text-2xl font-bold text-slate-950">{bundle.responses.length}</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">คะแนนเฉลี่ย</p><p className="mt-1 text-2xl font-bold text-brand-700">{average.toFixed(2)} / 5</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">พึงพอใจระดับ 4–5</p><p className="mt-1 text-2xl font-bold text-emerald-700">{satisfactionRate.toFixed(1)}%</p></div></div>
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-slate-900">ข้อมูลเกี่ยวกับการใช้งานระบบ</h3><p className="mt-1 text-xs text-slate-500">สรุปจากข้อมูลที่ผู้ตอบเลือกในรอบนี้</p></div>
              <span className={`rounded-md px-3 py-1.5 text-xs font-semibold ${contextMissingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>มีข้อมูล {bundle.respondentContexts.length}/{bundle.responses.length}{contextMissingCount > 0 ? ` · ยังไม่มีข้อมูล ${contextMissingCount}` : ''}</span>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[
                { title: bundle.contextSettings.role_prompt, data: resultRoleDistribution },
                { title: bundle.contextSettings.frequency_prompt, data: resultFrequencyDistribution },
                { title: bundle.contextSettings.services_prompt, data: resultServiceDistribution },
                ...additionalResultDistributions,
              ].map((group) => <div key={group.title}><h4 className="text-xs font-semibold text-slate-600">{group.title}</h4><div className="mt-2 divide-y divide-slate-100 border-y border-slate-100">{group.data.length > 0 ? group.data.map((item) => <div key={item.name} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="text-slate-700">{item.name}</span><strong className="shrink-0 text-slate-900">{item.total}</strong></div>) : <p className="py-3 text-sm text-slate-400">ยังไม่มีข้อมูล</p>}</div></div>)}
              {additionalResultTextAnswers.map((group) => <div key={group.title} className="md:col-span-2 xl:col-span-3"><h4 className="text-xs font-semibold text-slate-600">{group.title}</h4><div className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto border-y border-slate-100">{group.answers.length > 0 ? group.answers.map((answer, index) => <p key={`${group.title}-${index}`} className="whitespace-pre-wrap py-2 text-sm leading-6 text-slate-700">{answer}</p>) : <p className="py-3 text-sm text-slate-400">ยังไม่มีข้อมูล</p>}</div></div>)}
            </div>
          </section>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">ข้อ</th><th className="px-4 py-3">มิติที่วัด</th><th className="px-4 py-3">คะแนนเฉลี่ย</th><th className="px-4 py-3">จำนวนคำตอบ</th></tr></thead><tbody className="divide-y divide-slate-100">{questions.filter((question) => question.question_type === 'rating_5').map((question) => { const values = bundle.answers.filter((answer) => answer.question_id === question.id && answer.rating_value !== null); const avg = values.length ? values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / values.length : 0; return <tr key={question.id}><td className="px-4 py-3 font-semibold">{question.position}</td><td className="px-4 py-3">{question.dimension || question.prompt}</td><td className="px-4 py-3">{avg.toFixed(2)}</td><td className="px-4 py-3">{values.length}</td></tr>; })}</tbody></table></div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">คำตอบรายบุคคล</h3>
              {bundle.responses.length > 0 ? <span className="text-xs text-slate-500">รายการ {responsePage * RESPONSES_PER_PAGE + 1}–{Math.min((responsePage + 1) * RESPONSES_PER_PAGE, bundle.responses.length)} จาก {bundle.responses.length}</span> : null}
            </div>
            {bundle.responses.length === 0 ? <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">ยังไม่มีผู้ตอบแบบสำรวจ</div> : pagedResponses.map((response) => {
              const respondent = profileById.get(response.respondent_id);
              const context = contextByResponse.get(response.id);
              return (
                <div key={response.id} className="rounded-md border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-100 pr-3">
                    <details className="min-w-0 flex-1">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                        {respondent?.full_name || 'ไม่พบชื่อผู้ตอบ'} · {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.submitted_at))}
                      </summary>
                      <div className="border-t border-slate-100 px-4 py-3">
                        {context ? <div className="mb-3 grid gap-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-3"><span><strong>{bundle.contextSettings.role_prompt}:</strong> {getSurveyOptionLabel(roleOptions, context.respondent_role)}{context.respondent_role_other ? `: ${context.respondent_role_other}` : ''}</span><span><strong>{bundle.contextSettings.frequency_prompt}:</strong> {getSurveyOptionLabel(frequencyOptions, context.usage_frequency)}</span><span><strong>{bundle.contextSettings.services_prompt}:</strong> {context.used_services.map((service) => getSurveyOptionLabel(serviceOptions, service)).join(', ')}{context.used_services_other ? `: ${context.used_services_other}` : ''}</span>{bundle.contextSettings.additional_fields.filter((field) => field.is_active).map((field) => <span key={field.id} className="whitespace-pre-wrap"><strong>{field.prompt}:</strong> {formatCustomContextAnswer(field, context.custom_answers?.[field.id]) || '-'}</span>)}</div> : null}
                        {(answersByResponse.get(response.id) || []).map((answer) => <div key={answer.id} className="border-b border-slate-100 py-2 last:border-0"><p className="text-xs text-slate-500">ข้อ {answer.question_position}: {answer.question_prompt}</p><p className="mt-1 text-sm text-slate-800">{answer.rating_value !== null ? `${answer.rating_value} คะแนน` : answer.text_value}</p></div>)}
                      </div>
                    </details>
                    {profile?.role === 'super_admin' ? <button type="button" onClick={() => setDeleteResponseId(response.id)} title="ลบคำตอบนี้" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}
                  </div>
                </div>
              );
            })}
            {totalResponsePages > 1 ? (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setResponsePage((current) => Math.max(0, current - 1))} disabled={responsePage === 0} title="หน้าก่อนหน้า" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                <span className="min-w-20 text-center text-sm font-semibold text-slate-600">หน้า {responsePage + 1}/{totalResponsePages}</span>
                <button type="button" onClick={() => setResponsePage((current) => Math.min(totalResponsePages - 1, current + 1))} disabled={responsePage >= totalResponsePages - 1} title="หน้าถัดไป" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === 'dashboard' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-semibold text-slate-950">ภาพรวมผลสำรวจ รอบที่ {bundle.survey.version}</h3>
              <p className="mt-1 text-sm text-slate-500">ข้อมูลสรุปจากคำตอบที่ส่งสำเร็จและอยู่ในช่วงวันที่ที่เลือก</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="text-xs font-medium text-slate-600">ตั้งแต่<input type="date" value={dashboardStartDate} onChange={(event) => setDashboardStartDate(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">ถึง<input type="date" value={dashboardEndDate} onChange={(event) => setDashboardEndDate(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
              {(dashboardStartDate || dashboardEndDate) ? <button type="button" onClick={() => { setDashboardStartDate(''); setDashboardEndDate(''); }} className="self-end rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">ล้างตัวกรอง</button> : null}
              <button type="button" onClick={() => void exportDashboard()} disabled={exporting} className="inline-flex self-end items-center gap-2 rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60">
                <Download className="h-4 w-4" aria-hidden="true" /> {exporting ? 'กำลัง Export...' : 'Export Excel'}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ผู้ตอบในช่วงที่เลือก</p><p className="mt-1 text-2xl font-bold text-slate-950">{filteredDashboardResponses.length}</p></div>
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">คะแนนเฉลี่ยรวม</p><p className="mt-1 text-2xl font-bold text-blue-700">{dashboardAverage.toFixed(2)} / 5</p></div>
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ความพึงพอใจระดับ 4–5</p><p className="mt-1 text-2xl font-bold text-emerald-700">{dashboardSatisfactionRate.toFixed(1)}%</p></div>
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ข้อที่มีคะแนน</p><p className="mt-1 text-2xl font-bold text-amber-700">{questionChartData.filter((item) => item.total > 0).length} / {questionChartData.length}</p></div>
          </div>

          {filteredDashboardResponses.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">ยังไม่มีข้อมูลในรอบหรือช่วงวันที่ที่เลือก</div>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">คะแนนเฉลี่ยรายข้อ</h4>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={questionChartData} margin={{ top: 28, right: 12, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 5]} fontSize={12} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)} คะแนน`, 'คะแนนเฉลี่ย']} /><Bar dataKey="average" fill="#0369a1" radius={[4, 4, 0, 0]}><LabelList dataKey="averageLabel" position="top" fill="#334155" fontSize={12} fontWeight={600} /></Bar></BarChart></ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">สัดส่วนคะแนน 1–5</h4>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={scoreDistribution} dataKey="total" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} label={({ payload }) => payload?.display || ''}>{scoreDistribution.map((entry, index) => <Cell key={entry.score} fill={SCORE_COLORS[index]} />)}</Pie><Tooltip formatter={(value) => [`${value} คำตอบ`, 'จำนวน']} /><Legend /></PieChart></ResponsiveContainer>
                  </div>
                </section>
              </div>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h4 className="text-sm font-semibold text-slate-900">ลักษณะการใช้งานของผู้ตอบ</h4><p className="mt-1 text-xs text-slate-500">จำนวนผู้ตอบจำแนกตามบทบาท ความถี่ และบริการที่เคยใช้งาน</p></div>
                  {filteredContexts.length < filteredDashboardResponses.length ? <span className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">ไม่มีข้อมูล {filteredDashboardResponses.length - filteredContexts.length} รายการ</span> : null}
                </div>
                {filteredContexts.length > 0 ? (
                  <div className="mt-4 grid gap-5 xl:grid-cols-2">
                    <div><h5 className="text-center text-xs font-semibold text-slate-600">{bundle.contextSettings.role_prompt}</h5><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={roleDistribution} dataKey="total" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={2} labelLine={false} label={({ payload }) => payload?.total ? payload.display : ''}>{roleDistribution.map((item, index) => <Cell key={item.name} fill={SCORE_COLORS[index % SCORE_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [formatDistributionValue(value, filteredContexts.length), 'จำนวนและร้อยละ']} /><Legend /></PieChart></ResponsiveContainer></div></div>
                    <div><h5 className="text-center text-xs font-semibold text-slate-600">{bundle.contextSettings.frequency_prompt}</h5><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={frequencyDistribution} margin={{ top: 30, right: 10, left: -18, bottom: 42 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} angle={-24} textAnchor="end" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip formatter={(value) => [formatDistributionValue(value, filteredContexts.length), 'จำนวนและร้อยละ']} /><Bar dataKey="total" fill="#0d9488" radius={[4, 4, 0, 0]}><LabelList dataKey="display" position="top" fill="#334155" fontSize={12} fontWeight={600} /></Bar></BarChart></ResponsiveContainer></div></div>
                    <div className="xl:col-span-2"><h5 className="text-center text-xs font-semibold text-slate-600">{bundle.contextSettings.services_prompt}</h5><div className="mt-3 divide-y divide-slate-100 md:hidden">{serviceDistribution.map((item) => <div key={item.name} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="text-slate-700">{item.name}</span><strong className="shrink-0 text-blue-700">{item.display}</strong></div>)}</div><div className="hidden md:block" style={{ height: Math.max(340, serviceDistribution.length * 46) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={serviceDistribution} layout="vertical" margin={{ top: 10, right: 130, left: 0, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="name" width={280} tick={<ServiceAxisTick />} /><Tooltip formatter={(value) => [formatDistributionValue(value, filteredContexts.length), 'จำนวนและร้อยละ']} /><Bar dataKey="total" fill="#0369a1" radius={[0, 4, 4, 0]}><LabelList dataKey="display" position="right" fill="#334155" fontSize={12} fontWeight={600} /></Bar></BarChart></ResponsiveContainer></div></div>
                    {additionalDashboardDistributions.map((group) => <div key={group.title} className="xl:col-span-2"><h5 className="text-center text-xs font-semibold text-slate-600">{group.title}</h5><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{group.data.map((item) => <div key={item.name} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"><span className="text-slate-700">{item.name}</span><strong className="shrink-0 text-blue-700">{item.display}</strong></div>)}</div></div>)}
                    {additionalDashboardTextAnswers.map((group) => <div key={group.title} className="xl:col-span-2"><div className="flex items-center justify-between gap-3"><h5 className="text-xs font-semibold text-slate-600">{group.title}</h5><span className="text-xs text-slate-500">{group.answers.length} คำตอบ</span></div><div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 px-3">{group.answers.length > 0 ? group.answers.map((answer, index) => <p key={`${group.title}-${index}`} className="whitespace-pre-wrap py-2 text-sm leading-6 text-slate-700">{answer}</p>) : <p className="py-3 text-sm text-slate-400">ยังไม่มีข้อมูล</p>}</div></div>)}
                  </div>
                ) : <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีข้อมูลบทบาท ความถี่ และบริการในช่วงที่เลือก</p>}
              </section>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">คะแนนตามมิติ KPI</h4>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={dimensionChartData} layout="vertical" margin={{ top: 4, right: 20, left: 38, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 5]} fontSize={12} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)} คะแนน`, 'คะแนนเฉลี่ย']} /><Bar dataKey="average" fill="#0d9488" radius={[0, 4, 4, 0]}><LabelList dataKey="averageLabel" position="insideRight" fill="#ffffff" fontSize={12} fontWeight={700} /></Bar></BarChart></ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">แนวโน้มเปรียบเทียบแต่ละรอบ</h4>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis yAxisId="score" domain={[0, 5]} fontSize={12} /><YAxis yAxisId="people" orientation="right" allowDecimals={false} fontSize={12} /><Tooltip /><Legend /><Line yAxisId="score" type="monotone" dataKey="average" name="คะแนนเฉลี่ย" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} /><Line yAxisId="people" type="monotone" dataKey="respondents" name="จำนวนผู้ตอบ" stroke="#d97706" strokeWidth={2} /></LineChart></ResponsiveContainer>
                  </div>
                </section>
              </div>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">การกระจายคะแนนรายข้อ</h4>
                    <p className="mt-1 text-xs text-slate-500">สัดส่วนร้อยละของคะแนน 1–5 สำหรับคำถามทั้ง 10 ข้อ พร้อมคะแนนเฉลี่ยและจำนวนผู้ตอบ</p>
                  </div>
                  <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white" aria-label="มุมมองการเรียงลำดับกราฟ">
                    {[
                      { value: 'question_order' as const, label: 'ตามลำดับข้อ' },
                      { value: 'improvement_priority' as const, label: 'ควรพัฒนาก่อน' },
                      { value: 'strength' as const, label: 'จุดเด่น' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setLikertView(option.value)}
                        className={cn(
                          'border-l border-slate-300 px-3 py-2 text-xs font-semibold transition first:border-l-0',
                          likertView === option.value ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50',
                        )}
                        aria-pressed={likertView === option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <div className="h-[560px] min-w-[900px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayedLikertChartData} layout="vertical" margin={{ top: 8, right: 115, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={11} />
                        <YAxis type="category" dataKey="name" width={430} tick={<LikertAxisTick />} />
                        <Tooltip content={<LikertTooltip />} />
                        <Legend />
                        {Array.from({ length: 5 }, (_, index) => {
                          const score = index + 1;
                          return (
                            <Bar key={score} dataKey={`score${score}`} name={`${score} คะแนน`} stackId="likert" fill={LIKERT_COLORS[index]} isAnimationActive={false}>
                              <LabelList dataKey={`score${score}Label`} position="center" fill={score === 3 ? '#422006' : '#ffffff'} fontSize={11} fontWeight={700} />
                              {score === 5 ? <LabelList dataKey="averageDisplay" position="right" fill="#334155" fontSize={12} fontWeight={700} /> : null}
                            </Bar>
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">ข้อเสนอแนะล่าสุด</h4>
                <p className="mt-1 text-xs text-slate-500">จัดกลุ่มคำตอบตามผู้ตอบ โดยผู้ที่ส่งแบบสำรวจล่าสุดจะแสดงอยู่ด้านบน</p>
                {latestCommentRows.length > 0 ? (
                  <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-600">
                        <tr>
                          {openTextQuestions.map((question, index) => <th key={question.id} className={cn('border-b border-slate-200 px-4 py-3 font-semibold', index > 0 && 'border-l')}><span className="block text-slate-900">ข้อ {question.position}</span><span className="mt-1 block font-normal leading-5">{question.prompt}</span></th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {latestCommentRows.map((row) => (
                          <tr key={row.response.id} className="align-top even:bg-slate-50/50">
                            {openTextQuestions.map((question, index) => <td key={question.id} className={cn('border-b border-slate-100 px-4 py-4 whitespace-pre-line leading-6 text-slate-700', index > 0 && 'border-l')}>{row.answers.get(question.id) || <span className="text-slate-400">ไม่ได้ระบุ</span>}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="py-5 text-center text-sm text-slate-500">ยังไม่มีข้อเสนอแนะในช่วงที่เลือก</p>}
              </section>
            </>
          )}
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteQuestionId)}
        onClose={() => setDeleteQuestionId(null)}
        onConfirm={confirmDeleteQuestion}
        title="ยืนยันการลบคำถาม"
        message={deleteQuestion ? <span>ต้องการลบ <strong>คำถามข้อ {deleteQuestion.position}</strong> “{deleteQuestion.prompt}” ออกจากรายการใช่หรือไม่ เลขข้อที่เหลือจะถูกจัดลำดับใหม่ และการเปลี่ยนแปลงจะมีผลเมื่อกดบันทึกคำถามและคะแนน</span> : 'ยืนยันการลบคำถามนี้หรือไม่'}
        confirmLabel="ลบคำถาม"
        cancelLabel="ยกเลิก"
        variant="danger"
      />

      <ConfirmModal
        isOpen={Boolean(saveSuccessMessage)}
        onClose={() => setSaveSuccessMessage(null)}
        onConfirm={() => setSaveSuccessMessage(null)}
        title="บันทึกสำเร็จ"
        message={saveSuccessMessage || ''}
        confirmLabel="ตกลง"
        variant="success"
        showCancelButton={false}
      />

      <ConfirmModal
        isOpen={Boolean(deleteResponseId)}
        onClose={() => setDeleteResponseId(null)}
        onConfirm={() => void confirmDeleteResponse()}
        title="ยืนยันการลบคำตอบแบบสำรวจ"
        message={<span>ต้องการลบคำตอบของ <strong>{deleteRespondent?.full_name || 'ผู้ตอบรายนี้'}</strong> ในรอบที่ {bundle.survey.version} ออกจากฐานข้อมูลอย่างถาวรใช่หรือไม่ การดำเนินการนี้ไม่สามารถกู้คืนได้</span>}
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        isLoading={deleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={Boolean(clearSurveyId)}
        onClose={() => setClearSurveyId(null)}
        onConfirm={() => void confirmClearSurveyData()}
        title="ยืนยันการล้างข้อมูลรอบแบบสำรวจ"
        message={clearSurvey ? <span>ต้องการล้างข้อมูลของ <strong>{heading} รอบที่ {clearSurvey.version}</strong> สถานะ “{statusLabels[clearSurvey.status]}” ซึ่งมีผู้ตอบ {(responseCountBySurvey.get(clearSurvey.id) || 0).toLocaleString('th-TH')} คน ใช่หรือไม่ คำตอบ คะแนน Consent และผลประเมินของรอบนี้จะถูกลบอย่างถาวร แต่แม่แบบ คำถาม และการตั้งค่าจะยังคงอยู่</span> : 'ยืนยันการล้างข้อมูลรอบแบบสำรวจนี้หรือไม่'}
        confirmLabel="ยืนยันการล้างข้อมูล"
        cancelLabel="ยกเลิก"
        isLoading={deleting}
        variant="danger"
      />
    </section>
  );
}
