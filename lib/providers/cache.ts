import { canonicalJson, sha256Hex } from "@/lib/provenance/hash";
import type { WeatherDataset, WeatherProviderId, WeatherQuery } from "./types";

interface CacheEntry {
  value: WeatherDataset;
  storedAtMs: number;
  expiresAtMs: number;
}

const MAX_ENTRIES = 32;
const memoryCache = new Map<string, CacheEntry>();

export async function weatherCacheKey(
  providerId: WeatherProviderId,
  query: WeatherQuery,
  requestedDataClass: WeatherQuery["dataClass"] = query.dataClass,
): Promise<string> {
  const digest = await sha256Hex(canonicalJson({ providerId, query, requestedDataClass }));
  return `weather:${providerId}:${digest.slice(0, 32)}`;
}

export function readWeatherCache(key: string, now = Date.now()): WeatherDataset | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAtMs <= now) {
    memoryCache.delete(key);
    return null;
  }
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  const value = clone(entry.value);
  value.cache = {
    status: "hit",
    key,
    storedAtUtc: new Date(entry.storedAtMs).toISOString(),
    expiresAtUtc: new Date(entry.expiresAtMs).toISOString(),
    ttlSeconds: Math.max(0, Math.round((entry.expiresAtMs - entry.storedAtMs) / 1_000)),
  };
  value.attempts = [];
  return value;
}

export function writeWeatherCache(
  key: string,
  value: WeatherDataset,
  ttlSeconds: number,
  now = Date.now(),
): WeatherDataset {
  while (memoryCache.size >= MAX_ENTRIES) {
    const oldest = memoryCache.keys().next().value as string | undefined;
    if (!oldest) break;
    memoryCache.delete(oldest);
  }
  const expiresAtMs = now + ttlSeconds * 1_000;
  const stored = clone(value);
  stored.cache = {
    status: "miss",
    key,
    storedAtUtc: new Date(now).toISOString(),
    expiresAtUtc: new Date(expiresAtMs).toISOString(),
    ttlSeconds,
  };
  memoryCache.set(key, { value: stored, storedAtMs: now, expiresAtMs });
  return clone(stored);
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}
