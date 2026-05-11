import { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  UserCheck, 
  UserX, 
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { listAllUsers, updateUserRole, updateUserStatus, deleteUser } from '../../services/admin.service';
import type { Profile } from '../../types/database.types';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole, ProfileStatus } from '../../types/roles';
import { roleLabels } from '../../types/roles';

export function UserManagementPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; fullName: string }>({
    isOpen: false,
    userId: '',
    fullName: '',
  });

  const currentUser = useAuthStore((state) => state.user);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!currentUser) return;
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยน Role ได้');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: ProfileStatus) => {
    if (!currentUser) return;
    setUpdating(userId);
    try {
      await updateUserStatus(userId, newStatus);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะได้');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteClick = (userId: string, fullName: string) => {
    if (userId === currentUser?.id) {
      alert('คุณไม่สามารถลบบัญชีของตัวเองได้');
      return;
    }
    setDeleteModal({ isOpen: true, userId, fullName });
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !deleteModal.userId) return;

    setUpdating(deleteModal.userId);
    try {
      await deleteUser(deleteModal.userId);
      setDeleteModal({ isOpen: false, userId: '', fullName: '' });
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบผู้ใช้งานได้');
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.employee_code && u.employee_code.toLowerCase().includes(search.toLowerCase()))
  );

  const isIncomplete = (u: Profile) => !u.position || !u.department;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="บริหารจัดการบัญชีผู้ใช้งาน กำหนดสิทธิ์ และตรวจสอบความสมบูรณ์ของข้อมูลบุคลากร"
      />

      {/* Search & Filters */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
            className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden text-xs text-slate-500 lg:block">
          จำนวนผู้ใช้ทั้งหมด: {users.length} ท่าน
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">ผู้ใช้งาน / ข้อมูลโปรไฟล์</th>
                <th className="px-6 py-4">Role / สิทธิ์</th>
                <th className="px-6 py-4">สถานะบัญชี</th>
                <th className="px-6 py-4">ความสมบูรณ์</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้งานที่ต้องการ</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.user_id} className={`hover:bg-slate-50/50 transition ${updating === u.user_id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.full_name}</div>
                          <div className="text-xs text-slate-500">{u.position || 'ยังไม่ระบุตำแหน่ง'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium bg-white focus:border-brand-500 outline-none"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                      >
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.status === 'active' ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <UserCheck className="h-3 w-3" /> Active
                          </span>
                        ) : u.status === 'pending' ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <UserX className="h-3 w-3" /> Inactive
                          </span>
                        )}
                        <button 
                          onClick={() => handleStatusChange(u.user_id, u.status === 'active' ? 'inactive' : 'active')}
                          className="text-[10px] text-brand-600 hover:underline font-bold"
                        >
                          {u.status === 'pending' ? 'Approve' : u.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isIncomplete(u) ? (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">โปรไฟล์ไม่สมบูรณ์</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">ข้อมูลครบถ้วน</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {useAuthStore.getState().profile?.role === 'super_admin' && u.user_id !== currentUser?.id && (
                          <button 
                            onClick={() => handleDeleteClick(u.user_id, u.full_name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition"
                            title="ลบผู้ใช้งาน"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <button className="p-1.5 text-slate-400 hover:text-slate-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${deleteModal.fullName}"? การกระทำนี้ไม่สามารถย้อนกลับได้ และข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบออกจากระบบ`}
        confirmLabel="ลบผู้ใช้งาน"
        isLoading={updating === deleteModal.userId}
        variant="danger"
      />
    </div>
  );
}
