import { ProviderError } from "./errors";
import type {
  ProviderMode,
  WeatherDataClass,
  WeatherProviderId,
  WeatherQuery,
} from "./types";

export interface WeatherQueryInput {
  latitude?: unknown;
  longitude?: unknown;
  startUtc?: unknown;
  endUtc?: unknown;
  dataClass?: unknown;
  provider?: unknown;
  mode?: unknown;
  allowSimulatedFallback?: unknown;
  panelTiltDeg?: unknown;
  panelAzimuthDeg?: unknown;
}

const DATA_CLASSES: WeatherDataClass[] = [
  "observation",
  "reanalysis",
  "issued_forecast",
  "typical_meteorological_year",
  "simulation",
];
const PROVIDERS: Array<WeatherProviderId | "auto"> = ["auto", "sample", "open-meteo", "pvgis"];
const MODES: ProviderMode[] = ["auto", "live", "sample"];

export function parseWeatherQuery(
  input: WeatherQueryInput,
  now = new Date(),
): WeatherQuery {
  const dataClass = enumValue(input.dataClass, DATA_CLASSES, "simulation", "dataClass");
  const provider = enumValue(input.provider, PROVIDERS, "auto", "provider");
  const mode = enumValue(input.mode, MODES, dataClass === "simulation" ? "sample" : "auto", "mode");
  const latitude = bounded(input.latitude, 51.5074, -90, 90, "latitude");
  const longitude = bounded(input.longitude, -0.1278, -180, 180, "longitude");
  const defaults = defaultRange(dataClass, now);
  const startUtc = utcHour(input.startUtc, defaults[0], "startUtc");
  const endUtc = utcHour(input.endUtc, defaults[1], "endUtc");
  const durationMs = Date.parse(endUtc) - Date.parse(startUtc);
  if (durationMs < 0) invalid("endUtc must be on or after startUtc.");
  if (durationMs > 366 * 24 * 3_600_000) invalid("Weather ranges are limited to 366 days per request.");
  if (dataClass === "issued_forecast" && durationMs > 16 * 24 * 3_600_000) {
    invalid("Issued forecast requests are limited to 16 days.");
  }
  if (provider === "pvgis" && dataClass !== "typical_meteorological_year") {
    invalid("PVGIS is exposed here only for typical_meteorological_year data.");
  }
  if (provider === "sample" && mode === "live") invalid("The sample provider is not a live provider.");
  const allowSimulatedFallback = booleanValue(input.allowSimulatedFallback, mode === "auto");

  return {
    latitude,
    longitude,
    startUtc,
    endUtc,
    intervalSeconds: 3_600,
    dataClass,
    provider,
    mode,
    allowSimulatedFallback,
    panelTiltDeg:
      input.panelTiltDeg === undefined
        ? undefined
        : bounded(input.panelTiltDeg, 30, 0, 90, "panelTiltDeg"),
    panelAzimuthDeg:
      input.panelAzimuthDeg === undefined
        ? undefined
        : bounded(input.panelAzimuthDeg, 0, -180, 180, "panelAzimuthDeg"),
  };
}

function defaultRange(dataClass: WeatherDataClass, now: Date): [string, string] {
  if (dataClass === "typical_meteorological_year") {
    return ["2001-01-01T00:00:00.000Z", "2001-12-31T23:00:00.000Z"];
  }
  if (dataClass === "issued_forecast") {
    const start = floorUtcHour(now);
    return [start.toISOString(), new Date(start.getTime() + 7 * 24 * 3_600_000).toISOString()];
  }
  if (dataClass === "reanalysis" || dataClass === "observation") {
    const end = floorUtcHour(new Date(now.getTime() - 7 * 24 * 3_600_000));
    return [new Date(end.getTime() - 7 * 24 * 3_600_000).toISOString(), end.toISOString()];
  }
  return ["2025-06-01T00:00:00.000Z", "2025-06-07T23:00:00.000Z"];
}

function floorUtcHour(date: Date): Date {
  const result = new Date(date);
  result.setUTCMinutes(0, 0, 0);
  return result;
}

function utcHour(value: unknown, fallback: string, name: string): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") invalid(`${name} must be an ISO-8601 timestamp.`);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    invalid(`${name} must include an explicit UTC offset or Z suffix.`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) invalid(`${name} must be an ISO-8601 timestamp.`);
  const date = new Date(timestamp);
  if (date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
    invalid(`${name} must be aligned to an exact UTC hour.`);
  }
  return date.toISOString();
}

function bounded(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    invalid(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  name: string,
): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    invalid(`${name} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && ["true", "1", "yes"].includes(value.toLowerCase())) return true;
  if (typeof value === "string" && ["false", "0", "no"].includes(value.toLowerCase())) return false;
  invalid("allowSimulatedFallback must be a boolean.");
}

function invalid(message: string): never {
  throw new ProviderError(message, { code: "INVALID_QUERY" });
}
