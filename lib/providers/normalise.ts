import { makeQuality } from "@/lib/contracts";
import { FIELD_BOUNDS } from "./conversions";
import type {
  CanonicalWeatherField,
  CanonicalWeatherHour,
  WeatherProvenance,
} from "./types";

const FIELDS: CanonicalWeatherField[] = [
  "temperatureC",
  "relativeHumidityPct",
  "cloudCoverPct",
  "precipitationMm",
  "snowDepthCm",
  "surfacePressureHpa",
  "windSpeedMps",
  "ghiWm2",
  "dniWm2",
  "dhiWm2",
];

export function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normaliseUtcTimestamp(value: string): string | null {
  const trimmed = value.trim();
  const candidate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)
    ? `${trimmed}Z`
    : trimmed;
  const time = Date.parse(candidate);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function sanitiseRecords(records: CanonicalWeatherHour[]): CanonicalWeatherHour[] {
  const sorted = records
    .filter((record) => Number.isFinite(Date.parse(record.timestampUtc)))
    .sort((a, b) => Date.parse(a.timestampUtc) - Date.parse(b.timestampUtc));
  const deduplicated: CanonicalWeatherHour[] = [];
  let priorTimestamp = "";
  for (const record of sorted) {
    if (record.timestampUtc === priorTimestamp) continue;
    priorTimestamp = record.timestampUtc;
    const flags = [...record.qualityFlags];
    for (const field of FIELDS) {
      const value = record[field];
      if (value === null) {
        flags.push(`missing:${field}`);
        continue;
      }
      const [minimum, maximum] = FIELD_BOUNDS[field];
      if (value < minimum || value > maximum) {
        record[field] = null;
        flags.push(`outlier:${field}`);
      }
    }
    if (
      record.ghiWm2 !== null &&
      record.dhiWm2 !== null &&
      record.dhiWm2 > record.ghiWm2 + 75
    ) {
      flags.push("consistency:diffuse_exceeds_global");
    }
    record.qualityFlags = [...new Set(flags)];
    deduplicated.push(record);
  }

  for (const field of FIELDS) interpolateShortGaps(deduplicated, field, 2);
  for (let index = 0; index < deduplicated.length; index += 1) {
    const record = deduplicated[index];
    if (index > 0) {
      const delta = Date.parse(record.timestampUtc) - Date.parse(deduplicated[index - 1].timestampUtc);
      if (delta !== 3_600_000) record.qualityFlags.push("temporal:irregular_interval");
    }
    const present = FIELDS.filter((field) => record[field] !== null).length;
    const imputedPenalty = record.imputedFields.length * 0.008;
    const outlierPenalty = record.qualityFlags.filter((flag) => flag.startsWith("outlier:"))
      .length * 0.035;
    record.qualityScore = clamp(present / FIELDS.length - imputedPenalty - outlierPenalty, 0, 1);
    record.qualityFlags = [...new Set(record.qualityFlags)].sort();
  }
  return deduplicated;
}

function interpolateShortGaps(
  records: CanonicalWeatherHour[],
  field: CanonicalWeatherField,
  maxGap: number,
): void {
  let index = 0;
  while (index < records.length) {
    if (records[index][field] !== null) {
      index += 1;
      continue;
    }
    const gapStart = index;
    while (index < records.length && records[index][field] === null) index += 1;
    const gapEnd = index - 1;
    const gapLength = gapEnd - gapStart + 1;
    if (gapLength > maxGap || gapStart === 0 || index >= records.length) continue;
    const before = records[gapStart - 1][field];
    const after = records[index][field];
    const expectedSpan = (gapLength + 1) * 3_600_000;
    const actualSpan =
      Date.parse(records[index].timestampUtc) - Date.parse(records[gapStart - 1].timestampUtc);
    if (before === null || after === null || actualSpan !== expectedSpan) continue;
    for (let offset = 1; offset <= gapLength; offset += 1) {
      records[gapStart + offset - 1][field] = before + (after - before) * (offset / (gapLength + 1));
      records[gapStart + offset - 1].imputedFields.push(field);
      records[gapStart + offset - 1].qualityFlags.push(`imputed:${field}:linear`);
    }
  }
}

export function assessDatasetQuality(records: CanonicalWeatherHour[]): WeatherProvenance["quality"] {
  if (records.length === 0) return makeQuality(0, ["empty_dataset"], 0, false);
  let score = records.reduce((sum, record) => sum + record.qualityScore, 0) / records.length;
  const imputed = records.some((record) => record.imputedFields.length > 0);
  const flags = new Set<string>();
  for (const record of records) {
    for (const flag of record.qualityFlags) flags.add(flag);
  }
  if (flags.has("synthetic:deterministic_sample")) score = Math.min(score, 0.78);
  const completeness =
    records.reduce(
      (sum, record) => sum + FIELDS.filter((field) => record[field] !== null).length,
      0,
    ) /
    (records.length * FIELDS.length);
  return makeQuality(score, [...flags].sort().slice(0, 40), completeness, imputed);
}

export function emptyWeatherHour(timestampUtc: string, sourceTimestamp = timestampUtc): CanonicalWeatherHour {
  return {
    timestampUtc,
    sourceTimestamp,
    temperatureC: null,
    relativeHumidityPct: null,
    cloudCoverPct: null,
    precipitationMm: null,
    snowDepthCm: null,
    surfacePressureHpa: null,
    windSpeedMps: null,
    ghiWm2: null,
    dniWm2: null,
    dhiWm2: null,
    imputedFields: [],
    qualityFlags: [],
    qualityScore: 0,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
