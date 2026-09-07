export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

export type RateLimitClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<RpcResult>;
};

export async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function consumeRateLimit(
  client: RateLimitClient,
  scope: string,
  identifier: string,
  requestLimit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const identifierHash = await sha256Hex(identifier || 'unknown');
  const rateKey = `${scope}:${identifierHash}`;
  const { data, error } = await client.rpc('consume_edge_function_rate_limit', {
    p_rate_key: rateKey,
    p_request_limit: requestLimit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error('Edge Function rate-limit check failed', {
      scope,
      message: error.message ?? 'unknown_error',
    });
    throw new Error('rate_limit_unavailable');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    throw new Error('rate_limit_invalid_response');
  }

  const record = row as Record<string, unknown>;
  return {
    allowed: record.allowed === true,
    remaining: typeof record.remaining === 'number' ? record.remaining : 0,
    retryAfterSeconds: typeof record.retry_after_seconds === 'number'
      ? record.retry_after_seconds
      : windowSeconds,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    ...(result.allowed
      ? {}
      : { 'Retry-After': String(Math.max(result.retryAfterSeconds, 1)) }),
  };
}
