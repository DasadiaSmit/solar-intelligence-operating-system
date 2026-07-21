function normaliseForHash(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(normaliseForHash);
  if (value instanceof Date) return value.toISOString();
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, normaliseForHash(nested)]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normaliseForHash(value));
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(
    typeof value === "string" ? value : canonicalJson(value),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function reproducibleId(prefix: string, value: unknown): Promise<string> {
  return `${prefix}_${(await sha256Hex(value)).slice(0, 24)}`;
}

