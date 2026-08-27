import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Save, UserCog } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { PasswordRequirementsChecklist } from '../../components/auth/PasswordRequirementsChecklist';
import { isPasswordFormValid } from '../auth/passwordPolicy';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { updateOwnProfileDetails } from '../../services/personnel.service';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

type SettingsTab = 'profile' | 'password';

type ProfileFormState = {
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  work_group: string;
  gender: '' | 'male' | 'female';
  education: '' | 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก';
  birth_date_th: string;
  start_work_date_th: string;
  employment_type: '' | 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)';
};

const educationOptions: ProfileFormState['education'][] = ['', 'ต่ำกว่าปริญญาตรี', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก'];
const employmentTypeOptions: ProfileFormState['employment_type'][] = [
  '',
  'ข้าราชการ',
  'พนักงานราชการ',
  'พนักงานกระทรวงสาธารณสุข',
  'ลูกจ้างชั่วคราว',
  'จ้างเหมาบริการฯ (พขร.)',
];

function formatISOToThaiDate(isoDate: string | null) {
  if (!isoDate) return '';

  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';

  const year = Number(parts[0]) + 543;
  return `${parts[2]}/${parts[1]}/${String(year)}`;
}

function parseThaiDateToISO(value: string, fieldLabel = 'วันเกิด') {
  if (!value.trim()) return null;

  const parts = value.trim().replace(/\//g, '-').split('-');
  if (parts.length !== 3) {
    throw new Error(`${fieldLabel}ต้องเป็นรูปแบบ วว/ดด/ปปปป (พ.ศ.)`);
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const thaiYear = Number(parts[2]);

  if (!day || !month || !thaiYear || day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error(`${fieldLabel}ไม่ถูกต้อง`);
  }

  const christianYear = thaiYear - 543;
  if (christianYear < 1900 || christianYear > 2100) {
    throw new Error(`${fieldLabel}ปีไม่ถูกต้อง`);
  }

  return `${String(christianYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function AccountSettingsPage() {
  const location = useLocation();
  useAuditPageAccess({ module: 'settings', action: 'settings_page_access', route: '/settings' });
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const authLoading = useAuthStore((state) => state.loading);
  const authError = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    employee_code: '',
    full_name: '',
    position: '',
    department: '',
    work_group: '',
    gender: '',
    education: '',
    birth_date_th: '',
    start_work_date_th: '',
    employment_type: '',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordFormValid = isPasswordFormValid(passwordForm.password, passwordForm.confirmPassword);


  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab') || location.hash.replace('#', '');

    if (tabParam === 'password' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [location.hash, location.search]);
  useEffect(() => {
    if (!profile) return;

    setProfileForm({
      employee_code: profile.employee_code || '',
      full_name: profile.full_name || '',
      position: profile.position || '',
      department: profile.department || '',
      work_group: profile.work_group || '',
      gender: profile.gender || '',
      education: profile.education || '',
      birth_date_th: formatISOToThaiDate(profile.birth_date),
      start_work_date_th: formatISOToThaiDate(profile.start_work_date),
      employment_type: profile.employment_type || '',
    });
  }, [profile]);

  const updateProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setProfileMessage(null);
    setProfileError(null);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const birthDate = parseThaiDateToISO(profileForm.birth_date_th, 'วันเกิด');
      const startWorkDate = parseThaiDateToISO(profileForm.start_work_date_th, 'วันที่เริ่มงาน');
      await updateOwnProfileDetails({
        employee_code: profileForm.employee_code || null,
        full_name: profileForm.full_name || null,
        position: profileForm.position || null,
        department: profileForm.department || null,
        work_group: profileForm.work_group || null,
        gender: profileForm.gender || null,
        education: profileForm.education || null,
        birth_date: birthDate,
        start_work_date: startWorkDate,
        employment_type: profileForm.employment_type || null,
      });
      await refreshProfile();
      setProfileMessage('บันทึกข้อมูลส่วนบุคคลเรียบร้อย');
    } catch (err) {
      setProfileError(getSafeUserErrorMessage(err, 'ไม่สามารถบันทึกข้อมูลส่วนบุคคลได้'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    clearAuthError();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!passwordFormValid) {
      setPasswordError('กรุณากำหนดรหัสผ่านให้ผ่านเงื่อนไขครบทุกข้อ');
      return;
    }

    try {
      await updatePassword(passwordForm.password);
      setPasswordForm({ password: '', confirmPassword: '' });
      setPasswordMessage('เปลี่ยนรหัสผ่านเรียบร้อย');
    } catch (err) {
      setPasswordError(getSafeUserErrorMessage(err, 'ไม่สามารถเปลี่ยนรหัสผ่านได้'));
    }
  };

  if (!profile) {
    return <div className="py-20 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้งาน</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="ตั้งค่าข้อมูล" description="แก้ไขข้อมูลส่วนบุคคลและตั้งค่ารหัสผ่านของบัญชีผู้ใช้งาน" />

      <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'profile' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCog className="h-4 w-4" aria-hidden="true" />
            แก้ไขข้อมูลส่วนบุคคล
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'password' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            ตั้งค่ารหัสผ่านใหม่
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ID</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.employee_code} onChange={(e) => updateProfileField('employee_code', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ชื่อ-นามสกุล</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.full_name} onChange={(e) => updateProfileField('full_name', e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500" value={user?.email || ''} disabled />
              <span className="mt-1 block text-xs text-slate-500">หากต้องการแก้ไข Email กรุณาแจ้ง HR หรือผู้มีสิทธิ์สูงกว่า</span>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500" value={profile.role} disabled>
                <option value={profile.role}>{roleLabels[profile.role]}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ตำแหน่ง</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.position} onChange={(e) => updateProfileField('position', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">หน่วยงาน</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.department} onChange={(e) => updateProfileField('department', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">กลุ่มงาน</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.work_group} onChange={(e) => updateProfileField('work_group', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">เพศ</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.gender} onChange={(e) => updateProfileField('gender', e.target.value)}>
                <option value="">ไม่ระบุ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">การศึกษา</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.education} onChange={(e) => updateProfileField('education', e.target.value)}>
                {educationOptions.map((option) => <option key={option || 'empty'} value={option}>{option || 'ไม่ระบุ'}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">วันเกิด (วว/ดด/ปปปป พ.ศ.)</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.birth_date_th} onChange={(e) => updateProfileField('birth_date_th', e.target.value)} placeholder="01/01/2530" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.start_work_date_th} onChange={(e) => updateProfileField('start_work_date_th', e.target.value)} placeholder="01/10/2560" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">รูปแบบการจ้าง</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={profileForm.employment_type} onChange={(e) => updateProfileField('employment_type', e.target.value)}>
                {employmentTypeOptions.map((option) => <option key={option || 'empty'} value={option}>{option || 'ไม่ระบุ'}</option>)}
              </select>
            </label>
          </div>

          {profileMessage ? <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profileMessage}</div> : null}
          {profileError ? <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div> : null}

          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={savingProfile}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </section>
      ) : (
        <section className="max-w-xl rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</span>
              <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full bg-transparent py-2 text-sm outline-none"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่านใหม่' : 'แสดงรหัสผ่านใหม่'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</span>
              <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full bg-transparent py-2 text-sm outline-none"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-4">
            <PasswordRequirementsChecklist
              password={passwordForm.password}
              confirmPassword={passwordForm.confirmPassword}
            />
          </div>

          {passwordMessage ? <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordMessage}</div> : null}
          {(passwordError || authError) ? <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError || authError}</div> : null}

          <button
            type="button"
            onClick={() => void handleUpdatePassword()}
            disabled={authLoading || !passwordFormValid}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {authLoading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </section>
      )}
    </div>
  );
}
