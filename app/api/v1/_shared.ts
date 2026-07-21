import { ProviderError } from "@/lib/providers";

export const API_VERSION = "v1";

export function requestId(request: Request): string {
  const incoming = request.headers.get("x-request-id")?.trim();
  if (incoming && /^[a-zA-Z0-9._:-]{8,128}$/.test(incoming)) return incoming;
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `req_${Date.now().toString(36)}`;
}

export function jsonResponse(
  body: unknown,
  options: { status?: number; cacheControl?: string; requestId?: string } = {},
): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": options.cacheControl ?? "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (options.requestId) headers.set("X-Request-ID", options.requestId);
  return new Response(JSON.stringify(body), { status: options.status ?? 200, headers });
}

export function apiError(error: unknown, id: string): Response {
  const providerError = error instanceof ProviderError ? error : null;
  const status = providerError?.code === "INVALID_QUERY" ? 400 : 503;
  const message =
    error instanceof Error ? error.message : "The request could not be completed.";
  return jsonResponse(
    {
      apiVersion: API_VERSION,
      requestId: id,
      ok: false,
      error: {
        code: providerError?.code ?? "INTERNAL_ERROR",
        message,
        retryable: providerError?.retryable ?? false,
        retryAfterMs: providerError?.retryAfterMs ?? null,
      },
    },
    { status, requestId: id },
  );
}

export async function readBoundedJson(
  request: Request,
  maximumBytes = 131_072,
): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new ProviderError(`JSON body exceeds ${maximumBytes} bytes.`, {
      code: "INVALID_QUERY",
    });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new ProviderError(`JSON body exceeds ${maximumBytes} bytes.`, {
      code: "INVALID_QUERY",
    });
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ProviderError("Request body must be valid JSON.", { code: "INVALID_QUERY" });
  }
}

export function runtimeActorEmail(request: Request): string | null {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  return email && email.length <= 320 ? email : null;
}

export function databaseUnavailable(error: unknown): boolean {
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
    } else {
      messages.push(String(current));
      break;
    }
  }
  const message = messages.join("\n");
  return (
    message.includes("binding `DB` is unavailable") ||
    message.includes("no such table") ||
    message.includes("D1_ERROR") ||
    message.includes("not configured")
  );
}
