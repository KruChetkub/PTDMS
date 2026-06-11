import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, Filter, RefreshCw, Search, X } from 'lucide-react';
import { getSpdServiceTickets } from '../../services/spd-service.service';
import type { SpdServiceTicket, SpdServiceTicketStatus, SpdServiceUrgency } from '../../types/database.types';
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
const urgencyOptions: Array<'all' | SpdServiceUrgency> = ['all', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function uniqueOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
}

function matchesKeyword(ticket: SpdServiceTicket, keyword: string) {
  if (!keyword) {
    return true;
  }

  return [
    ticket.ticket_no,
    ticket.subject,
    ticket.description,
    ticket.requester_name,
    ticket.requester_department,
    ticket.requester_phone,
    ticket.category_name,
    ticket.urgency,
    ticket.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(keyword);
}

export function SpdServiceTicketListPage() {
  const [tickets, setTickets] = useState<SpdServiceTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SpdServiceTicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | SpdServiceUrgency>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSpdServiceTickets();
      setTickets(data);
    } catch (loadError) {
      console.error('Failed to load SPD Service tickets:', loadError);
      setError('ไม่สามารถโหลดรายการคำขอได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const categoryOptions = useMemo(() => uniqueOptions(tickets.map((ticket) => ticket.category_name)), [tickets]);

  const filteredTickets = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return tickets.filter(
      (ticket) =>
        matchesKeyword(ticket, keyword) &&
        (statusFilter === 'all' || ticket.status === statusFilter) &&
        (categoryFilter === 'all' || ticket.category_name === categoryFilter) &&
        (urgencyFilter === 'all' || ticket.urgency === urgencyFilter),
    );
  }, [categoryFilter, searchTerm, statusFilter, tickets, urgencyFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setUrgencyFilter('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link to="/spd-service" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับ Dashboard
            </Link>
            <h1 className="truncate text-2xl font-semibold text-slate-950">รายการคำขอทั้งหมด</h1>
            <p className="mt-1 text-sm text-slate-500">ค้นหาและกรองสถานะคำขอรับบริการ SPD Service</p>
          </div>
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
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_14rem_10rem_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">ค้นหา</span>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="เลขคำขอ, หัวข้อ, ผู้แจ้ง, เบอร์โทร"
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

            <label className="block">
              <span className="text-xs font-medium text-slate-600">ประเภทบริการ</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="all">ทุกประเภท</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">ความเร่งด่วน</span>
              <select
                value={urgencyFilter}
                onChange={(event) => setUrgencyFilter(event.target.value as 'all' | SpdServiceUrgency)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {urgencyOptions.map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {urgency === 'all' ? 'ทุกระดับ' : urgency}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              ล้าง
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            แสดง <span className="font-semibold text-slate-950">{filteredTickets.length.toLocaleString()}</span> จาก{' '}
            <span className="font-semibold text-slate-950">{tickets.length.toLocaleString()}</span> รายการ
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-2 pb-3">เลขคำขอ</th>
                  <th className="px-2 pb-3">หัวข้อ</th>
                  <th className="px-2 pb-3">ประเภท</th>
                  <th className="px-2 pb-3">ผู้แจ้ง</th>
                  <th className="px-2 pb-3">โทรศัพท์</th>
                  <th className="px-2 pb-3">ความเร่งด่วน</th>
                  <th className="px-2 pb-3">สถานะ</th>
                  <th className="px-2 pb-3">วันที่สร้าง</th>
                  <th className="px-2 pb-3">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="transition hover:bg-slate-50">
                    <td className="px-2 py-3 font-mono text-xs font-semibold text-teal-700">{ticket.ticket_no}</td>
                    <td className="max-w-[280px] truncate px-2 py-3 font-semibold text-slate-900" title={ticket.subject}>
                      {ticket.subject}
                    </td>
                    <td className="px-2 py-3 text-slate-600">{ticket.category_name}</td>
                    <td className="px-2 py-3 text-slate-600">{ticket.requester_name}</td>
                    <td className="px-2 py-3 font-medium text-slate-700">{ticket.requester_phone}</td>
                    <td className="px-2 py-3 font-semibold text-slate-700">{ticket.urgency}</td>
                    <td className="px-2 py-3">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTones[ticket.status])}>
                        {statusLabels[ticket.status]}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-slate-500">{new Date(ticket.created_at).toLocaleDateString('th-TH')}</td>
                    <td className="px-2 py-3">
                      <Link
                        to="/spd-service"
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Dashboard
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-12 text-center text-slate-400">
                      ไม่พบคำขอที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
