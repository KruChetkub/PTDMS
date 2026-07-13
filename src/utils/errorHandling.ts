import { recordAuditLog } from '../services/audit.service';

const technicalErrorPattern =
  /(pgrst|sql|schema|policy|permission denied|relation|constraint|duplicate key|jwt|service_role|supabase|stack|trace|secret|token|apikey|api_key|authorization)/i;

const sensitiveKeyPattern = /(password|token|secret|apikey|api_key|authorization|otp|refresh|access)/i;

function stringifyError(error: unknown) {
  if (!error) return '';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    try {
      return JSON.stringify(sanitizeErrorDetail(error));
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function sanitizeErrorDetail(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeErrorDetail);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !sensitiveKeyPattern.test(key))
        .map(([key, nestedValue]) => [key, sanitizeErrorDetail(nestedValue)]),
    );
  }

  return value;
}

function truncate(value: string, maxLength = 1000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function getSafeUserErrorMessage(error: unknown, fallback: string) {
  const message = stringifyError(error).trim();

  if (!message || technicalErrorPattern.test(message)) {
    return fallback;
  }

  return message;
}

export function getTechnicalErrorMessage(error: unknown) {
  return truncate(stringifyError(error).trim() || 'unknown_error');
}

export async function reportClientError(...details: unknown[]) {
  const [firstDetail, ...restDetails] = details;
  const errorMessage = getTechnicalErrorMessage(firstDetail);

  await recordAuditLog({
    module: 'frontend',
    action: 'client_error',
    targetType: 'client_error',
    status: 'fail',
    errorMessage,
    metadata: {
      details: sanitizeErrorDetail(restDetails),
    },
  });
}

export async function reportHandledError(
  error: unknown,
  context: {
    module: string;
    action: string;
    targetType?: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await recordAuditLog({
    module: context.module,
    action: context.action,
    targetType: context.targetType || 'error',
    targetId: context.targetId,
    status: 'fail',
    errorMessage: getTechnicalErrorMessage(error),
    metadata: context.metadata || null,
  });
}
