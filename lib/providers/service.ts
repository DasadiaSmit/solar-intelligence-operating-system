import { canonicalJson, reproducibleId, sha256Hex } from "@/lib/provenance/hash";
import { assessDatasetQuality } from "./normalise";
import { readProviderConfig, type ProviderConfig } from "./config";
import { readWeatherCache, weatherCacheKey, writeWeatherCache } from "./cache";
import { ProviderError, toProviderError } from "./errors";
import { OpenMeteoProvider } from "./open-meteo";
import { PvgisProvider } from "./pvgis";
import { DeterministicSampleProvider } from "./sample";
import {
  CANONICAL_WEATHER_UNITS,
  PROVIDER_CALCULATION_VERSION,
  PROVIDER_SCHEMA_VERSION,
  type ProviderAttempt,
  type ProviderRuntimeEnv,
  type RawProviderResult,
  type WeatherDataset,
  type WeatherProvider,
  type WeatherQuery,
} from "./types";

export interface WeatherServiceOptions {
  env?: ProviderRuntimeEnv;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  signal?: AbortSignal;
  bypassCache?: boolean;
}

interface Candidate {
  provider: WeatherProvider;
  query: WeatherQuery;
}

export async function getWeatherDataset(
  query: WeatherQuery,
  options: WeatherServiceOptions = {},
): Promise<WeatherDataset> {
  const config = readProviderConfig(options.env);
  const now = options.now ?? (() => new Date());
  const candidates = providerCandidates(query, config);
  const attempts: ProviderAttempt[] = [];
  let lastError: ProviderError | null = null;

  for (const candidate of candidates) {
    const key = await weatherCacheKey(
      candidate.provider.descriptor.id,
      candidate.query,
      query.dataClass,
    );
    if (!options.bypassCache) {
      const cached = readWeatherCache(key);
      if (cached) return { ...cached, attempts };
    }
    const startedAt = now();
    const startedMs = Date.now();
    try {
      const raw = await candidate.provider.fetch(candidate.query, {
        fetch: options.fetch ?? globalThis.fetch,
        now,
        signal: options.signal,
      });
      const dataset = await buildDataset(raw, query, attempts, key, config.cacheTtlSeconds);
      attempts.push({
        providerId: candidate.provider.descriptor.id,
        startedAtUtc: startedAt.toISOString(),
        elapsedMs: Math.max(0, Date.now() - startedMs),
        outcome: "success",
        httpStatus: raw.transport?.httpStatus ?? 200,
        retryCount: raw.transport?.retryCount ?? 0,
        errorCode: null,
        detail: "Validated canonical dataset returned.",
      });
      dataset.attempts = [...attempts];
      const cached = writeWeatherCache(
        key,
        { ...dataset, rawPayload: undefined },
        config.cacheTtlSeconds,
      );
      dataset.cache = cached.cache;
      return dataset;
    } catch (error) {
      lastError = toProviderError(error, candidate.provider.descriptor.id);
      attempts.push({
        providerId: candidate.provider.descriptor.id,
        startedAtUtc: startedAt.toISOString(),
        elapsedMs: Math.max(0, Date.now() - startedMs),
        outcome: "error",
        httpStatus: lastError.httpStatus,
        retryCount: lastError.retryable ? Math.max(0, config.maxAttempts - 1) : 0,
        errorCode: lastError.code,
        detail: lastError.message.slice(0, 300),
      });
    }
  }

  throw new ProviderError(
    lastError
      ? `No provider returned a usable ${query.dataClass} dataset. Last error: ${lastError.message}`
      : `No provider supports ${query.dataClass} under the selected mode.`,
    {
      code: "NO_SEMANTICALLY_SAFE_PROVIDER",
      providerId: lastError?.providerId,
      cause: lastError,
    },
  );
}

function providerCandidates(query: WeatherQuery, config: ProviderConfig): Candidate[] {
  const sample = new DeterministicSampleProvider();
  const openMeteo = new OpenMeteoProvider(config);
  const pvgis = new PvgisProvider(config);
  const available: Record<string, WeatherProvider> = {
    sample,
    "open-meteo": openMeteo,
    pvgis,
  };
  const serverForcesSample = config.mode === "sample";
  const requestForcesSample = query.mode === "sample" || query.provider === "sample";
  if (serverForcesSample || requestForcesSample) {
    if (query.dataClass !== "simulation" && !query.allowSimulatedFallback) return [];
    return [{ provider: sample, query: asSimulation(query) }];
  }
  if (query.provider !== "auto") {
    const selected = available[query.provider];
    if (selected.supports(query)) return [{ provider: selected, query }];
    return [];
  }
  if (query.dataClass === "simulation") return [{ provider: sample, query }];
  const live =
    query.dataClass === "typical_meteorological_year"
      ? [{ provider: pvgis, query }]
      : query.dataClass === "reanalysis" || query.dataClass === "issued_forecast"
        ? [{ provider: openMeteo, query }]
        : [];
  const mayUseSample =
    query.mode === "auto" &&
    config.mode === "auto" &&
    query.allowSimulatedFallback &&
    config.allowSimulatedFallback;
  return mayUseSample ? [...live, { provider: sample, query: asSimulation(query) }] : live;
}

function asSimulation(query: WeatherQuery): WeatherQuery {
  return { ...query, provider: "sample", mode: "sample", dataClass: "simulation" };
}

async function buildDataset(
  raw: RawProviderResult,
  requestedQuery: WeatherQuery,
  attempts: ProviderAttempt[],
  cacheKey: string,
  cacheTtlSeconds: number,
): Promise<WeatherDataset> {
  const quality = assessDatasetQuality(raw.records);
  const contentHash = await sha256Hex(canonicalJson(raw.records));
  const snapshotId = await reproducibleId("dsv", {
    provider: raw.provider.id,
    providerVersion: raw.provider.version,
    requestedQuery,
    actualDataClass: raw.actualDataClass,
    contentHash,
    schemaVersion: PROVIDER_SCHEMA_VERSION,
    calculationVersion: PROVIDER_CALCULATION_VERSION,
  });
  const semanticSubstitution = raw.actualDataClass !== requestedQuery.dataClass;
  const warnings = [...raw.warnings];
  if (semanticSubstitution) {
    warnings.unshift(
      `Requested ${requestedQuery.dataClass} data was unavailable; returned ${raw.actualDataClass} data with an explicit semantic-substitution flag.`,
    );
  }
  return {
    records: raw.records,
    provenance: {
      snapshotId,
      contentHash,
      schemaVersion: PROVIDER_SCHEMA_VERSION,
      provider: raw.provider,
      requestedDataClass: requestedQuery.dataClass,
      actualDataClass: raw.actualDataClass,
      semanticSubstitution,
      retrievalTimeUtc: raw.retrievalTimeUtc,
      issueTimeUtc: raw.issueTimeUtc,
      validRangeUtc: [raw.records[0].timestampUtc, raw.records.at(-1)?.timestampUtc ?? raw.records[0].timestampUtc],
      intervalSeconds: raw.provider.temporalResolutionSeconds,
      units: CANONICAL_WEATHER_UNITS,
      quality,
      calculationVersion: PROVIDER_CALCULATION_VERSION,
      assumptions: raw.assumptions,
      uncertainty: {
        method: "provider quality and deterministic validation flags; no calibrated numeric interval",
        level: null,
        boundsAvailable: false,
        note: "Provider uncertainty ensembles are not exposed by this adapter version.",
      },
      transformations: raw.transformations,
      warnings,
    },
    attempts: [...attempts],
    cache: {
      status: "miss",
      key: cacheKey,
      storedAtUtc: null,
      expiresAtUtc: null,
      ttlSeconds: cacheTtlSeconds,
    },
    rawPayload: raw.rawPayload,
  };
}
