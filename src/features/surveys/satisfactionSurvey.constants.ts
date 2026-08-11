import type { SmartDspSurveyRespondentRole, SmartDspSurveyUsageFrequency } from '../../types/database.types';

export const SURVEY_RESPONDENT_ROLE_OPTIONS: Array<{ value: SmartDspSurveyRespondentRole; label: string }> = [
  { value: 'executive', label: 'ผู้บริหาร' },
  { value: 'general_user', label: 'ผู้ปฏิบัติงาน/ผู้ใช้งานทั่วไป' },
  { value: 'data_editor', label: 'ผู้บันทึกหรือปรับปรุงข้อมูล' },
  { value: 'reviewer', label: 'ผู้ตรวจสอบหรือผู้อนุมัติ' },
  { value: 'system_admin', label: 'ผู้ดูแลระบบ' },
  { value: 'other', label: 'อื่น ๆ' },
];

export const SURVEY_USAGE_FREQUENCY_OPTIONS: Array<{ value: SmartDspSurveyUsageFrequency; label: string }> = [
  { value: 'daily', label: 'ทุกวัน' },
  { value: 'several_weekly', label: 'สัปดาห์ละหลายครั้ง' },
  { value: 'weekly', label: 'สัปดาห์ละ 1 ครั้ง' },
  { value: 'several_monthly', label: 'เดือนละหลายครั้ง' },
  { value: 'rarely', label: 'นาน ๆ ครั้ง' },
];

export const SURVEY_SERVICE_OPTIONS = [
  { value: 'public_home_search', label: 'หน้าหลักและการสืบค้นข้อมูลสาธารณะ' },
  { value: 'strategy_plans', label: 'ยุทธศาสตร์และแผนปฏิบัติราชการ' },
  { value: 'performance_results', label: 'ผลการดำเนินงานสำคัญของกรมควบคุมโรค' },
  { value: 'r2r_research', label: 'งานวิจัยจากงานประจำ' },
  { value: 'personnel_profile', label: 'ข้อมูลบุคลากรและข้อมูลส่วนบุคคลของผู้ใช้งาน' },
  { value: 'training_records', label: 'ข้อมูลหลักสูตรและประวัติการฝึกอบรม' },
  { value: 'service_requests', label: 'ระบบงานบริการหรือการติดตามคำขอ' },
  { value: 'meeting_resources', label: 'ระบบจองห้องประชุมหรือทรัพยากร' },
  { value: 'reports_dashboard', label: 'รายงาน สถิติ หรือ Dashboard' },
  { value: 'site_admin', label: 'งานผู้ดูแลระบบและการจัดการเนื้อหา' },
  { value: 'other', label: 'อื่น ๆ' },
] as const;

export function getSurveyOptionLabel(options: ReadonlyArray<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label || value;
}
