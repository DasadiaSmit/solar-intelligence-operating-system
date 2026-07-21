import type { QualityAssessment } from "@/lib/contracts";

export const PROVIDER_CALCULATION_VERSION = "sios-provider-normalisation-1.0.0";
export const PROVIDER_SCHEMA_VERSION = "canonical-weather-hour-v1";

export type WeatherDataClass =
  | "observation"
  | "reanalysis"
  | "issued_forecast"
  | "typical_meteorological_year"
  | "simulation";

export type WeatherProviderId = "sample" | "open-meteo" | "pvgis";
export type ProviderMode = "auto" | "live" | "sample";

export type CanonicalWeatherField =
  | "temperatureC"
  | "relativeHumidityPct"
  | "cloudCoverPct"
  | "precipitationMm"
  | "snowDepthCm"
  | "surfacePressureHpa"
  | "windSpeedMps"
  | "ghiWm2"
  | "dniWm2"
  | "dhiWm2";

export const CANONICAL_WEATHER_UNITS: Record<CanonicalWeatherField, string> = {
  temperatureC: "degC",
  relativeHumidityPct: "%",
  cloudCoverPct: "%",
  precipitationMm: "mm h-1",
  snowDepthCm: "cm",
  surfacePressureHpa: "hPa",
  windSpeedMps: "m s-1",
  ghiWm2: "W m-2 (preceding-hour mean)",
  dniWm2: "W m-2 (preceding-hour mean)",
  dhiWm2: "W m-2 (preceding-hour mean)",
};

export interface WeatherQuery {
  latitude: number;
  longitude: number;
  startUtc: string;
  endUtc: string;
  intervalSeconds: 3600;
  dataClass: WeatherDataClass;
  provider: WeatherProviderId | "auto";
  mode: ProviderMode;
  allowSimulatedFallback: boolean;
  panelTiltDeg?: number;
  panelAzimuthDeg?: number;
}

export interface CanonicalWeatherHour {
  timestampUtc: string;
  sourceTimestamp: string;
  temperatureC: number | null;
  relativeHumidityPct: number | null;
  cloudCoverPct: number | null;
  precipitationMm: number | null;
  snowDepthCm: number | null;
  surfacePressureHpa: number | null;
  windSpeedMps: number | null;
  ghiWm2: number | null;
  dniWm2: number | null;
  dhiWm2: number | null;
  imputedFields: CanonicalWeatherField[];
  qualityFlags: string[];
  qualityScore: number;
}

export interface ProviderDescriptor {
  id: WeatherProviderId;
  name: string;
  product: string;
  version: string;
  dataClasses: WeatherDataClass[];
  temporalResolutionSeconds: number;
  spatialResolutionKm: number | null;
  attribution: string;
  documentationUrl: string;
}

export interface ProviderAttempt {
  providerId: WeatherProviderId;
  startedAtUtc: string;
  elapsedMs: number;
  outcome: "success" | "error" | "skipped";
  httpStatus: number | null;
  retryCount: number;
  errorCode: string | null;
  detail: string;
}

export interface ProviderCacheMetadata {
  status: "hit" | "miss" | "bypass";
  key: string;
  storedAtUtc: string | null;
  expiresAtUtc: string | null;
  ttlSeconds: number;
}

export interface WeatherProvenance {
  snapshotId: string;
  contentHash: string;
  schemaVersion: string;
  provider: ProviderDescriptor;
  requestedDataClass: WeatherDataClass;
  actualDataClass: WeatherDataClass;
  semanticSubstitution: boolean;
  retrievalTimeUtc: string;
  issueTimeUtc: string | null;
  validRangeUtc: [string, string];
  intervalSeconds: number;
  units: typeof CANONICAL_WEATHER_UNITS;
  quality: QualityAssessment;
  calculationVersion: string;
  assumptions: string[];
  uncertainty: {
    method: string;
    level: number | null;
    boundsAvailable: boolean;
    note: string;
  };
  transformations: string[];
  warnings: string[];
}

export interface WeatherDataset {
  records: CanonicalWeatherHour[];
  provenance: WeatherProvenance;
  attempts: ProviderAttempt[];
  cache: ProviderCacheMetadata;
  /** Retained for scheduled immutable snapshots; API routes must not echo it. */
  rawPayload?: unknown;
}

export interface RawProviderResult {
  provider: ProviderDescriptor;
  actualDataClass: WeatherDataClass;
  records: CanonicalWeatherHour[];
  issueTimeUtc: string | null;
  retrievalTimeUtc: string;
  assumptions: string[];
  transformations: string[];
  warnings: string[];
  rawPayload?: unknown;
  transport?: {
    httpStatus: number;
    retryCount: number;
  };
}

export interface ProviderFetchContext {
  fetch: typeof globalThis.fetch;
  now: () => Date;
  signal?: AbortSignal;
}

export interface WeatherProvider {
  readonly descriptor: ProviderDescriptor;
  supports(query: WeatherQuery): boolean;
  fetch(query: WeatherQuery, context: ProviderFetchContext): Promise<RawProviderResult>;
}

export interface ProviderRuntimeEnv {
  SOLAR_PROVIDER_MODE?: string;
  SOLAR_ALLOW_SIMULATED_FALLBACK?: string;
  OPEN_METEO_BASE_URL?: string;
  OPEN_METEO_ARCHIVE_BASE_URL?: string;
  OPEN_METEO_FORECAST_MODEL?: string;
  OPEN_METEO_REANALYSIS_MODEL?: string;
  PVGIS_BASE_URL?: string;
  PROVIDER_TIMEOUT_MS?: string;
  PROVIDER_MAX_ATTEMPTS?: string;
  PROVIDER_BACKOFF_BASE_MS?: string;
  PROVIDER_CACHE_TTL_SECONDS?: string;
  SOLAR_INGESTION_PROVIDER?: string;
  SOLAR_DEFAULT_LATITUDE?: string;
  SOLAR_DEFAULT_LONGITUDE?: string;
  DB?: D1Database;
  SNAPSHOTS?: R2Bucket;
}
