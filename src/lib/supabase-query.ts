const DEFAULT_SUPABASE_TIMEOUT_MS = 60000;

type SupabaseResult = {
  error: unknown | null;
};

type AbortableSupabaseRequest<T extends SupabaseResult> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
};

function getErrorMessage(error: unknown) {
  if (!error) return '';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    const fields = error as Record<string, unknown>;
    return [fields.code, fields.message, fields.details, fields.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');
  }

  return String(error);
}

export function toSupabaseError(error: unknown, operation: string) {
  const message = getErrorMessage(error);
  return new Error(message ? `${operation} ไม่สำเร็จ: ${message}` : `${operation} ไม่สำเร็จ`);
}

export async function runSupabaseQuery<T extends SupabaseResult>(
  request: AbortableSupabaseRequest<T>,
  operation: string,
  timeoutMs = DEFAULT_SUPABASE_TIMEOUT_MS,
): Promise<T> {
  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const executableRequest =
    typeof request.abortSignal === 'function' ? request.abortSignal(abortController.signal) : request;

  try {
    const result = await Promise.race([
      Promise.resolve(executableRequest),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(
            new Error(
              `${operation} ยังไม่ได้รับคำตอบจาก Supabase ภายใน 60 วินาที กรุณาตรวจสอบอินเทอร์เน็ตหรือ Supabase แล้วลองใหม่`,
            ),
          );
        }, timeoutMs);
      }),
    ]);

    if (result.error) {
      throw toSupabaseError(result.error, operation);
    }

    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
