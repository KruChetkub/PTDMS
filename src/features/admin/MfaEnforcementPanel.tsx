import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, Loader2, Search, ShieldCheck, ShieldOff, Users } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  listMfaEnforcementUsers,
  setMfaRequirement,
  type MfaEnforcementUser,
} from '../../services/mfaEnforcement.service';
import type { UserRole } from '../../types/roles';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const targetRoles: UserRole[] = ['admin', 'executive', 'hr', 'personnel'];

type PendingAction = {
  userIds: string[];
  required: boolean;
  title: string;
  message: string;
} | null;

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function MfaEnforcementPanel() {
  const [users, setUsers] = useState<MfaEnforcementUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'missing' | 'required' | UserRole>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listMfaEnforcementUsers());
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดสถานะ MFA ได้ กรุณาตรวจสอบว่าเข้าสู่ระบบด้วย MFA แล้ว'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const activeUsers = useMemo(() => users.filter((user) => user.status === 'active'), [users]);
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th-TH');
    return activeUsers.filter((user) => {
      const matchesSearch = !keyword
        || user.full_name?.toLocaleLowerCase('th-TH').includes(keyword)
        || user.email?.toLocaleLowerCase('th-TH').includes(keyword);
      const matchesFilter = filter === 'all'
        || (filter === 'enabled' && user.mfa_enabled)
        || (filter === 'missing' && !user.mfa_enabled)
        || (filter === 'required' && user.mfa_required)
        || user.role === filter;
      return matchesSearch && matchesFilter;
    });
  }, [activeUsers, filter, search]);

  const selectedUsers = activeUsers.filter((user) => selectedIds.includes(user.user_id));
  const visibleIds = filteredUsers.map((user) => user.user_id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const requestAction = (userIds: string[], required: boolean, label: string) => {
    if (userIds.length === 0) return;
    setPendingAction({
      userIds,
      required,
      title: required ? 'ยืนยันการบังคับใช้ MFA' : 'ยืนยันการยกเลิกข้อบังคับ MFA',
      message: required
        ? `ผู้ใช้ ${userIds.length.toLocaleString('th-TH')} รายการใน ${label} จะเข้าใช้ระบบอื่นไม่ได้จนกว่าจะตั้งค่า MFA สำเร็จ`
        : `ยกเลิกข้อบังคับ MFA สำหรับผู้ใช้ ${userIds.length.toLocaleString('th-TH')} รายการใน ${label}`,
    });
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await setMfaRequirement(pendingAction.userIds, pendingAction.required);
      setMessage(`อัปเดตข้อบังคับ MFA สำเร็จ ${updated.toLocaleString('th-TH')} บัญชี`);
      setSelectedIds([]);
      setPendingAction(null);
      await loadUsers();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถอัปเดตข้อบังคับ MFA ได้'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'บัญชีที่ตรวจ', value: activeUsers.length, tone: 'text-slate-900' },
          { label: 'เปิด MFA แล้ว', value: activeUsers.filter((u) => u.mfa_enabled).length, tone: 'text-emerald-700' },
          { label: 'ยังไม่เปิด MFA', value: activeUsers.filter((u) => !u.mfa_enabled).length, tone: 'text-red-700' },
          { label: 'ถูกบังคับใช้งาน', value: activeUsers.filter((u) => u.mfa_required).length, tone: 'text-amber-700' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.tone}`}>{stat.value.toLocaleString('th-TH')}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-slate-950">บังคับ MFA ตามกลุ่มสิทธิ์</h2>
              <p className="mt-1 text-sm text-slate-500">คำสั่งนี้ต้องใช้บัญชี Super Admin ที่ผ่าน MFA (`aal2`)</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {targetRoles.map((role) => {
              const roleUsers = activeUsers.filter((user) => user.role === role);
              const targets = roleUsers.filter((user) => !user.mfa_required);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={submitting || targets.length === 0}
                  onClick={() => requestAction(targets.map((user) => user.user_id), true, roleLabels[role])}
                  className="rounded-lg border border-slate-200 px-3 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">{roleLabels[role]}</span>
                  <span className="mt-1 block text-xs text-slate-500">บังคับเพิ่ม {targets.length} / ทั้งหมด {roleUsers.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมล" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="all">ทั้งหมด</option><option value="enabled">เปิด MFA แล้ว</option><option value="missing">ยังไม่เปิด MFA</option><option value="required">ถูกบังคับ</option>
              {targetRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </label>
          <button type="button" disabled={submitting || selectedUsers.every((u) => u.mfa_required)} onClick={() => requestAction(selectedUsers.filter((u) => !u.mfa_required).map((u) => u.user_id), true, 'รายการที่เลือก')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4" />บังคับที่เลือก</button>
          <button type="button" disabled={submitting || selectedUsers.every((u) => !u.mfa_required)} onClick={() => requestAction(selectedUsers.filter((u) => u.mfa_required).map((u) => u.user_id), false, 'รายการที่เลือก')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><ShieldOff className="h-4 w-4" />ยกเลิกที่เลือก</button>
        </div>

        {message ? <div className="border-b border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="w-12 px-4 py-3 text-center"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])} aria-label="เลือกทั้งหมด" /></th><th className="px-4 py-3">ผู้ใช้งาน</th><th className="px-4 py-3">สิทธิ์</th><th className="px-4 py-3">สถานะ MFA</th><th className="px-4 py-3">ข้อบังคับ</th><th className="px-4 py-3">วันที่บังคับ</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />กำลังโหลด...</td></tr>
                : filteredUsers.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Users className="mx-auto mb-2 h-5 w-5" />ไม่พบผู้ใช้งาน</td></tr>
                : filteredUsers.map((user) => <tr key={user.user_id} className="hover:bg-slate-50"><td className="px-4 py-3 text-center"><input type="checkbox" checked={selectedIds.includes(user.user_id)} onChange={() => setSelectedIds((current) => current.includes(user.user_id) ? current.filter((id) => id !== user.user_id) : [...current, user.user_id])} aria-label={`เลือก ${user.full_name}`} /></td><td className="px-4 py-3"><p className="font-semibold text-slate-900">{user.full_name || '-'}</p><p className="text-xs text-slate-500">{user.email || '-'}</p></td><td className="px-4 py-3">{roleLabels[user.role]}</td><td className="px-4 py-3">{user.mfa_enabled ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" />เปิดแล้ว</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="h-4 w-4" />ยังไม่เปิด</span>}</td><td className="px-4 py-3">{user.mfa_required ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">บังคับ</span> : <span className="text-slate-500">ไม่บังคับ</span>}</td><td className="px-4 py-3 text-slate-600">{formatDateTime(user.mfa_required_at)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal isOpen={pendingAction !== null} onClose={() => setPendingAction(null)} onConfirm={() => void executeAction()} title={pendingAction?.title ?? ''} message={pendingAction?.message ?? ''} confirmLabel="ยืนยัน" isLoading={submitting} variant="warning" />
    </div>
  );
}
