import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BellRing, CheckCircle2, RefreshCw, Save } from 'lucide-react';
import {
  defaultSpdServiceTelegramMessageTemplate,
  getSpdServiceAdminRecipients,
  getSpdServiceTelegramSettings,
  saveSpdServiceTelegramSettings,
} from '../../services/spd-service.service';
import { useAuthStore } from '../../stores/auth.store';
import type { Profile } from '../../types/database.types';
import { cn } from '../../utils/cn';

export function SpdServiceTelegramSettingsPage() {
  const { profile } = useAuthStore();
  const canEditSettings = profile?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<'notification' | 'message'>('notification');
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [chatId, setChatId] = useState('');
  const [adminRecipientIds, setAdminRecipientIds] = useState<string[]>([]);
  const [adminUsernames, setAdminUsernames] = useState<Record<string, string>>({});
  const [messageTemplate, setMessageTemplate] = useState(defaultSpdServiceTelegramMessageTemplate);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedAdminCount = useMemo(
    () => admins.filter((admin) => adminRecipientIds.includes(admin.user_id)).length,
    [adminRecipientIds, admins],
  );

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const [adminData, telegramSettings] = await Promise.all([
        getSpdServiceAdminRecipients(),
        getSpdServiceTelegramSettings(),
      ]);

      setAdmins(adminData);
      setEnabled(telegramSettings.enabled);
      setChatId(telegramSettings.chatId);
      setAdminRecipientIds(telegramSettings.adminRecipientIds);
      setAdminUsernames(telegramSettings.adminUsernames);
      setMessageTemplate(telegramSettings.messageTemplate);
    } catch (loadError) {
      console.error('Failed to load SPD Service Telegram settings:', loadError);
      setError('ไม่สามารถโหลดการตั้งค่า Telegram ได้');
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.user_id) {
      setError('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (!canEditSettings) {
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

      setSuccess('บันทึกการตั้งค่า Telegram สำหรับ SPD Service เรียบร้อยแล้ว');
    } catch (saveError) {
      console.error('Failed to save SPD Service Telegram settings:', saveError);
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
              กลับแดชบอร์ด SPD Service
            </Link>
            <h1 className="truncate text-2xl font-semibold text-slate-950">Telegram Notification Settings</h1>
            <p className="mt-1 text-sm text-slate-500">ตั้งค่าการแจ้งเตือนเฉพาะระบบ SPD Service สำหรับ Super Admin เท่านั้น</p>
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

        {!canEditSettings ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            หน้านี้เป็นโหมดดูข้อมูลสำหรับ Admin/Executive เฉพาะ Super Admin เท่านั้นที่แก้ไขและบันทึกการตั้งค่าได้
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab('notification')}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-semibold transition',
                  activeTab === 'notification' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                ตั้งค่าการแจ้งเตือน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('message')}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-semibold transition',
                  activeTab === 'message' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                ตั้งค่าข้อความที่ส่ง
              </button>
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
                        ใช้สำหรับเก็บค่ากลุ่ม Telegram และรายชื่อ Admin ที่ต้องการให้ระบบ SPD Service แจ้งเตือน
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-700">
                    <span className={cn('rounded-full px-3 py-1.5 transition', !enabled && 'bg-white shadow-sm')}>ปิด</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => setEnabled(event.target.checked)}
                      disabled={!canEditSettings}
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
                    readOnly={!canEditSettings}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="-1001234567890"
                  />
                  <span className="mt-1 block text-xs text-slate-500">เก็บเฉพาะ Chat ID ของกลุ่ม Telegram สำหรับ SPD Service</span>
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
                              disabled={!canEditSettings}
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
                                readOnly={!canEditSettings}
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
          ) : (
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Template ข้อความ Telegram</h2>
                  <p className="mt-1 text-sm text-slate-500">แก้ไขข้อความที่ bot ส่งเข้ากลุ่มเมื่อมีคำขอใหม่</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMessageTemplate(defaultSpdServiceTelegramMessageTemplate)}
                  disabled={!canEditSettings}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  คืนค่าเริ่มต้น
                </button>
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">ข้อความที่ส่งเข้า Telegram</span>
                <textarea
                  value={messageTemplate}
                  onChange={(event) => setMessageTemplate(event.target.value)}
                  readOnly={!canEditSettings}
                  className="mt-1 min-h-96 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

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
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/spd-service"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isLoading || isSaving || !canEditSettings}
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
