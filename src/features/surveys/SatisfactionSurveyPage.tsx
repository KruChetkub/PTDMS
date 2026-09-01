import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Save, Send, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuthStore } from '../../stores/auth.store';
import { getSafeUserErrorMessage, reportClientError } from '../../utils/errorHandling';
import type { SmartDspSurveyAdditionalContextField, SmartDspSurveyCustomContextAnswer } from '../../types/database.types';
import type { SatisfactionSurveyBundle, SurveySubmissionAnswer } from './satisfactionSurvey.service';
import {
  acceptSatisfactionSurveyPdpa,
  completeSurveyRespondentContext,
  getSystemSurveyConfig,
  loadSatisfactionSurvey,
  SMARTDSP_SURVEY_PDPA_ACKNOWLEDGEMENT,
  SMARTDSP_SURVEY_PDPA_CONSENT,
  submitSatisfactionSurvey,
} from './satisfactionSurvey.service';
import { getSurveyOptionLabel, SURVEY_RESPONDENT_ROLE_OPTIONS, SURVEY_SERVICE_OPTIONS, SURVEY_USAGE_FREQUENCY_OPTIONS } from './satisfactionSurvey.constants';

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

function mergeSurveyDetails(description: string, instructions: string) {
  const details = description.trim();
  const guidance = instructions.trim();
  if (!guidance) return details;
  if (!details) return guidance;
  if (details.includes(guidance)) return details;
  return `${details}\n\n${guidance}`;
}

function hasCustomContextAnswer(field: SmartDspSurveyAdditionalContextField, answer: SmartDspSurveyCustomContextAnswer | undefined) {
  if (field.selection_type === 'rating_5') return typeof answer === 'number' && answer >= 1 && answer <= 5;
  if (field.selection_type === 'open_text') return typeof answer === 'string' && answer.trim().length > 0;
  return Array.isArray(answer) && answer.length > 0;
}

function formatCustomContextAnswer(field: SmartDspSurveyAdditionalContextField, answer: SmartDspSurveyCustomContextAnswer | undefined) {
  if (field.selection_type === 'rating_5') return typeof answer === 'number' ? `${answer} คะแนน` : 'ไม่มีข้อมูล';
  if (field.selection_type === 'open_text') return typeof answer === 'string' && answer.trim() ? answer : 'ไม่มีข้อมูล';
  return Array.isArray(answer) ? answer.map((value) => getSurveyOptionLabel(field.options, value)).join(', ') || 'ไม่มีข้อมูล' : 'ไม่มีข้อมูล';
}

export function SatisfactionSurveyPage() {
  const { surveyCode } = useParams<{ surveyCode?: string }>();
  const surveyConfig = getSystemSurveyConfig(surveyCode);
  const user = useAuthStore((state) => state.user);
  const [bundle, setBundle] = useState<SatisfactionSurveyBundle | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [respondentRole, setRespondentRole] = useState('');
  const [respondentRoleOther, setRespondentRoleOther] = useState('');
  const [usageFrequency, setUsageFrequency] = useState('');
  const [usedServices, setUsedServices] = useState<string[]>([]);
  const [usedServicesOther, setUsedServicesOther] = useState('');
  const [customContextAnswers, setCustomContextAnswers] = useState<Record<string, SmartDspSurveyCustomContextAnswer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acceptingPdpa, setAcceptingPdpa] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pdpaAcknowledged, setPdpaAcknowledged] = useState(false);
  const [pdpaConsented, setPdpaConsented] = useState(false);
  const [pdpaAccepted, setPdpaAccepted] = useState(false);
  const [pdpaConsentRecordId, setPdpaConsentRecordId] = useState<string | null>(null);
  const [pdpaError, setPdpaError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setBundle(await loadSatisfactionSurvey(user.id, surveyConfig.code));
    } catch (error) {
      void reportClientError('Failed to load satisfaction survey', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถโหลดแบบสำรวจได้ กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id, surveyConfig.code]);

  useEffect(() => {
    setPdpaAcknowledged(false);
    setPdpaConsented(false);
    setPdpaAccepted(Boolean(bundle?.ownResponse));
    setPdpaConsentRecordId(null);
    setPdpaError(null);
    setCustomContextAnswers({});
  }, [bundle?.survey.id, bundle?.ownResponse?.id]);

  const pdpaRequired = Boolean(bundle && !bundle.ownResponse && !pdpaAccepted);

  useEffect(() => {
    if (!pdpaRequired) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pdpaRequired]);

  const answerByQuestion = useMemo(
    () => new Map((bundle?.ownAnswers || []).map((answer) => [answer.question_id, answer])),
    [bundle?.ownAnswers],
  );
  const roleOptions = bundle?.contextSettings.role_options || SURVEY_RESPONDENT_ROLE_OPTIONS;
  const frequencyOptions = bundle?.contextSettings.frequency_options || SURVEY_USAGE_FREQUENCY_OPTIONS;
  const serviceOptions = bundle?.contextSettings.service_options || SURVEY_SERVICE_OPTIONS;

  const validateContext = () => {
    if (!respondentRole) {
      setMessage('กรุณาเลือกบทบาทของผู้ตอบแบบสำรวจ');
      return false;
    }
    if (respondentRole === 'other' && !respondentRoleOther.trim()) {
      setMessage('กรุณาระบุบทบาทอื่น ๆ');
      return false;
    }
    if (!usageFrequency) {
      setMessage('กรุณาเลือกความถี่ในการเข้าใช้งานระบบ');
      return false;
    }
    if (usedServices.length === 0) {
      setMessage('กรุณาเลือกส่วนงานหรือบริการที่เคยใช้งานอย่างน้อย 1 รายการ');
      return false;
    }
    if (usedServices.includes('other') && !usedServicesOther.trim()) {
      setMessage('กรุณาระบุส่วนงานหรือบริการอื่น ๆ');
      return false;
    }
    const missingCustomField = bundle?.contextSettings.additional_fields.find((field) => (
      field.is_active && field.is_required && !hasCustomContextAnswer(field, customContextAnswers[field.id])
    ));
    if (missingCustomField) {
      setMessage(`กรุณาตอบ “${missingCustomField.prompt}”`);
      return false;
    }
    setMessage(null);
    return true;
  };

  const buildContext = () => ({
    respondent_role: respondentRole,
    respondent_role_other: respondentRole === 'other' ? respondentRoleOther.trim() : undefined,
    usage_frequency: usageFrequency,
    used_services: usedServices,
    used_services_other: usedServices.includes('other') ? usedServicesOther.trim() : undefined,
    custom_answers: customContextAnswers,
  });

  const validate = () => {
    if (!bundle) return false;
    if (!pdpaAccepted || !pdpaAcknowledged || !pdpaConsented || !pdpaConsentRecordId) {
      setMessage('กรุณาอ่านและยืนยันคำชี้แจงการคุ้มครองข้อมูลส่วนบุคคลก่อนตอบแบบสำรวจ');
      return false;
    }
    if (!validateContext()) return false;
    const missing = bundle.questions.find((question) => {
      if (!question.is_required) return false;
      return question.question_type === 'rating_5'
        ? !ratings[question.id]
        : !texts[question.id]?.trim();
    });
    if (missing) {
      setMessage(`กรุณาตอบคำถามข้อ ${missing.position} ให้ครบถ้วน`);
      return false;
    }
    setMessage(null);
    return true;
  };

  const requestSubmit = () => {
    if (validate()) setConfirmOpen(true);
  };

  const handleAcceptPdpa = async () => {
    if (!bundle || !pdpaAcknowledged || !pdpaConsented) return;
    setAcceptingPdpa(true);
    setPdpaError(null);
    try {
      const consentRecordId = await acceptSatisfactionSurveyPdpa(bundle.survey.id, {
        acknowledged: pdpaAcknowledged,
        consented: pdpaConsented,
      });
      setPdpaConsentRecordId(consentRecordId);
      setPdpaAccepted(true);
    } catch (error) {
      void reportClientError('Failed to accept satisfaction survey PDPA notice', error);
      setPdpaError(getSafeUserErrorMessage(error, 'ไม่สามารถบันทึกการรับทราบและความยินยอมได้ กรุณาลองใหม่'));
    } finally {
      setAcceptingPdpa(false);
    }
  };

  const handleSubmit = async () => {
    if (!bundle || !pdpaConsentRecordId || !validate()) return;
    const answers = bundle.questions.reduce<SurveySubmissionAnswer[]>((result, question) => {
      if (question.question_type === 'rating_5') {
        if (ratings[question.id]) result.push({ question_id: question.id, rating_value: ratings[question.id] });
        return result;
      }
      const textValue = texts[question.id]?.trim();
      if (textValue) result.push({ question_id: question.id, text_value: textValue });
      return result;
    }, []);

    setSubmitting(true);
    try {
      await submitSatisfactionSurvey(bundle.survey.id, answers, buildContext(), pdpaConsentRecordId);
      setConfirmOpen(false);
      setMessage('ส่งแบบสำรวจเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นของท่าน');
      await reload();
    } catch (error) {
      void reportClientError('Failed to submit satisfaction survey', error);
      setConfirmOpen(false);
      if (error instanceof Error && error.message.includes('notice has changed')) {
        setPdpaAccepted(false);
        setPdpaConsentRecordId(null);
        setPdpaAcknowledged(false);
        setPdpaConsented(false);
        setPdpaError('คำชี้แจงมีการแก้ไขระหว่างที่ท่านตอบแบบสำรวจ กรุณาอ่านและยืนยันฉบับล่าสุดอีกครั้ง');
      }
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถส่งแบบสำรวจได้ กรุณาตรวจสอบคำตอบแล้วลองใหม่'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteContext = async () => {
    if (!bundle?.ownResponse || bundle.ownContext || !validateContext()) return;
    setSubmitting(true);
    try {
      await completeSurveyRespondentContext(bundle.ownResponse.id, buildContext());
      setMessage('บันทึกข้อมูลเกี่ยวกับการใช้งานระบบเรียบร้อย');
      await reload();
    } catch (error) {
      void reportClientError('Failed to complete survey respondent context', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถบันทึกข้อมูลการใช้งานระบบได้'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับหน้า Portal
        </Link>

        <header className="mt-5 border-b border-slate-200 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
              <ClipboardCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">{surveyConfig.title}</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">{surveyConfig.description} คำตอบของท่านจะนำไปใช้ประเมินผลและปรับปรุงระบบ</p>
            </div>
          </div>
        </header>

        {message ? (
          <div className={`mt-5 rounded-md border px-4 py-3 text-sm font-medium ${bundle?.ownResponse ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">กำลังโหลดแบบสำรวจ...</div>
        ) : !bundle ? (
          <div className="mt-6 rounded-md border border-slate-200 bg-white px-5 py-10 text-center text-slate-600">
            ขณะนี้ยังไม่มีแบบสำรวจที่เปิดให้ตอบ
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-brand-700">รอบที่ {bundle.survey.version}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{bundle.survey.title}</h2>
                </div>
                {bundle.ownResponse ? (
                  <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> ตอบแล้ว
                  </span>
                ) : null}
              </div>
              {bundle.ownResponse ? <p className="mt-4 text-xs text-slate-500">ส่งเมื่อ {formatThaiDate(bundle.ownResponse.submitted_at)} และไม่สามารถแก้ไขคำตอบได้</p> : null}
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">ข้อมูลเกี่ยวกับการใช้งานระบบ</h2>
              <p className="mt-1 text-sm text-slate-500">ใช้สำหรับจำแนกผลการประเมิน โดยไม่เปลี่ยนแปลงสิทธิ์การใช้งานของท่าน</p>

              {bundle.ownResponse && bundle.ownContext ? (
                <dl className="mt-5 grid gap-4 md:grid-cols-3">
                  <div><dt className="text-xs font-semibold text-slate-500">{bundle.contextSettings.role_prompt}</dt><dd className="mt-1 text-sm text-slate-800">{bundle.ownContext ? getSurveyOptionLabel(roleOptions, bundle.ownContext.respondent_role) : 'ไม่มีข้อมูล'}{bundle.ownContext?.respondent_role_other ? `: ${bundle.ownContext.respondent_role_other}` : ''}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">{bundle.contextSettings.frequency_prompt}</dt><dd className="mt-1 text-sm text-slate-800">{bundle.ownContext ? getSurveyOptionLabel(frequencyOptions, bundle.ownContext.usage_frequency) : 'ไม่มีข้อมูล'}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">{bundle.contextSettings.services_prompt}</dt><dd className="mt-1 text-sm leading-6 text-slate-800">{bundle.ownContext ? bundle.ownContext.used_services.map((service) => getSurveyOptionLabel(serviceOptions, service)).join(', ') : 'ไม่มีข้อมูล'}{bundle.ownContext?.used_services_other ? `: ${bundle.ownContext.used_services_other}` : ''}</dd></div>
                  {bundle.contextSettings.additional_fields.filter((field) => field.is_active).map((field) => (
                    <div key={field.id}>
                      <dt className="text-xs font-semibold text-slate-500">{field.prompt}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{formatCustomContextAnswer(field, bundle.ownContext?.custom_answers?.[field.id])}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="mt-5 space-y-6">
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-800">{bundle.contextSettings.role_prompt} <span className="text-red-600">*</span></legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {roleOptions.map((option) => <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${respondentRole === option.value ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}><input type="radio" name="respondent-role" checked={respondentRole === option.value} onChange={() => setRespondentRole(option.value)} className="h-4 w-4" />{option.label}</label>)}
                    </div>
                    {respondentRole === 'other' ? <input value={respondentRoleOther} onChange={(event) => setRespondentRoleOther(event.target.value)} maxLength={500} placeholder="โปรดระบุบทบาท" className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /> : null}
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-800">{bundle.contextSettings.frequency_prompt} <span className="text-red-600">*</span></legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {frequencyOptions.map((option) => <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${usageFrequency === option.value ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}><input type="radio" name="usage-frequency" checked={usageFrequency === option.value} onChange={() => setUsageFrequency(option.value)} className="h-4 w-4" />{option.label}</label>)}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-800">{bundle.contextSettings.services_prompt} <span className="text-red-600">*</span></legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {serviceOptions.map((option) => { const checked = usedServices.includes(option.value); return <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 hover:border-emerald-300'}`}><input type="checkbox" checked={checked} onChange={(event) => setUsedServices((current) => event.target.checked ? [...current, option.value] : current.filter((value) => value !== option.value))} className="h-4 w-4" />{option.label}</label>; })}
                    </div>
                    {usedServices.includes('other') ? <input value={usedServicesOther} onChange={(event) => setUsedServicesOther(event.target.value)} maxLength={500} placeholder="โปรดระบุส่วนงานหรือบริการ" className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /> : null}
                  </fieldset>

                  {bundle.contextSettings.additional_fields.filter((field) => field.is_active).map((field) => {
                    const currentAnswer = customContextAnswers[field.id];
                    return (
                      <fieldset key={field.id}>
                        <legend className="text-sm font-semibold text-slate-800">{field.prompt} {field.is_required ? <span className="text-red-600">*</span> : null}</legend>
                        {field.selection_type === 'rating_5' ? (
                          <div className="mt-3 grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" onClick={() => setCustomContextAnswers((current) => ({ ...current, [field.id]: score }))} className={`min-h-11 rounded-md border text-sm font-semibold ${currentAnswer === score ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'}`} aria-pressed={currentAnswer === score}>{score}</button>)}
                          </div>
                        ) : field.selection_type === 'open_text' ? (
                          <textarea value={typeof currentAnswer === 'string' ? currentAnswer : ''} onChange={(event) => setCustomContextAnswers((current) => ({ ...current, [field.id]: event.target.value }))} rows={4} maxLength={4000} placeholder="กรอกความคิดเห็นหรือข้อเสนอแนะ" className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                        ) : (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {field.options.map((option) => {
                              const selectedValues = Array.isArray(currentAnswer) ? currentAnswer : [];
                              const checked = selectedValues.includes(option.value);
                              return (
                                <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${checked ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-700 hover:border-violet-300'}`}>
                                  <input type={field.selection_type === 'single' ? 'radio' : 'checkbox'} name={`context-${field.id}`} checked={checked} onChange={(event) => setCustomContextAnswers((current) => ({ ...current, [field.id]: field.selection_type === 'single' ? [option.value] : event.target.checked ? [...selectedValues, option.value] : selectedValues.filter((value) => value !== option.value) }))} className="h-4 w-4" />
                                  {option.label}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">เกณฑ์การให้คะแนน</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                {bundle.ratingOptions.map((option) => (
                  <div key={option.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="font-semibold text-brand-700">{option.rating_value} - {option.label}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{option.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              {bundle.questions.map((question) => {
                const savedAnswer = answerByQuestion.get(question.id);
                return (
                  <div key={question.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">{question.position}</span>
                      <div className="min-w-0 flex-1">
                        {question.dimension ? <p className="text-xs font-semibold text-brand-700">{question.dimension}</p> : null}
                        <h3 className="mt-1 text-base font-semibold leading-6 text-slate-900">
                          {question.prompt} {question.is_required ? <span className="text-red-600">*</span> : null}
                        </h3>
                        {question.help_text ? <p className="mt-1 text-sm text-slate-500">{question.help_text}</p> : null}

                        {question.question_type === 'rating_5' ? (
                          <div className="mt-4 grid grid-cols-5 gap-2">
                            {bundle.ratingOptions.map((option) => {
                              const checked = bundle.ownResponse ? savedAnswer?.rating_value === option.rating_value : ratings[question.id] === option.rating_value;
                              return (
                                <label key={option.rating_value} className={`flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-md border px-2 py-2 text-center ${checked ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-300'} ${bundle.ownResponse ? 'cursor-default' : ''}`}>
                                  <input type="radio" className="sr-only" name={question.id} value={option.rating_value} checked={checked} disabled={Boolean(bundle.ownResponse)} onChange={() => setRatings((current) => ({ ...current, [question.id]: option.rating_value }))} />
                                  <span className="text-lg font-bold">{option.rating_value}</span>
                                  <span className="text-xs">{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : bundle.ownResponse ? (
                          <div className="mt-4 min-h-20 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            {savedAnswer?.text_value || 'ไม่ได้ระบุความคิดเห็น'}
                          </div>
                        ) : (
                          <textarea value={texts[question.id] || ''} onChange={(event) => setTexts((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={4000} rows={4} className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {!bundle.ownResponse ? (
              <button type="button" onClick={requestSubmit} disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Send className="h-4 w-4" aria-hidden="true" /> ส่งแบบสำรวจ
              </button>
            ) : !bundle.ownContext ? (
              <button type="button" onClick={() => void handleCompleteContext()} disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" aria-hidden="true" /> บันทึกข้อมูลการใช้งานระบบ
              </button>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => void handleSubmit()} title="ยืนยันการส่งแบบสำรวจ" message="เมื่อส่งแล้วจะไม่สามารถแก้ไขหรือตอบซ้ำในรอบนี้ได้" confirmLabel="ยืนยันการส่ง" variant="info" isLoading={submitting} />

      {pdpaRequired && bundle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="smartdsp-pdpa-title">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="smartdsp-pdpa-title" className="text-lg font-semibold text-slate-950">คำชี้แจงการคุ้มครองข้อมูลส่วนบุคคล</h2>
                <p className="mt-1 text-sm text-slate-600">โปรดอ่านรายละเอียดและยืนยันก่อนเริ่มตอบแบบสำรวจ รอบที่ {bundle.survey.version}</p>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4 sm:px-6">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">รายละเอียด</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{mergeSurveyDetails(bundle.survey.description, bundle.survey.instructions) || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
              </section>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 text-sm leading-6 ${pdpaAcknowledged ? 'border-brand-400 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}>
                  <input type="checkbox" checked={pdpaAcknowledged} onChange={(event) => setPdpaAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <span>{SMARTDSP_SURVEY_PDPA_ACKNOWLEDGEMENT}</span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 text-sm leading-6 ${pdpaConsented ? 'border-brand-400 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}>
                  <input type="checkbox" checked={pdpaConsented} onChange={(event) => setPdpaConsented(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <span>{SMARTDSP_SURVEY_PDPA_CONSENT}</span>
                </label>
                {pdpaError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pdpaError}</div> : null}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Link to="/portal" className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                กลับหน้า Portal
              </Link>
              <button
                type="button"
                disabled={!pdpaAcknowledged || !pdpaConsented || acceptingPdpa}
                onClick={() => void handleAcceptPdpa()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> {acceptingPdpa ? 'กำลังบันทึก...' : 'ตอบแบบสำรวจ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
