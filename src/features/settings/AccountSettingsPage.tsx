import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PasswordRequirementsChecklist } from '../../components/auth/PasswordRequirementsChecklist';
import { isPasswordFormValid } from '../auth/passwordPolicy';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { updateOwnProfileDetails } from '../../services/personnel.service';
import {
  enrollTotp,
  getMfaStatus,
  MfaEnrollResult,
  MfaStatus,
  unenrollTotp,
  verifyTotpEnrollment,
} from '../../services/mfa.service';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

type SettingsTab = 'profile' | 'password' | 'security';

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

  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [enrollData, setEnrollData] = useState<MfaEnrollResult | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [unenrollTargetId, setUnenrollTargetId] = useState<string | null>(null);
  const [disablingMfa, setDisablingMfa] = useState(false);

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab') || location.hash.replace('#', '');

    if (tabParam === 'password' || tabParam === 'profile' || tabParam === 'security') {
      setActiveTab(tabParam as SettingsTab);
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

  const loadMfaStatus = async () => {
    setLoadingMfa(true);
    setMfaError(null);
    try {
      const status = await getMfaStatus();
      setMfaStatus(status);
    } catch (err) {
      setMfaError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลการยืนยันแบบ 2 ขั้นตอนได้'));
    } finally {
      setLoadingMfa(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      void loadMfaStatus();
    }
  }, [activeTab]);

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

  const handleStartEnrollment = async () => {
    setEnrollingMfa(true);
    setMfaError(null);
    setMfaMessage(null);
    setTotpVerifyCode('');
    try {
      const result = await enrollTotp('SmartDSP Account');
      setEnrollData(result);
    } catch (err) {
      setMfaError(getSafeUserErrorMessage(err, 'ไม่สามารถเริ่มต้นตั้งค่า Google Authenticator ได้'));
    } finally {
      setEnrollingMfa(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollData || !totpVerifyCode.trim()) return;

    setVerifyingTotp(true);
    setMfaError(null);
    setMfaMessage(null);

    try {
      await verifyTotpEnrollment(enrollData.id, totpVerifyCode.trim());
      setMfaMessage('เปิดใช้งาน Google Authenticator (2-Step Verification) สำเร็จแล้ว!');
      setEnrollData(null);
      setTotpVerifyCode('');
      await loadMfaStatus();
    } catch (err) {
      setMfaError(getSafeUserErrorMessage(err, 'รหัสยืนยัน 6 หลักไม่ถูกต้อง หรือหมดอายุ กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setVerifyingTotp(false);
    }
  };

  const handleConfirmDisableMfa = async () => {
    if (!unenrollTargetId) return;

    setDisablingMfa(true);
    setMfaError(null);
    setMfaMessage(null);

    try {
      await unenrollTotp(unenrollTargetId);
      setMfaMessage('ปิดการใช้งาน 2-Step Verification เรียบร้อยแล้ว');
      setUnenrollTargetId(null);
      await loadMfaStatus();
    } catch (err) {
      setMfaError(getSafeUserErrorMessage(err, 'ไม่สามารถปิดการใช้งาน 2-Step Verification ได้'));
    } finally {
      setDisablingMfa(false);
    }
  };

  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    } catch {
      // Fallback
    }
  };

  const getQrCodeSource = (rawQr: string) => {
    if (rawQr.startsWith('data:')) return rawQr;
    if (rawQr.startsWith('<svg')) {
      return `data:image/svg+xml;utf-8,${encodeURIComponent(rawQr)}`;
    }
    return rawQr;
  };

  if (!profile) {
    return <div className="py-20 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้งาน</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ตั้งค่าข้อมูล"
        description="แก้ไขข้อมูลส่วนบุคคล ตั้งค่ารหัสผ่าน และการยืนยันแบบ 2 ขั้นตอน (Google Authenticator)"
      />

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
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'security' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ความปลอดภัย (2-Step Verification)
            {mfaStatus?.enabled ? (
              <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                เปิดใช้งาน
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ID</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.employee_code}
                onChange={(e) => updateProfileField('employee_code', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ชื่อ-นามสกุล</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.full_name}
                onChange={(e) => updateProfileField('full_name', e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                value={user?.email || ''}
                disabled
              />
              <span className="mt-1 block text-xs text-slate-500">หากต้องการแก้ไข Email กรุณาแจ้ง HR หรือผู้มีสิทธิ์สูงกว่า</span>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                value={profile.role}
                disabled
              >
                <option value={profile.role}>{roleLabels[profile.role]}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ตำแหน่ง</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.position}
                onChange={(e) => updateProfileField('position', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">หน่วยงาน</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.department}
                onChange={(e) => updateProfileField('department', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">กลุ่มงาน</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.work_group}
                onChange={(e) => updateProfileField('work_group', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">เพศ</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.gender}
                onChange={(e) => updateProfileField('gender', e.target.value)}
              >
                <option value="">ไม่ระบุ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">การศึกษา</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.education}
                onChange={(e) => updateProfileField('education', e.target.value)}
              >
                {educationOptions.map((option) => (
                  <option key={option || 'empty'} value={option}>
                    {option || 'ไม่ระบุ'}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">วันเกิด (วว/ดด/ปปปป พ.ศ.)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.birth_date_th}
                onChange={(e) => updateProfileField('birth_date_th', e.target.value)}
                placeholder="01/01/2530"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.start_work_date_th}
                onChange={(e) => updateProfileField('start_work_date_th', e.target.value)}
                placeholder="01/10/2560"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">รูปแบบการจ้าง</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profileForm.employment_type}
                onChange={(e) => updateProfileField('employment_type', e.target.value)}
              >
                {employmentTypeOptions.map((option) => (
                  <option key={option || 'empty'} value={option}>
                    {option || 'ไม่ระบุ'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {profileMessage ? (
            <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profileMessage}</div>
          ) : null}
          {profileError ? (
            <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>
          ) : null}

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
      ) : activeTab === 'password' ? (
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
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
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

          {passwordMessage ? (
            <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordMessage}</div>
          ) : null}
          {passwordError || authError ? (
            <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError || authError}</div>
          ) : null}

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
      ) : (
        /* Security & 2-Step Verification Tab */
        <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-brand-600" />
                <h3 className="text-lg font-bold text-slate-900">การยืนยันตัวตนแบบ 2 ขั้นตอน (2-Step Verification)</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                เพิ่มความปลอดภัยให้กับบัญชีของคุณด้วยแอป <strong>Google Authenticator</strong> หรือแอป TOTP อื่นๆ ฟรี ไม่เสียค่าใช้จ่าย
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMfaStatus()}
              disabled={loadingMfa}
              title="รีเฟรชสถานะ"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingMfa ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {mfaMessage ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3.5 text-sm text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{mfaMessage}</span>
            </div>
          ) : null}

          {mfaError ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3.5 text-sm text-red-800 border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{mfaError}</span>
            </div>
          ) : null}

          {loadingMfa ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <span>กำลังตรวจสอบสถานะความปลอดภัย...</span>
            </div>
          ) : mfaStatus?.enabled ? (
            /* MFA Already Enabled View */
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-900">เปิดใช้งานการยืนยันตัวตนแบบ 2 ขั้นตอนแล้ว</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      บัญชีของคุณได้รับการปกป้อง ทุกครั้งที่เข้าสู่ระบบจะต้องระบุรหัส 6 หลักจาก Google Authenticator
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">แอป Authenticator ที่ลงทะเบียนไว้</h4>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
                  {mfaStatus.factors.map((factor) => (
                    <div key={factor.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">
                            {factor.friendly_name || 'Google Authenticator (TOTP)'}
                          </p>
                          <p className="text-xs text-slate-500">
                            ลงทะเบียนเมื่อ: {new Date(factor.created_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setUnenrollTargetId(factor.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ปิดการใช้งาน
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : enrollData ? (
            /* MFA Enrollment Step (QR Code & Verification) */
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                <h4 className="font-semibold text-brand-900 text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-brand-600" />
                  ขั้นตอนการตั้งค่า Google Authenticator
                </h4>
                <ol className="mt-2 list-decimal list-inside text-xs text-brand-800 space-y-1">
                  <li>เปิดแอป <strong>Google Authenticator</strong> (หรือ Microsoft Authenticator) บนโทรศัพท์มือถือ</li>
                  <li>กดปุ่มบวก (+) แล้วเลือก <strong>"สแกนคิวอาร์โค้ด" (Scan a QR code)</strong></li>
                  <li>กรอกรหัส 6 หลักที่ปรากฏในแอปด้านล่างเพื่อยืนยัน</li>
                </ol>
              </div>

              {/* QR Code and Secret Display */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <img
                    src={getQrCodeSource(enrollData.totp.qr_code)}
                    alt="QR Code สำหรับ Google Authenticator"
                    className="h-48 w-48 object-contain"
                  />
                </div>

                <div className="mt-4 w-full max-w-sm">
                  <p className="text-xs text-slate-500 mb-1.5">หากไม่สามารถสแกนได้ ให้ป้อนรหัสลับ (Secret Key) นี้ด้วยตนเอง:</p>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left">
                    <code className="flex-1 font-mono text-xs font-bold text-slate-800 tracking-wider break-all select-all">
                      {enrollData.totp.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => void handleCopySecret(enrollData.totp.secret)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition shrink-0"
                      title="คัดลอก Secret Key"
                    >
                      {copiedSecret ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 6-digit confirmation code input */}
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    กรอกรหัสยืนยัน 6 หลักจากแอปพลิเคชัน
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="000000"
                    value={totpVerifyCode}
                    onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollData(null);
                      setTotpVerifyCode('');
                      setMfaError(null);
                    }}
                    disabled={verifyingTotp}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVerifyEnrollment()}
                    disabled={verifyingTotp || totpVerifyCode.trim().length !== 6}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    {verifyingTotp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังตรวจสอบ...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        ยืนยันและเปิดใช้งาน
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MFA Not Enabled View (Call to Action) */
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Smartphone className="h-7 w-7" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-900">เพิ่มความปลอดภัยด้วย 2-Step Verification</h4>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
                  ปกป้องบัญชีและข้อมูลสำคัญของคุณจากการเข้าถึงโดยไม่ได้รับอนุญาต แม้ผู้อื่นจะทราบรหัสผ่านของคุณ ก็จะไม่สามารถเข้าสู่ระบบได้หากไม่มีรหัสยืนยันจากมือถือ
                </p>

                <div className="mt-6 grid gap-3 text-left sm:grid-cols-2 max-w-lg mx-auto">
                  <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">ฟรี 100% ไม่มีค่าบริการ</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">ทำงานผ่าน Time-based OTP ไม่ต้องเสียค่า SMS</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">รองรับทุกแอป TOTP</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Google Authenticator, Microsoft Auth, ฯลฯ</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleStartEnrollment()}
                  disabled={enrollingMfa}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {enrollingMfa ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังสร้าง QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4" />
                      เริ่มต้นตั้งค่า Google Authenticator
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Modal confirm disable */}
          <ConfirmModal
            isOpen={Boolean(unenrollTargetId)}
            onClose={() => setUnenrollTargetId(null)}
            onConfirm={() => void handleConfirmDisableMfa()}
            title="ยืนยันการปิดการใช้งาน 2-Step Verification"
            message="หากคุณปิดการใช้งาน การเข้าสู่ระบบครั้งถัดไปจะใช้เพียงรหัสผ่านเท่านั้น และความปลอดภัยของบัญชีอาจลดลง คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งาน?"
            confirmLabel="ปิดการใช้งาน"
            cancelLabel="ยกเลิก"
            variant="danger"
            isLoading={disablingMfa}
          />
        </section>
      )}
    </div>
  );
}
