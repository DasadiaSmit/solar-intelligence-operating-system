import type { ProviderConfig } from "./config";
import { pressureToHpa, speedToMetresPerSecond } from "./conversions";
import { ProviderError } from "./errors";
import { emptyWeatherHour, finiteOrNull, sanitiseRecords } from "./normalise";
import { fetchJsonWithRetry } from "./retry";
import type {
  ProviderFetchContext,
  RawProviderResult,
  WeatherProvider,
  WeatherQuery,
} from "./types";

interface PvgisPayload {
  inputs?: Record<string, unknown>;
  outputs?: {
    tmy_hourly?: unknown;
    months_selected?: unknown;
  };
  meta?: Record<string, unknown>;
  message?: unknown;
}

export class PvgisProvider implements WeatherProvider {
  readonly descriptor = {
    id: "pvgis" as const,
    name: "European Commission Joint Research Centre PVGIS",
    product: "PVGIS typical meteorological year (TMY)",
    version: "5.3",
    dataClasses: ["typical_meteorological_year" as const],
    temporalResolutionSeconds: 3_600,
    spatialResolutionKm: null,
    attribution: "European Commission, Joint Research Centre (JRC), PVGIS.",
    documentationUrl:
      "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en",
  };

  constructor(private readonly config: ProviderConfig) {}

  supports(query: WeatherQuery): boolean {
    return query.dataClass === "typical_meteorological_year";
  }

  async fetch(query: WeatherQuery, context: ProviderFetchContext): Promise<RawProviderResult> {
    if (!this.supports(query)) {
      throw new ProviderError(`PVGIS TMY cannot supply ${query.dataClass}.`, {
        code: "UNSUPPORTED_DATA_CLASS",
        providerId: this.descriptor.id,
      });
    }
    const url = new URL(this.config.pvgisBaseUrl);
    url.searchParams.set("lat", query.latitude.toFixed(6));
    url.searchParams.set("lon", query.longitude.toFixed(6));
    url.searchParams.set("usehorizon", "1");
    url.searchParams.set("outputformat", "json");
    url.searchParams.set("browser", "0");

    const transport = await fetchJsonWithRetry(
      url,
      { method: "GET" },
      this.config,
      this.descriptor.id,
      context.fetch,
      context.signal,
    );
    const payload = validatePayload(transport.payload);
    const records = parseTmy(payload, query);
    const database = extractDatabase(payload.inputs) ?? "upstream default database";

    return {
      provider: this.descriptor,
      actualDataClass: "typical_meteorological_year",
      records,
      issueTimeUtc: null,
      retrievalTimeUtc: context.now().toISOString(),
      assumptions: [
        `PVGIS selected the source months using ${database}.`,
        "PVGIS TMY uses at least ten source years; it is not an average of 2022–2025.",
        "Source-month timestamps are retained separately while the canonical series is normalised to calendar year 2001 UTC.",
        "The PVGIS database and horizon model determine spatial representativeness; local obstruction surveys are not included.",
      ],
      transformations: [
        "PVGIS 5.3 JSON schema guard",
        "source month timestamps to a monotonic 2001 UTC TMY calendar",
        "Pa to hPa and canonical SI unit conversion",
        "physical-bound outlier rejection",
      ],
      warnings: [
        "TMY is a constructed climatological reference and must not be treated as an issued forecast or a measured year.",
        "Cloud cover, precipitation and snow depth are not supplied by this PVGIS TMY product and remain null.",
      ],
      rawPayload: payload,
      transport: {
        httpStatus: transport.httpStatus,
        retryCount: transport.retryCount,
      },
    };
  }
}

function validatePayload(value: unknown): PvgisPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Expected a JSON object.");
  const payload = value as PvgisPayload;
  const hourly = payload.outputs?.tmy_hourly;
  if (!Array.isArray(hourly) || hourly.length < 8_700 || hourly.length > 8_784) {
    invalid("outputs.tmy_hourly must contain one representative year of hourly records.");
  }
  return payload;
}

function parseTmy(payload: PvgisPayload, query: WeatherQuery) {
  const source = payload.outputs?.tmy_hourly as Array<Record<string, unknown>>;
  const records = [];
  const start = Date.parse(query.startUtc);
  const end = Date.parse(query.endUtc);
  for (const row of source) {
    if (!row || typeof row !== "object") continue;
    const sourceTimestamp = stringValue(row["time(UTC)"] ?? row.time);
    if (!sourceTimestamp) continue;
    const parsed = parsePvgisTimestamp(sourceTimestamp);
    if (!parsed) continue;
    const timestampUtc = new Date(
      Date.UTC(2001, parsed.month - 1, parsed.day, parsed.hour, parsed.minute),
    ).toISOString();
    const timestamp = Date.parse(timestampUtc);
    if (timestamp < start || timestamp > end) continue;
    const record = emptyWeatherHour(timestampUtc, sourceTimestamp);
    record.temperatureC = numeric(row.T2m);
    record.relativeHumidityPct = numeric(row.RH);
    record.cloudCoverPct = null;
    record.precipitationMm = null;
    record.snowDepthCm = null;
    record.surfacePressureHpa = convert(numeric(row.SP), (value) => pressureToHpa(value, "Pa"));
    record.windSpeedMps = convert(numeric(row.WS10m), (value) => speedToMetresPerSecond(value, "m/s"));
    record.ghiWm2 = nonNegative(numeric(row["G(h)"]));
    record.dniWm2 = nonNegative(numeric(row["Gb(n)"]));
    record.dhiWm2 = nonNegative(numeric(row["Gd(h)"]));
    record.qualityFlags.push("constructed:typical_meteorological_year");
    records.push(record);
  }
  if (records.length === 0) invalid("No TMY rows overlapped the requested canonical UTC range.");
  return sanitiseRecords(records);
}

function parsePvgisTimestamp(value: string) {
  const match = /^(\d{4})(\d{2})(\d{2}):(\d{2})(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return {
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function extractDatabase(inputs: Record<string, unknown> | undefined): string | null {
  if (!inputs) return null;
  const meteo = inputs.meteo_data;
  if (!meteo || typeof meteo !== "object") return null;
  const source = meteo as Record<string, unknown>;
  const radiation = stringValue(source.radiation_db);
  const weather = stringValue(source.meteo_db);
  return [radiation, weather].filter(Boolean).join(" / ") || null;
}

function numeric(value: unknown): number | null {
  if (typeof value === "string" && value.trim() !== "") return finiteOrNull(Number(value));
  return finiteOrNull(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function convert(value: number | null, transform: (value: number) => number): number | null {
  return value === null ? null : transform(value);
}

function nonNegative(value: number | null): number | null {
  if (value === null) return null;
  return value > -0.5 && value < 0 ? 0 : value;
}

function invalid(message: string): never {
  throw new ProviderError(`Invalid PVGIS response: ${message}`, {
    code: "UPSTREAM_RESPONSE_INVALID",
    providerId: "pvgis",
  });
}

