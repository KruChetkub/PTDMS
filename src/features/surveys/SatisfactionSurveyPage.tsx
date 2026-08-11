import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuthStore } from '../../stores/auth.store';
import { getSafeUserErrorMessage, reportClientError } from '../../utils/errorHandling';
import type { SatisfactionSurveyBundle, SurveySubmissionAnswer } from './satisfactionSurvey.service';
import { loadSatisfactionSurvey, submitSatisfactionSurvey } from './satisfactionSurvey.service';

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

export function SatisfactionSurveyPage() {
  const user = useAuthStore((state) => state.user);
  const [bundle, setBundle] = useState<SatisfactionSurveyBundle | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setBundle(await loadSatisfactionSurvey(user.id));
    } catch (error) {
      void reportClientError('Failed to load satisfaction survey', error);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถโหลดแบบสำรวจได้ กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  const answerByQuestion = useMemo(
    () => new Map((bundle?.ownAnswers || []).map((answer) => [answer.question_id, answer])),
    [bundle?.ownAnswers],
  );

  const validate = () => {
    if (!bundle) return false;
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

  const handleSubmit = async () => {
    if (!bundle || !validate()) return;
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
      await submitSatisfactionSurvey(bundle.survey.id, answers);
      setConfirmOpen(false);
      setMessage('ส่งแบบสำรวจเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นของท่าน');
      await reload();
    } catch (error) {
      void reportClientError('Failed to submit satisfaction survey', error);
      setConfirmOpen(false);
      setMessage(getSafeUserErrorMessage(error, 'ไม่สามารถส่งแบบสำรวจได้ กรุณาตรวจสอบคำตอบแล้วลองใหม่'));
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
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">แบบสำรวจความพึงพอใจระบบ SmartDSP</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">คำตอบของท่านจะนำไปใช้ประเมินผลและปรับปรุงระบบ</p>
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
              {bundle.survey.description ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{bundle.survey.description}</p> : null}
              {bundle.survey.instructions ? <p className="mt-3 whitespace-pre-line border-l-4 border-brand-200 pl-3 text-sm leading-6 text-slate-700">{bundle.survey.instructions}</p> : null}
              {bundle.ownResponse ? <p className="mt-4 text-xs text-slate-500">ส่งเมื่อ {formatThaiDate(bundle.ownResponse.submitted_at)} และไม่สามารถแก้ไขคำตอบได้</p> : null}
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
            ) : null}
          </div>
        )}
      </div>

      <ConfirmModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => void handleSubmit()} title="ยืนยันการส่งแบบสำรวจ" message="เมื่อส่งแล้วจะไม่สามารถแก้ไขหรือตอบซ้ำในรอบนี้ได้" confirmLabel="ยืนยันการส่ง" variant="info" isLoading={submitting} />
    </main>
  );
}
