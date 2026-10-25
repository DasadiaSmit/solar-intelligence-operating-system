import type { HourlyOperatingPoint, OperatingSnapshot } from "@/lib/contracts";
import {
  DEFAULT_SUNLIT_INDEX,
  SUNLIT_FRAME_SCHEMA_VERSION,
  isSunlitDateUtc,
  type SunlitFrame,
  type SunlitHour,
} from "./frame";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const ANNUAL_RECORDS = 8_760;

export class SunlitFrameError extends Error {
  readonly kind: "invalid-query" | "invalid-source";

  constructor(message: string, kind: "invalid-query" | "invalid-source") {
    super(message);
    this.name = "SunlitFrameError";
    this.kind = kind;
  }
}

function sourceAssert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new SunlitFrameError(message, "invalid-source");
}

function queryAssert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new SunlitFrameError(message, "invalid-query");
}

function hourFrom(point: HourlyOperatingPoint): SunlitHour {
  const hour: SunlitHour = {
    index: point.index,
    timestampUtc: point.timestamp,
    solarElevationDeg: point.sun.apparentElevationDeg,
    solarAzimuthDeg: point.sun.azimuthDeg,
    isDaylight: point.sun.isDaylight,
    incidenceDeg: point.irradiance.angleOfIncidenceDeg,
    arrayTiltDeg: point.irradiance.resolvedTiltDeg,
    arrayAzimuthDeg: point.irradiance.resolvedAzimuthDeg,
    generationKWh: point.generation.acKWh,
    demandKWh: point.flow.demandKWh,
    solarToLoadKWh: point.flow.solarToLoadKWh,
    batteryChargeInputKWh: point.flow.batteryChargeKWh,
    batteryDischargeDeliveredKWh: point.flow.batteryDischargeKWh,
    batterySocKWh: point.flow.batterySocKWh,
    gridImportKWh: point.flow.gridImportKWh,
    gridExportKWh: point.flow.gridExportKWh,
    curtailedKWh: point.flow.curtailedKWh,
    ghiWm2: point.weather.ghiWm2,
    poaWm2: point.irradiance.effectiveWm2,
    temperatureC: point.weather.temperatureC,
    cloudCoverPct: point.weather.cloudCoverPct,
    humidityPct: point.weather.relativeHumidityPct,
    windSpeedMs: point.weather.windSpeedMps,
    qualityScore: point.quality.score,
  };
  for (const [name, value] of Object.entries(hour)) {
    sourceAssert(typeof value !== "number" || Number.isFinite(value), `Invalid canonical ${name}.`);
  }
  for (const value of [hour.generationKWh, hour.demandKWh, hour.solarToLoadKWh,
    hour.batteryChargeInputKWh, hour.batteryDischargeDeliveredKWh, hour.batterySocKWh,
    hour.gridImportKWh, hour.gridExportKWh, hour.curtailedKWh]) {
    sourceAssert(value >= 0, "Canonical energy cannot be negative.");
  }
  sourceAssert(hour.qualityScore >= 0 && hour.qualityScore <= 1, "Invalid canonical quality score.");
  sourceAssert(hour.cloudCoverPct >= 0 && hour.cloudCoverPct <= 100, "Invalid canonical cloud cover.");
  sourceAssert(Math.abs(hour.generationKWh - hour.solarToLoadKWh - hour.batteryChargeInputKWh
    - hour.gridExportKWh - hour.curtailedKWh) < 1e-7, "Canonical PV energy does not reconcile.");
  sourceAssert(Math.abs(hour.demandKWh - hour.solarToLoadKWh - hour.batteryDischargeDeliveredKWh
    - hour.gridImportKWh) < 1e-7, "Canonical demand energy does not reconcile.");
  sourceAssert(!(hour.gridImportKWh > 1e-8 && hour.gridExportKWh > 1e-8), "Canonical grid directions conflict.");
  sourceAssert(!(hour.batteryChargeInputKWh > 1e-8 && hour.batteryDischargeDeliveredKWh > 1e-8), "Canonical battery directions conflict.");
  return Object.freeze(hour);
}

/**
 * Copies one canonical UTC day without rounding, resimulation, or changing the
 * existing annual compact tuple. Calendar and linked index remain concordant.
 */
export function buildSunlitFrame({
  snapshot,
  resultId,
  dateUtc,
  selectedIndex,
}: {
  readonly snapshot: OperatingSnapshot;
  readonly resultId: string;
  readonly dateUtc?: string;
  readonly selectedIndex?: number;
}): SunlitFrame {
  sourceAssert(snapshot.hourly.length === ANNUAL_RECORDS, "Sunlit observation requires the complete canonical year.");
  sourceAssert(typeof resultId === "string" && resultId.trim().length > 0, "A canonical result identity is required.");
  const firstTime = Date.parse(snapshot.hourly[0].timestamp);
  sourceAssert(Number.isFinite(firstTime), "Invalid canonical start timestamp.");
  for (let index = 0; index < snapshot.hourly.length; index += 1) {
    const point = snapshot.hourly[index];
    sourceAssert(point.index === index && Date.parse(point.timestamp) === firstTime + index * HOUR_MS,
      "Canonical chronology must be contiguous with matching indices.");
  }
  const minDateUtc = snapshot.hourly[0].timestamp.slice(0, 10);
  const maxDateUtc = snapshot.hourly[ANNUAL_RECORDS - 1].timestamp.slice(0, 10);
  if (selectedIndex !== undefined) {
    queryAssert(Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < ANNUAL_RECORDS,
      "Selected index must identify a canonical hour.");
  }
  const requestedDate = dateUtc
    ?? snapshot.hourly[selectedIndex ?? DEFAULT_SUNLIT_INDEX].timestamp.slice(0, 10);
  queryAssert(isSunlitDateUtc(requestedDate), "Date must be a valid UTC calendar date in YYYY-MM-DD format.");
  queryAssert(requestedDate >= minDateUtc && requestedDate <= maxDateUtc,
    `Date must be between ${minDateUtc} and ${maxDateUtc}.`);
  const dayIndex = (Date.parse(`${requestedDate}T00:00:00.000Z`)
    - Date.parse(`${minDateUtc}T00:00:00.000Z`)) / DAY_MS;
  sourceAssert(Number.isInteger(dayIndex), "Canonical day boundary is invalid.");
  const dayStartIndex = dayIndex * 24;
  const initialIndex = selectedIndex ?? dayStartIndex + 12;
  queryAssert(initialIndex >= dayStartIndex && initialIndex < dayStartIndex + 24,
    "Selected index must belong to the requested UTC day.");
  const points = snapshot.hourly.slice(dayStartIndex, dayStartIndex + 24);
  sourceAssert(points.length === 24 && points.every((point) => point.timestamp.startsWith(`${requestedDate}T`)),
    "Canonical UTC day must contain exactly 24 records.");
  const hours = points.map(hourFrom);
  const provider = snapshot.provenance.find((item) => item.kind === "provider");
  const dataset = snapshot.provenance.find((item) => item.kind === "dataset");
  const calculation = snapshot.provenance.find((item) => item.kind === "calculation");
  sourceAssert(Boolean(provider?.provider && dataset?.version && calculation?.calculationVersion),
    "Canonical observation provenance is incomplete.");
  const capacityKWh = snapshot.config.battery.enabled ? snapshot.config.battery.capacityKWh : 0;
  const maxSocFraction = snapshot.config.battery.maxSocFraction;
  sourceAssert(Number.isFinite(capacityKWh) && capacityKWh >= 0
    && Number.isFinite(maxSocFraction) && maxSocFraction >= 0 && maxSocFraction <= 1,
  "Canonical battery bounds are invalid.");
  sourceAssert(hours.every((hour) => hour.batterySocKWh <= capacityKWh * maxSocFraction + 1e-7),
    "Canonical storage exceeds its configured bound.");
  sourceAssert(Number.isFinite(snapshot.summary.annualGenerationKWh), "Canonical annual energy is invalid.");
  const lifecycle = snapshot.status.deterministic
    ? "SIMULATED"
    : ({ implemented: "IMPLEMENTED", experimental: "EXPERIMENTAL", simulated: "SIMULATED", planned: "PLANNED" } as const)[snapshot.status.overall];
  return Object.freeze({
    schemaVersion: SUNLIT_FRAME_SCHEMA_VERSION,
    resultId,
    lifecycle,
    provider: provider!.provider,
    datasetVersion: dataset!.version,
    calculationVersion: calculation!.calculationVersion,
    site: Object.freeze({
      name: snapshot.config.location.name,
      latitude: snapshot.config.location.latitude,
      longitude: snapshot.config.location.longitude,
      timeZone: snapshot.config.location.timezone,
    }),
    dateUtc: requestedDate,
    minDateUtc,
    maxDateUtc,
    initialIndex,
    intervalSeconds: 3600,
    timestampRole: "canonical-record-anchor",
    array: Object.freeze({
      tiltDeg: snapshot.config.array.tiltDeg,
      azimuthDeg: snapshot.config.array.azimuthDeg,
      capacityKwDc: snapshot.config.array.capacityKwDc,
    }),
    battery: Object.freeze({
      enabled: snapshot.config.battery.enabled,
      capacityKWh,
      minSocFraction: snapshot.config.battery.minSocFraction,
      maxSocFraction,
      reserveFraction: snapshot.config.battery.reserveFraction,
    }),
    annual: Object.freeze({ generationKWh: snapshot.summary.annualGenerationKWh }),
    provenance: Object.freeze({
      evidenceRefIds: Object.freeze([
        `evidence:${resultId}:hour.${initialIndex}`,
        `evidence:${resultId}:day.${requestedDate}`,
        `evidence:${resultId}:annual.energy-ledger`,
      ]),
      scientificStatus: snapshot.status.overall,
      guaranteeNotice: snapshot.status.guaranteeNotice,
      scenario: "canonical-baseline" as const,
      units: "kWh per 3600-second record; battery state in kWh" as const,
    }),
    hours: Object.freeze(hours),
  });
}
