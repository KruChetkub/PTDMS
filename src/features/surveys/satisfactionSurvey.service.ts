import { supabase } from '../../lib/supabase';
import type {
  Profile,
  SmartDspSurvey,
  SmartDspSurveyAnswer,
  SmartDspSurveyContextSettings,
  SmartDspSurveyQuestion,
  SmartDspSurveyRatingOption,
  SmartDspSurveyRespondentContext,
  SmartDspSurveyResponse,
} from '../../types/database.types';
import { optionalPlainTextInput, sanitizePlainTextInput } from '../../utils/inputSecurity';
import {
  createDefaultSurveyContextSettings,
} from './satisfactionSurvey.constants';

export const SMARTDSP_SURVEY_CODE = 'smartdsp-satisfaction';
export const SYSTEM_SURVEY_CONFIGS = [
  {
    code: SMARTDSP_SURVEY_CODE,
    shortTitle: 'ภาพรวม SmartDSP',
    title: 'แบบสำรวจความพึงพอใจ SmartDSP',
    description: 'ประเมินภาพรวมการใช้งานระบบ SmartDSP',
  },
  {
    code: 'ptdms-training-development',
    shortTitle: 'ระบบฝึกอบรมและบุคลากร',
    title: 'ระบบบริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากร',
    description: 'ประเมินระบบ PTDMS ด้านข้อมูลการฝึกอบรมและการพัฒนาบุคลากร',
  },
  {
    code: 'strategy-calendar-meeting-room',
    shortTitle: 'กิจกรรมและห้องประชุม',
    title: 'ระบบบันทึกกิจกรรมสำคัญและการจองห้องประชุม',
    description: 'ประเมินระบบกิจกรรมสำคัญ ปฏิทิน และการจองห้องประชุม',
  },
  {
    code: 'budget-utilization-dashboard',
    shortTitle: 'งบประมาณ',
    title: 'แดชบอร์ดติดตามการใช้จ่ายงบประมาณ',
    description: 'ประเมินแดชบอร์ดติดตามการใช้จ่ายงบประมาณ กองยุทธศาสตร์และแผนงาน',
  },
  {
    code: 'spd-service-management',
    shortTitle: 'บริการสารสนเทศ',
    title: 'ระบบแจ้งขอรับบริการและงานสนับสนุนด้านสารสนเทศ',
    description: 'ประเมินระบบแจ้งขอรับบริการและติดตามงานสนับสนุนด้านสารสนเทศ',
  },
] as const;

export type SystemSurveyCode = (typeof SYSTEM_SURVEY_CONFIGS)[number]['code'];
export const APP_SYSTEM_SURVEY_CONFIGS = SYSTEM_SURVEY_CONFIGS.filter((config) => config.code !== SMARTDSP_SURVEY_CODE);

export function getSystemSurveyConfig(code?: string) {
  return SYSTEM_SURVEY_CONFIGS.find((config) => config.code === code) || SYSTEM_SURVEY_CONFIGS[0];
}
export const SMARTDSP_SURVEY_LONG_TEXT_MAX_LENGTH = 8000;
export const SMARTDSP_SURVEY_PDPA_ACKNOWLEDGEMENT = 'ข้าพเจ้าได้อ่านและรับทราบคำชี้แจงการคุ้มครองข้อมูลส่วนบุคคลฉบับนี้แล้ว';
export const SMARTDSP_SURVEY_PDPA_CONSENT = 'ข้าพเจ้ายินยอมให้กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค เก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลเพื่อวัตถุประสงค์ที่ระบุไว้ข้างต้น';

export type SurveySubmissionAnswer = {
  question_id: string;
  rating_value?: number;
  text_value?: string;
};

export type SurveyRespondentContextInput = {
  respondent_role: string;
  respondent_role_other?: string;
  usage_frequency: string;
  used_services: string[];
  used_services_other?: string;
  custom_answers: Record<string, string[]>;
};

export type SurveyConsentConfirmation = {
  acknowledged: boolean;
  consented: boolean;
};

export type SatisfactionSurveyBundle = {
  survey: SmartDspSurvey;
  questions: SmartDspSurveyQuestion[];
  ratingOptions: SmartDspSurveyRatingOption[];
  ownResponse: SmartDspSurveyResponse | null;
  ownAnswers: SmartDspSurveyAnswer[];
  ownContext: SmartDspSurveyRespondentContext | null;
  contextSettings: SmartDspSurveyContextSettings;
};

export type SatisfactionSurveyAdminBundle = SatisfactionSurveyBundle & {
  responses: SmartDspSurveyResponse[];
  answers: SmartDspSurveyAnswer[];
  respondents: Profile[];
  respondentContexts: SmartDspSurveyRespondentContext[];
};

export type SatisfactionSurveyDashboardData = {
  surveys: SmartDspSurvey[];
  responses: SmartDspSurveyResponse[];
  answers: SmartDspSurveyAnswer[];
};

export type SatisfactionSurveyDraft = Pick<
  SmartDspSurvey,
  'id' | 'title' | 'description' | 'instructions' | 'status' | 'is_enabled' | 'starts_at' | 'ends_at'
>;

function isOpenNow(survey: SmartDspSurvey) {
  const now = Date.now();
  const startsAt = survey.starts_at ? new Date(survey.starts_at).getTime() : null;
  const endsAt = survey.ends_at ? new Date(survey.ends_at).getTime() : null;

  return survey.status === 'active'
    && survey.is_enabled
    && (startsAt === null || startsAt <= now)
    && (endsAt === null || endsAt > now);
}

async function listSurveysByCode(surveyCode: string = SMARTDSP_SURVEY_CODE) {
  const { data, error } = await supabase
    .from('smartdsp_surveys')
    .select('*')
    .eq('code', surveyCode)
    .order('version', { ascending: false });

  if (error) throw new Error(`โหลดแบบสำรวจไม่สำเร็จ: ${error.message}`);
  return (data || []) as SmartDspSurvey[];
}

async function listPortalSurveys(surveyCode: string = SMARTDSP_SURVEY_CODE) {
  const surveys = await listSurveysByCode(surveyCode);
  return surveys.filter((survey) => survey.is_enabled);
}

async function listOwnResponses(userId: string, surveyIds: string[]) {
  if (surveyIds.length === 0) return [];

  const { data, error } = await supabase
    .from('smartdsp_survey_responses')
    .select('*')
    .eq('respondent_id', userId)
    .in('survey_id', surveyIds)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`ตรวจสอบสถานะการตอบแบบสำรวจไม่สำเร็จ: ${error.message}`);
  return (data || []) as SmartDspSurveyResponse[];
}

async function loadSurveyContent(survey: SmartDspSurvey, ownResponse: SmartDspSurveyResponse | null): Promise<SatisfactionSurveyBundle> {
  const [questionsResult, ratingOptionsResult, answersResult, contextResult, contextSettingsResult] = await Promise.all([
    supabase
      .from('smartdsp_survey_questions')
      .select('*')
      .eq('survey_id', survey.id)
      .eq('is_active', true)
      .order('position', { ascending: true }),
    supabase
      .from('smartdsp_survey_rating_options')
      .select('*')
      .eq('survey_id', survey.id)
      .order('rating_value', { ascending: true }),
    ownResponse
      ? supabase
          .from('smartdsp_survey_answers')
          .select('*')
          .eq('response_id', ownResponse.id)
          .order('question_position', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    ownResponse
      ? supabase
          .from('smartdsp_survey_respondent_contexts')
          .select('*')
          .eq('response_id', ownResponse.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('smartdsp_survey_context_settings')
      .select('*')
      .eq('survey_id', survey.id)
      .maybeSingle(),
  ]);

  if (questionsResult.error) throw new Error(`โหลดคำถามไม่สำเร็จ: ${questionsResult.error.message}`);
  if (ratingOptionsResult.error) throw new Error(`โหลดระดับคะแนนไม่สำเร็จ: ${ratingOptionsResult.error.message}`);
  if (answersResult.error) throw new Error(`โหลดคำตอบของท่านไม่สำเร็จ: ${answersResult.error.message}`);
  if (contextResult.error) throw new Error(`โหลดข้อมูลผู้ตอบแบบสำรวจไม่สำเร็จ: ${contextResult.error.message}`);
  if (contextSettingsResult.error) throw new Error(`โหลดการตั้งค่าข้อมูลผู้ตอบไม่สำเร็จ: ${contextSettingsResult.error.message}`);

  return {
    survey,
    questions: (questionsResult.data || []) as SmartDspSurveyQuestion[],
    ratingOptions: (ratingOptionsResult.data || []) as SmartDspSurveyRatingOption[],
    ownResponse,
    ownAnswers: (answersResult.data || []) as SmartDspSurveyAnswer[],
    ownContext: (contextResult.data || null) as SmartDspSurveyRespondentContext | null,
    contextSettings: (contextSettingsResult.data || createDefaultSurveyContextSettings(survey.id)) as SmartDspSurveyContextSettings,
  };
}

export async function getPortalSurveyState(userId: string, surveyCode: string = SMARTDSP_SURVEY_CODE) {
  const surveys = await listPortalSurveys(surveyCode);
  const ownResponses = await listOwnResponses(userId, surveys.map((survey) => survey.id));
  const ownResponseBySurvey = new Map(ownResponses.map((response) => [response.survey_id, response]));
  const survey = surveys.find(isOpenNow) || surveys.find((item) => ownResponseBySurvey.has(item.id)) || null;

  if (!survey) return null;

  return {
    survey,
    ownResponse: ownResponseBySurvey.get(survey.id) || null,
    isOpen: isOpenNow(survey),
  };
}

export async function loadSatisfactionSurvey(userId: string, surveyCode: string = SMARTDSP_SURVEY_CODE) {
  const state = await getPortalSurveyState(userId, surveyCode);
  if (!state) return null;
  return loadSurveyContent(state.survey, state.ownResponse);
}

export async function submitSatisfactionSurvey(
  surveyId: string,
  answers: SurveySubmissionAnswer[],
  context: SurveyRespondentContextInput,
  consentRecordId: string,
) {
  const { data, error } = await supabase.rpc('submit_smartdsp_survey_with_context', {
    target_survey_id: surveyId,
    submitted_answers: answers,
    respondent_context: context,
    consent_record_id: consentRecordId,
  });

  if (error) throw new Error(`ส่งแบบสำรวจไม่สำเร็จ: ${error.message}`);
  return data as string;
}

export async function acceptSatisfactionSurveyPdpa(surveyId: string, confirmation: SurveyConsentConfirmation) {
  const { data, error } = await supabase.rpc('accept_smartdsp_survey_pdpa', {
    target_survey_id: surveyId,
    consent_confirmation: confirmation,
  });

  if (error) throw new Error(`บันทึกการรับทราบและความยินยอมไม่สำเร็จ: ${error.message}`);
  return data as string;
}

export async function completeSurveyRespondentContext(responseId: string, context: SurveyRespondentContextInput) {
  const { error } = await supabase.rpc('complete_smartdsp_survey_respondent_context', {
    target_response_id: responseId,
    respondent_context: context,
  });
  if (error) throw new Error(`บันทึกข้อมูลการใช้งานระบบไม่สำเร็จ: ${error.message}`);
}

export async function listSurveysForAdmin(surveyCode: string = SMARTDSP_SURVEY_CODE) {
  return listSurveysByCode(surveyCode);
}

export async function loadSurveyForAdmin(surveyId?: string, surveyCode: string = SMARTDSP_SURVEY_CODE): Promise<SatisfactionSurveyAdminBundle | null> {
  const surveys = await listSurveysForAdmin(surveyCode);
  const survey = (surveyId ? surveys.find((item) => item.id === surveyId) : surveys[0]) || null;
  if (!survey) return null;

  const [questionsResult, ratingOptionsResult, responsesResult, contextSettingsResult] = await Promise.all([
    supabase.from('smartdsp_survey_questions').select('*').eq('survey_id', survey.id).order('position', { ascending: true }),
    supabase.from('smartdsp_survey_rating_options').select('*').eq('survey_id', survey.id).order('rating_value', { ascending: true }),
    supabase.from('smartdsp_survey_responses').select('*').eq('survey_id', survey.id).order('submitted_at', { ascending: false }),
    supabase.from('smartdsp_survey_context_settings').select('*').eq('survey_id', survey.id).maybeSingle(),
  ]);

  if (questionsResult.error) throw new Error(`โหลดคำถามสำหรับผู้ดูแลไม่สำเร็จ: ${questionsResult.error.message}`);
  if (ratingOptionsResult.error) throw new Error(`โหลดระดับคะแนนสำหรับผู้ดูแลไม่สำเร็จ: ${ratingOptionsResult.error.message}`);
  if (responsesResult.error) throw new Error(`โหลดผลตอบแบบสำรวจไม่สำเร็จ: ${responsesResult.error.message}`);
  if (contextSettingsResult.error) throw new Error(`โหลดการตั้งค่าข้อมูลผู้ตอบไม่สำเร็จ: ${contextSettingsResult.error.message}`);

  const responses = (responsesResult.data || []) as SmartDspSurveyResponse[];
  const responseIds = responses.map((response) => response.id);
  const respondentIds = [...new Set(responses.map((response) => response.respondent_id))];
  const [answersResult, profilesResult, contextsResult] = await Promise.all([
    responseIds.length > 0
      ? supabase.from('smartdsp_survey_answers').select('*').in('response_id', responseIds).order('question_position', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    respondentIds.length > 0
      ? supabase.from('profiles').select('*').in('user_id', respondentIds)
      : Promise.resolve({ data: [], error: null }),
    responseIds.length > 0
      ? supabase.from('smartdsp_survey_respondent_contexts').select('*').in('response_id', responseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (answersResult.error) throw new Error(`โหลดรายละเอียดคำตอบไม่สำเร็จ: ${answersResult.error.message}`);
  if (profilesResult.error) throw new Error(`โหลดข้อมูลผู้ตอบไม่สำเร็จ: ${profilesResult.error.message}`);
  if (contextsResult.error) throw new Error(`โหลดข้อมูลพื้นฐานผู้ตอบไม่สำเร็จ: ${contextsResult.error.message}`);

  return {
    survey,
    questions: (questionsResult.data || []) as SmartDspSurveyQuestion[],
    ratingOptions: (ratingOptionsResult.data || []) as SmartDspSurveyRatingOption[],
    ownResponse: null,
    ownAnswers: [],
    ownContext: null,
    contextSettings: (contextSettingsResult.data || createDefaultSurveyContextSettings(survey.id)) as SmartDspSurveyContextSettings,
    responses,
    answers: (answersResult.data || []) as SmartDspSurveyAnswer[],
    respondents: (profilesResult.data || []) as Profile[],
    respondentContexts: (contextsResult.data || []) as SmartDspSurveyRespondentContext[],
  };
}

export async function deleteSurveyResponse(responseId: string) {
  const { error } = await supabase.rpc('delete_smartdsp_survey_response', { target_response_id: responseId });
  if (error) throw new Error(`ลบคำตอบแบบสำรวจไม่สำเร็จ: ${error.message}`);
}

export async function clearSurveyRoundData(surveyId: string) {
  const { error } = await supabase.rpc('clear_smartdsp_survey_round_data', { target_survey_id: surveyId });
  if (error) throw new Error(`ล้างข้อมูลรอบแบบสำรวจไม่สำเร็จ: ${error.message}`);
}

export async function loadSurveyDashboard(surveyCode: string = SMARTDSP_SURVEY_CODE): Promise<SatisfactionSurveyDashboardData> {
  const surveys = await listSurveysForAdmin(surveyCode);
  const surveyIds = surveys.map((survey) => survey.id);
  if (surveyIds.length === 0) return { surveys, responses: [], answers: [] };

  const { data: responseData, error: responseError } = await supabase
    .from('smartdsp_survey_responses')
    .select('*')
    .in('survey_id', surveyIds)
    .order('submitted_at', { ascending: true });

  if (responseError) throw new Error(`โหลดข้อมูลแดชบอร์ดไม่สำเร็จ: ${responseError.message}`);
  const responses = (responseData || []) as SmartDspSurveyResponse[];
  const responseIds = responses.map((response) => response.id);
  if (responseIds.length === 0) return { surveys, responses, answers: [] };

  const { data: answerData, error: answerError } = await supabase
    .from('smartdsp_survey_answers')
    .select('*')
    .in('response_id', responseIds)
    .order('question_position', { ascending: true });

  if (answerError) throw new Error(`โหลดคะแนนสำหรับแดชบอร์ดไม่สำเร็จ: ${answerError.message}`);
  return { surveys, responses, answers: (answerData || []) as SmartDspSurveyAnswer[] };
}

export async function saveSurveySettings(draft: SatisfactionSurveyDraft) {
  const title = sanitizePlainTextInput(draft.title, { fieldName: 'ชื่อแบบสำรวจ', maxLength: 300, allowNewlines: false });
  const description = optionalPlainTextInput(draft.description, { fieldName: 'รายละเอียดแบบสำรวจ', maxLength: SMARTDSP_SURVEY_LONG_TEXT_MAX_LENGTH, allowNewlines: true }) || '';

  if (!title) throw new Error('กรุณากรอกชื่อแบบสำรวจ');
  if (draft.starts_at && draft.ends_at && new Date(draft.ends_at) <= new Date(draft.starts_at)) {
    throw new Error('วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น');
  }

  const { data, error } = await supabase
    .from('smartdsp_surveys')
    .update({
      title,
      description,
      instructions: '',
      status: draft.status,
      is_enabled: draft.is_enabled,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
    })
    .eq('id', draft.id)
    .select('*')
    .single();

  if (error) throw new Error(`บันทึกการตั้งค่าแบบสำรวจไม่สำเร็จ: ${error.message}`);
  return data as SmartDspSurvey;
}

export async function saveSurveyQuestions(questions: SmartDspSurveyQuestion[]) {
  for (const question of questions) {
    const prompt = sanitizePlainTextInput(question.prompt, { fieldName: `คำถามข้อ ${question.position}`, maxLength: 1000, allowNewlines: true });
    const dimension = optionalPlainTextInput(question.dimension, { fieldName: 'มิติที่วัด', maxLength: 200, allowNewlines: false });
    const helpText = optionalPlainTextInput(question.help_text, { fieldName: 'คำอธิบายคำถาม', maxLength: 1000, allowNewlines: true });
    if (!prompt) throw new Error(`กรุณากรอกคำถามข้อ ${question.position}`);

    const { error } = await supabase
      .from('smartdsp_survey_questions')
      .update({ prompt, dimension, help_text: helpText, is_required: question.is_required, is_active: question.is_active })
      .eq('id', question.id);

    if (error) throw new Error(`บันทึกคำถามข้อ ${question.position} ไม่สำเร็จ: ${error.message}`);
  }
}

export async function saveSurveyRatingOptions(options: SmartDspSurveyRatingOption[]) {
  for (const option of options) {
    const label = sanitizePlainTextInput(option.label, { fieldName: `ชื่อระดับ ${option.rating_value}`, maxLength: 100, allowNewlines: false });
    const description = sanitizePlainTextInput(option.description, { fieldName: `เหตุผลระดับ ${option.rating_value}`, maxLength: 1000, allowNewlines: true });
    if (!label || !description) throw new Error(`กรุณากรอกข้อมูลระดับคะแนน ${option.rating_value} ให้ครบถ้วน`);

    const { error } = await supabase
      .from('smartdsp_survey_rating_options')
      .update({ label, description })
      .eq('id', option.id);

    if (error) throw new Error(`บันทึกระดับคะแนน ${option.rating_value} ไม่สำเร็จ: ${error.message}`);
  }
}

export async function saveSurveyContextSettings(settings: SmartDspSurveyContextSettings) {
  const rolePrompt = sanitizePlainTextInput(settings.role_prompt, { fieldName: 'หัวข้อบทบาทผู้ตอบ', maxLength: 300, allowNewlines: false });
  const frequencyPrompt = sanitizePlainTextInput(settings.frequency_prompt, { fieldName: 'หัวข้อความถี่ในการใช้งาน', maxLength: 300, allowNewlines: false });
  const servicesPrompt = sanitizePlainTextInput(settings.services_prompt, { fieldName: 'หัวข้อส่วนงานหรือบริการ', maxLength: 500, allowNewlines: false });
  if (!rolePrompt || !frequencyPrompt || !servicesPrompt) throw new Error('กรุณากรอกหัวข้อข้อมูลเกี่ยวกับการใช้งานระบบให้ครบถ้วน');

  const sanitizeOptions = (current: ReadonlyArray<{ value: string; label: string }>, fieldName: string) => {
    if (current.length === 0 || current.length > 50) throw new Error(`${fieldName} ต้องมีตัวเลือก 1–50 รายการ`);
    const seen = new Set<string>();
    return current.map((option) => {
      if (!/^[a-z0-9_]{3,80}$/.test(option.value) || seen.has(option.value)) throw new Error(`รหัสภายในของ ${fieldName} ไม่ถูกต้องหรือซ้ำกัน`);
      seen.add(option.value);
    const label = sanitizePlainTextInput(
        option.label,
        { fieldName, maxLength: 200, allowNewlines: false },
    );
    if (!label) throw new Error(`กรุณากรอกชื่อตัวเลือก ${fieldName} ให้ครบถ้วน`);
      return { value: option.value, label };
    });
  };

  if (settings.additional_fields.length > 20) throw new Error('เพิ่มหัวข้อข้อมูลผู้ตอบได้ไม่เกิน 20 หัวข้อ');
  const seenFieldIds = new Set<string>();
  const additionalFields = settings.additional_fields.map((field, index) => {
    if (!/^[a-z0-9_]{3,80}$/.test(field.id) || seenFieldIds.has(field.id)) throw new Error('รหัสภายในของหัวข้อใหม่ไม่ถูกต้องหรือซ้ำกัน');
    seenFieldIds.add(field.id);
    const prompt = sanitizePlainTextInput(field.prompt, { fieldName: `หัวข้อเพิ่มเติม ${index + 1}`, maxLength: 500, allowNewlines: false });
    if (!prompt) throw new Error(`กรุณากรอกชื่อหัวข้อเพิ่มเติม ${index + 1}`);
    return {
      id: field.id,
      prompt,
      selection_type: field.selection_type === 'multiple' ? 'multiple' as const : 'single' as const,
      is_required: Boolean(field.is_required),
      is_active: Boolean(field.is_active),
      options: sanitizeOptions(field.options, `ตัวเลือกของหัวข้อ “${prompt}”`),
    };
  });

  const { data, error } = await supabase
    .from('smartdsp_survey_context_settings')
    .upsert({
      survey_id: settings.survey_id,
      role_prompt: rolePrompt,
      frequency_prompt: frequencyPrompt,
      services_prompt: servicesPrompt,
      role_options: sanitizeOptions(settings.role_options, 'บทบาทผู้ตอบ'),
      frequency_options: sanitizeOptions(settings.frequency_options, 'ความถี่ในการใช้งาน'),
      service_options: sanitizeOptions(settings.service_options, 'ส่วนงานหรือบริการ'),
      additional_fields: additionalFields,
    }, { onConflict: 'survey_id' })
    .select('*')
    .single();

  if (error) throw new Error(`บันทึกการตั้งค่าข้อมูลผู้ตอบไม่สำเร็จ: ${error.message}`);
  return data as SmartDspSurveyContextSettings;
}

export async function cloneSurveyRound(sourceSurveyId: string) {
  const { data, error } = await supabase.rpc('clone_smartdsp_survey', { source_survey_id: sourceSurveyId });
  if (error) throw new Error(`สร้างรอบแบบสำรวจใหม่ไม่สำเร็จ: ${error.message}`);
  return data as string;
}
