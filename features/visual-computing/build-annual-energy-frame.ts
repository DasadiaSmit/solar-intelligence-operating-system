import type {
  OperatingSnapshot,
  ProvenanceRecord,
} from "@/lib/contracts";
import {
  quantile,
} from "@/lib/solar/math";
import {
  ANNUAL_ENERGY_FRAME_SCHEMA_VERSION,
  ANNUAL_ENERGY_RECORD_COUNT,
  deepFreezeAnnualEnergyFrame,
  type AnnualEnergyFrameBuildResult,
  type AnnualEnergyFrameUnavailableReason,
  type AnnualEnergyFrameV1,
  type AnnualEnergyHemisphere,
  type MeteorologicalSeason,
  type UnavailableAnnualEnergyLayerV1,
} from "./annual-energy-frame";
import type {
  SceneLifecycle,
} from "./scene-frame";

export interface BuildAnnualEnergyFrameOptions {
  readonly snapshot: OperatingSnapshot;
  readonly resultId: string;
  readonly lifecycle: SceneLifecycle;
}

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);

function failed(
  reason: AnnualEnergyFrameUnavailableReason,
  summary: string,
): AnnualEnergyFrameBuildResult {
  return Object.freeze({ status: "unavailable", reason, summary });
}

function unavailable(reason: string): UnavailableAnnualEnergyLayerV1 {
  return Object.freeze({ status: "unavailable", reason, value: null });
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function reconciles(first: number, second: number): boolean {
  const tolerance = Math.max(
    1e-8,
    Math.max(Math.abs(first), Math.abs(second)) * 1e-10,
  );
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= tolerance;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function calendarYear(snapshot: OperatingSnapshot): number | null {
  if (snapshot.hourly.length !== ANNUAL_ENERGY_RECORD_COUNT) return null;
  const first = snapshot.hourly[0];
  const last = snapshot.hourly.at(-1);
  if (!first || !last) return null;
  const startMs = Date.parse(first.timestamp);
  const endMs = Date.parse(last.timestamp);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const start = new Date(startMs);
  const year = start.getUTCFullYear();
  if (
    isLeapYear(year)
    || start.toISOString() !== first.timestamp
    || start.getUTCMonth() !== 0
    || start.getUTCDate() !== 1
    || start.getUTCHours() !== 0
    || endMs !== startMs + (ANNUAL_ENERGY_RECORD_COUNT - 1) * 3_600_000
  ) {
    return null;
  }

  for (let index = 0; index < snapshot.hourly.length; index += 1) {
    const point = snapshot.hourly[index];
    const expectedMs = startMs + index * 3_600_000;
    const parsedMs = Date.parse(point.timestamp);
    if (!Number.isFinite(parsedMs) || parsedMs !== expectedMs) return null;
    const date = new Date(parsedMs);
    if (
      date.toISOString() !== point.timestamp
      || date.getUTCFullYear() !== year
      || (date.getUTCMonth() === 1 && date.getUTCDate() === 29)
      || point.index !== index
      || point.timestamp !== point.weather.timestamp
      || point.month !== date.getUTCMonth() + 1
      || point.weather.month !== point.month
      || point.day !== date.getUTCDate()
      || point.weather.day !== point.day
      || point.hour !== date.getUTCHours()
      || point.weather.hour !== point.hour
    ) {
      return null;
    }
  }
  return year;
}

function provenanceRecord(
  records: readonly ProvenanceRecord[],
  kind: ProvenanceRecord["kind"],
): ProvenanceRecord | null {
  return records.find((record) => record.kind === kind) ?? null;
}

function seasonSpecs(
  hemisphere: AnnualEnergyHemisphere,
): readonly {
  readonly season: MeteorologicalSeason;
  readonly months: readonly number[];
}[] {
  return hemisphere === "northern"
    ? [
        { season: "winter", months: [12, 1, 2] },
        { season: "spring", months: [3, 4, 5] },
        { season: "summer", months: [6, 7, 8] },
        { season: "autumn", months: [9, 10, 11] },
      ]
    : [
        { season: "summer", months: [12, 1, 2] },
        { season: "autumn", months: [3, 4, 5] },
        { season: "winter", months: [6, 7, 8] },
        { season: "spring", months: [9, 10, 11] },
      ];
}

export function buildAnnualEnergyFrameV1({
  snapshot,
  resultId,
  lifecycle,
}: BuildAnnualEnergyFrameOptions): AnnualEnergyFrameBuildResult {
  if (!nonEmpty(resultId) || resultId === "unidentified-result") {
    return failed("invalid-result-id", "A stable annual result ID is required.");
  }
  if (!VALID_LIFECYCLES.has(lifecycle)) {
    return failed("invalid-lifecycle", "The annual lifecycle is invalid.");
  }
  const year = calendarYear(snapshot);
  if (year === null) {
    return failed(
      "invalid-annual-calendar",
      "Annual Energy requires exactly 8,760 contiguous UTC hours in one non-leap calendar year.",
    );
  }
  const latitude = snapshot.config.location.latitude;
  if (!Number.isFinite(latitude) || latitude === 0 || Math.abs(latitude) > 90) {
    return failed(
      "invalid-seasonality",
      "A non-equatorial configured latitude is required for meteorological seasons.",
    );
  }
  const hemisphere: AnnualEnergyHemisphere =
    latitude > 0 ? "northern" : "southern";
  const capacity = snapshot.config.array.capacityKwDc;
  const energy = snapshot.hourly.map((point) => point.generation.acKWh);
  if (
    !Number.isFinite(capacity)
    || capacity <= 0
    || energy.some(
      (value) =>
        !Number.isFinite(value) || value < 0 || value > capacity,
    )
  ) {
    return failed(
      "invalid-hourly-energy",
      "Hourly AC energy is invalid or exceeds configured DC capacity for a one-hour interval.",
    );
  }
  const quality = snapshot.hourly.map((point) => point.quality.score);
  if (quality.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    return failed(
      "invalid-hourly-quality",
      "Every annual quality score must be a finite fraction.",
    );
  }

  const annual = energy.reduce((total, value) => total + value, 0);
  const peak = Math.max(...energy);
  const meanQuality =
    quality.reduce((total, value) => total + value, 0) / quality.length;
  if (
    !reconciles(annual, snapshot.summary.annualGenerationKWh)
    || !reconciles(peak, snapshot.summary.peakAcKw)
    || !reconciles(
      snapshot.summary.specificYieldKWhPerKwp,
      annual / capacity,
    )
    || !reconciles(meanQuality, snapshot.summary.qualityScore)
  ) {
    return failed(
      "invalid-annual-summary",
      "The hourly series does not reconcile to the annual summary.",
    );
  }

  if (
    snapshot.monthly.length !== 12
    || snapshot.monthly.some(
      (record, index) =>
        record.month !== index + 1
        || !Number.isFinite(record.generationKWh)
        || record.generationKWh < 0,
    )
  ) {
    return failed("invalid-monthly-summary", "Monthly totals are invalid.");
  }
  const monthly = snapshot.monthly.map((record) => ({
    month: record.month,
    generationKWh: record.generationKWh,
  }));
  const groupedMonths = Array.from({ length: 12 }, () => 0);
  for (const point of snapshot.hourly) {
    groupedMonths[point.month - 1] += point.generation.acKWh;
  }
  if (
    monthly.some(
      (record, index) =>
        !reconciles(record.generationKWh, groupedMonths[index] ?? 0),
    )
    || !reconciles(
      monthly.reduce((total, record) => total + record.generationKWh, 0),
      annual,
    )
  ) {
    return failed(
      "invalid-monthly-summary",
      "Monthly generation does not reconcile to the hourly and annual totals.",
    );
  }

  const seasons = seasonSpecs(hemisphere).map((spec) => ({
    season: spec.season,
    months: [...spec.months],
    generationKWh: snapshot.hourly.reduce(
      (total, point) =>
        spec.months.includes(point.month)
          ? total + point.generation.acKWh
          : total,
      0,
    ),
  }));
  if (
    !reconciles(
      seasons.reduce((total, season) => total + season.generationKWh, 0),
      annual,
    )
    || seasons.some(
      (season) =>
        !reconciles(
          season.generationKWh,
          season.months.reduce(
            (total, month) =>
              total + (monthly[month - 1]?.generationKWh ?? 0),
            0,
          ),
        ),
    )
  ) {
    return failed("invalid-seasonality", "Season totals do not reconcile.");
  }

  const representative = snapshot.representativeYear;
  const sourceYears = [...representative.sourceYears];
  if (
    !nonEmpty(representative.id)
    || !nonEmpty(representative.method)
    || sourceYears.length !== 4
    || new Set(sourceYears).size !== 4
  ) {
    return failed(
      "missing-representative-year",
      "Representative-year identity or source years are incomplete.",
    );
  }
  const comparisons = [...representative.comparisons].sort(
    (first, second) => first.year - second.year,
  );
  if (
    comparisons.length !== 4
    || new Set(comparisons.map((comparison) => comparison.year)).size !== 4
    || comparisons.some(
      (comparison) =>
        !Number.isInteger(comparison.year)
        || !sourceYears.includes(comparison.year)
        || !Number.isFinite(comparison.generationKWh)
        || comparison.generationKWh < 0
        || !Number.isFinite(comparison.meanQualityScore)
        || comparison.meanQualityScore < 0
        || comparison.meanQualityScore > 1
        || !reconciles(
          comparison.specificYieldKWhPerKwp,
          comparison.generationKWh / capacity,
        ),
    )
  ) {
    return failed(
      "invalid-empirical-spread",
      "Exactly four attributable source-year totals are required.",
    );
  }
  const sourceAnnualGenerationKWh =
    comparisons.map((comparison) => comparison.generationKWh);
  const orderedAnnuals = [...sourceAnnualGenerationKWh].sort(
    (first, second) => first - second,
  );
  const p10KWh = quantile(orderedAnnuals, 0.1);
  const p50KWh = quantile(orderedAnnuals, 0.5);
  const p90KWh = quantile(orderedAnnuals, 0.9);
  if (
    !reconciles(p10KWh, snapshot.summary.p10GenerationKWh)
    || !reconciles(p90KWh, snapshot.summary.p90GenerationKWh)
  ) {
    return failed(
      "invalid-empirical-spread",
      "The reported annual range does not match the four source years.",
    );
  }

  const provider = provenanceRecord(snapshot.provenance, "provider");
  const dataset = provenanceRecord(snapshot.provenance, "dataset");
  const calculation = provenanceRecord(snapshot.provenance, "calculation");
  if (
    !provider
    || !dataset
    || !calculation
    || !nonEmpty(provider.provider)
    || !nonEmpty(dataset.version)
    || !nonEmpty(calculation.calculationVersion)
  ) {
    return failed("missing-provenance", "Annual provenance is incomplete.");
  }
  const evidenceRef = (fact: string) => `evidence:${resultId}:${fact}`;
  const frame: AnnualEnergyFrameV1 = {
    schemaVersion: ANNUAL_ENERGY_FRAME_SCHEMA_VERSION,
    resultId,
    lifecycle,
    calendar: {
      startTimestampUtc: snapshot.hourly[0]?.timestamp ?? "",
      endTimestampUtc: snapshot.hourly.at(-1)?.timestamp ?? "",
      intervalSeconds: 3600,
      recordCount: ANNUAL_ENERGY_RECORD_COUNT,
      calendarYearUtc: year,
      noLeap: true,
      hemisphere,
    },
    series: {
      generationAcKWh: energy,
      qualityScores: quality,
    },
    summary: {
      capacityKwDc: capacity,
      peakAcKw: snapshot.summary.peakAcKw,
      annualGenerationKWh: snapshot.summary.annualGenerationKWh,
      specificYieldKWhPerKwp: snapshot.summary.specificYieldKWhPerKwp,
      annualMeanQualityScore: snapshot.summary.qualityScore,
    },
    monthly,
    seasons,
    empiricalSpread: {
      basis: "four-source-year-annual-generation",
      quantileMethod: "linear-interpolation-between-ordered-values",
      sourceYears: comparisons.map((comparison) => comparison.year),
      sourceAnnualGenerationKWh,
      p10KWh,
      p50KWh,
      p90KWh,
      calibratedProbabilisticInterval: false,
      forecastGuarantee: false,
    },
    representativeYear: {
      id: representative.id,
      method: representative.method,
      sourceYears,
    },
    units: {
      intervalEnergy: "kWh/1h",
      annualEnergy: "kWh",
      peakPower: "kW",
      arrayCapacity: "kW DC",
      specificYield: "kWh/kWp",
      quality: "fraction",
    },
    provenance: {
      provider: provider.provider,
      datasetVersion: dataset.version,
      calculationVersion: calculation.calculationVersion,
      evidenceRefIds: [
        evidenceRef("hourly.generation.ac"),
        evidenceRef("hourly.quality"),
        evidenceRef("monthly.generation"),
        evidenceRef("annual.generation"),
        evidenceRef("annual.specific-yield"),
        evidenceRef("annual.peak"),
        evidenceRef("scenario.capacity"),
        evidenceRef("representative-year.identity"),
        ...comparisons.map((comparison) =>
          evidenceRef(`source-year.${comparison.year}.generation`)),
      ],
    },
    unavailableLayers: {
      measuredOrLivePlantOutput: unavailable(
        "No measured or live plant output is attached to this annual result.",
      ),
      issuedFutureForecast: unavailable(
        "The four source-year spread is not an issued future forecast.",
      ),
      intraHourVariation: unavailable(
        "One-hour intervals do not resolve intra-hour ramps or transients.",
      ),
      spatialGenerationField: unavailable(
        "No site-resolved spatial generation field is attached.",
      ),
      causalClimateAttribution: unavailable(
        "Four source years do not support causal climate attribution.",
      ),
    },
  };
  return Object.freeze({
    status: "ready",
    frame: deepFreezeAnnualEnergyFrame(frame),
  });
}
