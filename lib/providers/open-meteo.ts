import type { ProviderConfig } from "./config";
import {
  depthToCentimetres,
  precipitationToMillimetres,
  pressureToHpa,
  speedToMetresPerSecond,
  temperatureToCelsius,
} from "./conversions";
import { ProviderError } from "./errors";
import { emptyWeatherHour, finiteOrNull, normaliseUtcTimestamp, sanitiseRecords } from "./normalise";
import { fetchJsonWithRetry } from "./retry";
import type {
  CanonicalWeatherHour,
  ProviderFetchContext,
  RawProviderResult,
  WeatherProvider,
  WeatherQuery,
} from "./types";

interface OpenMeteoPayload {
  latitude?: unknown;
  longitude?: unknown;
  elevation?: unknown;
  timezone?: unknown;
  utc_offset_seconds?: unknown;
  hourly?: Record<string, unknown>;
  hourly_units?: Record<string, unknown>;
  error?: unknown;
  reason?: unknown;
}

const HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "cloud_cover",
  "precipitation",
  "snow_depth",
  "surface_pressure",
  "wind_speed_10m",
  "shortwave_radiation",
  "direct_normal_irradiance",
  "diffuse_radiation",
];

export class OpenMeteoProvider implements WeatherProvider {
  readonly descriptor = {
    id: "open-meteo" as const,
    name: "Open-Meteo",
    product: "Forecast API and Historical Weather API",
    version: "v1",
    dataClasses: ["issued_forecast" as const, "reanalysis" as const],
    temporalResolutionSeconds: 3_600,
    spatialResolutionKm: null,
    attribution: "Open-Meteo; underlying model attribution is retained in assumptions.",
    documentationUrl: "https://open-meteo.com/en/docs",
  };

  constructor(private readonly config: ProviderConfig) {}

  supports(query: WeatherQuery): boolean {
    return query.dataClass === "issued_forecast" || query.dataClass === "reanalysis";
  }

  async fetch(query: WeatherQuery, context: ProviderFetchContext): Promise<RawProviderResult> {
    if (!this.supports(query)) {
      throw new ProviderError(`Open-Meteo cannot supply ${query.dataClass} through this adapter.`, {
        code: "UNSUPPORTED_DATA_CLASS",
        providerId: this.descriptor.id,
      });
    }
    const forecast = query.dataClass === "issued_forecast";
    const url = new URL(forecast ? this.config.openMeteoBaseUrl : this.config.openMeteoArchiveBaseUrl);
    url.searchParams.set("latitude", query.latitude.toFixed(5));
    url.searchParams.set("longitude", query.longitude.toFixed(5));
    url.searchParams.set("start_date", query.startUtc.slice(0, 10));
    url.searchParams.set("end_date", query.endUtc.slice(0, 10));
    url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
    url.searchParams.set("timezone", "GMT");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("wind_speed_unit", "ms");
    url.searchParams.set("precipitation_unit", "mm");
    const model = forecast
      ? this.config.openMeteoForecastModel
      : this.config.openMeteoReanalysisModel;
    if (model && model !== "best_match") url.searchParams.set("models", model);

    const transport = await fetchJsonWithRetry(
      url,
      { method: "GET" },
      this.config,
      this.descriptor.id,
      context.fetch,
      context.signal,
    );
    const payload = validatePayload(transport.payload);
    const records = parseHourly(payload, query);
    const product = forecast
      ? `Weather Forecast API (${model || "best_match"})`
      : `Historical Weather API (${model || "best_match"})`;

    return {
      provider: {
        ...this.descriptor,
        product,
        spatialResolutionKm: forecast ? null : reanalysisResolutionKm(model),
      },
      actualDataClass: query.dataClass,
      records,
      issueTimeUtc: null,
      retrievalTimeUtc: context.now().toISOString(),
      assumptions: [
        `Requested Open-Meteo model selector: ${model || "best_match"}.`,
        forecast
          ? "The best-match API does not expose a single authoritative model issue time in this response; issueTimeUtc is null."
          : "Historical values are modelled reanalysis, not direct station observations.",
        "Radiation variables are preceding-hour means and timestamps are normalised to UTC.",
      ],
      transformations: [
        "Open-Meteo JSON schema guard",
        "provider units to canonical SI units",
        "GMT timestamp to ISO-8601 UTC",
        "physical-bound outlier rejection",
        "field-specific linear interpolation for eligible interior gaps of no more than two hours",
      ],
      warnings: forecast
        ? ["Exact upstream model issue time is unavailable in the best-match response and is not inferred."]
        : ["Reanalysis represents a gridded model estimate and may not resolve local terrain or shading."],
      rawPayload: payload,
      transport: {
        httpStatus: transport.httpStatus,
        retryCount: transport.retryCount,
      },
    };
  }
}

function reanalysisResolutionKm(model: string): number | null {
  const normalised = model.toLowerCase().replaceAll("-", "_");
  if (normalised === "era5") return 25;
  if (normalised === "era5_land") return 11;
  if (normalised === "era5_ensemble") return 55;
  if (normalised === "cerra") return 5;
  return null;
}

function validatePayload(value: unknown): OpenMeteoPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Expected a JSON object.");
  const payload = value as OpenMeteoPayload;
  if (payload.error === true) {
    invalid(typeof payload.reason === "string" ? payload.reason : "Open-Meteo reported an error.");
  }
  if (!payload.hourly || typeof payload.hourly !== "object") invalid("Missing hourly object.");
  const times = payload.hourly.time;
  // A complete preceding-hour calendar year can require requesting the final
  // interval end at 00:00 on 1 January of the following year. Open-Meteo's
  // date-granular transport then includes one boundary day that is filtered
  // against the exact query range below.
  if (!Array.isArray(times) || times.length === 0 || times.length > 8_808) {
    invalid("Hourly time must be a non-empty array of at most 8,808 values.");
  }
  return payload;
}

function parseHourly(payload: OpenMeteoPayload, query: WeatherQuery): CanonicalWeatherHour[] {
  const hourly = payload.hourly as Record<string, unknown>;
  const units = (payload.hourly_units ?? {}) as Record<string, unknown>;
  const times = hourly.time as unknown[];
  const fields = Object.fromEntries(
    HOURLY_VARIABLES.map((name) => [name, series(hourly[name], times.length, name)]),
  ) as Record<string, Array<number | null>>;
  const start = Date.parse(query.startUtc);
  const end = Date.parse(query.endUtc);
  const records: CanonicalWeatherHour[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const sourceTimestamp = times[index];
    if (typeof sourceTimestamp !== "string") continue;
    const timestampUtc = normaliseUtcTimestamp(sourceTimestamp);
    if (!timestampUtc) continue;
    const timestamp = Date.parse(timestampUtc);
    if (timestamp < start || timestamp > end) continue;
    const record = emptyWeatherHour(timestampUtc, sourceTimestamp);
    record.temperatureC = convert(fields.temperature_2m[index], (value) =>
      temperatureToCelsius(value, unit(units.temperature_2m)),
    );
    record.relativeHumidityPct = fields.relative_humidity_2m[index];
    record.cloudCoverPct = fields.cloud_cover[index];
    record.precipitationMm = convert(fields.precipitation[index], (value) =>
      precipitationToMillimetres(value, unit(units.precipitation)),
    );
    record.snowDepthCm = convert(fields.snow_depth[index], (value) =>
      depthToCentimetres(value, unit(units.snow_depth)),
    );
    record.surfacePressureHpa = convert(fields.surface_pressure[index], (value) =>
      pressureToHpa(value, unit(units.surface_pressure)),
    );
    record.windSpeedMps = convert(fields.wind_speed_10m[index], (value) =>
      speedToMetresPerSecond(value, unit(units.wind_speed_10m)),
    );
    record.ghiWm2 = nonNegative(fields.shortwave_radiation[index]);
    record.dniWm2 = nonNegative(fields.direct_normal_irradiance[index]);
    record.dhiWm2 = nonNegative(fields.diffuse_radiation[index]);
    records.push(record);
  }
  if (records.length === 0) invalid("No hourly values overlapped the requested UTC range.");
  return sanitiseRecords(records);
}

function series(value: unknown, expectedLength: number, name: string): Array<number | null> {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new ProviderError(`Open-Meteo hourly.${name} is missing or misaligned.`, {
      code: "UPSTREAM_RESPONSE_INVALID",
      providerId: "open-meteo",
    });
  }
  return value.map(finiteOrNull);
}

function convert(value: number | null, transform: (value: number) => number): number | null {
  return value === null ? null : transform(value);
}

function nonNegative(value: number | null): number | null {
  if (value === null) return null;
  return value > -0.5 && value < 0 ? 0 : value;
}

function unit(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function invalid(message: string): never {
  throw new ProviderError(`Invalid Open-Meteo response: ${message}`, {
    code: "UPSTREAM_RESPONSE_INVALID",
    providerId: "open-meteo",
  });
}
