import { useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Loader2, Plus, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  deactivateLoginIpRule,
  getLoginIpBlockSettings,
  listLoginIpRules,
  saveLoginIpRule,
  updateLoginIpBlockSettings,
  type LoginIpSettingsInput,
} from '../../services/loginIpBlock.service';
import type { LoginIpRule } from '../../types/database.types';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const defaultSettings: LoginIpSettingsInput = {
  enabled: true,
  attempt_limit: 10,
  window_minutes: 5,
  permanent_block: true,
  auto_unblock_days: 1,
};

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function isValidIp(value: string) {
  const ip = value.trim();
  if (!ip || ip.length > 64 || !/^[0-9a-fA-F:.]+$/.test(ip)) return false;
  if (ip.includes(':')) return true;
  const parts = ip.split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

export function LoginIpBlockPanel() {
  const [settings, setSettings] = useState<LoginIpSettingsInput>(defaultSettings);
  const [rules, setRules] = useState<LoginIpRule[]>([]);
  const [ruleType, setRuleType] = useState<LoginIpRule['rule_type']>('block');
  const [ipAddress, setIpAddress] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<LoginIpRule | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSettings, nextRules] = await Promise.all([
        getLoginIpBlockSettings(),
        listLoginIpRules(),
      ]);
      setSettings({
        enabled: nextSettings.enabled,
        attempt_limit: nextSettings.attempt_limit,
        window_minutes: nextSettings.window_minutes,
        permanent_block: nextSettings.permanent_block,
        auto_unblock_days: nextSettings.auto_unblock_days,
      });
      setRules(nextRules);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดการตั้งค่าและรายการ IP ได้ กรุณาเข้าสู่ระบบด้วย MFA'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const visibleRules = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rules.filter((rule) => rule.rule_type === ruleType
      && (!keyword || rule.ip_address.toLowerCase().includes(keyword) || rule.reason.toLowerCase().includes(keyword)));
  }, [rules, ruleType, search]);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateLoginIpBlockSettings(settings);
      setSettings(updated);
      setMessage('บันทึกการตั้งค่าบล็อก IP แล้ว');
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถบันทึกการตั้งค่าได้'));
    } finally {
      setSaving(false);
    }
  };

  const createRule = async () => {
    if (!isValidIp(ipAddress)) {
      setError('กรุณาระบุ IPv4 หรือ IPv6 ที่ถูกต้อง');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveLoginIpRule({ ipAddress, ruleType, reason: reason || (ruleType === 'block' ? 'บล็อกโดย Super Admin' : 'อนุญาตโดย Super Admin') });
      setIpAddress('');
      setReason('');
      setMessage(ruleType === 'block' ? 'เพิ่ม IP ในรายการบล็อกแล้ว' : 'เพิ่ม IP ในรายการอนุญาตแล้ว');
      setRules(await listLoginIpRules());
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถบันทึกรายการ IP ได้'));
    } finally {
      setSaving(false);
    }
  };

  const deactivateRule = async () => {
    if (!pendingDeactivate) return;
    setSaving(true);
    setError(null);
    try {
      await deactivateLoginIpRule(pendingDeactivate.id);
      setPendingDeactivate(null);
      setMessage('ปิดใช้งานกฎ IP แล้ว');
      setRules(await listLoginIpRules());
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถปิดใช้งานกฎ IP ได้'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />กำลังโหลดการตั้งค่า IP...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Ban className="mt-0.5 h-5 w-5 text-red-600" />
            <div><h2 className="font-bold text-slate-950">ป้องกันการลองเข้าสู่ระบบผิดปกติตาม IP</h2><p className="mt-1 text-sm text-slate-500">บล็อกอัตโนมัติเมื่อจำนวนครั้งล้มเหลวถึงเกณฑ์ และปลดบล็อกได้โดย Super Admin</p></div>
          </div>
          <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />โหลดใหม่</button>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-800"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4" />เปิดใช้งานบล็อก IP อัตโนมัติ</label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-600">จำนวนครั้งที่ล้มเหลว<input type="number" min={3} max={100} value={settings.attempt_limit} onChange={(event) => setSettings((current) => ({ ...current, attempt_limit: Math.max(3, Math.min(100, Number(event.target.value) || 3)) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-600">ภายใน (นาที)<input type="number" min={1} max={1440} value={settings.window_minutes} onChange={(event) => setSettings((current) => ({ ...current, window_minutes: Math.max(1, Math.min(1440, Number(event.target.value) || 1)) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={settings.permanent_block} onChange={(event) => setSettings((current) => ({ ...current, permanent_block: event.target.checked }))} />บล็อกจนกว่า Super Admin ปลด</label>
          <label className="text-sm text-slate-600">ปลดอัตโนมัติหลัง (วัน)<input type="number" min={1} max={365} disabled={settings.permanent_block} value={settings.auto_unblock_days} onChange={(event) => setSettings((current) => ({ ...current, auto_unblock_days: Math.max(1, Math.min(365, Number(event.target.value) || 1)) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
        </div>
        <button type="button" disabled={saving} onClick={() => void saveSettings()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />บันทึกการตั้งค่า</button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          {([{ value: 'block', label: 'รายการบล็อก', icon: Ban }, { value: 'allow', label: 'รายการอนุญาต', icon: ShieldCheck }] as const).map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.value} type="button" onClick={() => setRuleType(tab.value)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${ruleType === tab.value ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`}><Icon className="h-4 w-4" />{tab.label}</button>;
          })}
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[220px_1fr_auto]">
          <input value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} placeholder="IP เช่น 203.0.113.10" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="เหตุผล (ไม่บังคับ)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" disabled={saving} onClick={() => void createRule()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />เพิ่มรายการ</button>
        </div>

        {message ? <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="border-b border-slate-200 p-4"><label className="relative block max-w-md"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา IP หรือเหตุผล" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-4 py-3">IP Address</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ที่มา / จำนวนครั้ง</th><th className="px-4 py-3">เหตุผล</th><th className="px-4 py-3">วันเวลา</th><th className="px-4 py-3 text-right">จัดการ</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRules.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">ไม่มีข้อมูล</td></tr> : visibleRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{rule.ip_address}</td>
                  <td className="px-4 py-3">{rule.is_active ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${rule.rule_type === 'block' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}><CheckCircle2 className="h-3.5 w-3.5" />ใช้งาน</span> : <span className="text-slate-400">ปิดแล้ว</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{rule.source === 'automatic' ? 'อัตโนมัติ' : 'Super Admin'}{rule.failed_attempt_count > 0 ? ` · ${rule.failed_attempt_count} ครั้ง` : ''}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{rule.reason || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(rule.blocked_at || rule.updated_at)}{rule.expires_at ? <span className="block">สิ้นสุด {formatDateTime(rule.expires_at)}</span> : null}</td>
                  <td className="px-4 py-3 text-right">{rule.is_active ? <button type="button" onClick={() => setPendingDeactivate(rule)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{rule.rule_type === 'block' ? 'ปลดบล็อก' : 'ปิดใช้งาน'}</button> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal isOpen={pendingDeactivate !== null} onClose={() => setPendingDeactivate(null)} onConfirm={() => void deactivateRule()} title={pendingDeactivate?.rule_type === 'block' ? 'ยืนยันการปลดบล็อก IP' : 'ยืนยันการปิดรายการอนุญาต'} message={pendingDeactivate ? `IP ${pendingDeactivate.ip_address} จะถูกปิดใช้งานจากรายการนี้` : ''} confirmLabel="ยืนยัน" isLoading={saving} variant="warning" />
    </div>
  );
}
