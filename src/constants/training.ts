export const trainingTypeOptions = [
  'หลักสูตรพื้นฐานสำหรับบุคลากร',
  'หลักสูตรด้านภาวะผู้นำ กรมควบคุมโรค',
  'หลักสูตรด้านนโยบายและยุทธศาสตร์',
  'หลักสูตรด้านดิจิทัล',
  'หลักสูตรตามสมรรถนะที่เหมาะสมสำหรับการปฏิบัติงาน (อื่นๆ)',
] as const;

export type TrainingTypeValue = (typeof trainingTypeOptions)[number];

