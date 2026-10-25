import type { LocationConfig, SystemConfig } from "@/lib/contracts";
import { canonicalJson, reproducibleId, sha256Hex } from "@/lib/provenance/hash";
import { assessDatasetQuality } from "@/lib/providers/normalise";
import {
  CANONICAL_WEATHER_UNITS,
  PROVIDER_CALCULATION_VERSION,
  PROVIDER_SCHEMA_VERSION,
  type CanonicalWeatherField,
} from "@/lib/providers/types";
import { DEFAULT_SYSTEM_CONFIG } from "@/lib/sample/defaults";
import { mean } from "@/lib/solar/math";
import {
  canonicalDatasetToWeatherYear,
  RESEARCH_WEATHER_ADAPTER_VERSION,
  RESEARCH_YEARS,
  researchYearQuery,
  type HistoricalWeatherArchive,
  type ResearchYear,
} from "./historical-weather";

export const FROZEN_BUNDLE_SCHEMA = "sios-frozen-research-bundle-1.0.0";
const CALENDAR_POLICY = "UTC interval-end source; interval-midpoint science; exclude 29 February after stateful adaptation";

export interface FrozenBundleMetadata {
  createdAtUtc: string;
  sourceCommit?: string;
  purpose?: string;
}

export interface FrozenResearchBundle {
  schema: typeof FROZEN_BUNDLE_SCHEMA;
  config: SystemConfig;
  archive: HistoricalWeatherArchive;
  metadata: FrozenBundleMetadata;
  binding: {
    site: LocationConfig;
    sourceYears: ResearchYear[];
    scienceAdapterVersion: string;
    calendarPolicy: string;
    queries: Record<ResearchYear, ReturnType<typeof researchYearQuery>>;
  };
  hashes: {
    configuration: string;
    canonicalRecords: Record<ResearchYear, string>;
    adaptedWeather: Record<ResearchYear, string>;
    /** Every bundle field, including all other hashes, except this field itself. */
    content: string;
  };
}

export class FrozenBundleError extends Error {
  constructor(message: string) {
    super(`Frozen research bundle: ${message}`);
    this.name = "FrozenBundleError";
  }
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new FrozenBundleError(message);
}

function object(value: unknown, name: string): asserts value is Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), `${name} must be an object.`);
}

function text(value: unknown, name: string): asserts value is string {
  requireValue(typeof value === "string" && value.trim().length > 0, `${name} must be a nonempty string.`);
}

function strings(value: unknown, name: string): asserts value is string[] {
  requireValue(Array.isArray(value) && value.every((item) => typeof item === "string"), `${name} must be a string array.`);
}

function same(actual: unknown, expected: unknown, message: string): void {
  requireValue(canonicalJson(actual) === canonicalJson(expected), message);
}

/** Reject silent JSON corruption (NaN, class instances, cycles and sparse arrays). */
function inspectJson(value: unknown, path: string, ancestors = new Set<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    requireValue(Number.isFinite(value), `${path} must contain only finite numbers.`);
    return;
  }
  requireValue(typeof value === "object", `${path} contains a value that cannot be frozen as JSON.`);
  requireValue(!ancestors.has(value), `${path} contains a circular reference.`);
  requireValue(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null,
    `${path} must contain plain JSON objects.`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) inspectJson(value[index], `${path}[${index}]`, ancestors);
  } else {
    for (const [key, item] of Object.entries(value)) {
      // Optional object properties, such as an absent rawPayload, are omitted.
      if (item !== undefined) inspectJson(item, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

function jsonCopy<T>(value: T): T {
  inspectJson(value, "input");
  return JSON.parse(JSON.stringify(value)) as T;
}

function matchConfigurationShape(value: unknown, template: unknown, path: string): void {
  if (template !== null && typeof template === "object") {
    object(value, path);
    for (const [key, expected] of Object.entries(template)) matchConfigurationShape(value[key], expected, `${path}.${key}`);
    return;
  }
  requireValue(typeof value === typeof template, `${path} is missing or has an invalid type.`);
}

function checkTopLevel(bundle: FrozenResearchBundle): void {
  object(bundle, "bundle");
  requireValue(bundle.schema === FROZEN_BUNDLE_SCHEMA, "unsupported schema version.");
  object(bundle.config, "config");
  matchConfigurationShape(bundle.config, DEFAULT_SYSTEM_CONFIG, "config");
  requireValue(Math.abs(bundle.config.location.latitude) <= 90 && Math.abs(bundle.config.location.longitude) <= 180,
    "site coordinates are out of range.");
  object(bundle.metadata, "metadata");
  text(bundle.metadata.createdAtUtc, "metadata.createdAtUtc");
  requireValue(Number.isFinite(Date.parse(bundle.metadata.createdAtUtc)) && bundle.metadata.createdAtUtc.endsWith("Z"),
    "metadata.createdAtUtc must be a valid UTC timestamp.");
  if (bundle.metadata.sourceCommit !== undefined) text(bundle.metadata.sourceCommit, "metadata.sourceCommit");
  if (bundle.metadata.purpose !== undefined) text(bundle.metadata.purpose, "metadata.purpose");
  object(bundle.archive, "archive");
  requireValue(bundle.archive.mode === "sample" || bundle.archive.mode === "live", "mode must be sample or live.");
  object(bundle.archive.datasets, "archive.datasets");
  object(bundle.archive.years, "archive.years");
  for (const map of [bundle.archive.datasets, bundle.archive.years]) {
    same(Object.keys(map).sort(), RESEARCH_YEARS.map(String), "archive must contain exactly source years 2022–2025.");
  }
  requireValue(Array.isArray(bundle.archive.evidence) && bundle.archive.evidence.length === 4,
    "archive needs four ordered source-evidence records.");
  object(bundle.binding, "binding");
  same(bundle.binding.site, bundle.config.location, "site/configuration binding does not match.");
  same(bundle.binding.sourceYears, RESEARCH_YEARS, "source-year binding does not match.");
  requireValue(bundle.binding.scienceAdapterVersion === RESEARCH_WEATHER_ADAPTER_VERSION, "stale science adapter version.");
  requireValue(bundle.binding.calendarPolicy === CALENDAR_POLICY, "unsupported calendar policy.");
  object(bundle.binding.queries, "binding.queries");
  object(bundle.hashes, "hashes");
  object(bundle.hashes.canonicalRecords, "hashes.canonicalRecords");
  object(bundle.hashes.adaptedWeather, "hashes.adaptedWeather");
  for (const hash of [bundle.hashes.content, bundle.hashes.configuration,
    ...Object.values(bundle.hashes.canonicalRecords), ...Object.values(bundle.hashes.adaptedWeather)]) {
    requireValue(typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash), "invalid SHA-256 value.");
  }
}

async function envelopeHash(bundle: FrozenResearchBundle): Promise<string> {
  const remainingHashes = { ...bundle.hashes } as Partial<FrozenResearchBundle["hashes"]>;
  delete remainingHashes.content;
  return sha256Hex({ ...bundle, hashes: remainingHashes });
}

async function validateYear(bundle: FrozenResearchBundle, year: ResearchYear, index: number): Promise<void> {
  const { archive, config } = bundle;
  const dataset = archive.datasets[year];
  const evidence = archive.evidence[index];
  const weather = archive.years[year];
  const expectedHours = year === 2024 ? 8_784 : 8_760;
  const dataClass = archive.mode === "live" ? "reanalysis" : "simulation";
  const providerId = archive.mode === "live" ? "open-meteo" : "sample";
  const query = researchYearQuery(year, config.location, archive.mode);
  same(bundle.binding.queries[year], query, `source query/site binding does not match ${year}.`);
  object(dataset, `dataset ${year}`);
  object(dataset.provenance, `dataset ${year} provenance`);
  object(dataset.provenance.provider, `dataset ${year} provider`);
  object(evidence, `evidence ${year}`);
  requireValue(evidence.year === year, `source evidence must be ordered 2022–2025; expected ${year}.`);
  requireValue(Array.isArray(dataset.records) && dataset.records.length === expectedHours,
    `canonical dataset ${year} requires ${expectedHours} source intervals.`);
  requireValue(Array.isArray(weather) && weather.length === 8_760, `adapted year ${year} requires 8760 hours.`);
  const provenance = dataset.provenance;
  requireValue(provenance.actualDataClass === dataClass && provenance.requestedDataClass === dataClass && provenance.semanticSubstitution === false,
    `dataset ${year} mode/data class or semantic substitution is invalid.`);
  requireValue(provenance.provider.id === providerId, `dataset ${year} provider does not match research mode.`);
  requireValue(provenance.schemaVersion === PROVIDER_SCHEMA_VERSION && provenance.calculationVersion === PROVIDER_CALCULATION_VERSION,
    `dataset ${year} has an unsupported provider schema/calculation version.`);
  requireValue(provenance.intervalSeconds === 3_600 && provenance.provider.temporalResolutionSeconds === 3_600,
    `dataset ${year} must use hourly intervals.`);
  same(provenance.units, CANONICAL_WEATHER_UNITS, `dataset ${year} canonical units do not match.`);
  same(provenance.validRangeUtc, [query.startUtc, query.endUtc], `dataset ${year} source range does not match.`);
  const fields = Object.keys(CANONICAL_WEATHER_UNITS) as CanonicalWeatherField[];
  for (const [recordIndex, record] of dataset.records.entries()) {
    object(record, `dataset ${year} record ${recordIndex}`);
    const expectedTime = Date.UTC(year, 0, 1) + (recordIndex + 1) * 3_600_000;
    requireValue(record.timestampUtc === new Date(expectedTime).toISOString(), `dataset ${year} has a missing, duplicate or unordered UTC interval.`);
    text(record.sourceTimestamp, `dataset ${year} source timestamp`);
    for (const field of fields) requireValue(record[field] === null || typeof record[field] === "number",
      `dataset ${year} ${field} must be a finite number or explicit null.`);
    requireValue(typeof record.qualityScore === "number" && record.qualityScore >= 0 && record.qualityScore <= 1,
      `dataset ${year} quality score is invalid.`);
    strings(record.qualityFlags, `dataset ${year} quality flags`);
    strings(record.imputedFields, `dataset ${year} imputed fields`);
    requireValue(record.imputedFields.every((field) => fields.includes(field)), `dataset ${year} has an unknown imputed field.`);
  }
  const canonicalHash = await sha256Hex(dataset.records);
  requireValue(canonicalHash === provenance.contentHash && canonicalHash === evidence.contentHash
    && canonicalHash === bundle.hashes.canonicalRecords[year], `canonical records ${year} content hash does not match.`);
  const expectedSnapshot = await reproducibleId("dsv", {
    provider: provenance.provider.id,
    providerVersion: provenance.provider.version,
    requestedQuery: query,
    actualDataClass: dataClass,
    contentHash: canonicalHash,
    schemaVersion: provenance.schemaVersion,
    calculationVersion: provenance.calculationVersion,
  });
  requireValue(provenance.snapshotId === expectedSnapshot && evidence.snapshotId === expectedSnapshot,
    `dataset ${year} snapshot/query identity does not match the configured site.`);
  same(provenance.quality, assessDatasetQuality(dataset.records), `dataset ${year} quality evidence does not match its records.`);
  requireValue(evidence.scienceAdapterVersion === RESEARCH_WEATHER_ADAPTER_VERSION, `dataset ${year} has a stale science adapter version.`);
  const adaptedHash = await sha256Hex(weather);
  requireValue(adaptedHash === evidence.scienceContentHash && adaptedHash === bundle.hashes.adaptedWeather[year],
    `adapted weather ${year} content hash does not match.`);
  const regenerated = canonicalDatasetToWeatherYear(dataset, year, config.location);
  requireValue(await sha256Hex(regenerated) === adaptedHash,
    `regenerated scientific weather ${year} does not match the frozen adapted weather.`);
  const derivationCounts = {
    erbsIrradianceHours: regenerated.filter((hour) => hour.quality.flags.includes("derived:erbs-irradiance-components")).length,
    suppliedIrradianceClosureHours: regenerated.filter((hour) => hour.quality.flags.includes("corrected:supplied-irradiance-closure")).length,
    snowDepthProxySourceHours: dataset.records.filter((record) => record.snowDepthCm === null).length,
    snowDepthProxyHours: regenerated.filter((hour) => hour.quality.flags.includes("derived:snow-depth-balance-proxy")).length,
    snowAlbedoHours: regenerated.filter((hour) => hour.quality.flags.includes("derived:albedo-snow")).length,
  };
  const expectedEvidence = {
    providerId, providerName: provenance.provider.name, product: provenance.provider.product,
    requestedDataClass: dataClass, actualDataClass: dataClass, validRangeUtc: provenance.validRangeUtc,
    sourceRecordCount: expectedHours, simulationRecordCount: 8_760, leapHoursRemoved: expectedHours - 8_760,
    providerQualityScore: provenance.quality.score, providerCompleteness: provenance.quality.completeness,
    scienceQualityScore: mean(regenerated.map((hour) => hour.quality.score)),
    scienceCompleteness: mean(regenerated.map((hour) => hour.quality.completeness)),
    derivationCounts, schemaVersion: provenance.schemaVersion, calculationVersion: provenance.calculationVersion,
  };
  for (const [key, expected] of Object.entries(expectedEvidence)) {
    same(evidence[key as keyof typeof evidence], expected, `source evidence ${year}.${key} does not match canonical/scientific data.`);
  }
  strings(provenance.transformations, `dataset ${year} transformations`);
  strings(provenance.warnings, `dataset ${year} warnings`);
  strings(evidence.transformations, `evidence ${year} transformations`);
  strings(evidence.warnings, `evidence ${year} warnings`);
  requireValue(provenance.transformations.every((entry) => evidence.transformations.includes(entry))
    && provenance.warnings.every((entry) => evidence.warnings.includes(entry)),
  `source evidence ${year} omits provider transformations or warnings.`);
}

/**
 * Freeze an independently replayable JSON value; no filesystem or network I/O.
 * Hashes establish integrity/consistency, not authenticity of a provider claim.
 */
export async function createFrozenBundle(
  config: SystemConfig,
  archive: HistoricalWeatherArchive,
  metadata: FrozenBundleMetadata,
): Promise<FrozenResearchBundle> {
  const copied = jsonCopy({ config, archive, metadata });
  const queries = {} as FrozenResearchBundle["binding"]["queries"];
  const canonicalRecords = {} as Record<ResearchYear, string>;
  const adaptedWeather = {} as Record<ResearchYear, string>;
  for (const year of RESEARCH_YEARS) {
    queries[year] = researchYearQuery(year, copied.config.location, copied.archive.mode);
    canonicalRecords[year] = await sha256Hex(copied.archive.datasets[year]?.records);
    adaptedWeather[year] = await sha256Hex(copied.archive.years[year]);
  }
  const bundle: FrozenResearchBundle = {
    schema: FROZEN_BUNDLE_SCHEMA,
    ...copied,
    binding: {
      site: { ...copied.config.location },
      sourceYears: [...RESEARCH_YEARS],
      scienceAdapterVersion: RESEARCH_WEATHER_ADAPTER_VERSION,
      calendarPolicy: CALENDAR_POLICY,
      queries,
    },
    hashes: { configuration: await sha256Hex(copied.config), canonicalRecords, adaptedWeather, content: "" },
  };
  bundle.hashes.content = await envelopeHash(bundle);
  await validateContents(bundle);
  return bundle;
}

async function validateContents(bundle: FrozenResearchBundle): Promise<void> {
  checkTopLevel(bundle);
  requireValue(await envelopeHash(bundle) === bundle.hashes.content, "complete-envelope content hash does not match.");
  requireValue(await sha256Hex(bundle.config) === bundle.hashes.configuration, "configuration hash does not match.");
  for (const [index, year] of RESEARCH_YEARS.entries()) await validateYear(bundle, year, index);
}

/** Return a validated snapshot, isolated from subsequent mutations of input. */
export async function validateFrozenBundle(value: unknown): Promise<{
  bundle: FrozenResearchBundle;
  config: SystemConfig;
  archive: HistoricalWeatherArchive;
}> {
  const bundle = jsonCopy(value) as FrozenResearchBundle;
  await validateContents(bundle);
  return { bundle, config: bundle.config, archive: bundle.archive };
}
