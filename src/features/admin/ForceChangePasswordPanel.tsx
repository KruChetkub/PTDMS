import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Search, ShieldAlert, ShieldOff } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  listForcePasswordChangeUsers,
  setForcePasswordChange,
  type ForcePasswordChangeUser,
} from '../../services/forcePasswordChange.service';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

type PendingAction =
  | { type: 'force-all' }
  | { type: 'force-selected'; userIds: string[] }
  | { type: 'cancel-selected'; userIds: string[] }
  | null;

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
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th-TH');
    if (!keyword) return manageableUsers;
    return manageableUsers.filter((user) => (
      user.full_name.toLocaleLowerCase('th-TH').includes(keyword)
      || (user.email ?? '').toLocaleLowerCase('th-TH').includes(keyword)
      || roleLabels[user.role].toLocaleLowerCase('th-TH').includes(keyword)
    ));
  }, [manageableUsers, search]);
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
  }, [search]);

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
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
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
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            บังคับผู้ใช้ทั้งหมด
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border-l-4 border-slate-300 px-4 py-2">
            <p className="text-xs text-slate-500">บัญชี Active ที่จัดการได้</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{manageableUsers.length.toLocaleString('th-TH')}</p>
          </div>
          <div className="border-l-4 border-amber-400 px-4 py-2">
            <p className="text-xs text-slate-500">รอเปลี่ยนรหัสผ่าน</p>
            <p className="mt-1 text-xl font-bold text-amber-700">{forcedCount.toLocaleString('th-TH')}</p>
          </div>
          <div className="border-l-4 border-emerald-500 px-4 py-2">
            <p className="text-xs text-slate-500">ใช้งานได้ตามปกติ</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{(manageableUsers.length - forcedCount).toLocaleString('th-TH')}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <label className="flex min-w-0 flex-1 items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldOff className="h-4 w-4" aria-hidden="true" />
            ยกเลิกที่เลือก ({selectedForcedCount})
          </button>
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
                  <td className="px-4 py-3 text-slate-600">{roleLabels[user.role]}</td>
                  <td className="px-4 py-3">
                    {user.force_password_change ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">รอเปลี่ยนรหัสผ่าน</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">ปกติ</span>
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
