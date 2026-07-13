import { useEffect, useRef, useState } from 'react';
import { Activity, CalendarCheck, List, RefreshCw, Search, UserCheck, UserCircle, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { listPersonnel, type PersonnelSummary } from '../../services/personnel.service';
import { roleLabels } from '../../types/roles';
import { formatThaiDate } from '../../utils/thaiDate';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

function statusStyle(status: PersonnelSummary['status']) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-red-50 text-red-700 ring-red-200';
}

export function PersonnelListPage() {
  const location = useLocation();
  const personnelListState = location.state?.personnelList as { focusUserId?: string; search?: string } | undefined;
  const restoredFocusRef = useRef(false);
  const [personnel, setPersonnel] = useState<PersonnelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(personnelListState?.search || '');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPersonnel();
      setPersonnel(data);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลรายชื่อบุคลากรได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (loading || restoredFocusRef.current || !personnelListState?.focusUserId) return;

    const targetId = window.matchMedia('(min-width: 1024px)').matches
      ? `personnel-row-${personnelListState.focusUserId}`
      : `personnel-card-${personnelListState.focusUserId}`;
    const target = document.getElementById(targetId);
    if (!target) return;

    restoredFocusRef.current = true;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center' });
    });
  }, [loading, personnelListState?.focusUserId]);

  const filtered = personnel.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(s) ||
      p.employee_code?.toLowerCase().includes(s) ||
      p.department?.toLowerCase().includes(s) ||
      p.work_group?.toLowerCase().includes(s) ||
      p.position?.toLowerCase().includes(s) ||
      roleLabels[p.role].toLowerCase().includes(s) ||
      p.status.toLowerCase().includes(s)
    );
  });

  const totalTrainingCount = personnel.reduce((sum, person) => sum + person.training_count, 0);
  const currentYearTrainingCount = personnel.reduce((sum, person) => sum + person.current_year_training_count, 0);
  const activePersonnelCount = personnel.filter((person) => person.status === 'active').length;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Personnel List"
          description="รายชื่อบุคลากรทั้งหมดในระบบ พร้อมสถิติการอบรมเบื้องต้น"
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

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">บุคลากรทั้งหมด</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : personnel.length.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-brand-50 p-3 text-brand-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">บัญชี Active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : activePersonnelCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-700">
              <UserCheck className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">การอบรมทั้งหมด</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : totalTrainingCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-3 text-slate-700">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">ปีงบประมาณนี้</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : currentYearTrainingCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-700">
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex max-w-md items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            placeholder="ค้นหาชื่อ / รหัส / หน่วยงาน / กลุ่มงาน"
          />
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="lg:hidden">
        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-md border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-100"></div>
                    <div className="h-3 w-1/2 rounded bg-slate-100"></div>
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              ไม่พบข้อมูลบุคลากรตามที่ค้นหา
            </div>
          ) : (
            filtered.map((person) => (
              <Link
                key={person.user_id}
                id={`personnel-card-${person.user_id}`}
                to={`/personnel/${person.user_id}`}
                state={{ personnelList: { focusUserId: person.user_id, search } }}
                className="group block rounded-md border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <UserCircle className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-brand-600">{person.full_name}</h3>
                      <p className="text-xs text-slate-500">{person.employee_code || ''}</p>
                    </div>
                  </div>
                  <div className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase ring-1 ${statusStyle(person.status)}`}>
                    {person.status}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2">
                  <div>
                    <p className="font-medium uppercase tracking-wider text-slate-400">หน่วยงาน</p>
                    <p className="truncate text-slate-700">{person.department || '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium uppercase tracking-wider text-slate-400">กลุ่มงาน</p>
                    <p className="truncate text-slate-700">{person.work_group || '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium uppercase tracking-wider text-slate-400">สิทธิ์การใช้งาน</p>
                    <p className="text-slate-700">{roleLabels[person.role]}</p>
                  </div>
                  <div>
                    <p className="font-medium uppercase tracking-wider text-slate-400">หลักสูตรเด่น</p>
                    <p className="truncate text-slate-700">{person.top_category || '-'}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-brand-600">{person.training_count.toLocaleString()}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">ทั้งหมด</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-emerald-600">{person.current_year_training_count.toLocaleString()}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">ปีนี้</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="truncate text-sm font-bold text-slate-700">{formatThaiDate(person.last_training_date)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">ล่าสุด</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="truncate text-xs text-slate-500">{person.position || 'ไม่ระบุตำแหน่ง'}</span>
                  <span className="shrink-0 text-xs font-medium text-brand-600">ดูรายละเอียด</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <section className="hidden rounded-md border border-slate-200 bg-white shadow-sm lg:block">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
          <List className="h-4 w-4" aria-hidden="true" />
          <span> รายการ</span>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 rounded bg-slate-100"></div>
                    <div className="h-3 w-2/5 rounded bg-slate-100"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">ไม่พบข้อมูลบุคลากรตามที่ค้นหา</div>
        ) : (
          <div>
            <div className="grid grid-cols-[64px_minmax(260px,1.5fr)_minmax(180px,1fr)_minmax(150px,0.8fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>ลำดับที่</span>
              <span>บุคลากร</span>
              <span>หน่วยงาน / กลุ่มงาน</span>
              <span>ตำแหน่ง / สิทธิ์</span>
              <span>อบรมทั้งหมด</span>
              <span>สถานะ</span>
            </div>
            <div className="divide-y divide-slate-100">
            {filtered.map((person, index) => (
              <Link
                key={person.user_id}
                id={`personnel-row-${person.user_id}`}
                to={`/personnel/${person.user_id}`}
                state={{ personnelList: { focusUserId: person.user_id, search } }}
                className="grid grid-cols-[64px_minmax(260px,1.5fr)_minmax(180px,1fr)_minmax(150px,0.8fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)] items-center gap-4 px-4 py-4 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
              >
                <div className="text-sm font-semibold text-slate-500">
                  {(index + 1).toLocaleString('th-TH')}
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <UserCircle className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{person.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{person.employee_code || 'ไม่มีรหัสบุคลากร'}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{person.department || '-'}</p>
                  <p className="truncate text-xs text-slate-500">{person.work_group || '-'}</p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{person.position || 'ไม่ระบุตำแหน่ง'}</p>
                  <p className="truncate text-xs text-slate-500">{roleLabels[person.role]}</p>
                </div>

                <div className="text-sm text-slate-700">
                  <span className="font-semibold text-brand-600">{person.training_count.toLocaleString()}</span>
                  <span className="ml-1 text-xs text-slate-500">ครั้ง</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className={`rounded px-2 py-1 text-[10px] font-bold uppercase ring-1 ${statusStyle(person.status)}`}>
                    {person.status}
                  </div>
                  <span className="text-xs font-medium text-brand-600">รายละเอียด</span>
                </div>
              </Link>
            ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

