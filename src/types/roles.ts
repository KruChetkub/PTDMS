export type UserRole = 'super_admin' | 'admin' | 'executive' | 'hr' | 'personnel';
export type ProfileStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  executive: 'Executive',
  hr: 'HR',
  personnel: 'Personnel',
};

export const privilegedRoles: UserRole[] = ['super_admin', 'admin', 'executive', 'hr'];

export function canAccess(role: UserRole | undefined, allowedRoles?: UserRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}

