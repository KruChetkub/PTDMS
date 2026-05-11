import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'กรุณากรอกชื่อ-สกุล'),
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(8, 'รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร'),
    confirmPassword: z.string().min(8, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านทั้งสองช่องต้องตรงกัน',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

