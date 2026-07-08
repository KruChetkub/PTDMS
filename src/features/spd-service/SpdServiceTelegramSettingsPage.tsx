import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BellRing, CheckCircle2, ImageIcon, RefreshCw, Save, Upload } from 'lucide-react';
import {
  defaultSpdServiceTelegramMessageTemplate,
  getSpdServiceAdminRecipients,
  getSpdServiceDigitalGuideSettings,
  getSpdServiceTelegramSettings,
  saveSpdServiceDigitalGuideSettings,
  saveSpdServiceTelegramSettings,
  uploadSpdServiceDigitalGuideImage,
  type SpdServiceDigitalGuide,
  type SpdServiceDigitalGuideSubject,
} from '../../services/spd-service.service';
import { useAuthStore } from '../../stores/auth.store';
import type { Profile } from '../../types/database.types';
import { cn } from '../../utils/cn';

const sampleTelegramTemplateValues: Record<string, string> = {
  ticket_no: 'DSP-IT-07072569-001',
  subject: 'ขอรับบริการระบบคอมพิวเตอร์',
  category_name: 'แจ้งปัญหาระบบ',
  urgency: 'ปกติ',
  requester_name: 'สมชาย ทดสอบ',
  requester_department: 'กองยุทธศาสตร์และแผนงาน',
  requester_phone: '081-234-5678',
  status: 'new',
  created_at: '12 มิ.ย. 2569 09:30',
  admin_mentions: '@admin',
  description: 'รายละเอียดตัวอย่างสำหรับตรวจสอบข้อความที่ส่งเข้า Telegram',
};

type SettingsTab = 'notification' | 'message' | 'request';

function renderTelegramTemplatePreview(template: string) {
  return Object.entries(sampleTelegramTemplateValues).reduce(
    (message, [key, value]) => message.split(`{{${key}}}`).join(value),
    template,
  );
}

export function SpdServiceTelegramSettingsPage() {
  const { profile } = useAuthStore();
  const canEditTelegramSettings = profile?.role === 'super_admin';
  const canEditRequestSettings = profile?.role === 'super_admin' || profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTab>('notification');
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [chatId, setChatId] = useState('');
  const [adminRecipientIds, setAdminRecipientIds] = useState<string[]>([]);
  const [adminUsernames, setAdminUsernames] = useState<Record<string, string>>({});
  const [messageTemplate, setMessageTemplate] = useState(defaultSpdServiceTelegramMessageTemplate);
  const [digitalGuides, setDigitalGuides] = useState<SpdServiceDigitalGuide[]>([]);
  const [uploadingSubject, setUploadingSubject] = useState<SpdServiceDigitalGuideSubject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedAdminCount = useMemo(
    () => admins.filter((admin) => adminRecipientIds.includes(admin.user_id)).length,
    [adminRecipientIds, admins],
  );
  const messagePreview = useMemo(() => renderTelegramTemplatePreview(messageTemplate), [messageTemplate]);
  const canSaveActiveTab = activeTab === 'request' ? canEditRequestSettings : canEditTelegramSettings;

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const [adminData, telegramSettings, guideSettings] = await Promise.all([
        getSpdServiceAdminRecipients(),
        getSpdServiceTelegramSettings(),
        getSpdServiceDigitalGuideSettings(),
      ]);

      setAdmins(adminData);
      setEnabled(telegramSettings.enabled);
      setChatId(telegramSettings.chatId);
      setAdminRecipientIds(telegramSettings.adminRecipientIds);
      setAdminUsernames(telegramSettings.adminUsernames);
      setMessageTemplate(telegramSettings.messageTemplate);
      setDigitalGuides(guideSettings);
    } catch (loadError) {
      console.error('Failed to load DSP Service settings:', loadError);
      setError('ไม่สามารถโหลดการตั้งค่า DSP Service ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const toggleAdminRecipient = (adminId: string) => {
    setAdminRecipientIds((current) =>
      current.includes(adminId) ? current.filter((id) => id !== adminId) : [...current, adminId],
    );
  };

  const updateAdminUsername = (adminId: string, username: string) => {
    setAdminUsernames((current) => ({
      ...current,
      [adminId]: username,
    }));
  };

  const updateDigitalGuide = (subject: SpdServiceDigitalGuideSubject, updates: Partial<Omit<SpdServiceDigitalGuide, 'subject'>>) => {
    setDigitalGuides((current) => current.map((guide) => (guide.subject === subject ? { ...guide, ...updates } : guide)));
  };

  const handleGuideImageUpload = async (subject: SpdServiceDigitalGuideSubject, file: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploadingSubject(subject);
      setError(null);
      const image = await uploadSpdServiceDigitalGuideImage(file);
      updateDigitalGuide(subject, image);
      setSuccess('อัปโหลดรูปภาพแล้ว กรุณากดบันทึกการตั้งค่าเพื่อใช้งาน');
    } catch (uploadError) {
      console.error('Failed to upload DSP Service guide image:', uploadError);
      setError('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingSubject(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.user_id) {
      setError('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (activeTab === 'request') {
      if (!canEditRequestSettings) {
        setError('เฉพาะ Super Admin และ Admin เท่านั้นที่บันทึกการตั้งค่าคำขอรับบริการได้');
        return;
      }

      try {
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        await saveSpdServiceDigitalGuideSettings({ guides: digitalGuides, updatedBy: profile.user_id });
        setSuccess('บันทึกการตั้งค่าแจ้งคำขอรับบริการเรียบร้อยแล้ว');
      } catch (saveError) {
        console.error('Failed to save DSP Service request guide settings:', saveError);
        setError('ไม่สามารถบันทึกการตั้งค่าแจ้งคำขอรับบริการได้');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!canEditTelegramSettings) {
      setError('เฉพาะ Super Admin เท่านั้นที่บันทึกการตั้งค่า Telegram ได้');
      return;
    }

    if (enabled && !chatId.trim()) {
      setError('กรุณากรอก Telegram Group/Chat ID ก่อนเปิดใช้งาน');
      return;
    }

    if (enabled && adminRecipientIds.length === 0) {
      setError('กรุณาเลือก Admin อย่างน้อย 1 คนสำหรับรับการแจ้งเตือน');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await saveSpdServiceTelegramSettings({
        enabled,
        chatId,
        adminRecipientIds,
        adminUsernames,
        messageTemplate,
        updatedBy: profile.user_id,
      });

      setSuccess('บันทึกการตั้งค่า Telegram สำหรับ DSP Service เรียบร้อยแล้ว');
    } catch (saveError) {
      console.error('Failed to save DSP Service Telegram settings:', saveError);
      setError('ไม่สามารถบันทึกการตั้งค่า Telegram ได้');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link to="/spd-service" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับแดชบอร์ด DSP Service
            </Link>
            <h1 className="truncate text-2xl font-semibold text-slate-950">ตั้งค่า DSP Service</h1>
            <p className="mt-1 text-sm text-slate-500">ตั้งค่าการแจ้งเตือนและคำแนะนำในฟอร์มแจ้งคำขอรับบริการ</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
            รีเฟรช
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {success}
          </div>
        ) : null}

        {!canEditTelegramSettings && activeTab !== 'request' ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            การตั้งค่า Telegram เป็นโหมดดูข้อมูล เฉพาะ Super Admin เท่านั้นที่แก้ไขและบันทึกได้
          </div>
        ) : null}

        {!canEditRequestSettings && activeTab === 'request' ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            เฉพาะ Super Admin และ Admin เท่านั้นที่แก้ไขการตั้งค่าแจ้งคำขอรับบริการได้
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-2 md:grid-cols-3">
              {[
                { value: 'notification', label: 'ตั้งค่าการแจ้งเตือน' },
                { value: 'message', label: 'ตั้งค่าข้อความที่ส่ง' },
                { value: 'request', label: 'แจ้งคำขอรับบริการ' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.value as SettingsTab);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-semibold transition',
                    activeTab === tab.value ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'notification' ? (
            <>
              <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="rounded-md bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100">
                      <BellRing className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">เปิดใช้งาน Telegram</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        ใช้สำหรับเก็บค่ากลุ่ม Telegram และรายชื่อ Admin ที่ต้องการให้ระบบ DSP Service แจ้งเตือน
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-700">
                    <span className={cn('rounded-full px-3 py-1.5 transition', !enabled && 'bg-white shadow-sm')}>ปิด</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => setEnabled(event.target.checked)}
                      disabled={!canEditTelegramSettings}
                      className="sr-only"
                    />
                    <span className={cn('rounded-full px-3 py-1.5 transition', enabled && 'bg-teal-700 text-white shadow-sm')}>เปิด</span>
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-slate-700">Telegram Group/Chat ID</span>
                  <input
                    value={chatId}
                    onChange={(event) => setChatId(event.target.value)}
                    readOnly={!canEditTelegramSettings}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="-1001234567890"
                  />
                  <span className="mt-1 block text-xs text-slate-500">เก็บเฉพาะ Chat ID ของกลุ่ม Telegram สำหรับ DSP Service</span>
                </label>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">เลือก Admin ที่รับการแจ้งเตือน</h2>
                    <p className="mt-1 text-sm text-slate-500">เลือกจากผู้ใช้งาน Role Admin และสถานะ Active</p>
                  </div>
                  <p className="text-sm font-semibold text-teal-700">เลือกแล้ว {selectedAdminCount} คน</p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {isLoading ? (
                    <div className="col-span-full rounded-md border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500">
                      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden="true" />
                      กำลังโหลดรายชื่อ Admin
                    </div>
                  ) : admins.length > 0 ? (
                    admins.map((admin) => {
                      const checked = adminRecipientIds.includes(admin.user_id);

                      return (
                        <div
                          key={admin.user_id}
                          className={cn(
                            'rounded-md border p-4 transition',
                            checked ? 'border-teal-300 bg-teal-50 ring-1 ring-teal-100' : 'border-slate-200 bg-white hover:bg-slate-50',
                          )}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAdminRecipient(admin.user_id)}
                              disabled={!canEditTelegramSettings}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-950">{admin.full_name}</span>
                              <span className="mt-1 block truncate text-xs text-slate-500">
                                {[admin.position, admin.department || admin.work_group].filter(Boolean).join(' / ') || 'Admin'}
                              </span>
                            </span>
                          </label>

                          {checked ? (
                            <label className="mt-3 block">
                              <span className="text-xs font-medium text-slate-600">Telegram username สำหรับ @mention</span>
                              <input
                                value={adminUsernames[admin.user_id] || ''}
                                onChange={(event) => updateAdminUsername(admin.user_id, event.target.value)}
                                readOnly={!canEditTelegramSettings}
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                placeholder="@username"
                              />
                              <span className="mt-1 block text-xs text-slate-500">กรอก username ที่อยู่ในกลุ่ม Telegram เช่น @somchai</span>
                            </label>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      ยังไม่พบผู้ใช้งาน Role Admin ที่ Active
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}

          {activeTab === 'message' ? (
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Template ข้อความ Telegram</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    แก้ไขข้อความที่ bot ส่งเข้ากลุ่มเมื่อมีคำขอใหม่ สามารถพิมพ์ข้อความธรรมดาเพิ่มได้ โดยไม่จำเป็นต้องเป็นตัวแปรเท่านั้น
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMessageTemplate(defaultSpdServiceTelegramMessageTemplate)}
                  disabled={!canEditTelegramSettings}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  คืนค่าเริ่มต้น
                </button>
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">ข้อความที่ส่งเข้า Telegram</span>
                <textarea
                  value={messageTemplate}
                  onChange={(event) => setMessageTemplate(event.target.value)}
                  readOnly={!canEditTelegramSettings}
                  className="mt-1 min-h-96 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  ข้อความที่พิมพ์เองจะถูกส่งไปพร้อมกัน ส่วนรูปแบบ <code className="font-mono text-teal-700">{'{{ticket_no}}'}</code> จะถูกแทนค่าด้วยข้อมูลคำขอจริง
                </span>
              </label>

              <div className="mt-4 rounded-md border border-teal-100 bg-teal-50/60 p-4">
                <h3 className="text-sm font-semibold text-slate-900">ตัวอย่างข้อความหลังแทนค่าตัวแปร</h3>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-teal-100 bg-white p-3 text-sm leading-6 text-slate-700">
                  {messagePreview}
                </pre>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">ตัวแปรที่ใช้ได้</h3>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  {[
                    '{{ticket_no}}',
                    '{{subject}}',
                    '{{category_name}}',
                    '{{urgency}}',
                    '{{requester_name}}',
                    '{{requester_department}}',
                    '{{requester_phone}}',
                    '{{status}}',
                    '{{created_at}}',
                    '{{admin_mentions}}',
                    '{{description}}',
                  ].map((token) => (
                    <code key={token} className="rounded bg-white px-2 py-1 font-mono text-teal-700 ring-1 ring-slate-200">
                      {token}
                    </code>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">รองรับ Telegram HTML เช่น &lt;b&gt;...&lt;/b&gt; และ &lt;code&gt;...&lt;/code&gt;</p>
              </div>
            </section>
          ) : null}

          {activeTab === 'request' ? (
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">คำแนะนำสำหรับ Digital Service</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    ตั้งค่ารูปภาพที่จะปรากฏในหน้าแจ้งคำขอ เมื่อผู้ใช้เลือกประเภทบริการ Digital Service และติ๊กหัวข้อที่กำหนด
                  </p>
                </div>
                <Link
                  to="/spd-service/request"
                  className="inline-flex items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
                >
                  เปิดหน้าฟอร์ม
                </Link>
              </div>

              <div className="mt-5 grid gap-4">
                {digitalGuides.map((guide) => (
                  <div key={guide.subject} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={guide.enabled}
                          onChange={(event) => updateDigitalGuide(guide.subject, { enabled: event.target.checked })}
                          disabled={!canEditRequestSettings}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                        />
                        <span>
                          <span className="block text-base font-semibold text-slate-950">{guide.subject}</span>
                          <span className="mt-1 block text-sm text-slate-500">เปิด/ปิดการแสดงรูปภาพคำแนะนำสำหรับหัวข้อนี้</span>
                        </span>
                      </label>

                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        {uploadingSubject === guide.subject ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพ'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={!canEditRequestSettings || uploadingSubject === guide.subject}
                          onChange={(event) => void handleGuideImageUpload(guide.subject, event.target.files?.[0] || null)}
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-sm font-medium text-slate-700">ตำแหน่งไฟล์รูปภาพ</span>
                      <input
                        value={guide.imagePath}
                        onChange={(event) => updateDigitalGuide(guide.subject, { imagePath: event.target.value })}
                        readOnly={!canEditRequestSettings}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        placeholder="อัปโหลดรูปภาพเพื่อสร้าง path ใน private bucket"
                      />
                    </label>

                    {guide.signedImageUrl ? (
                      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                        <img src={guide.signedImageUrl} alt={`คำแนะนำ ${guide.subject}`} className="max-h-96 w-full object-contain" />
                      </div>
                    ) : (
                      <div className="mt-4 flex min-h-36 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                        <ImageIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        ยังไม่มีรูปภาพ
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/spd-service"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isLoading || isSaving || !canSaveActiveTab}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
