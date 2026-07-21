import type { ProviderConfig } from "./config";
import { ProviderError, toProviderError } from "./errors";

export interface RetriedJsonResult {
  payload: unknown;
  httpStatus: number;
  retryCount: number;
  responseHeaders: Headers;
}

export async function fetchJsonWithRetry(
  url: URL,
  init: RequestInit,
  policy: Pick<ProviderConfig, "timeoutMs" | "maxAttempts" | "backoffBaseMs">,
  providerId: string,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
  outerSignal?: AbortSignal,
): Promise<RetriedJsonResult> {
  let lastError: ProviderError | null = null;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("provider-timeout"), policy.timeoutMs);
    const abortFromOuter = () => controller.abort(outerSignal?.reason);
    outerSignal?.addEventListener("abort", abortFromOuter, { once: true });
    try {
      const response = await fetcher(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "User-Agent": "Solar-Intelligence-OS/1.0 (research data adapter)",
          ...init.headers,
        },
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (error) {
        throw new ProviderError("The provider returned non-JSON content.", {
          code: "UPSTREAM_RESPONSE_INVALID",
          httpStatus: response.status,
          retryable: response.status >= 500,
          providerId,
          cause: error,
        });
      }

      if (response.ok) {
        return {
          payload,
          httpStatus: response.status,
          retryCount: attempt - 1,
          responseHeaders: response.headers,
        };
      }

      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      const overloaded = response.status === 529;
      const rateLimited = response.status === 429;
      const retryable = rateLimited || overloaded || response.status >= 500;
      const detail = upstreamErrorDetail(payload);
      lastError = new ProviderError(
        detail || `The provider returned HTTP ${response.status}.`,
        {
          code: rateLimited
            ? "UPSTREAM_RATE_LIMITED"
            : overloaded
              ? "UPSTREAM_OVERLOADED"
              : response.status >= 500
                ? "UPSTREAM_UNAVAILABLE"
                : "UPSTREAM_RESPONSE_INVALID",
          httpStatus: response.status,
          retryable,
          retryAfterMs,
          providerId,
        },
      );
      if (!retryable || attempt === policy.maxAttempts) throw lastError;
      await boundedDelay(delayForAttempt(attempt, policy.backoffBaseMs, retryAfterMs), outerSignal);
    } catch (error) {
      lastError = toProviderError(error, providerId);
      if (!lastError.retryable || attempt === policy.maxAttempts || outerSignal?.aborted) {
        throw lastError;
      }
      await boundedDelay(delayForAttempt(attempt, policy.backoffBaseMs, lastError.retryAfterMs), outerSignal);
    } finally {
      clearTimeout(timeout);
      outerSignal?.removeEventListener("abort", abortFromOuter);
    }
  }

  throw (
    lastError ??
    new ProviderError("The provider request did not complete.", {
      code: "UPSTREAM_UNAVAILABLE",
      providerId,
    })
  );
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function delayForAttempt(attempt: number, baseMs: number, retryAfterMs: number | null): number {
  // Worker requests remain bounded even if an upstream asks clients to wait for minutes.
  return Math.min(2_000, Math.max(retryAfterMs ?? 0, baseMs * 2 ** (attempt - 1)));
}

async function boundedDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const complete = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(complete, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function upstreamErrorDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const source = payload as Record<string, unknown>;
  const value = source.reason ?? source.message ?? source.error;
  return typeof value === "string" ? value.slice(0, 300) : "";
}
