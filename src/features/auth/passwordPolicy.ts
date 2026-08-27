export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export const passwordRequirementDefinitions = [
  { key: 'minLength', label: `อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร` },
  { key: 'lowercase', label: 'ตัวพิมพ์เล็กอย่างน้อย 1 ตัว' },
  { key: 'uppercase', label: 'ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว' },
  { key: 'number', label: 'ตัวเลขอย่างน้อย 1 ตัว' },
  { key: 'specialCharacter', label: 'อักขระพิเศษอย่างน้อย 1 ตัว' },
] as const;

export type PasswordRequirementKey = (typeof passwordRequirementDefinitions)[number]['key'];

export function getPasswordRequirementState(password: string): Record<PasswordRequirementKey, boolean> {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    specialCharacter: hasPasswordSpecialCharacter(password),
  };
}

export function hasPasswordSpecialCharacter(password: string) {
  return Array.from(password).some((character) => PASSWORD_SPECIAL_CHARACTERS.includes(character));
}

export function isPasswordPolicySatisfied(password: string) {
  return Object.values(getPasswordRequirementState(password)).every(Boolean);
}

export function isPasswordFormValid(password: string, confirmPassword: string) {
  return isPasswordPolicySatisfied(password) && password === confirmPassword && confirmPassword.length > 0;
}
