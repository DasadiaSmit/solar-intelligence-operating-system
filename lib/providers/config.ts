import { ProviderError } from "./errors";
import type { ProviderMode, ProviderRuntimeEnv, WeatherProviderId } from "./types";

export interface ProviderConfig {
  mode: ProviderMode;
  allowSimulatedFallback: boolean;
  openMeteoBaseUrl: string;
  openMeteoArchiveBaseUrl: string;
  openMeteoForecastModel: string;
  openMeteoReanalysisModel: string;
  pvgisBaseUrl: string;
  timeoutMs: number;
  maxAttempts: number;
  backoffBaseMs: number;
  cacheTtlSeconds: number;
  ingestionProvider: WeatherProviderId;
  defaultLatitude: number;
  defaultLongitude: number;
}

const DEFAULTS: ProviderConfig = {
  mode: "auto",
  allowSimulatedFallback: true,
  openMeteoBaseUrl: "https://api.open-meteo.com/v1/forecast",
  openMeteoArchiveBaseUrl: "https://archive-api.open-meteo.com/v1/archive",
  openMeteoForecastModel: "best_match",
  openMeteoReanalysisModel: "era5",
  pvgisBaseUrl: "https://re.jrc.ec.europa.eu/api/v5_3/tmy",
  timeoutMs: 7_000,
  maxAttempts: 3,
  backoffBaseMs: 220,
  cacheTtlSeconds: 900,
  ingestionProvider: "sample",
  defaultLatitude: 51.5074,
  defaultLongitude: -0.1278,
};

function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function safeProviderUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !isLocalhost(url)) return fallback;
    url.username = "";
    url.password = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function isLocalhost(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1")
  );
}

export function readProviderConfig(env: ProviderRuntimeEnv = {}): ProviderConfig {
  const mode = ["auto", "live", "sample"].includes(env.SOLAR_PROVIDER_MODE ?? "")
    ? (env.SOLAR_PROVIDER_MODE as ProviderMode)
    : DEFAULTS.mode;
  const ingestionProvider = ["sample", "open-meteo", "pvgis"].includes(
    env.SOLAR_INGESTION_PROVIDER ?? "",
  )
    ? (env.SOLAR_INGESTION_PROVIDER as WeatherProviderId)
    : DEFAULTS.ingestionProvider;

  return {
    mode,
    allowSimulatedFallback: booleanValue(
      env.SOLAR_ALLOW_SIMULATED_FALLBACK,
      DEFAULTS.allowSimulatedFallback,
    ),
    openMeteoBaseUrl: safeProviderUrl(env.OPEN_METEO_BASE_URL, DEFAULTS.openMeteoBaseUrl),
    openMeteoArchiveBaseUrl: safeProviderUrl(
      env.OPEN_METEO_ARCHIVE_BASE_URL,
      DEFAULTS.openMeteoArchiveBaseUrl,
    ),
    openMeteoForecastModel: env.OPEN_METEO_FORECAST_MODEL?.trim() || DEFAULTS.openMeteoForecastModel,
    openMeteoReanalysisModel:
      env.OPEN_METEO_REANALYSIS_MODEL?.trim() || DEFAULTS.openMeteoReanalysisModel,
    pvgisBaseUrl: safeProviderUrl(env.PVGIS_BASE_URL, DEFAULTS.pvgisBaseUrl),
    timeoutMs: Math.round(
      boundedNumber(env.PROVIDER_TIMEOUT_MS, DEFAULTS.timeoutMs, 1_000, 20_000),
    ),
    maxAttempts: Math.round(
      boundedNumber(env.PROVIDER_MAX_ATTEMPTS, DEFAULTS.maxAttempts, 1, 4),
    ),
    backoffBaseMs: Math.round(
      boundedNumber(env.PROVIDER_BACKOFF_BASE_MS, DEFAULTS.backoffBaseMs, 50, 1_000),
    ),
    cacheTtlSeconds: Math.round(
      boundedNumber(
        env.PROVIDER_CACHE_TTL_SECONDS,
        DEFAULTS.cacheTtlSeconds,
        60,
        86_400,
      ),
    ),
    ingestionProvider,
    defaultLatitude: boundedNumber(
      env.SOLAR_DEFAULT_LATITUDE,
      DEFAULTS.defaultLatitude,
      -90,
      90,
    ),
    defaultLongitude: boundedNumber(
      env.SOLAR_DEFAULT_LONGITUDE,
      DEFAULTS.defaultLongitude,
      -180,
      180,
    ),
  };
}

export function assertConfiguredMode(config: ProviderConfig, requestedMode: ProviderMode): void {
  if (config.mode === "sample" && requestedMode === "live") {
    throw new ProviderError("Live providers are disabled by server configuration.", {
      code: "NO_SEMANTICALLY_SAFE_PROVIDER",
    });
  }
}

