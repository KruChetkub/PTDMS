import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, ClipboardCheck, CopyPlus, Gauge, Save, Settings2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SmartDspSurveyQuestion, SmartDspSurveyRatingOption, SmartDspSurveyStatus } from '../../../types/database.types';
import { getSafeUserErrorMessage, reportClientError } from '../../../utils/errorHandling';
import {
  cloneSurveyRound,
  listSurveysForAdmin,
  loadSurveyDashboard,
  loadSurveyForAdmin,
  saveSurveyQuestions,
  saveSurveyRatingOptions,
  saveSurveySettings,
  type SatisfactionSurveyAdminBundle,
  type SatisfactionSurveyDashboardData,
} from '../../surveys/satisfactionSurvey.service';

type View = 'settings' | 'questions' | 'results' | 'dashboard';

const RESPONSES_PER_PAGE = 10;
const SCORE_COLORS = ['#dc2626', '#ea580c', '#d97706', '#0d9488', '#047857'];

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

export function SiteManagerSatisfactionSurveyEditor() {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (surveyId?: string) => {
    setLoading(true);
    try {
      const surveyList = await listSurveysForAdmin();
      const nextId = surveyId || selectedId || surveyList[0]?.id || '';
      const [nextBundle, nextDashboardData] = await Promise.all([loadSurveyForAdmin(nextId), loadSurveyDashboard()]);
      setSurveys(surveyList);
      setDashboardData(nextDashboardData);
      setSelectedId(nextBundle?.survey.id || '');
      setBundle(nextBundle);
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
    void load();
  }, []);

  const profileById = useMemo(() => new Map((bundle?.respondents || []).map((profile) => [profile.user_id, profile])), [bundle?.respondents]);
  const answersByResponse = useMemo(() => {
    const grouped = new Map<string, SatisfactionSurveyAdminBundle['answers']>();
    for (const answer of bundle?.answers || []) grouped.set(answer.response_id, [...(grouped.get(answer.response_id) || []), answer]);
    return grouped;
  }, [bundle?.answers]);
  const ratingAnswers = (bundle?.answers || []).filter((answer) => answer.rating_value !== null);
  const average = ratingAnswers.length ? ratingAnswers.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / ratingAnswers.length : 0;
  const satisfactionRate = ratingAnswers.length ? (ratingAnswers.filter((answer) => (answer.rating_value || 0) >= 4).length / ratingAnswers.length) * 100 : 0;
  const structureLocked = Boolean(bundle?.responses.length);
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
  const filteredRatingAnswers = dashboardData.answers.filter((answer) => filteredResponseIds.has(answer.response_id) && answer.rating_value !== null);
  const dashboardAverage = filteredRatingAnswers.length
    ? filteredRatingAnswers.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / filteredRatingAnswers.length
    : 0;
  const dashboardSatisfactionRate = filteredRatingAnswers.length
    ? filteredRatingAnswers.filter((answer) => (answer.rating_value || 0) >= 4).length / filteredRatingAnswers.length * 100
    : 0;
  const scoreDistribution = Array.from({ length: 5 }, (_, index) => {
    const score = index + 1;
    return { name: `${score} คะแนน`, score, total: filteredRatingAnswers.filter((answer) => answer.rating_value === score).length };
  });
  const questionChartData = questions.filter((question) => question.question_type === 'rating_5').map((question) => {
    const values = filteredRatingAnswers.filter((answer) => answer.question_id === question.id);
    return {
      name: `ข้อ ${question.position}`,
      fullName: question.prompt,
      average: values.length ? Number((values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / values.length).toFixed(2)) : 0,
      total: values.length,
    };
  });
  const dimensionGroups = new Map<string, number[]>();
  for (const answer of filteredRatingAnswers) {
    const dimension = answer.dimension || 'ไม่ระบุมิติ';
    dimensionGroups.set(dimension, [...(dimensionGroups.get(dimension) || []), answer.rating_value || 0]);
  }
  const dimensionChartData = [...dimensionGroups.entries()].map(([name, values]) => ({
    name,
    average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
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
  const rankedQuestions = questionChartData.filter((item) => item.total > 0).sort((left, right) => right.average - left.average);
  const dashboardComments = dashboardData.answers
    .filter((answer) => filteredResponseIds.has(answer.response_id) && answer.question_type === 'open_text' && answer.text_value)
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .slice(-5)
    .reverse();

  const saveSettings = async () => {
    if (!bundle) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveSurveySettings(bundle.survey);
      setMessage('บันทึกการตั้งค่าแบบสำรวจเรียบร้อย');
      await load(bundle.survey.id);
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
      await saveSurveyQuestions(questions);
      await saveSurveyRatingOptions(options);
      setMessage('บันทึกคำถามและเกณฑ์คะแนนเรียบร้อย');
      await load(bundle.survey.id);
    } catch (error) {
      void reportClientError('Failed to save survey structure', error);
      setMessage(getSafeUserErrorMessage(error, 'บันทึกคำถามไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
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
            <h2 className="text-lg font-semibold text-slate-950">แบบสำรวจความพึงพอใจ SmartDSP</h2>
            <p className="mt-1 text-sm text-slate-600">กำหนดช่วงเวลา คำถาม เกณฑ์คะแนน และตรวจผลประเมินแต่ละรอบ</p>
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
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 md:col-span-2">ชื่อแบบสำรวจ<input value={bundle.survey.title} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, title: event.target.value } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">รายละเอียด<textarea rows={3} value={bundle.survey.description} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, description: event.target.value } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">คำชี้แจง<textarea rows={3} value={bundle.survey.instructions} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, instructions: event.target.value } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">สถานะ<select value={bundle.survey.status} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, status: event.target.value as SmartDspSurveyStatus } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="flex items-center gap-3 self-end rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={bundle.survey.is_enabled} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, is_enabled: event.target.checked } })} className="h-4 w-4" /> แสดงแบบสำรวจที่หน้า Portal</label>
            <label className="text-sm font-medium text-slate-700">เริ่มรับคำตอบ<input type="datetime-local" value={toLocalDateTime(bundle.survey.starts_at)} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, starts_at: toIso(event.target.value) } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">สิ้นสุดการรับคำตอบ<input type="datetime-local" value={toLocalDateTime(bundle.survey.ends_at)} onChange={(event) => setBundle({ ...bundle, survey: { ...bundle.survey, ends_at: toIso(event.target.value) } })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          </div>
          <p className="mt-4 text-xs text-slate-500">การแสดงหน้า Portal ต้องเลือกสถานะ “เปิดใช้งาน” และเปิดสวิตช์แสดงแบบสำรวจ โดยระบบอนุญาตเพียงหนึ่งรอบในเวลาเดียวกัน</p>
          <button type="button" onClick={() => void saveSettings()} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" /> บันทึกการตั้งค่า</button>
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
          <div className="space-y-3">
            {questions.map((question, index) => <div key={question.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-[64px_1fr_220px]"><div className="text-sm font-bold text-brand-700">ข้อ {question.position}</div><textarea disabled={structureLocked} rows={2} value={question.prompt} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" /><input disabled={structureLocked} value={question.dimension || ''} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dimension: event.target.value || null } : item))} placeholder="มิติที่วัด" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" /></div><div className="mt-3 flex flex-wrap gap-4 pl-0 text-xs text-slate-600 md:pl-16"><span>{question.question_type === 'rating_5' ? 'คะแนน 1–5' : 'ข้อเสนอแนะข้อความ'}</span><label className="flex items-center gap-2"><input type="checkbox" disabled={structureLocked} checked={question.is_required} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_required: event.target.checked } : item))} /> บังคับตอบ</label><label className="flex items-center gap-2"><input type="checkbox" disabled={structureLocked} checked={question.is_active} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_active: event.target.checked } : item))} /> เปิดใช้คำถาม</label></div></div>)}
          </div>
          {!structureLocked ? <button type="button" onClick={() => void saveStructure()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" /> บันทึกคำถามและคะแนน</button> : null}
        </div>
      ) : null}

      {view === 'results' ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ผู้ตอบทั้งหมด</p><p className="mt-1 text-2xl font-bold text-slate-950">{bundle.responses.length}</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">คะแนนเฉลี่ย</p><p className="mt-1 text-2xl font-bold text-brand-700">{average.toFixed(2)} / 5</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">พึงพอใจระดับ 4–5</p><p className="mt-1 text-2xl font-bold text-emerald-700">{satisfactionRate.toFixed(1)}%</p></div></div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">ข้อ</th><th className="px-4 py-3">มิติที่วัด</th><th className="px-4 py-3">คะแนนเฉลี่ย</th><th className="px-4 py-3">จำนวนคำตอบ</th></tr></thead><tbody className="divide-y divide-slate-100">{questions.filter((question) => question.question_type === 'rating_5').map((question) => { const values = bundle.answers.filter((answer) => answer.question_id === question.id && answer.rating_value !== null); const avg = values.length ? values.reduce((sum, answer) => sum + (answer.rating_value || 0), 0) / values.length : 0; return <tr key={question.id}><td className="px-4 py-3 font-semibold">{question.position}</td><td className="px-4 py-3">{question.dimension || question.prompt}</td><td className="px-4 py-3">{avg.toFixed(2)}</td><td className="px-4 py-3">{values.length}</td></tr>; })}</tbody></table></div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">คำตอบรายบุคคล</h3>
              {bundle.responses.length > 0 ? <span className="text-xs text-slate-500">รายการ {responsePage * RESPONSES_PER_PAGE + 1}–{Math.min((responsePage + 1) * RESPONSES_PER_PAGE, bundle.responses.length)} จาก {bundle.responses.length}</span> : null}
            </div>
            {bundle.responses.length === 0 ? <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">ยังไม่มีผู้ตอบแบบสำรวจ</div> : pagedResponses.map((response) => { const respondent = profileById.get(response.respondent_id); return <details key={response.id} className="rounded-md border border-slate-200 bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">{respondent?.full_name || 'ไม่พบชื่อผู้ตอบ'} · {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.submitted_at))}</summary><div className="border-t border-slate-100 px-4 py-3">{(answersByResponse.get(response.id) || []).map((answer) => <div key={answer.id} className="border-b border-slate-100 py-2 last:border-0"><p className="text-xs text-slate-500">ข้อ {answer.question_position}: {answer.question_prompt}</p><p className="mt-1 text-sm text-slate-800">{answer.rating_value !== null ? `${answer.rating_value} คะแนน` : answer.text_value}</p></div>)}</div></details>; })}
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
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ผู้ตอบในช่วงที่เลือก</p><p className="mt-1 text-2xl font-bold text-slate-950">{filteredDashboardResponses.length}</p></div>
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">คะแนนเฉลี่ยรวม</p><p className="mt-1 text-2xl font-bold text-blue-700">{dashboardAverage.toFixed(2)} / 5</p></div>
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ความพึงพอใจระดับ 4–5</p><p className="mt-1 text-2xl font-bold text-emerald-700">{dashboardSatisfactionRate.toFixed(1)}%</p></div>
            <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">ข้อที่มีคะแนน</p><p className="mt-1 text-2xl font-bold text-amber-700">{rankedQuestions.length} / {questionChartData.length}</p></div>
          </div>

          {filteredDashboardResponses.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">ยังไม่มีข้อมูลในรอบหรือช่วงวันที่ที่เลือก</div>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">คะแนนเฉลี่ยรายข้อ</h4>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={questionChartData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 5]} fontSize={12} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)} คะแนน`, 'คะแนนเฉลี่ย']} /><Bar dataKey="average" fill="#0369a1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">สัดส่วนคะแนน 1–5</h4>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={scoreDistribution} dataKey="total" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{scoreDistribution.map((entry, index) => <Cell key={entry.score} fill={SCORE_COLORS[index]} />)}</Pie><Tooltip formatter={(value) => [`${value} คำตอบ`, 'จำนวน']} /><Legend /></PieChart></ResponsiveContainer>
                  </div>
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">คะแนนตามมิติ KPI</h4>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={dimensionChartData} layout="vertical" margin={{ top: 4, right: 20, left: 38, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 5]} fontSize={12} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)} คะแนน`, 'คะแนนเฉลี่ย']} /><Bar dataKey="average" fill="#0d9488" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">แนวโน้มเปรียบเทียบแต่ละรอบ</h4>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis yAxisId="score" domain={[0, 5]} fontSize={12} /><YAxis yAxisId="people" orientation="right" allowDecimals={false} fontSize={12} /><Tooltip /><Legend /><Line yAxisId="score" type="monotone" dataKey="average" name="คะแนนเฉลี่ย" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} /><Line yAxisId="people" type="monotone" dataKey="respondents" name="จำนวนผู้ตอบ" stroke="#d97706" strokeWidth={2} /></LineChart></ResponsiveContainer>
                  </div>
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-md border border-emerald-200 bg-emerald-50/40 p-4"><h4 className="text-sm font-semibold text-emerald-900">จุดเด่น</h4><div className="mt-3 space-y-2">{rankedQuestions.slice(0, 3).map((item) => <div key={item.name} className="flex items-start justify-between gap-3 border-b border-emerald-100 pb-2 text-sm last:border-0"><span className="text-slate-700">{item.name}: {item.fullName}</span><strong className="shrink-0 text-emerald-800">{item.average.toFixed(2)}</strong></div>)}</div></section>
                <section className="rounded-md border border-amber-200 bg-amber-50/40 p-4"><h4 className="text-sm font-semibold text-amber-900">ประเด็นที่ควรปรับปรุง</h4><div className="mt-3 space-y-2">{rankedQuestions.slice(-3).reverse().map((item) => <div key={item.name} className="flex items-start justify-between gap-3 border-b border-amber-100 pb-2 text-sm last:border-0"><span className="text-slate-700">{item.name}: {item.fullName}</span><strong className="shrink-0 text-amber-800">{item.average.toFixed(2)}</strong></div>)}</div></section>
              </div>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">ข้อเสนอแนะล่าสุด</h4>
                <div className="mt-3 divide-y divide-slate-100">{dashboardComments.length > 0 ? dashboardComments.map((answer) => <div key={answer.id} className="py-3"><p className="text-xs font-semibold text-slate-500">ข้อ {answer.question_position}: {answer.question_prompt}</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{answer.text_value}</p></div>) : <p className="py-5 text-center text-sm text-slate-500">ยังไม่มีข้อเสนอแนะในช่วงที่เลือก</p>}</div>
              </section>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
