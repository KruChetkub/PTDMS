import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/roles';
import { reportClientError } from '../utils/errorHandling';

export const SPD_ASSISTANT_FALLBACK = 'ขออภัย ไม่พบข้อมูลในฐานความรู้ของระบบ';

export type SpdAssistantPageContext = {
  route: string;
  page_name_th: string;
  module_name_th: string;
  description_th: string;
  help_text_th: string;
  available_actions_th: string[];
  common_questions_th: string[];
  related_roles: UserRole[];
};

export type SpdAssistantKnowledgeRecord = {
  id: string;
  title: string;
  module: string;
  route: string | null;
  keywords: string[];
  question: string;
  answer: string;
  related_roles: UserRole[];
  content_type: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SpdAssistantSearchResult = {
  id: string;
  title: string;
  module: string;
  route: string | null;
  question: string;
  answer: string;
  keywords: string[];
  related_roles: UserRole[];
  score: number;
};

export type AskSpdAssistantPayload = {
  question: string;
  route: string;
  pageNameTh?: string | null;
  moduleNameTh?: string | null;
  userRole?: UserRole | null;
  userId?: string | null;
  conversationId?: string | null;
};

export type AskSpdAssistantResponse = {
  answer: string;
  conversationId: string | null;
  matchedKnowledgeId: string | null;
  score: number | null;
  sources: SpdAssistantSearchResult[];
};

type GeminiAssistantResponse = {
  answer: string;
  matchedKnowledgeId: string | null;
  score: number | null;
  sources: SpdAssistantSearchResult[];
};

function normalizeRoute(pathname: string) {
  if (/^\/personnel\/[^/]+$/.test(pathname)) {
    return '/personnel/:id';
  }

  return pathname || '/';
}

function isStrongMatch(result: SpdAssistantSearchResult | undefined, route: string) {
  if (!result) {
    return false;
  }

  if (result.route === route && result.score >= 35) {
    return true;
  }

  return result.score >= 50;
}

function logAssistantError(message: string, error: unknown) {
  void reportClientError(`[DSP Assistant] ${message}`, error);
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`).replace(/[(),]/g, ' ');
}

function normalizeKeywords(keywords: string[]) {
  return keywords.map((keyword) => keyword.trim()).filter(Boolean);
}

export function getSpdAssistantRoute(pathname: string) {
  return normalizeRoute(pathname);
}

export async function getSpdAssistantPageContext(route: string) {
  try {
    const { data, error } = await (supabase as any).rpc('get_spd_assistant_page_context', {
      p_route: normalizeRoute(route),
    });

    if (error) throw error;
    return (Array.isArray(data) ? data[0] : data) as SpdAssistantPageContext | null;
  } catch (error) {
    logAssistantError('Page context retrieval failed.', error);
    return null;
  }
}

export async function searchSpdAssistantKnowledge(question: string, route: string, moduleName?: string | null) {
  const { data, error } = await (supabase as any).rpc('search_spd_assistant_knowledge', {
    p_query: question,
    p_route: normalizeRoute(route),
    p_module: moduleName ?? null,
    p_limit: 5,
  });

  if (error) throw error;
  return (data ?? []) as SpdAssistantSearchResult[];
}

async function askSpdAssistantGemini(payload: AskSpdAssistantPayload & { route: string }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('DSP Assistant Gemini endpoint requires an authenticated session.');
  }

  const response = await fetch('/api/spd-assistant-gemini', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: payload.question,
      route: payload.route,
      pageNameTh: payload.pageNameTh ?? null,
      moduleNameTh: payload.moduleNameTh ?? null,
      userRole: payload.userRole ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`DSP Assistant Gemini endpoint failed with status ${response.status}.`);
  }

  return (await response.json()) as GeminiAssistantResponse;
}

async function getExtractiveAnswer(question: string, route: string, moduleNameTh?: string | null) {
  const results = await searchSpdAssistantKnowledge(question, route, moduleNameTh);
  const bestMatch = results[0];
  const answer = isStrongMatch(bestMatch, route) ? bestMatch.answer : SPD_ASSISTANT_FALLBACK;

  return {
    answer,
    matchedKnowledgeId: answer === SPD_ASSISTANT_FALLBACK ? null : bestMatch.id,
    score: answer === SPD_ASSISTANT_FALLBACK ? null : bestMatch.score,
    sources: answer === SPD_ASSISTANT_FALLBACK ? [] : results,
  };
}

async function createConversation(payload: AskSpdAssistantPayload) {
  if (!payload.userId) {
    return null;
  }

  const { data, error } = await (supabase as any)
    .from('spd_assistant_conversations')
    .insert({
      user_id: payload.userId,
      route: normalizeRoute(payload.route),
      page_name_th: payload.pageNameTh ?? null,
      module_name_th: payload.moduleNameTh ?? null,
      user_role: payload.userRole ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data?.id as string;
}

async function safeCreateConversation(payload: AskSpdAssistantPayload) {
  try {
    return await createConversation(payload);
  } catch (error) {
    logAssistantError('Conversation audit creation failed.', error);
    return null;
  }
}

async function insertMessage(params: {
  conversationId: string | null;
  userId?: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  route: string;
  matchedKnowledgeId?: string | null;
  score?: number | null;
}) {
  if (!params.conversationId || !params.userId) {
    return null;
  }

  const { data, error } = await (supabase as any)
    .from('spd_assistant_messages')
    .insert({
      conversation_id: params.conversationId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
      route: normalizeRoute(params.route),
      matched_knowledge_id: params.matchedKnowledgeId ?? null,
      score: params.score ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data?.id as string;
}

async function safeInsertMessage(params: Parameters<typeof insertMessage>[0]) {
  try {
    return await insertMessage(params);
  } catch (error) {
    logAssistantError('Message audit insert failed.', error);
    return null;
  }
}

export async function askSpdAssistant(payload: AskSpdAssistantPayload): Promise<AskSpdAssistantResponse> {
  const question = payload.question.trim();
  if (!question) {
    return {
      answer: SPD_ASSISTANT_FALLBACK,
      conversationId: payload.conversationId ?? null,
      matchedKnowledgeId: null,
      score: null,
      sources: [],
    };
  }

  const route = normalizeRoute(payload.route);
  const conversationId = payload.conversationId ?? (await safeCreateConversation({ ...payload, route }));

  await safeInsertMessage({
    conversationId,
    userId: payload.userId,
    role: 'user',
    content: question,
    route,
  });

  let assistantResponse: GeminiAssistantResponse;
  try {
    assistantResponse = await askSpdAssistantGemini({ ...payload, question, route });
  } catch (error) {
    logAssistantError('Gemini assistant endpoint failed. Falling back to extractive retrieval.', error);

    try {
      assistantResponse = await getExtractiveAnswer(question, route, payload.moduleNameTh);
    } catch (searchError) {
      logAssistantError('Knowledge search failed.', searchError);
      await safeInsertMessage({
        conversationId,
        userId: payload.userId,
        role: 'assistant',
        content: SPD_ASSISTANT_FALLBACK,
        route,
      });

      return {
        answer: SPD_ASSISTANT_FALLBACK,
        conversationId,
        matchedKnowledgeId: null,
        score: null,
        sources: [],
      };
    }
  }

  const answer = assistantResponse.answer || SPD_ASSISTANT_FALLBACK;
  const matchedKnowledgeId = answer === SPD_ASSISTANT_FALLBACK ? null : assistantResponse.matchedKnowledgeId;
  const score = answer === SPD_ASSISTANT_FALLBACK ? null : assistantResponse.score;
  const sources = answer === SPD_ASSISTANT_FALLBACK ? [] : assistantResponse.sources;

  if (answer === SPD_ASSISTANT_FALLBACK) {
    await safeInsertMessage({
      conversationId,
      userId: payload.userId,
      role: 'assistant',
      content: SPD_ASSISTANT_FALLBACK,
      route,
    });

    return {
      answer: SPD_ASSISTANT_FALLBACK,
      conversationId,
      matchedKnowledgeId: null,
      score: null,
      sources: [],
    };
  }

  await safeInsertMessage({
    conversationId,
    userId: payload.userId,
    role: 'assistant',
    content: answer,
    route,
    matchedKnowledgeId,
    score,
  });

  return {
    answer,
    conversationId,
    matchedKnowledgeId,
    score,
    sources,
  };
}

export async function listSpdAssistantKnowledge(searchTerm = '') {
  let query = (supabase as any)
    .from('spd_assistant_knowledge')
    .select('*')
    .order('priority', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(200);

  const keyword = searchTerm.trim();
  if (keyword) {
    const safeKeyword = escapeIlikeTerm(keyword);
    query = query.or(
      `title.ilike.%${safeKeyword}%,question.ilike.%${safeKeyword}%,answer.ilike.%${safeKeyword}%,module.ilike.%${safeKeyword}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SpdAssistantKnowledgeRecord[];
}

export type SaveSpdAssistantKnowledgePayload = {
  id?: string;
  title: string;
  module: string;
  route?: string | null;
  keywords: string[];
  question: string;
  answer: string;
  related_roles: UserRole[];
  content_type: string;
  priority: number;
  active: boolean;
  user_id?: string | null;
};

export async function saveSpdAssistantKnowledge(payload: SaveSpdAssistantKnowledgePayload) {
  const title = payload.title.trim();
  const module = payload.module.trim();
  const question = payload.question.trim();
  const answer = payload.answer.trim();

  if (!title || !module || !question || !answer || payload.related_roles.length === 0) {
    throw new Error('DSP Assistant knowledge requires title, module, question, answer, and at least one role.');
  }

  const record = {
    title,
    module,
    route: payload.route?.trim() || null,
    keywords: normalizeKeywords(payload.keywords),
    question,
    answer,
    related_roles: payload.related_roles,
    content_type: payload.content_type,
    priority: payload.priority,
    active: payload.active,
    updated_by: payload.user_id ?? null,
  };

  if (payload.id) {
    const { error } = await (supabase as any)
      .from('spd_assistant_knowledge')
      .update(record)
      .eq('id', payload.id);
    if (error) throw error;
    return;
  }

  const { error } = await (supabase as any)
    .from('spd_assistant_knowledge')
    .insert({ ...record, created_by: payload.user_id ?? null });
  if (error) throw error;
}

export async function listSpdAssistantConversations() {
  const { data, error } = await (supabase as any)
    .from('spd_assistant_conversations')
    .select('id, user_id, route, page_name_th, module_name_th, user_role, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function listSpdAssistantFeedback() {
  const { data, error } = await (supabase as any)
    .from('spd_assistant_feedback')
    .select('id, message_id, user_id, rating, comment, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}
