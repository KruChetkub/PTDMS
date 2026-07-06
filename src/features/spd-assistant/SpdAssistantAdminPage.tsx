import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Database, Edit3, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';
import {
  listSpdAssistantKnowledge,
  saveSpdAssistantKnowledge,
  type SpdAssistantKnowledgeRecord,
} from '../../services/spd-assistant.service';

const roleOptions: UserRole[] = ['super_admin', 'admin', 'executive', 'hr', 'personnel'];

type FormState = {
  id: string;
  title: string;
  module: string;
  route: string;
  keywords: string;
  question: string;
  answer: string;
  related_roles: UserRole[];
  content_type: string;
  priority: number;
  active: boolean;
};

const emptyForm: FormState = {
  id: '',
  title: '',
  module: '',
  route: '',
  keywords: '',
  question: '',
  answer: '',
  related_roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
  content_type: 'faq',
  priority: 100,
  active: true,
};

function toForm(record: SpdAssistantKnowledgeRecord): FormState {
  return {
    id: record.id,
    title: record.title,
    module: record.module,
    route: record.route ?? '',
    keywords: record.keywords.join(', '),
    question: record.question,
    answer: record.answer,
    related_roles: record.related_roles,
    content_type: record.content_type,
    priority: record.priority,
    active: record.active,
  };
}

export function SpdAssistantAdminPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<SpdAssistantKnowledgeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => records.filter((record) => record.active).length, [records]);

  const loadRecords = async (term = searchTerm) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listSpdAssistantKnowledge(term);
      setRecords(data);
    } catch (loadError) {
      console.error('Failed to load DSP knowledge:', loadError);
      setError('ไม่สามารถโหลดฐานความรู้ DSP Assistant ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveSpdAssistantKnowledge({
        id: form.id || undefined,
        title: form.title.trim(),
        module: form.module.trim(),
        route: form.route.trim() || null,
        keywords: form.keywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        question: form.question.trim(),
        answer: form.answer.trim(),
        related_roles: form.related_roles,
        content_type: form.content_type.trim() || 'faq',
        priority: Number(form.priority) || 100,
        active: form.active,
        user_id: user?.id ?? null,
      });

      setMessage('บันทึกฐานความรู้เรียบร้อยแล้ว');
      setForm(emptyForm);
      await loadRecords();
    } catch (saveError) {
      console.error('Failed to save DSP knowledge:', saveError);
      setError('ไม่สามารถบันทึกฐานความรู้ได้');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: UserRole) => {
    setForm((current) => {
      const hasRole = current.related_roles.includes(role);
      const nextRoles = hasRole
        ? current.related_roles.filter((currentRole) => currentRole !== role)
        : [...current.related_roles, role];

      return {
        ...current,
        related_roles: nextRoles.length > 0 ? nextRoles : current.related_roles,
      };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="DSP Assistant Knowledge"
        description="จัดการฐานความรู้ภาษาไทยที่ DSP Assistant ใช้ตอบคำถาม ผู้ช่วยจะตอบจากรายการที่ active และตรงกับสิทธิ์ของผู้ใช้เท่านั้น"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Database className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Knowledge Records
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{records.length}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Active Records
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-slate-700" aria-hidden="true" />
            Policy
          </div>
          <p className="mt-2 text-sm text-slate-600">ตอบจากฐานความรู้เท่านั้น และต้องเป็นภาษาไทย</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Bot className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {form.id ? 'แก้ไข Knowledge Record' : 'เพิ่ม Knowledge Record'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Module
                <input
                  value={form.module}
                  onChange={(event) => setForm((current) => ({ ...current, module: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Route
                <input
                  value={form.route}
                  onChange={(event) => setForm((current) => ({ ...current, route: event.target.value }))}
                  placeholder="/records"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Type
                <input
                  value={form.content_type}
                  onChange={(event) => setForm((current) => ({ ...current, content_type: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Keywords
              <input
                value={form.keywords}
                onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
                placeholder="คั่นคำด้วย comma"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Question
              <textarea
                value={form.question}
                onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                required
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Answer
              <textarea
                value={form.answer}
                onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
                required
                rows={5}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div>
              <div className="text-sm font-medium text-slate-700">Related Roles</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <label key={role} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.related_roles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Priority
                <input
                  type="number"
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Active
              </label>
            </div>

            {message ? <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {saving ? 'กำลังบันทึก' : 'บันทึก'}
              </button>
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Knowledge Records</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="ค้นหา"
                    className="w-48 rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadRecords(searchTerm)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  โหลด
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[720px] overflow-auto">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">กำลังโหลดฐานความรู้</div>
            ) : records.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">ไม่พบ records</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {records.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setForm(toForm(record))}
                    className="block w-full p-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{record.title}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{record.content_type}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{record.route || '-'} · {record.module}</div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{record.question}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={record.active ? 'text-xs font-medium text-emerald-600' : 'text-xs font-medium text-slate-400'}>
                          {record.active ? 'active' : 'inactive'}
                        </span>
                        <Edit3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
