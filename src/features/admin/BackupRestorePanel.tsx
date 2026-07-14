import { ChangeEvent, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  HardDrive,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  createSystemBackup,
  downloadBackupJson,
  restoreStorageFromDrive,
  restoreSystemBackup,
  type BackupRestoreFunctionResult,
} from '../../services/backup-restore.service';
import {
  loadBackupRestoreSettings,
  saveBackupRestoreSettings,
  type BackupRestoreSettings,
  type RestoreTestRecord,
  type RestoreTestStatus,
} from '../../services/system-settings.service';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

type RestoreTestForm = Omit<RestoreTestRecord, 'id'>;

const restoreTestStatusLabels: Record<RestoreTestStatus, string> = {
  not_started: 'ยังไม่ได้ทดสอบ',
  passed: 'ผ่าน',
  failed: 'ไม่ผ่าน',
};

const restoreTestStatusClasses: Record<RestoreTestStatus, string> = {
  not_started: 'bg-slate-100 text-slate-700',
  passed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
};

const emptyRestoreTestForm: RestoreTestForm = {
  testDate: '',
  tester: '',
  scope: '',
  status: 'passed',
  notes: '',
};

function formatNumber(value: number | undefined) {
  return Number(value || 0).toLocaleString('th-TH');
}

export function BackupRestorePanel() {
  const [settings, setSettings] = useState<BackupRestoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [restoreRunning, setRestoreRunning] = useState(false);
  const [storageRestoreRunning, setStorageRestoreRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [operationResult, setOperationResult] = useState<BackupRestoreFunctionResult | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Record<string, unknown> | null>(null);
  const [selectedBackupName, setSelectedBackupName] = useState<string>('');
  const [storageBackupFolderUrl, setStorageBackupFolderUrl] = useState('');
  const [restoreTestForm, setRestoreTestForm] = useState<RestoreTestForm>(emptyRestoreTestForm);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await loadBackupRestoreSettings();
        setSettings(data);
      } catch (err) {
        setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูล Backup / Restore ได้'));
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const updateSetting = <Key extends keyof BackupRestoreSettings>(key: Key, value: BackupRestoreSettings[Key]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setSavedMessage(null);
  };

  const updateRestoreTestForm = <Key extends keyof RestoreTestForm>(key: Key, value: RestoreTestForm[Key]) => {
    setRestoreTestForm((current) => ({ ...current, [key]: value }));
  };
  const addRestoreTestRecord = () => {
    if (!settings) return;

    const nextRecord: RestoreTestRecord = {
      id: `restore-test-${Date.now()}`,
      ...restoreTestForm,
    };

    setSettings({
      ...settings,
      lastRestoreTestDate: restoreTestForm.testDate || settings.lastRestoreTestDate,
      restoreTestStatus: restoreTestForm.status,
      restoreTestRecords: [nextRecord, ...settings.restoreTestRecords],
    });
    setRestoreTestForm(emptyRestoreTestForm);
    setSavedMessage(null);
  };

  const removeRestoreTestRecord = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      restoreTestRecords: settings.restoreTestRecords.filter((record) => record.id !== id),
    });
    setSavedMessage(null);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const savedSettings = await saveBackupRestoreSettings(settings);
      setSettings(savedSettings);
      setSavedMessage('บันทึกข้อมูล Backup / Restore แล้ว');
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถบันทึกข้อมูล Backup / Restore ได้'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupRunning(true);
    setError(null);
    setSavedMessage(null);
    setOperationResult(null);

    try {
      const result = await createSystemBackup(true);
      setOperationResult(result);
      const driveFolderUrl = result.apps_script?.result?.folder_url;
      if (typeof driveFolderUrl === 'string') {
        setStorageBackupFolderUrl(driveFolderUrl);
      }
      if (result.backup) {
        downloadBackupJson(result.backup);
      }
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถสร้าง Backup ได้'));
    } finally {
      setBackupRunning(false);
    }
  };

  const handleBackupFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedBackup(null);
    setSelectedBackupName('');

    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setSelectedBackup(parsed);
      setSelectedBackupName(file.name);
      setError(null);
    } catch {
      setError('ไฟล์ Backup ไม่ใช่ JSON ที่ถูกต้อง');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
      setError('กรุณาเลือกไฟล์ Backup JSON ก่อน Restore');
      return;
    }

    setRestoreRunning(true);
    setError(null);
    setSavedMessage(null);
    setOperationResult(null);

    try {
      const result = await restoreSystemBackup(selectedBackup);
      setOperationResult(result);
      setSavedMessage('Restore ข้อมูลตารางกลับเข้า Supabase แล้ว');
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถ Restore ข้อมูลได้'));
    } finally {
      setRestoreRunning(false);
    }
  };

  const handleRestoreStorage = async () => {
    const folderUrl = storageBackupFolderUrl.trim();
    if (!folderUrl) {
      setError('กรุณากรอก Google Drive Folder URL หรือ Folder ID ของ Backup');
      return;
    }

    setStorageRestoreRunning(true);
    setError(null);
    setSavedMessage(null);
    setOperationResult(null);

    try {
      const result = await restoreStorageFromDrive(folderUrl);
      setOperationResult(result);
      setSavedMessage('Restore ไฟล์รูปภาพ/PDF กลับเข้า Supabase Storage แล้ว');
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถ Restore ไฟล์ Storage ได้'));
    } finally {
      setStorageRestoreRunning(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">กำลังโหลดข้อมูล Backup / Restore...</div>;
  }

  if (!settings) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">ไม่พบข้อมูล Backup / Restore</div>;
  }

  return (
    <div className="space-y-6">
      {backupRunning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">กำลังสร้าง Backup</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              กรุณารอสักครู่ ระบบกำลังดึงข้อมูลจาก Supabase และส่งไฟล์ไปจัดเก็บที่ Google Drive
            </p>
            <p className="mt-3 text-xs text-slate-500">อย่าปิดหน้านี้จนกว่าการสร้าง Backup จะเสร็จสิ้น</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Database Backup</h3>
          </div>
          <p className="text-sm text-slate-600">สำรองข้อมูลทุกตารางสำคัญจาก Supabase เป็นไฟล์ JSON</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Google Drive</h3>
          </div>
          <p className="text-sm text-slate-600">ส่งข้อมูลและ signed URL ของไฟล์ไป Google Apps Script เพื่อเก็บใน Drive</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Restore</h3>
          </div>
          <p className="text-sm text-slate-600">นำไฟล์ JSON กลับเข้า Supabase ได้จากหน้านี้ หรือใช้ไฟล์เดียวกัน restore ตรงภายนอกได้</p>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {savedMessage ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{savedMessage}</div> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">สร้าง Backup จริง</h3>
              <p className="text-sm text-slate-500">ดึงข้อมูลจาก Supabase ส่งไป Google Apps Script/Drive และดาวน์โหลด JSON สำรองไว้</p>
            </div>
            <Download className="h-5 w-5 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={backupRunning}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {backupRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {backupRunning ? 'กำลังสร้าง Backup' : 'สร้าง Backup และส่งไป Google Drive'}
          </button>
          <p className="mt-3 text-xs text-slate-500">ถ้ายังไม่ได้ตั้งค่า Apps Script ระบบจะยังดาวน์โหลดไฟล์ JSON ให้เก็บไว้ก่อน</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Restore จากไฟล์ Backup</h3>
              <p className="text-sm text-slate-500">เลือกไฟล์ JSON ที่สร้างจากระบบ แล้วกู้ข้อมูลตารางกลับเข้า Supabase</p>
            </div>
            <UploadCloud className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleBackupFileChange}
            className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700"
          />
          {selectedBackupName ? <p className="mt-2 text-xs text-slate-500">เลือกไฟล์: {selectedBackupName}</p> : null}
          <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">ไฟล์ JSON ใช้กู้ข้อมูลตาราง ส่วนรูปภาพ/PDF ที่ส่งไป Google Drive จะมี storage-manifest.json ระบุ bucket และ path เดิมสำหรับกู้ไฟล์กลับตำแหน่งเดิม</p>
          <button
            type="button"
            onClick={handleRestoreBackup}
            disabled={restoreRunning || !selectedBackup}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {restoreRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {restoreRunning ? 'กำลัง Restore' : 'Restore ตารางเข้า Supabase'}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Restore ไฟล์ Storage จาก Google Drive</h3>
              <p className="text-sm text-slate-500">กรอก Folder URL หรือ Folder ID ของ Backup เพื่อกู้รูปภาพ/PDF กลับ bucket และ path เดิม</p>
            </div>
            <HardDrive className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={storageBackupFolderUrl}
            onChange={(event) => setStorageBackupFolderUrl(event.target.value)}
            placeholder="เช่น https://drive.google.com/drive/folders/..."
            className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">ระบบจะอ่าน storage-manifest.json ในโฟลเดอร์นี้ แล้วอัปโหลดไฟล์กลับ Supabase Storage ตามตำแหน่งเดิม จำกัดต่อครั้งประมาณ 200 ไฟล์หรือ 25MB</p>
          <button
            type="button"
            onClick={handleRestoreStorage}
            disabled={storageRestoreRunning || !storageBackupFolderUrl.trim()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {storageRestoreRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
            {storageRestoreRunning ? 'กำลัง Restore ไฟล์ Storage' : 'Restore รูปภาพ/PDF เข้า Storage'}
          </button>
        </div>
      </div>

      {operationResult ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-semibold">ผลการดำเนินการล่าสุด</div>
          {operationResult.backup_id ? <div>Backup ID: {operationResult.backup_id}</div> : null}
          {operationResult.summary ? (
            <div>
              ตาราง {formatNumber(operationResult.summary.table_count)} · แถวข้อมูล {formatNumber(operationResult.summary.row_count)} · ไฟล์ {formatNumber(operationResult.summary.storage_object_count)}
            </div>
          ) : null}
          {operationResult.apps_script?.skipped ? <div className="text-amber-700">ยังไม่ได้ส่งไป Google Drive เพราะยังไม่ได้ตั้งค่า Apps Script Secrets</div> : null}
          {operationResult.apps_script?.ok ? <div>ส่งไป Google Apps Script / Drive สำเร็จ</div> : null}
          {operationResult.restored ? <div>Restore ตารางสำเร็จ {Object.keys(operationResult.restored).length.toLocaleString('th-TH')} ตาราง</div> : null}
          {operationResult.restored_storage ? <div>Restore ไฟล์ Storage สำเร็จ {Object.values(operationResult.restored_storage).reduce((sum, count) => sum + count, 0).toLocaleString('th-TH')} ไฟล์</div> : null}
          {operationResult.storage_restore ? <div>อ่าน manifest {formatNumber(operationResult.storage_restore.manifest_count)} รายการ · ส่งไฟล์กลับ {formatNumber(operationResult.storage_restore.returned_files)} รายการ</div> : null}
          {operationResult.errors?.length ? <div className="text-red-700">มีบางรายการ Restore ไม่สำเร็จ {operationResult.errors.length} รายการ</div> : null}
        </div>
      ) : null}      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">ข้อมูลกำกับ Backup / Restore</h3>
            <p className="text-sm text-slate-500">ใช้กำหนด RPO/RTO และผู้รับผิดชอบประกอบการตรวจ ISO/IEC 27001</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'กำลังบันทึก' : 'บันทึกข้อมูลกำกับ'}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            RPO ยอมให้ข้อมูลย้อนหลังหายได้กี่ชั่วโมง
            <input
              type="number"
              min={1}
              value={settings.rpoHours}
              onChange={(event) => updateSetting('rpoHours', Number(event.target.value))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            RTO ต้องกู้ระบบกลับมาให้ใช้ได้ภายในกี่ชั่วโมง
            <input
              type="number"
              min={1}
              value={settings.rtoHours}
              onChange={(event) => updateSetting('rtoHours', Number(event.target.value))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
            รอบตรวจ Supabase Database Backup
            <textarea
              rows={3}
              value={settings.databaseBackupSchedule}
              onChange={(event) => updateSetting('databaseBackupSchedule', event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
            รอบตรวจ Supabase Storage Backup
            <textarea
              rows={3}
              value={settings.storageBackupSchedule}
              onChange={(event) => updateSetting('storageBackupSchedule', event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            ผู้รับผิดชอบ
            <input
              type="text"
              value={settings.responsibleOwner}
              onChange={(event) => updateSetting('responsibleOwner', event.target.value)}
              placeholder="Super Admin / ผู้ดูแลระบบ PTDMS"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            สถานะ Restore Test ล่าสุด
            <select
              value={settings.restoreTestStatus}
              onChange={(event) => updateSetting('restoreTestStatus', event.target.value as RestoreTestStatus)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="not_started">ยังไม่ได้ทดสอบ</option>
              <option value="passed">ผ่าน</option>
              <option value="failed">ไม่ผ่าน</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">บันทึกผล Restore Test</h3>
            <p className="text-sm text-slate-500">เพิ่มหลักฐานวันที่ทดสอบ ผู้ทดสอบ ขอบเขต และผลลัพธ์</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            วันที่ทดสอบ
            <input
              type="date"
              value={restoreTestForm.testDate}
              onChange={(event) => updateRestoreTestForm('testDate', event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            ผู้ทดสอบ
            <input
              type="text"
              value={restoreTestForm.tester}
              onChange={(event) => updateRestoreTestForm('tester', event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            ขอบเขตที่ทดสอบ
            <input
              type="text"
              value={restoreTestForm.scope}
              onChange={(event) => updateRestoreTestForm('scope', event.target.value)}
              placeholder="เช่น Database staging, Storage bucket สำคัญ"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            ผลการทดสอบ
            <select
              value={restoreTestForm.status}
              onChange={(event) => updateRestoreTestForm('status', event.target.value as RestoreTestStatus)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="passed">ผ่าน</option>
              <option value="failed">ไม่ผ่าน</option>
              <option value="not_started">ยังไม่ได้ทดสอบ</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
            หมายเหตุ / หลักฐาน
            <textarea
              rows={3}
              value={restoreTestForm.notes}
              onChange={(event) => updateRestoreTestForm('notes', event.target.value)}
              placeholder="เช่น ใช้เวลา restore 35 นาที, ตรวจ route login/portal/SPD แล้วผ่าน"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={addRestoreTestRecord}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          เพิ่มรายการ Restore Test
        </button>
      </div>      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">ประวัติ Restore Test</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">วันที่</th>
                <th className="px-6 py-3">ผู้ทดสอบ</th>
                <th className="px-6 py-3">ขอบเขต</th>
                <th className="px-6 py-3">ผล</th>
                <th className="px-6 py-3">หมายเหตุ</th>
                <th className="px-6 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.restoreTestRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">ยังไม่มีหลักฐาน Restore Test</td>
                </tr>
              ) : (
                settings.restoreTestRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{record.testDate || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{record.tester || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{record.scope || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${restoreTestStatusClasses[record.status]}`}>
                        {restoreTestStatusLabels[record.status]}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-6 py-4 text-slate-600">{record.notes || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeRestoreTestRecord(record.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}