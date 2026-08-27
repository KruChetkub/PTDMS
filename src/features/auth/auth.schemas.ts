import { z } from 'zod';
import { hasPasswordSpecialCharacter, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './passwordPolicy';

export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`)
  .max(PASSWORD_MAX_LENGTH, `รหัสผ่านต้องไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`)
  .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
  .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')
  .refine(hasPasswordSpecialCharacter, 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');

export const loginSchema = z.object({
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'กรุณากรอกชื่อ-สกุล'),
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: strongPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
});

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านทั้งสองช่องต้องตรงกัน',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

