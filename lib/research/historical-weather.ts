import type { LocationConfig, WeatherHour } from "@/lib/contracts";
import { makeQuality } from "@/lib/contracts";
import {
  ProviderError,
  getWeatherDataset,
  type CanonicalWeatherField,
  type CanonicalWeatherHour,
  type ProviderRuntimeEnv,
  type WeatherDataset,
  type WeatherQuery,
} from "@/lib/providers";
import { sha256Hex } from "@/lib/provenance";
import { DAYS_IN_MONTH, type SampleYear } from "@/lib/sample/weather";
import { decomposeGhiErbs } from "@/lib/solar/irradiance";
import { clamp, mean } from "@/lib/solar/math";
import { calculateSolarPosition } from "@/lib/solar/solar-position";

export const RESEARCH_YEARS = [2022, 2023, 2024, 2025] as const;
export type ResearchYear = (typeof RESEARCH_YEARS)[number];
export type ResearchDataMode = "live" | "sample";
export const RESEARCH_WEATHER_ADAPTER_VERSION = "sios-weather-science-adapter-1.0.0";

const SUPPLIED_IRRADIANCE_CLOSURE_ABSOLUTE_TOLERANCE_WM2 = 25;
const SUPPLIED_IRRADIANCE_CLOSURE_RELATIVE_TOLERANCE = 0.05;
const SUPPLIED_IRRADIANCE_CLOSURE_QUALITY_PENALTY = 0.02;

const REQUIRED_FIELDS: CanonicalWeatherField[] = [
  "temperatureC",
  "relativeHumidityPct",
  "cloudCoverPct",
  "precipitationMm",
  "surfacePressureHpa",
  "windSpeedMps",
  "ghiWm2",
];

export interface HistoricalDatasetEvidence {
  year: ResearchYear;
  snapshotId: string;
  contentHash: string;
  scienceContentHash: string;
  providerId: string;
  providerName: string;
  product: string;
  requestedDataClass: string;
  actualDataClass: string;
  validRangeUtc: [string, string];
  sourceRecordCount: number;
  simulationRecordCount: number;
  leapHoursRemoved: number;
  providerQualityScore: number;
  providerCompleteness: number;
  scienceQualityScore: number;
  scienceCompleteness: number;
  derivationCounts: {
    erbsIrradianceHours: number;
    suppliedIrradianceClosureHours: number;
    snowDepthProxySourceHours: number;
    snowDepthProxyHours: number;
    snowAlbedoHours: number;
  };
  schemaVersion: string;
  calculationVersion: string;
  scienceAdapterVersion: string;
  transformations: string[];
  warnings: string[];
}

export interface HistoricalWeatherArchive {
  mode: ResearchDataMode;
  years: Record<ResearchYear, WeatherHour[]>;
  evidence: HistoricalDatasetEvidence[];
  datasets: Record<ResearchYear, WeatherDataset>;
}

export interface HistoricalWeatherLoadOptions {
  mode: ResearchDataMode;
  env?: ProviderRuntimeEnv;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  bypassCache?: boolean;
}

/**
 * Acquires one bounded calendar-year request at a time. Live mode is strictly
 * reanalysis-only: it never substitutes sample data. The returned science
 * calendar is no-leap for like-for-like model alignment, while source evidence
 * records that 24 hours were removed from 2024.
 */
export async function loadHistoricalWeatherArchive(
  location: LocationConfig,
  options: HistoricalWeatherLoadOptions,
): Promise<HistoricalWeatherArchive> {
  const years = {} as Record<ResearchYear, WeatherHour[]>;
  const datasets = {} as Record<ResearchYear, WeatherDataset>;
  const evidence: HistoricalDatasetEvidence[] = [];

  for (const year of RESEARCH_YEARS) {
    const query = researchYearQuery(year, location, options.mode);
    const dataset = await getWeatherDataset(query, {
      env: options.env,
      fetch: options.fetch,
      now: options.now,
      bypassCache: options.bypassCache,
    });
    const requiredClass = options.mode === "live" ? "reanalysis" : "simulation";
    if (
      dataset.provenance.actualDataClass !== requiredClass ||
      dataset.provenance.semanticSubstitution
    ) {
      throw new ProviderError(
        `Research year ${year} requires ${requiredClass}; received ${dataset.provenance.actualDataClass}.`,
        {
          code: "NO_SEMANTICALLY_SAFE_PROVIDER",
          providerId: dataset.provenance.provider.id,
        },
      );
    }
    const weather = canonicalDatasetToWeatherYear(dataset, year, location);
    const scienceContentHash = await sha256Hex(weather);
    const erbsIrradianceHours = weather.filter((hour) =>
      hour.quality.flags.includes("derived:erbs-irradiance-components"),
    ).length;
    const suppliedIrradianceClosureHours = weather.filter((hour) =>
      hour.quality.flags.includes("corrected:supplied-irradiance-closure"),
    ).length;
    const snowDepthProxyHours = weather.filter((hour) =>
      hour.quality.flags.includes("derived:snow-depth-balance-proxy"),
    ).length;
    const snowDepthProxySourceHours = dataset.records.filter(
      (record) => record.snowDepthCm === null,
    ).length;
    const snowAlbedoHours = weather.filter((hour) =>
      hour.quality.flags.includes("derived:albedo-snow"),
    ).length;
    const usedSnowProxy = snowDepthProxyHours > 0;
    const usedErbsDecomposition = erbsIrradianceHours > 0;
    const usedSuppliedClosureCorrection = suppliedIrradianceClosureHours > 0;
    years[year] = weather;
    datasets[year] = dataset;
    evidence.push({
      year,
      snapshotId: dataset.provenance.snapshotId,
      contentHash: dataset.provenance.contentHash,
      scienceContentHash,
      providerId: dataset.provenance.provider.id,
      providerName: dataset.provenance.provider.name,
      product: dataset.provenance.provider.product,
      requestedDataClass: dataset.provenance.requestedDataClass,
      actualDataClass: dataset.provenance.actualDataClass,
      validRangeUtc: dataset.provenance.validRangeUtc,
      sourceRecordCount: dataset.records.length,
      simulationRecordCount: weather.length,
      leapHoursRemoved: dataset.records.length - weather.length,
      providerQualityScore: dataset.provenance.quality.score,
      providerCompleteness: dataset.provenance.quality.completeness,
      scienceQualityScore: mean(weather.map((hour) => hour.quality.score)),
      scienceCompleteness: mean(weather.map((hour) => hour.quality.completeness)),
      derivationCounts: {
        erbsIrradianceHours,
        suppliedIrradianceClosureHours,
        snowDepthProxySourceHours,
        snowDepthProxyHours,
        snowAlbedoHours,
      },
      schemaVersion: dataset.provenance.schemaVersion,
      calculationVersion: dataset.provenance.calculationVersion,
      scienceAdapterVersion: RESEARCH_WEATHER_ADAPTER_VERSION,
      transformations: [
        ...dataset.provenance.transformations,
        "preceding-hour radiation evaluated at interval midpoint (provider timestamp minus 30 minutes)",
        ...(usedErbsDecomposition ? ["GHI decomposed into DNI and DHI with the Erbs hourly correlation"] : []),
        ...(usedSuppliedClosureCorrection
          ? ["inconsistent supplied GHI/DNI/DHI reconciled to the midpoint solar-zenith closure equation"]
          : []),
        ...(usedSnowProxy ? ["snow depth derived with a temperature/precipitation balance proxy"] : []),
        "surface albedo derived from snow-depth and precipitation rules",
        ...(year === 2024
          ? ["29 February excluded from the output calendar after stateful snow evolution"]
          : []),
      ],
      warnings: [
        ...dataset.provenance.warnings,
        ...(usedSnowProxy
          ? ["Source snow depth was unavailable; a simplified balance proxy was used and science quality was reduced."]
          : []),
        ...(usedSuppliedClosureCorrection
          ? ["Some supplied irradiance components exceeded the declared closure tolerance; corrected hours are flagged and quality-penalised."]
          : []),
      ],
    });
  }

  return { mode: options.mode, years, evidence, datasets };
}

export function researchYearQuery(
  year: ResearchYear,
  location: Pick<LocationConfig, "latitude" | "longitude">,
  mode: ResearchDataMode,
): WeatherQuery {
  // Open-Meteo labels a preceding-hour radiation mean with the interval-end
  // timestamp. The scientific year therefore begins at 01:00 on 1 January and
  // ends at 00:00 on 1 January of the following year.
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    startUtc: `${year}-01-01T01:00:00.000Z`,
    endUtc: `${year + 1}-01-01T00:00:00.000Z`,
    intervalSeconds: 3_600,
    dataClass: mode === "live" ? "reanalysis" : "simulation",
    provider: mode === "live" ? "open-meteo" : "sample",
    mode,
    allowSimulatedFallback: false,
  };
}

/** Converts a validated provider dataset into the non-null scientific engine contract. */
export function canonicalDatasetToWeatherYear(
  dataset: WeatherDataset,
  year: ResearchYear,
  location: Pick<LocationConfig, "latitude" | "longitude" | "elevationM">,
): WeatherHour[] {
  const byTime = new Map<number, CanonicalWeatherHour>();
  for (const record of dataset.records) {
    const timestamp = Date.parse(record.timestampUtc);
    if (!Number.isFinite(timestamp)) continue;
    if (byTime.has(timestamp)) {
      invalidDataset(dataset, `Duplicate hourly timestamp ${record.timestampUtc}.`);
    }
    byTime.set(timestamp, record);
  }

  const sourceYearHours = isLeapYear(year) ? 8_784 : 8_760;
  if (dataset.records.length !== sourceYearHours || byTime.size !== sourceYearHours) {
    invalidDataset(
      dataset,
      `Expected ${sourceYearHours.toLocaleString("en-GB")} complete source intervals before calendar alignment; received ${dataset.records.length.toLocaleString("en-GB")}.`,
    );
  }
  const firstIntervalStart = Date.UTC(year, 0, 1);
  const snowDepthByIntervalEnd = new Map<number, number>();
  let modelledSnowDepthCm = 0;
  for (let index = 0; index < sourceYearHours; index += 1) {
    const intervalEnd = firstIntervalStart + (index + 1) * 3_600_000;
    const record = byTime.get(intervalEnd);
    if (!record) {
      invalidDataset(
        dataset,
        `Missing required source interval ending ${new Date(intervalEnd).toISOString()}.`,
      );
    }
    const missing = REQUIRED_FIELDS.filter((field) => record[field] === null);
    if (missing.length > 0) {
      invalidDataset(
        dataset,
        `Required fields remain missing at ${record.timestampUtc}: ${missing.join(", ")}.`,
      );
    }
    modelledSnowDepthCm = record.snowDepthCm === null
      ? updateSnowProxy(
          modelledSnowDepthCm,
          record.temperatureC as number,
          record.precipitationMm as number,
        )
      : Math.max(0, record.snowDepthCm);
    snowDepthByIntervalEnd.set(intervalEnd, modelledSnowDepthCm);
  }

  const result: WeatherHour[] = [];
  let dayOfYear = 0;
  for (let monthIndex = 0; monthIndex < DAYS_IN_MONTH.length; monthIndex += 1) {
    const month = monthIndex + 1;
    const days = DAYS_IN_MONTH[monthIndex] ?? 0;
    for (let day = 1; day <= days; day += 1) {
      dayOfYear += 1;
      for (let hour = 0; hour < 24; hour += 1) {
        const intervalStart = Date.UTC(year, monthIndex, day, hour);
        const intervalEnd = intervalStart + 3_600_000;
        const record = byTime.get(intervalEnd);
        if (!record) {
          invalidDataset(
            dataset,
            `Missing required research interval ending ${new Date(intervalEnd).toISOString()}.`,
          );
        }
        const midpoint = new Date(intervalEnd - 30 * 60_000).toISOString();
        const position = calculateSolarPosition(midpoint, location);
        const ghiWm2 = record.ghiWm2 as number;
        const flags = [
          ...record.qualityFlags,
          `source:${dataset.provenance.actualDataClass}`,
          "interval:preceding-hour-mean",
          "timestamp:interval-end",
          "solar-evaluation:interval-midpoint",
          "calendar:no-leap-research-alignment",
        ];
        const irradiance = resolveIrradiance(record, ghiWm2, position, flags);
        const precipitationMm = record.precipitationMm as number;
        const temperatureC = record.temperatureC as number;
        const snowDepthCm = snowDepthByIntervalEnd.get(intervalEnd);
        if (snowDepthCm === undefined) {
          invalidDataset(
            dataset,
            `Snow-state derivation is missing for interval ending ${record.timestampUtc}.`,
          );
        }
        if (record.snowDepthCm === null) flags.push("derived:snow-depth-balance-proxy");
        const albedo = snowDepthCm > 0.5
          ? 0.58
          : clamp(0.19 + Math.min(0.09, precipitationMm * 0.01), 0.16, 0.28);
        flags.push(snowDepthCm > 0.5 ? "derived:albedo-snow" : "derived:albedo-surface-default");
        const completeness = REQUIRED_FIELDS.filter((field) => record[field] !== null).length /
          REQUIRED_FIELDS.length;
        result.push({
          timestamp: midpoint,
          sourceTimestamp: record.sourceTimestamp,
          sourceYear: year as SampleYear,
          dayOfYear,
          month,
          day,
          hour,
          temperatureC,
          windSpeedMps: record.windSpeedMps as number,
          relativeHumidityPct: record.relativeHumidityPct as number,
          cloudCoverPct: record.cloudCoverPct as number,
          precipitationMm,
          snowDepthCm,
          surfacePressureHpa: record.surfacePressureHpa as number,
          albedo,
          ghiWm2: irradiance.ghiWm2,
          dniWm2: irradiance.dniWm2,
          dhiWm2: irradiance.dhiWm2,
          quality: makeQuality(
            Math.max(
              0,
              Math.min(record.qualityScore, dataset.provenance.quality.score) -
                (record.snowDepthCm === null ? 0.025 : 0) -
                (flags.includes("corrected:supplied-irradiance-closure")
                  ? SUPPLIED_IRRADIANCE_CLOSURE_QUALITY_PENALTY
                  : 0),
            ),
            [...new Set(flags)].sort(),
            completeness,
            record.imputedFields.length > 0 ||
              record.snowDepthCm === null ||
              flags.includes("corrected:supplied-irradiance-closure"),
          ),
        });
      }
    }
  }

  if (result.length !== 8_760) {
    invalidDataset(dataset, `Expected 8,760 no-leap research hours; received ${result.length}.`);
  }
  return result;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function updateSnowProxy(
  priorDepthCm: number,
  temperatureC: number,
  precipitationMm: number,
): number {
  if (temperatureC < 1 && precipitationMm > 0) {
    return clamp(priorDepthCm + precipitationMm * 0.65, 0, 100);
  }
  return clamp(priorDepthCm - Math.max(0, temperatureC) * 0.016, 0, 100);
}

function resolveIrradiance(
  record: CanonicalWeatherHour,
  ghiWm2: number,
  position: ReturnType<typeof calculateSolarPosition>,
  flags: string[],
) {
  if (record.dniWm2 === null || record.dhiWm2 === null) {
    flags.push("derived:erbs-irradiance-components");
    return decomposeGhiErbs(ghiWm2, position);
  }
  const ghi = Math.max(0, ghiWm2);
  const suppliedDni = Math.max(0, record.dniWm2);
  const suppliedDhi = Math.max(0, record.dhiWm2);
  const cosZenith = position.isDaylight
    ? Math.max(0, Math.cos(position.zenithDeg * Math.PI / 180))
    : 0;
  const suppliedHorizontal = suppliedDni * cosZenith + suppliedDhi;
  const tolerance = Math.max(
    SUPPLIED_IRRADIANCE_CLOSURE_ABSOLUTE_TOLERANCE_WM2,
    ghi * SUPPLIED_IRRADIANCE_CLOSURE_RELATIVE_TOLERANCE,
  );
  if (Math.abs(ghi - suppliedHorizontal) > tolerance) {
    flags.push("corrected:supplied-irradiance-closure");
    const correctedDni = cosZenith > 0.065
      ? clamp(suppliedDni, 0, Math.min(1_400, ghi / cosZenith))
      : 0;
    return {
      ghiWm2: ghi,
      dniWm2: correctedDni,
      dhiWm2: clamp(ghi - correctedDni * cosZenith, 0, ghi),
    };
  }
  return {
    ghiWm2: ghi,
    dniWm2: suppliedDni,
    dhiWm2: suppliedDhi,
  };
}

function invalidDataset(dataset: WeatherDataset, detail: string): never {
  throw new ProviderError(
    `Dataset ${dataset.provenance.snapshotId} is not eligible for annual simulation. ${detail}`,
    {
      code: "UPSTREAM_RESPONSE_INVALID",
      providerId: dataset.provenance.provider.id,
    },
  );
}
