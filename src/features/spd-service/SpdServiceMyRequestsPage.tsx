import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, Plus, RefreshCw, Search, Star } from 'lucide-react';
import {
  createSpdServiceSatisfactionSurvey,
  getMySpdServiceSatisfactionSurveys,
  getMySpdServiceTickets,
  getSpdServiceTicketDetail,
  type SpdServiceTicketDetail,
} from '../../services/spd-service.service';
import { useAuthStore } from '../../stores/auth.store';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import type { SpdServiceSatisfactionSurvey, SpdServiceTicket, SpdServiceTicketStatus } from '../../types/database.types';
import { cn } from '../../utils/cn';

const statusLabels: Record<SpdServiceTicketStatus, string> = {
  NEW: 'งานใหม่',
  ASSIGNED: 'มอบหมายแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  WAITING: 'รอข้อมูล',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

const statusTones: Record<SpdServiceTicketStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700 ring-sky-100',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-amber-100',
  WAITING: 'bg-orange-50 text-orange-700 ring-orange-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const statusOptions: Array<'all' | SpdServiceTicketStatus> = ['all', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED'];

function formatDateTime(value: string | null) {
  if (!value) return '-';

  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function matchesKeyword(ticket: SpdServiceTicket, keyword: string) {
  if (!keyword) return true;

  return [ticket.ticket_no, ticket.subject, ticket.description, ticket.category_name, ticket.urgency, ticket.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(keyword);
}

function TicketDetailModal({
  detail,
  isLoading,
  onClose,
}: {
  detail: SpdServiceTicketDetail | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (!detail && !isLoading) return null;

  const ticket = detail?.ticket || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-md bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-teal-700">คำขอของฉัน</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">{ticket ? ticket.ticket_no : 'กำลังโหลดข้อมูล'}</h2>
            {ticket ? <p className="mt-1 truncate text-sm text-slate-500">{ticket.subject}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
            ปิด
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center text-sm font-medium text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            กำลังโหลดรายละเอียด
          </div>
        ) : ticket ? (
          <div className="space-y-5 p-5">
            <section className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTones[ticket.status])}>
                  {statusLabels[ticket.status]}
                </span>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{ticket.category_name}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{ticket.urgency}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{ticket.subject}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{ticket.description}</p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">เวลาสำคัญ</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">สร้างคำขอ</dt>
                    <dd className="text-right font-medium text-slate-800">{formatDateTime(ticket.created_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">รับคำขอ</dt>
                    <dd className="text-right font-medium text-slate-800">{formatDateTime(ticket.assigned_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">เริ่มดำเนินการ</dt>
                    <dd className="text-right font-medium text-slate-800">{formatDateTime(ticket.started_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">ปิดงาน</dt>
                    <dd className="text-right font-medium text-slate-800">{formatDateTime(ticket.completed_at)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">ผลการดำเนินงาน</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">สาเหตุ</dt>
                    <dd className="mt-1 whitespace-pre-line text-slate-800">{ticket.problem_cause || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">ผลลัพธ์</dt>
                    <dd className="mt-1 whitespace-pre-line text-slate-800">{ticket.resolution_result || '-'}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-4">
              <h3 className="text-base font-semibold text-slate-950">Timeline</h3>
              <div className="mt-4 space-y-4">
                {detail?.timeline.map((item) => (
                  <div key={item.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-teal-600 ring-4 ring-teal-50" />
                    <div className="rounded-md bg-slate-50 p-3 ring-1 ring-slate-200">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-950">{item.note || item.action}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                      </div>
                      {item.from_status || item.to_status ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {item.from_status || '-'} → {item.to_status || '-'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">ไม่พบข้อมูลคำขอ</div>
        )}
      </div>
    </div>
  );
}

type SatisfactionModalProps = {
  ticket: SpdServiceTicket | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    speedRating: number;
    qualityRating: number;
    courtesyRating: number;
    overallRating: number;
    comment: string | null;
  }) => void;
};

function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-md border transition',
              rating <= value ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-slate-200 bg-white text-slate-300 hover:bg-slate-50',
            )}
            aria-label={`${label} ${rating} ดาว`}
          >
            <Star className={cn('h-5 w-5', rating <= value && 'fill-current')} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SatisfactionModal({ ticket, isSubmitting, onClose, onSubmit }: SatisfactionModalProps) {
  const [speedRating, setSpeedRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [courtesyRating, setCourtesyRating] = useState(5);
  const [overallRating, setOverallRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setSpeedRating(5);
    setQualityRating(5);
    setCourtesyRating(5);
    setOverallRating(5);
    setComment('');
  }, [ticket?.id]);

  if (!ticket) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      speedRating,
      qualityRating,
      courtesyRating,
      overallRating,
      comment: comment.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-md bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-amber-700">{ticket.ticket_no}</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">ประเมินความพึงพอใจ</h2>
            <p className="mt-1 truncate text-sm text-slate-500">{ticket.subject}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
            ปิด
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <RatingInput label="ความรวดเร็ว" value={speedRating} onChange={setSpeedRating} />
            <RatingInput label="คุณภาพการให้บริการ" value={qualityRating} onChange={setQualityRating} />
            <RatingInput label="ความสุภาพ" value={courtesyRating} onChange={setCourtesyRating} />
            <RatingInput label="ความพึงพอใจโดยรวม" value={overallRating} onChange={setOverallRating} />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">ข้อเสนอแนะเพิ่มเติม</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              placeholder="ความคิดเห็นเพิ่มเติม"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Star className="h-4 w-4 fill-current" aria-hidden="true" />
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SpdServiceMyRequestsPage() {
  useAuditPageAccess({ module: 'spd_service', action: 'spd_service_access', route: '/spd-service/my-requests' });
  const { profile } = useAuthStore();
  const [tickets, setTickets] = useState<SpdServiceTicket[]>([]);
  const [surveys, setSurveys] = useState<SpdServiceSatisfactionSurvey[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SpdServiceTicketStatus>('all');
  const [ticketDetail, setTicketDetail] = useState<SpdServiceTicketDetail | null>(null);
  const [satisfactionTicket, setSatisfactionTicket] = useState<SpdServiceTicket | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSurveySubmitting, setIsSurveySubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    if (!profile?.user_id) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [ticketData, surveyData] = await Promise.all([
        getMySpdServiceTickets(profile.user_id),
        getMySpdServiceSatisfactionSurveys(profile.user_id),
      ]);
      setTickets(ticketData);
      setSurveys(surveyData);
    } catch (loadError) {
      console.error('Failed to load my DSP Service requests:', loadError);
      setError('ไม่สามารถโหลดคำขอของฉันได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [profile?.user_id]);

  const filteredTickets = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => matchesKeyword(ticket, keyword) && (statusFilter === 'all' || ticket.status === statusFilter));
  }, [searchTerm, statusFilter, tickets]);

  const surveysByTicketId = useMemo(() => {
    return new Map(surveys.map((survey) => [survey.ticket_id, survey]));
  }, [surveys]);

  const handleOpenDetail = async (ticketId: string) => {
    try {
      setIsDetailLoading(true);
      setTicketDetail(null);
      setError(null);
      const detail = await getSpdServiceTicketDetail(ticketId);
      setTicketDetail(detail);
    } catch (detailError) {
      console.error('Failed to load my DSP Service request detail:', detailError);
      setError('ไม่สามารถโหลดรายละเอียดคำขอได้');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSubmitSatisfaction = async (values: {
    speedRating: number;
    qualityRating: number;
    courtesyRating: number;
    overallRating: number;
    comment: string | null;
  }) => {
    if (!profile?.user_id || !satisfactionTicket) return;

    try {
      setIsSurveySubmitting(true);
      setError(null);
      const survey = await createSpdServiceSatisfactionSurvey({
        ticketId: satisfactionTicket.id,
        requesterId: profile.user_id,
        ...values,
      });
      setSurveys((current) => [survey, ...current]);
      setSatisfactionTicket(null);
    } catch (surveyError) {
      console.error('Failed to submit DSP Service satisfaction survey:', surveyError);
      setError('ไม่สามารถบันทึกคะแนนความพึงพอใจได้ หรืออาจเคยให้คะแนนรายการนี้แล้ว');
    } finally {
      setIsSurveySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link to="/portal" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับ Portal
            </Link>
            <h1 className="truncate text-2xl font-semibold text-slate-950">คำขอรับบริการ DSP Service ของฉัน</h1>
            <p className="mt-1 text-sm text-slate-500">ติดตามสถานะคำขอที่คุณแจ้งไว้</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/spd-service/request"
              className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              แจ้งคำขอใหม่
            </Link>
            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
              รีเฟรช
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_14rem]">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">ค้นหา</span>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="เลขคำขอ, หัวข้อ, รายละเอียด"
                  className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">สถานะ</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | SpdServiceTicketStatus)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'ทุกสถานะ' : statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            แสดง <span className="font-semibold text-slate-950">{filteredTickets.length.toLocaleString()}</span> จาก{' '}
            <span className="font-semibold text-slate-950">{tickets.length.toLocaleString()}</span> รายการ
          </p>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-2 pb-3">เลขคำขอ</th>
                  <th className="px-2 pb-3">หัวข้อ</th>
                  <th className="px-2 pb-3">ประเภท</th>
                  <th className="px-2 pb-3">ความเร่งด่วน</th>
                  <th className="px-2 pb-3">สถานะ</th>
                  <th className="px-2 pb-3">วันที่สร้าง</th>
                  <th className="px-2 pb-3">ความพึงพอใจ</th>
                  <th className="px-2 pb-3">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => {
                  const survey = surveysByTicketId.get(ticket.id);

                  return (
                    <tr key={ticket.id} className="transition hover:bg-slate-50">
                      <td className="px-2 py-3 font-mono text-xs font-semibold text-teal-700">{ticket.ticket_no}</td>
                      <td className="max-w-[280px] truncate px-2 py-3 font-semibold text-slate-900" title={ticket.subject}>
                        {ticket.subject}
                      </td>
                      <td className="px-2 py-3 text-slate-600">{ticket.category_name}</td>
                      <td className="px-2 py-3 font-semibold text-slate-700">{ticket.urgency}</td>
                      <td className="px-2 py-3">
                        <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTones[ticket.status])}>
                          {statusLabels[ticket.status]}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-500">{new Date(ticket.created_at).toLocaleDateString('th-TH')}</td>
                      <td className="px-2 py-3">
                        {survey ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            {survey.overall_rating}/5
                          </span>
                        ) : ticket.status === 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => setSatisfactionTicket(ticket)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          >
                            <Star className="h-3.5 w-3.5" aria-hidden="true" />
                            ให้คะแนน
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">รอปิดงาน</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(ticket.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          เปิดดู
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-12 text-center text-slate-400">
                      ยังไม่มีคำขอที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <TicketDetailModal
        detail={ticketDetail}
        isLoading={isDetailLoading}
        onClose={() => {
          setTicketDetail(null);
          setIsDetailLoading(false);
        }}
      />
      <SatisfactionModal
        ticket={satisfactionTicket}
        isSubmitting={isSurveySubmitting}
        onClose={() => setSatisfactionTicket(null)}
        onSubmit={(values) => void handleSubmitSatisfaction(values)}
      />
    </div>
  );
}
