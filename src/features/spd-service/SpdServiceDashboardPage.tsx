import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Headphones,
  ListFilter,
  PlusCircle,
  RefreshCw,
  Star,
  TicketCheck,
  TimerReset,
  Trash2,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  deleteSpdServiceTicket,
  getSpdServiceDashboardData,
  getSpdServiceTicketDetail,
  type SpdServiceTicketDetail,
  updateSpdServiceTicketWorkflow,
} from '../../services/spd-service.service';
import { useAuthStore } from '../../stores/auth.store';
import type { SpdServiceCategory, SpdServiceSatisfactionSurvey, SpdServiceTicket, SpdServiceTicketStatus } from '../../types/database.types';
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

const chartColors = ['#0f766e', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#475569'];
const openStatuses: SpdServiceTicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'];
const recentTicketsPageSize = 10;

function isToday(dateValue: string) {
  const date = new Date(dateValue);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function isOverSla(ticket: SpdServiceTicket) {
  if (!openStatuses.includes(ticket.status)) {
    return false;
  }

  const createdAt = new Date(ticket.created_at).getTime();
  const hoursOpen = (Date.now() - createdAt) / (1000 * 60 * 60);
  return hoursOpen > 48;
}

function averageOverallRating(surveys: SpdServiceSatisfactionSurvey[]) {
  if (surveys.length === 0) {
    return '0.0';
  }

  const total = surveys.reduce((sum, survey) => sum + survey.overall_rating, 0);
  return (total / surveys.length).toFixed(1);
}

function countByCategory(tickets: SpdServiceTicket[], categories: SpdServiceCategory[]) {
  const categoryNames = categories.map((category) => category.name);
  const names = [...new Set([...categoryNames, ...tickets.map((ticket) => ticket.category_name)])];

  return names.map((name) => ({
    name,
    value: tickets.filter((ticket) => ticket.category_name === name).length,
  }));
}

function countByMonth(tickets: SpdServiceTicket[]) {
  const formatter = new Intl.DateTimeFormat('th-TH', { month: 'short', year: '2-digit' });
  const buckets = new Map<string, number>();

  tickets.forEach((ticket) => {
    const label = formatter.format(new Date(ticket.created_at));
    buckets.set(label, (buckets.get(label) || 0) + 1);
  });

  return [...buckets.entries()].slice(0, 6).reverse().map(([name, value]) => ({ name, value }));
}

function DashboardStat({
  title,
  value,
  subtext,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: typeof Headphones;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        </div>
        <div className={cn('rounded-md p-2 ring-1', tone)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type TicketDetailModalProps = {
  detail: SpdServiceTicketDetail | null;
  isLoading: boolean;
  onClose: () => void;
};

function TicketDetailModal({ detail, isLoading, onClose }: TicketDetailModalProps) {
  if (!detail && !isLoading) {
    return null;
  }

  const ticket = detail?.ticket || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-md bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-teal-700">รายละเอียดคำขอ</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">
              {ticket ? ticket.ticket_no : 'กำลังโหลดข้อมูล'}
            </h2>
            {ticket ? <p className="mt-1 truncate text-sm text-slate-500">{ticket.subject}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center text-sm font-medium text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            กำลังโหลดรายละเอียดคำขอ
          </div>
        ) : ticket ? (
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-5">
              <section className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTones[ticket.status])}>
                    {statusLabels[ticket.status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{ticket.urgency}</span>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{ticket.category_name}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{ticket.subject}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{ticket.description}</p>
              </section>

              <section className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">ผลการดำเนินงาน</h3>
                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">สาเหตุของปัญหา</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{ticket.problem_cause || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">วิธีการแก้ไข</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{ticket.resolution_method || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">ผลลัพธ์</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{ticket.resolution_result || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">ระยะเวลา</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {ticket.resolution_minutes === null ? '-' : `${ticket.resolution_minutes} นาที`}
                    </p>
                  </div>
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
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="font-mono">{item.action}</span>
                          {item.from_status || item.to_status ? (
                            <span>
                              {item.from_status || '-'} → {item.to_status || '-'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {detail?.timeline.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                      ยังไม่มีประวัติการดำเนินงาน
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">ผู้แจ้ง</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">ชื่อ</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{ticket.requester_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">หน่วยงาน</dt>
                    <dd className="mt-1 text-slate-800">{ticket.requester_department || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">เบอร์โทรศัพท์</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{ticket.requester_phone}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">เวลางาน</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">สร้างคำขอ</dt>
                    <dd className="mt-1 text-slate-800">{formatDateTime(ticket.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">รับงาน</dt>
                    <dd className="mt-1 text-slate-800">{formatDateTime(ticket.assigned_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">เริ่มดำเนินการ</dt>
                    <dd className="mt-1 text-slate-800">{formatDateTime(ticket.started_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">ปิดงาน</dt>
                    <dd className="mt-1 text-slate-800">{formatDateTime(ticket.completed_at)}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">ไม่พบข้อมูลคำขอ</div>
        )}
      </div>
    </div>
  );
}

type CompleteTicketModalProps = {
  ticket: SpdServiceTicket | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    problemCause: string;
    resolutionMethod: string;
    resolutionResult: string;
    resolutionMinutes: number | null;
  }) => void;
};

type PendingTicketAction = {
  type: 'accept' | 'cancel' | 'delete';
  ticket: SpdServiceTicket;
} | null;

function CompleteTicketModal({ ticket, isSubmitting, onClose, onSubmit }: CompleteTicketModalProps) {
  const [problemCause, setProblemCause] = useState('');
  const [resolutionMethod, setResolutionMethod] = useState('');
  const [resolutionResult, setResolutionResult] = useState('');
  const [resolutionMinutes, setResolutionMinutes] = useState('');

  useEffect(() => {
    setProblemCause('');
    setResolutionMethod('');
    setResolutionResult('');
    setResolutionMinutes('');
  }, [ticket?.id]);

  if (!ticket) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      problemCause: problemCause.trim(),
      resolutionMethod: resolutionMethod.trim(),
      resolutionResult: resolutionResult.trim(),
      resolutionMinutes: resolutionMinutes.trim() ? Number(resolutionMinutes) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-md bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-teal-700">{ticket.ticket_no}</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">ปิดงาน</h2>
            <p className="mt-1 truncate text-sm text-slate-500">{ticket.subject}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">สาเหตุของปัญหา</span>
            <textarea
              value={problemCause}
              onChange={(event) => setProblemCause(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">วิธีการแก้ไข</span>
            <textarea
              value={resolutionMethod}
              onChange={(event) => setResolutionMethod(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ผลการดำเนินการ</span>
              <textarea
                value={resolutionResult}
                onChange={(event) => setResolutionResult(event.target.value)}
                className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ระยะเวลา (นาที)</span>
              <input
                type="number"
                min="0"
                value={resolutionMinutes}
                onChange={(event) => setResolutionMinutes(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="30"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TicketCheck className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'กำลังปิดงาน...' : 'ปิดงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SpdServiceDashboardPage() {
  const { profile } = useAuthStore();
  const [tickets, setTickets] = useState<SpdServiceTicket[]>([]);
  const [categories, setCategories] = useState<SpdServiceCategory[]>([]);
  const [surveys, setSurveys] = useState<SpdServiceSatisfactionSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);
  const [completeTicket, setCompleteTicket] = useState<SpdServiceTicket | null>(null);
  const [ticketDetail, setTicketDetail] = useState<SpdServiceTicketDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [recentTicketsPage, setRecentTicketsPage] = useState(1);
  const [pendingTicketAction, setPendingTicketAction] = useState<PendingTicketAction>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageWorkflow = profile?.role === 'super_admin' || profile?.role === 'admin';
  const canViewTelegramSettings = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'executive';
  const canDeleteTickets = profile?.role === 'super_admin';

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSpdServiceDashboardData();
      setTickets(data.tickets);
      setCategories(data.categories);
      setSurveys(data.surveys);
    } catch (loadError) {
      console.error('Failed to load SPD Service dashboard:', loadError);
      setError('ไม่สามารถโหลดข้อมูล SPD Service ได้ กรุณาตรวจสอบว่า migration ถูกใช้งานแล้ว');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const newToday = tickets.filter((ticket) => ticket.status === 'NEW' && isToday(ticket.created_at)).length;
    const inProgress = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
    const completed = tickets.filter((ticket) => ticket.status === 'COMPLETED').length;
    const pending = tickets.filter((ticket) => openStatuses.includes(ticket.status)).length;
    const overSla = tickets.filter(isOverSla).length;
    const categoryChartData = countByCategory(tickets, categories);
    const monthlyChartData = countByMonth(tickets);

    return { newToday, inProgress, completed, pending, overSla, categoryChartData, monthlyChartData };
  }, [categories, tickets]);

  const recentTicketTotalPages = Math.max(1, Math.ceil(tickets.length / recentTicketsPageSize));
  const normalizedRecentTicketsPage = Math.min(recentTicketsPage, recentTicketTotalPages);
  const recentTicketsStart = (normalizedRecentTicketsPage - 1) * recentTicketsPageSize;
  const recentTickets = tickets.slice(recentTicketsStart, recentTicketsStart + recentTicketsPageSize);

  useEffect(() => {
    setRecentTicketsPage((current) => Math.min(current, Math.max(1, Math.ceil(tickets.length / recentTicketsPageSize))));
  }, [tickets.length]);

  const applyTicketUpdate = (updatedTicket: SpdServiceTicket) => {
    setTickets((current) => current.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket)));
  };

  const handleWorkflowAction = async (
    ticket: SpdServiceTicket,
    nextStatus: SpdServiceTicketStatus,
    action: string,
    note: string,
    updates: Parameters<typeof updateSpdServiceTicketWorkflow>[0]['updates'] = {},
  ) => {
    if (!profile?.user_id) {
      setError('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    try {
      setActionTicketId(ticket.id);
      setError(null);
      const updatedTicket = await updateSpdServiceTicketWorkflow({
        ticket,
        actorId: profile.user_id,
        nextStatus,
        action,
        note,
        updates,
      });
      applyTicketUpdate(updatedTicket);
    } catch (workflowError) {
      console.error('Failed to update SPD Service workflow:', workflowError);
      setError('ไม่สามารถอัปเดตสถานะงานได้');
    } finally {
      setActionTicketId(null);
    }
  };

  const handleAcceptTicket = (ticket: SpdServiceTicket) =>
    handleWorkflowAction(ticket, 'ASSIGNED', 'ACCEPT_JOB', 'เจ้าหน้าที่รับงาน', {
      assigned_to: profile?.user_id || null,
      assigned_at: new Date().toISOString(),
    });

  const handleStartTicket = (ticket: SpdServiceTicket) =>
    handleWorkflowAction(ticket, 'IN_PROGRESS', 'START_JOB', 'เริ่มดำเนินการ', {
      started_at: ticket.started_at || new Date().toISOString(),
    });

  const handleWaitingTicket = (ticket: SpdServiceTicket) =>
    handleWorkflowAction(ticket, 'WAITING', 'WAITING_FOR_INFO', 'รอข้อมูลเพิ่มเติม');

  const handleCancelTicket = (ticket: SpdServiceTicket) =>
    handleWorkflowAction(ticket, 'CANCELLED', 'CANCEL_TICKET', 'ยกเลิกคำขอ', {
      cancelled_at: new Date().toISOString(),
    });

  const handleCompleteTicket = async (values: {
    problemCause: string;
    resolutionMethod: string;
    resolutionResult: string;
    resolutionMinutes: number | null;
  }) => {
    if (!completeTicket) {
      return;
    }

    await handleWorkflowAction(completeTicket, 'COMPLETED', 'COMPLETE_JOB', 'ปิดงานและบันทึกผลการดำเนินงาน', {
      completed_at: new Date().toISOString(),
      problem_cause: values.problemCause,
      resolution_method: values.resolutionMethod,
      resolution_result: values.resolutionResult,
      resolution_minutes: values.resolutionMinutes,
    });
    setCompleteTicket(null);
  };

  const handleOpenTicketDetail = async (ticketId: string) => {
    try {
      setIsDetailLoading(true);
      setTicketDetail(null);
      setError(null);
      const detail = await getSpdServiceTicketDetail(ticketId);
      setTicketDetail(detail);
    } catch (detailError) {
      console.error('Failed to load SPD Service ticket detail:', detailError);
      setError('ไม่สามารถโหลดรายละเอียดคำขอได้');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDeleteTicket = async (ticket: SpdServiceTicket) => {
    if (!canDeleteTickets) {
      return;
    }

    try {
      setActionTicketId(ticket.id);
      setError(null);
      await deleteSpdServiceTicket(ticket.id);
      setTickets((current) => current.filter((item) => item.id !== ticket.id));
      setSurveys((current) => current.filter((survey) => survey.ticket_id !== ticket.id));
    } catch (deleteError) {
      console.error('Failed to delete SPD Service ticket:', deleteError);
      setError('ไม่สามารถลบคำขอได้ กรุณาตรวจสอบสิทธิ์ Super Admin และ policy ฐานข้อมูล');
    } finally {
      setActionTicketId(null);
    }
  };

  const handleConfirmPendingTicketAction = async () => {
    if (!pendingTicketAction) {
      return;
    }

    const { type, ticket } = pendingTicketAction;

    if (type === 'accept') {
      await handleAcceptTicket(ticket);
    }

    if (type === 'cancel') {
      await handleCancelTicket(ticket);
    }

    if (type === 'delete') {
      await handleDeleteTicket(ticket);
    }

    setPendingTicketAction(null);
  };

  const pendingActionTicketNo = pendingTicketAction?.ticket.ticket_no || '';
  const pendingActionSubject = pendingTicketAction?.ticket.subject || '';
  const pendingActionTitle =
    pendingTicketAction?.type === 'accept'
      ? 'ยืนยันการรับงาน'
      : pendingTicketAction?.type === 'cancel'
        ? 'ยืนยันการยกเลิกคำขอ'
        : 'ยืนยันการลบคำขอ';
  const pendingActionConfirmLabel =
    pendingTicketAction?.type === 'accept'
      ? 'รับงาน'
      : pendingTicketAction?.type === 'cancel'
        ? 'ยกเลิกคำขอ'
        : 'ลบคำขอ';
  const pendingActionVariant = pendingTicketAction?.type === 'accept' ? 'info' : 'danger';
  const pendingActionMessage =
    pendingTicketAction?.type === 'accept'
      ? `ต้องการรับงานคำขอเลขที่ ${pendingActionTicketNo} หัวข้อ "${pendingActionSubject}" ใช่หรือไม่?`
      : pendingTicketAction?.type === 'cancel'
        ? `ต้องการยกเลิกคำขอเลขที่ ${pendingActionTicketNo} หัวข้อ "${pendingActionSubject}" ใช่หรือไม่?`
        : `ต้องการลบคำขอเลขที่ ${pendingActionTicketNo} หัวข้อ "${pendingActionSubject}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`;

  const renderWorkflowActions = (ticket: SpdServiceTicket) => {
    if (!canManageWorkflow || ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
      return <span className="text-xs text-slate-400">-</span>;
    }

    const isBusy = actionTicketId === ticket.id;
    const buttonClass =
      'inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

    return (
      <div className="flex flex-wrap gap-1.5">
        {ticket.status === 'NEW' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setPendingTicketAction({ type: 'accept', ticket })}
            className={`${buttonClass} border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`}
          >
            รับงาน
          </button>
        ) : null}
        {ticket.status === 'ASSIGNED' || ticket.status === 'WAITING' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleStartTicket(ticket)}
            className={`${buttonClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
          >
            เริ่มงาน
          </button>
        ) : null}
        {ticket.status === 'IN_PROGRESS' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleWaitingTicket(ticket)}
            className={`${buttonClass} border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100`}
          >
            รอข้อมูล
          </button>
        ) : null}
        {ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING' || ticket.status === 'ASSIGNED' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setCompleteTicket(ticket)}
            className={`${buttonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          >
            ปิดงาน
          </button>
        ) : null}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setPendingTicketAction({ type: 'cancel', ticket })}
          className={`${buttonClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
        >
          ยกเลิก
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link to="/portal" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับ Portal
            </Link>
            <h1 className="truncate text-2xl font-semibold text-slate-950">SPD Service Management System</h1>
            <p className="mt-1 text-sm text-slate-500">แดชบอร์ดคำขอรับบริการด้านสารสนเทศ</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canViewTelegramSettings ? (
              <Link
                to="/spd-service/settings/telegram"
                className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-100"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                ตั้งค่า Telegram
              </Link>
            ) : null}
            <Link
              to="/spd-service/request"
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              แจ้งคำขอรับบริการ
            </Link>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
              รีเฟรช
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            SPD Service
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <DashboardStat title="งานใหม่วันนี้" value={isLoading ? '...' : stats.newToday} subtext="คำขอสถานะ NEW" icon={Headphones} tone="bg-sky-50 text-sky-700 ring-sky-100" />
          <DashboardStat title="กำลังดำเนินการ" value={isLoading ? '...' : stats.inProgress} subtext="สถานะ IN_PROGRESS" icon={Clock} tone="bg-amber-50 text-amber-700 ring-amber-100" />
          <DashboardStat title="เสร็จสิ้น" value={isLoading ? '...' : stats.completed} subtext="งานที่ปิดแล้ว" icon={TicketCheck} tone="bg-emerald-50 text-emerald-700 ring-emerald-100" />
          <DashboardStat title="งานค้าง" value={isLoading ? '...' : stats.pending} subtext="NEW/ASSIGNED/WAITING" icon={TimerReset} tone="bg-orange-50 text-orange-700 ring-orange-100" />
          <DashboardStat title="คะแนนเฉลี่ย" value={isLoading ? '...' : averageOverallRating(surveys)} subtext="ความพึงพอใจรวม" icon={Star} tone="bg-yellow-50 text-yellow-700 ring-yellow-100" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-950">งานตามประเภทบริการ</h2>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryChartData} margin={{ top: 28, right: 18, left: 4, bottom: 54 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={[0, 'dataMax + 2']} />
                  <Tooltip />
                  <Bar dataKey="value" name="จำนวนคำขอ" radius={[4, 4, 0, 0]} barSize={36}>
                    <LabelList dataKey="value" position="top" className="fill-slate-700 text-xs font-semibold" />
                    {stats.categoryChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-700" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-950">รายเดือน</h2>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyChartData} margin={{ top: 28, right: 18, left: 4, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={[0, 'dataMax + 2']} />
                  <Tooltip />
                  <Bar dataKey="value" name="จำนวนคำขอ" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={42}>
                    <LabelList dataKey="value" position="top" className="fill-slate-700 text-xs font-semibold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">คำขอรับบริการ</h2>
              <p className="mt-1 text-sm text-slate-500"></p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-red-700">เกิน SLA: {stats.overSla} รายการ</p>
              <Link
                to="/spd-service/tickets"
                className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <ListFilter className="h-4 w-4" aria-hidden="true" />
                รายการทั้งหมด
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-2 pb-3">เลขคำขอ</th>
                  <th className="px-2 pb-3">หัวข้อ</th>
                  <th className="px-2 pb-3">ประเภท</th>
                  <th className="px-2 pb-3">ผู้แจ้ง</th>
                  <th className="px-2 pb-3">ความเร่งด่วน</th>
                  <th className="px-2 pb-3">สถานะ</th>
                  <th className="px-2 pb-3">วันที่สร้าง</th>
                  <th className="px-2 pb-3">รายละเอียด</th>
                  <th className="px-2 pb-3">Workflow</th>
                  {canDeleteTickets ? <th className="px-2 pb-3">ลบ</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="transition hover:bg-slate-50">
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => void handleOpenTicketDetail(ticket.id)}
                        className="font-mono text-xs font-semibold text-teal-700 transition hover:text-teal-900 hover:underline"
                      >
                        {ticket.ticket_no}
                      </button>
                    </td>
                    <td className="max-w-[260px] truncate px-2 py-3 font-semibold text-slate-900">{ticket.subject}</td>
                    <td className="px-2 py-3 text-slate-600">{ticket.category_name}</td>
                    <td className="px-2 py-3 text-slate-600">{ticket.requester_name}</td>
                    <td className="px-2 py-3 font-semibold text-slate-700">{ticket.urgency}</td>
                    <td className="px-2 py-3">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTones[ticket.status])}>
                        {statusLabels[ticket.status]}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-slate-500">{new Date(ticket.created_at).toLocaleDateString('th-TH')}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => void handleOpenTicketDetail(ticket.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        เปิดดู
                      </button>
                    </td>
                    <td className="px-2 py-3">{renderWorkflowActions(ticket)}</td>
                    {canDeleteTickets ? (
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          disabled={actionTicketId === ticket.id}
                          onClick={() => setPendingTicketAction({ type: 'delete', ticket })}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ลบ
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={canDeleteTickets ? 10 : 9} className="px-2 py-10 text-center text-slate-400">
                      ยังไม่มีข้อมูลคำขอในระบบ SPD Service
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              แสดง {tickets.length === 0 ? 0 : recentTicketsStart + 1}-{Math.min(recentTicketsStart + recentTickets.length, tickets.length)} จาก {tickets.length} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecentTicketsPage((current) => Math.max(1, current - 1))}
                disabled={normalizedRecentTicketsPage <= 1}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                ก่อนหน้า
              </button>
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                หน้า {normalizedRecentTicketsPage} / {recentTicketTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setRecentTicketsPage((current) => Math.min(recentTicketTotalPages, current + 1))}
                disabled={normalizedRecentTicketsPage >= recentTicketTotalPages}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <CompleteTicketModal
        ticket={completeTicket}
        isSubmitting={Boolean(actionTicketId)}
        onClose={() => setCompleteTicket(null)}
        onSubmit={(values) => void handleCompleteTicket(values)}
      />
      <TicketDetailModal
        detail={ticketDetail}
        isLoading={isDetailLoading}
        onClose={() => {
          setTicketDetail(null);
          setIsDetailLoading(false);
        }}
      />
      <ConfirmModal
        isOpen={Boolean(pendingTicketAction)}
        onClose={() => setPendingTicketAction(null)}
        onConfirm={() => void handleConfirmPendingTicketAction()}
        title={pendingActionTitle}
        message={pendingActionMessage}
        confirmLabel={pendingActionConfirmLabel}
        cancelLabel="ยกเลิก"
        isLoading={Boolean(pendingTicketAction && actionTicketId === pendingTicketAction.ticket.id)}
        variant={pendingActionVariant}
      />
    </div>
  );
}
