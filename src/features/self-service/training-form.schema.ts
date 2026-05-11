import { z } from 'zod';
import { getMonthFromISODate } from '../../utils/thaiDate';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const trainingFormSchema = z.object({
  course: z.string().trim().min(2, 'กรุณากรอกชื่อหลักสูตร'),
  category: z.string().trim().min(1, 'กรุณากรอกประเภทการอบรม'),
  subcategory: optionalText,
  organizer: z.string().trim().min(2, 'กรุณากรอกหน่วยงานผู้จัด'),
  date: z.string().min(1, 'กรุณาเลือกวันที่อบรม'),
  year: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกปีงบประมาณเป็นตัวเลข' })
    .int('ปีงบประมาณต้องเป็นจำนวนเต็ม')
    .min(2400, 'ปีงบประมาณไม่ถูกต้อง')
    .max(2700, 'ปีงบประมาณไม่ถูกต้อง'),
  certificateName: optionalText,
  certificateLink: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || value.startsWith('https://'), 'ลิงก์ใบประกาศต้องขึ้นต้นด้วย https://')
    .refine((value) => {
      if (!value) {
        return true;
      }

      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, 'รูปแบบ URL ไม่ถูกต้อง'),
  developmentArea: optionalText,
  skillGroup: optionalText,
  targetDirection: optionalText,
});

export type TrainingFormValues = z.infer<typeof trainingFormSchema>;

export function getMonthFromDate(value: string) {
  return getMonthFromISODate(value);
}
