export type ProviderErrorCode =
  | "INVALID_QUERY"
  | "UNSUPPORTED_DATA_CLASS"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_OVERLOADED"
  | "UPSTREAM_RESPONSE_INVALID"
  | "UPSTREAM_UNAVAILABLE"
  | "NO_SEMANTICALLY_SAFE_PROVIDER";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly httpStatus: number | null;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  readonly providerId: string | null;

  constructor(
    message: string,
    options: {
      code: ProviderErrorCode;
      httpStatus?: number | null;
      retryable?: boolean;
      retryAfterMs?: number | null;
      providerId?: string | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.providerId = options.providerId ?? null;
  }
}

export function toProviderError(error: unknown, providerId?: string): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ProviderError("The upstream weather request timed out.", {
      code: "UPSTREAM_TIMEOUT",
      retryable: true,
      providerId,
      cause: error,
    });
  }
  return new ProviderError(
    error instanceof Error ? error.message : "The weather provider failed.",
    {
      code: "UPSTREAM_UNAVAILABLE",
      retryable: true,
      providerId,
      cause: error,
    },
  );
}

