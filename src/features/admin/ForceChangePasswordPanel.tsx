import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  KeyRound,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Users,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  listForcePasswordChangeUsers,
  setForcePasswordChange,
  type ForcePasswordChangeUser,
} from '../../services/forcePasswordChange.service';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

type PendingAction =
  | { type: 'force-all' }
  | { type: 'force-selected'; userIds: string[] }
  | { type: 'cancel-selected'; userIds: string[] }
  | null;

const TARGET_ROLES: UserRole[] = ['admin', 'executive', 'hr', 'personnel'];
const usersPerPage = 10;

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ForceChangePasswordPanel() {
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const [users, setUsers] = useState<ForcePasswordChangeUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'pending' | UserRole>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listForcePasswordChangeUsers());
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดสถานะการบังคับเปลี่ยนรหัสผ่านได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const manageableUsers = useMemo(
    () => users.filter((user) => user.user_id !== currentUserId && user.status === 'active'),
    [currentUserId, users],
  );

  const roleBreakdown = useMemo(() => {
    return TARGET_ROLES.map((role) => {
      const roleUsers = manageableUsers.filter((u) => u.role === role);
      const pendingUsers = roleUsers.filter((u) => u.force_password_change);
      return {
        role,
        label: roleLabels[role] || role,
        total: roleUsers.length,
        pendingCount: pendingUsers.length,
        completedCount: roleUsers.length - pendingUsers.length,
      };
    });
  }, [manageableUsers]);

  const pendingRoles = useMemo(() => {
    return roleBreakdown.filter((item) => item.pendingCount > 0);
  }, [roleBreakdown]);

  const filteredUsers = useMemo(() => {
    let result = manageableUsers;
    if (roleFilter === 'pending') {
      result = result.filter((u) => u.force_password_change);
    } else if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    const keyword = search.trim().toLocaleLowerCase('th-TH');
    if (!keyword) return result;
    return result.filter((user) => (
      user.full_name.toLocaleLowerCase('th-TH').includes(keyword)
      || (user.email ?? '').toLocaleLowerCase('th-TH').includes(keyword)
      || roleLabels[user.role].toLocaleLowerCase('th-TH').includes(keyword)
    ));
  }, [manageableUsers, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * usersPerPage;
  const visibleUsers = filteredUsers.slice(pageStart, pageStart + usersPerPage);
  const pageStartItem = filteredUsers.length === 0 ? 0 : pageStart + 1;
  const pageEndItem = Math.min(pageStart + visibleUsers.length, filteredUsers.length);
  const selectedUsers = manageableUsers.filter((user) => selectedIds.includes(user.user_id));
  const selectedForcedCount = selectedUsers.filter((user) => user.force_password_change).length;
  const selectedUnforcedCount = selectedUsers.length - selectedForcedCount;
  const forcedCount = manageableUsers.filter((user) => user.force_password_change).length;
  const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((user) => selectedIds.includes(user.user_id));

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleVisibleUsers = () => {
    const visibleIds = visibleUsers.map((user) => user.user_id);
    setSelectedIds((current) => (
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    ));
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const forceChange = pendingAction.type !== 'cancel-selected';
      const targetIds = pendingAction.type === 'force-all' ? null : pendingAction.userIds;
      const affectedCount = await setForcePasswordChange(targetIds, forceChange);
      setMessage(
        forceChange
          ? `กำหนดให้เปลี่ยนรหัสผ่านแล้ว ${affectedCount.toLocaleString('th-TH')} บัญชี`
          : `ยกเลิกการบังคับเปลี่ยนรหัสผ่านแล้ว ${affectedCount.toLocaleString('th-TH')} บัญชี`,
      );
      setSelectedIds([]);
      setPendingAction(null);
      await loadUsers();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถเปลี่ยนสถานะการบังคับเปลี่ยนรหัสผ่านได้'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmation = pendingAction?.type === 'force-all'
    ? {
        title: 'บังคับเปลี่ยนรหัสผ่านทุกบัญชี',
        message: `ผู้ใช้งานที่มีสถานะ Active ทุกคนจำนวน ${manageableUsers.length.toLocaleString('th-TH')} บัญชี (ยกเว้นบัญชีของคุณ) จะต้อง Reset Password ก่อนเข้าใช้งานระบบ`,
        label: 'บังคับทุกบัญชี',
        variant: 'danger' as const,
      }
    : pendingAction?.type === 'force-selected'
      ? {
          title: 'บังคับเปลี่ยนรหัสผ่านบัญชีที่เลือก',
          message: `ผู้ใช้ที่เลือก ${pendingAction.userIds.length.toLocaleString('th-TH')} บัญชีจะต้อง Reset Password ก่อนเข้าใช้งานระบบ`,
          label: 'ยืนยันการบังคับ',
          variant: 'warning' as const,
        }
      : {
          title: 'ยกเลิกการบังคับเปลี่ยนรหัสผ่าน',
          message: `ยกเลิกสถานะบังคับเปลี่ยนรหัสผ่านของผู้ใช้ที่เลือก ${pendingAction?.userIds.length ?? 0} บัญชี`,
          label: 'ยืนยันการยกเลิก',
          variant: 'info' as const,
        };

  return (
    <div className="space-y-5">
      {/* Header & Main Stats */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-950">Force Change Password</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              กำหนดให้ผู้ใช้ Reset Password ผ่านอีเมลก่อนเข้าใช้งานครั้งถัดไป ระบบไม่จัดเก็บรหัสผ่านของผู้ใช้ในฐานข้อมูล SmartDSP
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPendingAction({ type: 'force-all' })}
            disabled={loading || submitting || manageableUsers.length === 0}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            บังคับผู้ใช้ทั้งหมด
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">บัญชี Active ที่จัดการได้</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{manageableUsers.length.toLocaleString('th-TH')} <span className="text-sm font-normal text-slate-500">ท่าน</span></p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-xs font-medium text-amber-700">รอเปลี่ยนรหัสผ่าน</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">{forcedCount.toLocaleString('th-TH')} <span className="text-sm font-normal text-amber-600">ท่าน</span></p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-xs font-medium text-emerald-700">ใช้งานได้ตามปกติ</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{(manageableUsers.length - forcedCount).toLocaleString('th-TH')} <span className="text-sm font-normal text-emerald-600">ท่าน</span></p>
          </div>
        </div>
      </section>

      {/* Pending Roles Summary Alert */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {pendingRoles.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50/90 to-orange-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  สิทธิ์ที่ยังมีผู้ใช้ยังไม่ได้เปลี่ยนรหัสผ่าน ({pendingRoles.length} สิทธิ์):
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pendingRoles.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setRoleFilter(item.role)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50"
                    >
                      <span>{item.label}:</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                        {item.pendingCount.toLocaleString('th-TH')} ท่าน
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRoleFilter('pending')}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-200/80"
            >
              <Filter className="h-3.5 w-3.5" />
              ดูเฉพาะผู้ใช้ที่รอเปลี่ยนรหัส
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                ผู้ใช้งานทุกสิทธิ์ได้ทำการเปลี่ยนรหัสผ่านเรียบร้อยแล้ว
              </h3>
              <p className="text-xs text-emerald-700">
                ไม่มีผู้ใช้งานในสิทธิ์ Admin, Executive, HR, หรือ Personnel ที่ค้างสถานะรอเปลี่ยนรหัสผ่าน
              </p>
            </div>
          </div>
        )}

        {/* Role Breakdown Cards (Admin, Executive, HR, Personnel) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              สถิติจำนวนผู้ใช้และสถานะรหัสผ่านแยกตามสิทธิ์
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roleBreakdown.map((item) => {
              const isSelected = roleFilter === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setRoleFilter(isSelected ? 'all' : item.role)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/30 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-900">
                        {item.total.toLocaleString('th-TH')}{' '}
                        <span className="text-xs font-normal text-slate-500">ท่าน</span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.pendingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.pendingCount > 0 ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-2.5">
                    {item.pendingCount > 0 ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-700">รอเปลี่ยนรหัส:</span>
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                          {item.pendingCount.toLocaleString('th-TH')} ท่าน
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-emerald-700">เปลี่ยนครบแล้ว</span>
                        <span className="font-semibold text-emerald-800">{item.total}/{item.total} ท่าน</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Table Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">ตัวกรองสิทธิ์:</span>
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                roleFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({manageableUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('pending')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                roleFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              รอเปลี่ยนรหัส ({forcedCount})
            </button>
            {roleBreakdown.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => setRoleFilter(item.role)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  roleFilter === item.role
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label} ({item.total})
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex min-w-0 flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อ อีเมล หรือสิทธิ์"
                className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setPendingAction({
                type: 'force-selected',
                userIds: selectedUsers.filter((user) => !user.force_password_change).map((user) => user.user_id),
              })}
              disabled={submitting || selectedUnforcedCount === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              บังคับที่เลือก ({selectedUnforcedCount})
            </button>
            <button
              type="button"
              onClick={() => setPendingAction({
                type: 'cancel-selected',
                userIds: selectedUsers.filter((user) => user.force_password_change).map((user) => user.user_id),
              })}
              disabled={submitting || selectedForcedCount === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
              ยกเลิกที่เลือก ({selectedForcedCount})
            </button>
          </div>
        </div>

        {message ? <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleUsers} aria-label="เลือกผู้ใช้ที่แสดงทั้งหมด" />
                </th>
                <th className="px-4 py-3">ผู้ใช้งาน</th>
                <th className="px-4 py-3">สิทธิ์</th>
                <th className="px-4 py-3">สถานะ Force Change</th>
                <th className="px-4 py-3">วันที่กำหนด</th>
                <th className="px-4 py-3">เปลี่ยนรหัสผ่านล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />กำลังโหลดข้อมูล...</td></tr>
              ) : visibleUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">ไม่พบผู้ใช้งาน</td></tr>
              ) : visibleUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.user_id)}
                      onChange={() => setSelectedIds((current) => (
                        current.includes(user.user_id)
                          ? current.filter((id) => id !== user.user_id)
                          : [...current, user.user_id]
                      ))}
                      aria-label={`เลือก ${user.full_name || user.email || 'ผู้ใช้งาน'}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{user.full_name || '-'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{user.email || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.force_password_change ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> รอเปลี่ยนรหัสผ่าน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> ปกติ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(user.force_password_change_requested_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(user.password_changed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            แสดงรายการที่ <span className="font-semibold text-slate-900">{pageStartItem.toLocaleString('th-TH')}</span> -{' '}
            <span className="font-semibold text-slate-900">{pageEndItem.toLocaleString('th-TH')}</span> จาก{' '}
            <span className="font-semibold text-slate-900">{filteredUsers.length.toLocaleString('th-TH')}</span> รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
              className="rounded-md border border-slate-200 px-3 py-1.5 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="rounded-md bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
              หน้า {currentPage.toLocaleString('th-TH')} / {totalPages.toLocaleString('th-TH')}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-slate-200 px-3 py-1.5 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void executeAction()}
        title={confirmation.title}
        message={confirmation.message}
        confirmLabel={confirmation.label}
        isLoading={submitting}
        variant={confirmation.variant}
      />
    </div>
  );
}
