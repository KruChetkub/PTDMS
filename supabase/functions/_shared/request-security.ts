export class RequestBodyError extends Error {
  constructor(
    public readonly status: 400 | 413,
    public readonly reason: 'invalid_payload' | 'payload_too_large',
  ) {
    super(reason);
  }
}

export async function readJsonObject(
  req: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError(413, 'payload_too_large');
  }

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    throw new RequestBodyError(413, 'payload_too_large');
  }

  if (bytes.byteLength === 0) {
    return {};
  }

  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new RequestBodyError(400, 'invalid_payload');
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400, 'invalid_payload');
  }
}
