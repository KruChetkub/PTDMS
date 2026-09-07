import { supabase } from '../lib/supabase';

export type TotpFactor = {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
  factor_type: 'totp';
};

export type MfaEnrollResult = {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
};

export type MfaStatus = {
  enabled: boolean;
  factors: TotpFactor[];
  currentLevel: string | null;
  nextLevel: string | null;
};

/**
 * Get current user's MFA status and verified factors
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  const [factorsRes, aalRes] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (factorsRes.error) {
    throw factorsRes.error;
  }

  const totpFactors = (factorsRes.data?.totp ?? []) as TotpFactor[];
  const verifiedFactors = totpFactors.filter((f) => f.status === 'verified');

  return {
    enabled: verifiedFactors.length > 0,
    factors: verifiedFactors,
    currentLevel: (aalRes.data?.currentLevel as string | null) ?? null,
    nextLevel: (aalRes.data?.nextLevel as string | null) ?? null,
  };
}

/**
 * Start enrolling a new Google Authenticator / TOTP factor
 */
export async function enrollTotp(friendlyName = 'SmartDSP Account'): Promise<MfaEnrollResult> {
  // First, cleanup any unverified TOTP factors to avoid factor limits
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.all) {
      for (const factor of factors.all) {
        if (factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'SmartDSP',
    friendlyName,
  });

  if (error) {
    throw error;
  }

  return data as MfaEnrollResult;
}

/**
 * Verify enrollment with the 6-digit code from Google Authenticator
 */
export async function verifyTotpEnrollment(factorId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Unenroll (disable) an MFA factor
 */
export async function unenrollTotp(factorId: string) {
  const { data, error } = await supabase.auth.mfa.unenroll({
    factorId,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Challenge and verify TOTP code during Login flow
 */
export async function verifyLoginTotp(factorId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });

  if (error) {
    throw error;
  }

  return data;
}
