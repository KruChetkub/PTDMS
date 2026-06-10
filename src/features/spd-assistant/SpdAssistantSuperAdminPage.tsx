import { useEffect, useMemo, useState } from 'react';
import { Bot, Database, MessageSquare, RefreshCw, ShieldAlert, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  listSpdAssistantConversations,
  listSpdAssistantFeedback,
  listSpdAssistantKnowledge,
} from '../../services/spd-assistant.service';

type ConversationRow = {
  id: string;
  user_id: string | null;
  route: string | null;
  page_name_th: string | null;
  module_name_th: string | null;
  user_role: string | null;
  created_at: string;
};

type FeedbackRow = {
  id: string;
  message_id: string;
  user_id: string | null;
  rating: 'helpful' | 'not_helpful';
  comment: string | null;
  created_at: string;
};

export function SpdAssistantSuperAdminPage() {
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [activeKnowledgeCount, setActiveKnowledgeCount] = useState(0);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const feedbackStats = useMemo(
    () => ({
      helpful: feedback.filter((item) => item.rating === 'helpful').length,
      notHelpful: feedback.filter((item) => item.rating === 'not_helpful').length,
    }),
    [feedback],
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [knowledge, conversationRows, feedbackRows] = await Promise.all([
        listSpdAssistantKnowledge(''),
        listSpdAssistantConversations(),
        listSpdAssistantFeedback(),
      ]);

      setKnowledgeCount(knowledge.length);
      setActiveKnowledgeCount(knowledge.filter((record) => record.active).length);
      setConversations(conversationRows as ConversationRow[]);
      setFeedback(feedbackRows as FeedbackRow[]);
    } catch (loadError) {
      console.error('Failed to load SPD Assistant super admin data:', loadError);
      setError('ไม่สามารถโหลดข้อมูลควบคุม SPD Assistant ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SPD Assistant Super Admin"
        description="ศูนย์ควบคุมระดับสูงสำหรับตรวจสอบฐานความรู้ ประวัติการใช้งาน feedback และข้อกำหนดความปลอดภัยของ SPD Assistant"
      />

      {error ? <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Database className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Knowledge
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{knowledgeCount}</div>
          <p className="mt-1 text-xs text-slate-500">{activeKnowledgeCount} active</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MessageSquare className="h-4 w-4 text-cyan-600" aria-hidden="true" />
            Conversations
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{conversations.length}</div>
          <p className="mt-1 text-xs text-slate-500">latest 100</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ThumbsUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Helpful
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{feedbackStats.helpful}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ThumbsDown className="h-4 w-4 text-red-600" aria-hidden="true" />
            Not Helpful
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{feedbackStats.notHelpful}</div>
        </div>
      </div>

      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">Production Guardrails</h2>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-emerald-800">
              <li>Assistant ตอบเป็นภาษาไทยเท่านั้น</li>
              <li>คำตอบมาจาก `spd_assistant_knowledge.answer` เท่านั้น ไม่มี free-form generation</li>
              <li>หากไม่พบข้อมูล ต้องตอบว่า "ขออภัย ไม่พบข้อมูลในฐานความรู้ของระบบ"</li>
              <li>RLS จำกัด knowledge ตาม role และจำกัดหน้า control ตาม super_admin/admin</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Bot className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Conversation Audit
            </h2>
            <button
              type="button"
              onClick={() => loadData()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">กำลังโหลดข้อมูล</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">ยังไม่มี conversation</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{conversation.route || '-'}</div>
                        <div className="text-xs text-slate-500">{conversation.page_name_th || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{conversation.user_role || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(conversation.created_at).toLocaleString('th-TH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Feedback Review
            </h2>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">กำลังโหลด feedback</div>
            ) : feedback.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">ยังไม่มี feedback</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {feedback.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={item.rating === 'helpful' ? 'text-sm font-semibold text-emerald-700' : 'text-sm font-semibold text-red-700'}>
                        {item.rating === 'helpful' ? 'Helpful' : 'Not helpful'}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('th-TH')}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.comment || 'ไม่มี comment'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
