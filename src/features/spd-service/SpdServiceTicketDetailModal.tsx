import { RefreshCw, X } from 'lucide-react';
import type { SpdServiceTicketDetail } from '../../services/spd-service.service';
import type { SpdServiceTicketStatus } from '../../types/database.types';
import { cn } from '../../utils/cn';
import { formatSpdServiceTicketNo } from './spdServiceTicketNo';

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

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SpdServiceTicketDetailModal({ detail, isLoading, onClose }: {
  detail: SpdServiceTicketDetail | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (!detail && !isLoading) return null;
  const ticket = detail?.ticket || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="รายละเอียดคำขอ">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-md bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-teal-700">รายละเอียดคำขอ</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">{ticket ? formatSpdServiceTicketNo(ticket.ticket_no) : 'กำลังโหลดข้อมูล'}</h2>
            {ticket ? <p className="mt-1 truncate text-sm text-slate-500">{ticket.subject}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100" aria-label="ปิดรายละเอียด">
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
                  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTones[ticket.status])}>{statusLabels[ticket.status]}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{ticket.urgency}</span>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{ticket.category_name}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{ticket.subject}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{ticket.description}</p>
              </section>

              <section className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">ผลการดำเนินงาน</h3>
                <div className="mt-3 grid gap-3">
                  <div><p className="text-xs font-medium text-slate-500">สาเหตุของปัญหา</p><p className="mt-1 whitespace-pre-line text-sm text-slate-800">{ticket.problem_cause || '-'}</p></div>
                  <div><p className="text-xs font-medium text-slate-500">วิธีการแก้ไข</p><p className="mt-1 whitespace-pre-line text-sm text-slate-800">{ticket.resolution_method || '-'}</p></div>
                  <div><p className="text-xs font-medium text-slate-500">ผลลัพธ์</p><p className="mt-1 whitespace-pre-line text-sm text-slate-800">{ticket.resolution_result || '-'}</p></div>
                  <div><p className="text-xs font-medium text-slate-500">ระยะเวลา</p><p className="mt-1 text-sm font-semibold text-slate-800">{ticket.resolution_minutes === null ? '-' : `${ticket.resolution_minutes} นาที`}</p></div>
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
                        {item.from_status || item.to_status ? <p className="mt-2 text-xs text-slate-500">{item.from_status || '-'} → {item.to_status || '-'}</p> : null}
                      </div>
                    </div>
                  ))}
                  {detail?.timeline.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">ยังไม่มีประวัติการดำเนินงาน</div> : null}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">ผู้แจ้ง</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <div><dt className="text-xs font-medium text-slate-500">ชื่อ</dt><dd className="mt-1 font-semibold text-slate-900">{ticket.requester_name}</dd></div>
                  <div><dt className="text-xs font-medium text-slate-500">หน่วยงาน</dt><dd className="mt-1 text-slate-800">{ticket.requester_department || '-'}</dd></div>
                  <div><dt className="text-xs font-medium text-slate-500">เบอร์โทรศัพท์</dt><dd className="mt-1 font-semibold text-slate-900">{ticket.requester_phone}</dd></div>
                </dl>
              </section>
              <section className="rounded-md border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">เวลางาน</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <div><dt className="text-xs font-medium text-slate-500">สร้างคำขอ</dt><dd className="mt-1 text-slate-800">{formatDateTime(ticket.created_at)}</dd></div>
                  <div><dt className="text-xs font-medium text-slate-500">รับงาน</dt><dd className="mt-1 text-slate-800">{formatDateTime(ticket.assigned_at)}</dd></div>
                  <div><dt className="text-xs font-medium text-slate-500">เริ่มดำเนินการ</dt><dd className="mt-1 text-slate-800">{formatDateTime(ticket.started_at)}</dd></div>
                  <div><dt className="text-xs font-medium text-slate-500">ปิดงาน</dt><dd className="mt-1 text-slate-800">{formatDateTime(ticket.completed_at)}</dd></div>
                </dl>
              </section>
            </aside>
          </div>
        ) : <div className="p-8 text-center text-sm text-slate-500">ไม่พบข้อมูลคำขอ</div>}
      </div>
    </div>
  );
}
