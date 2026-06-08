import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { createManagedUser, listAllUsers, updateUserDetails, updateUserRole, updateUserStatus, deleteUser } from '../../services/admin.service';
import type { Profile } from '../../types/database.types';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole, ProfileStatus } from '../../types/roles';
import { roleLabels } from '../../types/roles';

type CreateFormState = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

type EditFormState = {
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  work_group: string;
  gender: '' | 'male' | 'female';
  education: '' | 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก';
  birth_date_th: string;
  employment_type: '' | 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)';
};

const genderLabels = {
  male: 'ชาย',
  female: 'หญิง',
};

const educationOptions: EditFormState['education'][] = ['', 'ต่ำกว่าปริญญาตรี', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก'];
const employmentTypeOptions: EditFormState['employment_type'][] = ['', 'ข้าราชการ', 'พนักงานราชการ', 'พนักงานกระทรวงสาธารณสุข', 'ลูกจ้างชั่วคราว', 'จ้างเหมาบริการฯ (พขร.)'];
const createRoleOptions: UserRole[] = ['personnel', 'hr', 'executive', 'admin'];

function parseThaiDateToISO(value: string) {
  if (!value) return null;

  const cleaned = value.trim().replace(/\//g, '-');
  const parts = cleaned.split('-');

  if (parts.length !== 3) {
    throw new Error('วันเกิดต้องเป็นรูปแบบ วว/ดด/ปปปป (พ.ศ.)');
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const thaiYear = Number(parts[2]);

  if (!day || !month || !thaiYear || day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error('วันเกิดไม่ถูกต้อง');
  }

  const christianYear = thaiYear - 543;
  if (christianYear < 1900 || christianYear > 2100) {
    throw new Error('ปีเกิดไม่ถูกต้อง');
  }

  return `${String(christianYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatISOToThaiDate(isoDate: string | null) {
  if (!isoDate) return '';

  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';

  const year = Number(parts[0]) + 543;
  return `${parts[2]}/${parts[1]}/${String(year)}`;
}

function mapUserToForm(user: Profile): EditFormState {
  return {
    employee_code: user.employee_code || '',
    full_name: user.full_name || '',
    position: user.position || '',
    department: user.department || '',
    work_group: user.work_group || '',
    gender: user.gender || '',
    education: user.education || '',
    birth_date_th: formatISOToThaiDate(user.birth_date),
    employment_type: user.employment_type || '',
  };
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function getCreateUserErrorMessage(err: unknown) {
  const message = getErrorMessage(err, 'ไม่สามารถสร้างผู้ใช้งานได้');

  if (message === 'User already registered') {
    return 'มี email นี้อยู่ในระบบแล้ว';
  }

  return message;
}

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
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; form: CreateFormState; error: string | null }>({
    isOpen: false,
    form: {
      fullName: '',
      email: '',
      password: '',
      role: 'personnel',
    },
    error: null,
  });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; user: Profile | null; form: EditFormState }>({
    isOpen: false,
    user: null,
    form: {
      employee_code: '',
      full_name: '',
      position: '',
      department: '',
      work_group: '',
      gender: '',
      education: '',
      birth_date_th: '',
      employment_type: '',
    },
  });

  const currentUser = useAuthStore((state) => state.user);
  const currentProfile = useAuthStore((state) => state.profile);
  const currentRole = currentProfile?.role;
  const canManageRoleAndStatus = currentRole === 'super_admin' || currentRole === 'admin';
  const canCreateUsers = currentRole === 'super_admin' || currentRole === 'admin';
  const canManageUsers = currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'hr';

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listAllUsers();
      setUsers(data);
      setError(null);
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
    if (!currentUser || !canManageRoleAndStatus) return;
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      alert(getErrorMessage(err, 'ไม่สามารถเปลี่ยน Role ได้'));
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: ProfileStatus) => {
    if (!currentUser || !canManageRoleAndStatus) return;
    setUpdating(userId);
    try {
      await updateUserStatus(userId, newStatus);
      await loadUsers();
    } catch (err) {
      alert(getErrorMessage(err, 'ไม่สามารถเปลี่ยนสถานะได้'));
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
      alert(getErrorMessage(err, 'ไม่สามารถลบผู้ใช้งานได้'));
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenCreate = () => {
    setCreateModal({
      isOpen: true,
      form: {
        fullName: '',
        email: '',
        password: '',
        role: 'personnel',
      },
      error: null,
    });
  };

  const handleCreateField = (field: keyof CreateFormState, value: string) => {
    setCreateModal((prev) => ({
      ...prev,
      error: null,
      form: {
        ...prev.form,
        [field]: value,
      },
    }));
  };

  const handleCreateUser = async () => {
    if (!canCreateUsers) return;

    const fullName = createModal.form.fullName.trim();
    const email = createModal.form.email.trim();
    const password = createModal.form.password;

    if (fullName.length < 2) {
      setCreateModal((prev) => ({ ...prev, error: 'กรุณากรอกชื่อ-นามสกุล' }));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateModal((prev) => ({ ...prev, error: 'กรุณากรอกอีเมลให้ถูกต้อง' }));
      return;
    }

    if (password.length < 8) {
      setCreateModal((prev) => ({ ...prev, error: 'รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร' }));
      return;
    }

    setUpdating('create-user');
    try {
      await createManagedUser({
        fullName,
        email,
        password,
        role: createModal.form.role,
      });
      setCreateModal((prev) => ({ ...prev, isOpen: false, error: null }));
      await loadUsers();
    } catch (err) {
      setCreateModal((prev) => ({ ...prev, error: getCreateUserErrorMessage(err) }));
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenEdit = (user: Profile) => {
    setEditModal({
      isOpen: true,
      user,
      form: mapUserToForm(user),
    });
  };

  const handleEditField = (field: keyof EditFormState, value: string) => {
    setEditModal((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        [field]: value,
      },
    }));
  };

  const handleSaveEdit = async () => {
    if (!editModal.user) return;

    setUpdating(editModal.user.user_id);

    try {
      const birthDateIso = parseThaiDateToISO(editModal.form.birth_date_th);
      await updateUserDetails(editModal.user.user_id, {
        employee_code: editModal.form.employee_code || null,
        full_name: editModal.form.full_name || null,
        position: editModal.form.position || null,
        department: editModal.form.department || null,
        work_group: editModal.form.work_group || null,
        gender: editModal.form.gender || null,
        education: editModal.form.education || null,
        birth_date: birthDateIso,
        employment_type: editModal.form.employment_type || null,
      });

      setEditModal((prev) => ({ ...prev, isOpen: false }));
      await loadUsers();
    } catch (err) {
      alert(getErrorMessage(err, 'ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้'));
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (u.employee_code && u.employee_code.toLowerCase().includes(search.toLowerCase())),
      ),
    [users, search],
  );

  const isIncomplete = (u: Profile) => !u.position || !u.department || !u.gender || !u.birth_date || !u.employment_type;

  if (!canManageUsers) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="บริหารจัดการบัญชีผู้ใช้งาน กำหนดสิทธิ์ และอัปเดตรายละเอียดบุคลากร"
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:gap-4">
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">จำนวนผู้ใช้ทั้งหมด: {users.length} ท่าน</div>
          {canCreateUsers && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              เพิ่มผู้ใช้
            </button>
          )}
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
                          <div className="text-xs text-slate-500">{u.position || 'ยังไม่ระบุตำแหน่ง'} · {u.generation || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium bg-white focus:border-brand-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                        disabled={!canManageRoleAndStatus}
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
                        {canManageRoleAndStatus && (
                          <button
                            onClick={() => handleStatusChange(u.user_id, u.status === 'active' ? 'inactive' : 'active')}
                            className="text-[10px] text-brand-600 hover:underline font-bold"
                          >
                            {u.status === 'pending' ? 'Approve' : u.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        )}
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
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          แก้ไขข้อมูล
                        </button>
                        {currentRole === 'super_admin' && u.user_id !== currentUser?.id && (
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
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${deleteModal.fullName}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบผู้ใช้งาน"
        isLoading={updating === deleteModal.userId}
        variant="danger"
      />

      <ConfirmModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleCreateUser}
        title="เพิ่มผู้ใช้ใหม่"
        message={(
          <div className="mt-4 space-y-3 text-left">
            {createModal.error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{createModal.error}</div>
            ) : null}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ชื่อ-นามสกุล</span>
              <input
                type="text"
                autoComplete="name"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value={createModal.form.fullName}
                onChange={(e) => handleCreateField('fullName', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value={createModal.form.email}
                onChange={(e) => handleCreateField('email', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value={createModal.form.password}
                onChange={(e) => handleCreateField('password', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value={createModal.form.role}
                onChange={(e) => handleCreateField('role', e.target.value as UserRole)}
              >
                {createRoleOptions.map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        confirmLabel="สร้างผู้ใช้"
        cancelLabel="ยกเลิก"
        isLoading={updating === 'create-user'}
        variant="info"
      />

      <ConfirmModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleSaveEdit}
        title={`แก้ไขข้อมูลผู้ใช้: ${editModal.user?.full_name || ''}`}
        message={(
          <div className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="รหัสพนักงาน" value={editModal.form.employee_code} onChange={(e) => handleEditField('employee_code', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="ชื่อ-นามสกุล" value={editModal.form.full_name} onChange={(e) => handleEditField('full_name', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="ตำแหน่ง" value={editModal.form.position} onChange={(e) => handleEditField('position', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="หน่วยงาน" value={editModal.form.department} onChange={(e) => handleEditField('department', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="กลุ่มงาน" value={editModal.form.work_group} onChange={(e) => handleEditField('work_group', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={editModal.form.education} onChange={(e) => handleEditField('education', e.target.value)}>
              {educationOptions.map((option) => (
                <option key={option || 'empty'} value={option}>
                  {option || 'การศึกษา'}
                </option>
              ))}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={editModal.form.gender} onChange={(e) => handleEditField('gender', e.target.value)}>
              <option value="">เพศ</option>
              <option value="male">{genderLabels.male}</option>
              <option value="female">{genderLabels.female}</option>
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="วันเกิด (วว/ดด/ปปปป พ.ศ.)" value={editModal.form.birth_date_th} onChange={(e) => handleEditField('birth_date_th', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={editModal.form.employment_type} onChange={(e) => handleEditField('employment_type', e.target.value)}>
              {employmentTypeOptions.map((option) => (
                <option key={option || 'empty'} value={option}>
                  {option || 'รูปแบบการจ้าง'}
                </option>
              ))}
            </select>
          </div>
        )}
        confirmLabel="บันทึก"
        cancelLabel="ยกเลิก"
        isLoading={updating === editModal.user?.user_id}
        variant="info"
      />
    </div>
  );
}
