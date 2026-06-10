import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: Record<string, string | undefined>;
};

const FALLBACK = 'ขออภัย ไม่พบข้อมูลในฐานความรู้ของระบบ';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: () => void;
};

type SearchResult = {
  id: string;
  title: string;
  module: string;
  route: string | null;
  question: string;
  answer: string;
  keywords: string[];
  related_roles: string[];
  score: number;
};

function getHeader(req: VercelRequest, name: string) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

function isStrongMatch(result: SearchResult | undefined, route: string | null) {
  if (!result) {
    return false;
  }

  if (route && result.route === route && Number(result.score) >= 35) {
    return true;
  }

  return Number(result.score) >= 50;
}

function cleanGeminiText(value: unknown) {
  return String(value ?? '').trim();
}

async function callGemini(params: {
  apiKey: string;
  model: string;
  question: string;
  route: string | null;
  pageNameTh: string | null;
  moduleNameTh: string | null;
  userRole: string | null;
  sources: SearchResult[];
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

  const sourceText = params.sources
    .map((source, index) => {
      return [
        `แหล่งข้อมูล ${index + 1}`,
        `หัวข้อ: ${source.title}`,
        `โมดูล: ${source.module}`,
        `Route: ${source.route ?? '-'}`,
        `คำถามในฐานความรู้: ${source.question}`,
        `คำตอบในฐานความรู้: ${source.answer}`,
        `คำค้น: ${source.keywords.join(', ')}`,
      ].join('\n');
    })
    .join('\n\n');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: [
              'คุณคือ SPD Assistant สำหรับระบบ PTDMS ขององค์กรภาครัฐ',
              'ตอบเป็นภาษาไทยเท่านั้น',
              'ใช้เฉพาะข้อมูลจากฐานความรู้ที่ให้มาเท่านั้น',
              'ห้ามแต่งข้อมูล ห้ามอ้างความรู้ภายนอก และห้ามเดาจากบริบทอื่น',
              `ถ้าข้อมูลไม่พอ ให้ตอบว่า "${FALLBACK}" เท่านั้น`,
              'ตอบให้กระชับ ชัดเจน และเหมาะกับผู้ใช้ทั่วไป',
            ].join('\n'),
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                `คำถามผู้ใช้: ${params.question}`,
                `Route ปัจจุบัน: ${params.route ?? '-'}`,
                `หน้าปัจจุบัน: ${params.pageNameTh ?? '-'}`,
                `โมดูลปัจจุบัน: ${params.moduleNameTh ?? '-'}`,
                `บทบาทผู้ใช้: ${params.userRole ?? '-'}`,
                '',
                'ฐานความรู้ที่อนุญาตให้ใช้:',
                sourceText,
              ].join('\n'),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 768,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return cleanGeminiText(parts.map((part: { text?: string }) => part.text ?? '').join('\n'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  if (!supabaseUrl || !supabaseAnonKey) {
    sendJson(res, 503, { answer: FALLBACK, matchedKnowledgeId: null, score: null, sources: [] });
    return;
  }

  const authorization = getHeader(req, 'authorization');
  if (!authorization?.startsWith('Bearer ')) {
    sendJson(res, 401, { answer: FALLBACK, matchedKnowledgeId: null, score: null, sources: [] });
    return;
  }

  const body = (req.body ?? {}) as {
    question?: unknown;
    route?: unknown;
    pageNameTh?: unknown;
    moduleNameTh?: unknown;
    userRole?: unknown;
  };

  const question = String(body.question ?? '').trim();
  const route = String(body.route ?? '').trim() || null;
  const pageNameTh = String(body.pageNameTh ?? '').trim() || null;
  const moduleNameTh = String(body.moduleNameTh ?? '').trim() || null;
  const userRole = String(body.userRole ?? '').trim() || null;

  if (!question) {
    sendJson(res, 200, { answer: FALLBACK, matchedKnowledgeId: null, score: null, sources: [] });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    sendJson(res, 401, { answer: FALLBACK, matchedKnowledgeId: null, score: null, sources: [] });
    return;
  }

  const { data: resultsData, error: searchError } = await supabase.rpc('search_spd_assistant_knowledge', {
    p_query: question,
    p_route: route,
    p_module: moduleNameTh,
    p_limit: 5,
  });

  if (searchError) {
    sendJson(res, 200, { answer: FALLBACK, matchedKnowledgeId: null, score: null, sources: [] });
    return;
  }

  const sources = (resultsData ?? []) as SearchResult[];
  const bestMatch = sources[0];
  if (!isStrongMatch(bestMatch, route)) {
    sendJson(res, 200, { answer: FALLBACK, matchedKnowledgeId: null, score: null, sources: [] });
    return;
  }

  if (!geminiApiKey) {
    sendJson(res, 200, {
      answer: bestMatch.answer || FALLBACK,
      matchedKnowledgeId: bestMatch.id,
      score: bestMatch.score,
      sources,
    });
    return;
  }

  try {
    const geminiAnswer = await callGemini({
      apiKey: geminiApiKey,
      model: geminiModel,
      question,
      route,
      pageNameTh,
      moduleNameTh,
      userRole,
      sources,
    });

    const answer = geminiAnswer || bestMatch.answer || FALLBACK;
    sendJson(res, 200, {
      answer,
      matchedKnowledgeId: answer === FALLBACK ? null : bestMatch.id,
      score: answer === FALLBACK ? null : bestMatch.score,
      sources: answer === FALLBACK ? [] : sources,
    });
  } catch (error) {
    sendJson(res, 200, {
      answer: bestMatch.answer || FALLBACK,
      matchedKnowledgeId: bestMatch.id,
      score: bestMatch.score,
      sources,
    });
  }
}
