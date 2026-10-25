import {
  quantile,
} from "@/lib/solar/math";
import {
  ANNUAL_ENERGY_FRAME_SCHEMA_VERSION,
  ANNUAL_ENERGY_RECORD_COUNT,
  type AnnualEnergyFrameBuildResult,
  type AnnualEnergyFrameUnavailableReason,
  type AnnualEnergyFrameV1,
  type AnnualEnergyHemisphere,
  type MeteorologicalSeason,
  type UnavailableAnnualEnergyLayerV1,
} from "./annual-energy-frame";

export type AnnualEnergyViewV1 = AnnualEnergyFrameV1;

export type AnnualEnergyViewUnavailableReason =
  | AnnualEnergyFrameUnavailableReason
  | "invalid-annual-energy-frame";

export type AnnualEnergyViewResult =
  | { readonly status: "ready"; readonly view: AnnualEnergyViewV1 }
  | {
      readonly status: "unavailable";
      readonly reason: AnnualEnergyViewUnavailableReason;
      readonly summary: string;
    };

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

function seasonMap(
  hemisphere: AnnualEnergyHemisphere,
): readonly [MeteorologicalSeason, readonly number[]][] {
  return hemisphere === "northern"
    ? [
        ["winter", [12, 1, 2]],
        ["spring", [3, 4, 5]],
        ["summer", [6, 7, 8]],
        ["autumn", [9, 10, 11]],
      ]
    : [
        ["summer", [12, 1, 2]],
        ["autumn", [3, 4, 5]],
        ["winter", [6, 7, 8]],
        ["spring", [9, 10, 11]],
      ];
}

function validUnavailable(layer: UnavailableAnnualEnergyLayerV1): boolean {
  return layer.status === "unavailable"
    && layer.value === null
    && nonEmpty(layer.reason);
}

function validFrame(frame: AnnualEnergyFrameV1): boolean {
  const { calendar, series, summary } = frame;
  const columns = [
    series.generationAcKWh,
    series.qualityScores,
  ];
  if (
    frame.schemaVersion !== ANNUAL_ENERGY_FRAME_SCHEMA_VERSION
    || !nonEmpty(frame.resultId)
    || !["IMPLEMENTED", "EXPERIMENTAL", "SIMULATED", "PLANNED"]
      .includes(frame.lifecycle)
    || calendar.intervalSeconds !== 3600
    || calendar.recordCount !== ANNUAL_ENERGY_RECORD_COUNT
    || calendar.noLeap !== true
    || !["northern", "southern"].includes(calendar.hemisphere)
    || columns.some(
      (column) => column.length !== ANNUAL_ENERGY_RECORD_COUNT,
    )
  ) {
    return false;
  }
  const startMs = Date.parse(calendar.startTimestampUtc);
  const endMs = Date.parse(calendar.endTimestampUtc);
  const start = new Date(startMs);
  const end = new Date(endMs);
  if (
    !Number.isFinite(startMs)
    || !Number.isFinite(endMs)
    || isLeapYear(calendar.calendarYearUtc)
    || start.toISOString() !== calendar.startTimestampUtc
    || end.toISOString() !== calendar.endTimestampUtc
    || start.getUTCFullYear() !== calendar.calendarYearUtc
    || start.getUTCMonth() !== 0
    || start.getUTCDate() !== 1
    || start.getUTCHours() !== 0
    || end.getUTCFullYear() !== calendar.calendarYearUtc
    || end.getUTCMonth() !== 11
    || end.getUTCDate() !== 31
    || end.getUTCHours() !== 23
    || endMs !== startMs + (ANNUAL_ENERGY_RECORD_COUNT - 1) * 3_600_000
  ) {
    return false;
  }

  let annual = 0;
  let peak = 0;
  let qualityTotal = 0;
  const groupedMonths = Array.from({ length: 12 }, () => 0);
  for (let index = 0; index < ANNUAL_ENERGY_RECORD_COUNT; index += 1) {
    const timestampMs = startMs + index * 3_600_000;
    const date = new Date(timestampMs);
    const month = date.getUTCMonth() + 1;
    const energy = series.generationAcKWh[index];
    const quality = series.qualityScores[index];
    if (
      date.getUTCFullYear() !== calendar.calendarYearUtc
      || (date.getUTCMonth() === 1 && date.getUTCDate() === 29)
      || !Number.isFinite(energy)
      || energy < 0
      || energy > summary.capacityKwDc
      || !Number.isFinite(quality)
      || quality < 0
      || quality > 1
    ) {
      return false;
    }
    annual += energy;
    peak = Math.max(peak, energy);
    qualityTotal += quality;
    groupedMonths[month - 1] += energy;
  }
  if (
    !Number.isFinite(summary.capacityKwDc)
    || summary.capacityKwDc <= 0
    || !reconciles(annual, summary.annualGenerationKWh)
    || !reconciles(peak, summary.peakAcKw)
    || !reconciles(
      summary.specificYieldKWhPerKwp,
      annual / summary.capacityKwDc,
    )
    || !reconciles(
      summary.annualMeanQualityScore,
      qualityTotal / ANNUAL_ENERGY_RECORD_COUNT,
    )
    || frame.monthly.length !== 12
    || frame.monthly.some(
      (record, index) =>
        record.month !== index + 1
        || !reconciles(
          record.generationKWh,
          groupedMonths[index] ?? 0,
        ),
    )
  ) {
    return false;
  }

  const expectedSeasons = seasonMap(calendar.hemisphere);
  if (
    frame.seasons.length !== 4
    || frame.seasons.some((season, index) => {
      const expected = expectedSeasons[index];
      return !expected
        || season.season !== expected[0]
        || season.months.length !== expected[1].length
        || season.months.some(
          (month, monthIndex) => month !== expected[1][monthIndex],
        )
        || !reconciles(
          season.generationKWh,
          season.months.reduce(
            (total, month) =>
              total + (frame.monthly[month - 1]?.generationKWh ?? 0),
            0,
          ),
        );
    })
    || !reconciles(
      frame.seasons.reduce(
        (total, season) => total + season.generationKWh,
        0,
      ),
      annual,
    )
  ) {
    return false;
  }

  const spread = frame.empiricalSpread;
  const ordered = [...spread.sourceAnnualGenerationKWh].sort(
    (first, second) => first - second,
  );
  if (
    spread.basis !== "four-source-year-annual-generation"
    || spread.quantileMethod
      !== "linear-interpolation-between-ordered-values"
    || spread.sourceYears.length !== 4
    || new Set(spread.sourceYears).size !== 4
    || spread.sourceYears.some((year) => !Number.isInteger(year))
    || spread.sourceAnnualGenerationKWh.length !== 4
    || ordered.some((value) => !Number.isFinite(value) || value < 0)
    || !reconciles(spread.p10KWh, quantile(ordered, 0.1))
    || !reconciles(spread.p50KWh, quantile(ordered, 0.5))
    || !reconciles(spread.p90KWh, quantile(ordered, 0.9))
    || spread.calibratedProbabilisticInterval !== false
    || spread.forecastGuarantee !== false
    || !nonEmpty(frame.representativeYear.id)
    || !nonEmpty(frame.representativeYear.method)
    || frame.representativeYear.sourceYears.length !== 4
    || !frame.representativeYear.sourceYears.every(
      (year, index) => year === spread.sourceYears[index],
    )
  ) {
    return false;
  }

  const units = frame.units;
  const unavailableLayers = Object.values(frame.unavailableLayers);
  const evidenceRefs = frame.provenance.evidenceRefIds;
  return units.intervalEnergy === "kWh/1h"
    && units.annualEnergy === "kWh"
    && units.peakPower === "kW"
    && units.arrayCapacity === "kW DC"
    && units.specificYield === "kWh/kWp"
    && units.quality === "fraction"
    && nonEmpty(frame.provenance.provider)
    && nonEmpty(frame.provenance.datasetVersion)
    && nonEmpty(frame.provenance.calculationVersion)
    && evidenceRefs.length > 0
    && evidenceRefs.every(nonEmpty)
    && new Set(evidenceRefs).size === evidenceRefs.length
    && unavailableLayers.length === 5
    && unavailableLayers.every(validUnavailable);
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneFrame(frame: AnnualEnergyFrameV1): AnnualEnergyViewV1 {
  return deepFreeze({
    ...frame,
    calendar: { ...frame.calendar },
    series: {
      generationAcKWh: [...frame.series.generationAcKWh],
      qualityScores: [...frame.series.qualityScores],
    },
    summary: { ...frame.summary },
    monthly: frame.monthly.map((record) => ({ ...record })),
    seasons: frame.seasons.map((season) => ({
      ...season,
      months: [...season.months],
    })),
    empiricalSpread: {
      ...frame.empiricalSpread,
      sourceYears: [...frame.empiricalSpread.sourceYears],
      sourceAnnualGenerationKWh: [
        ...frame.empiricalSpread.sourceAnnualGenerationKWh,
      ],
    },
    representativeYear: {
      ...frame.representativeYear,
      sourceYears: [...frame.representativeYear.sourceYears],
    },
    units: { ...frame.units },
    provenance: {
      ...frame.provenance,
      evidenceRefIds: [...frame.provenance.evidenceRefIds],
    },
    unavailableLayers: Object.fromEntries(
      Object.entries(frame.unavailableLayers).map(
        ([key, layer]) => [key, { ...layer }],
      ),
    ) as unknown as AnnualEnergyFrameV1["unavailableLayers"],
  } satisfies AnnualEnergyViewV1);
}

export function deriveAnnualEnergyView(
  result: AnnualEnergyFrameBuildResult,
): AnnualEnergyViewResult {
  if (result.status === "unavailable") {
    return Object.freeze({ ...result });
  }
  try {
    if (!validFrame(result.frame)) {
      return Object.freeze({
        status: "unavailable",
        reason: "invalid-annual-energy-frame",
        summary:
          "The annual frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
      });
    }
    return Object.freeze({
      status: "ready",
      view: cloneFrame(result.frame),
    });
  } catch {
    return Object.freeze({
      status: "unavailable",
      reason: "invalid-annual-energy-frame",
      summary:
        "The annual frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
    });
  }
}
