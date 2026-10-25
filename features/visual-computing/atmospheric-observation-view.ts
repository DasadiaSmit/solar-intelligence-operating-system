import {
  FIELD_BOUNDS,
} from "@/lib/providers/conversions";
import {
  ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
  ATMOSPHERIC_OBSERVATION_FRAME_SCHEMA_VERSION,
  type AtmosphericObservationFrameBuildResult,
  type AtmosphericObservationFrameUnavailableReason,
  type AtmosphericObservationFrameV1,
  type UnavailableAtmosphericLayerV1,
} from "./atmospheric-observation-frame";

export type AtmosphericObservationViewV1 =
  AtmosphericObservationFrameV1;

export type AtmosphericObservationViewUnavailableReason =
  | AtmosphericObservationFrameUnavailableReason
  | "invalid-atmospheric-observation-frame";

export type AtmosphericObservationViewResult =
  | {
      readonly status: "ready";
      readonly view: AtmosphericObservationViewV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: AtmosphericObservationViewUnavailableReason;
      readonly summary: string;
    };

const LIFECYCLES = new Set([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const QUALITY_LEVELS = new Set([
  "excellent",
  "good",
  "qualified",
  "low",
]);

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function within(
  value: number,
  bounds: readonly [minimum: number, maximum: number],
): boolean {
  return (
    Number.isFinite(value)
    && value >= bounds[0]
    && value <= bounds[1]
  );
}

function validUnavailable(layer: UnavailableAtmosphericLayerV1): boolean {
  return (
    layer.status === "unavailable"
    && layer.value === null
    && nonEmpty(layer.reason)
  );
}

function validUnits(frame: AtmosphericObservationFrameV1): boolean {
  const { units } = frame;
  return (
    units.cloudCover === "%"
    && units.relativeHumidity === "%"
    && units.windSpeed === "m/s"
    && units.ambientTemperature === "°C"
    && units.irradiance === "W/m²"
    && units.acEnergy === "kWh/1h"
    && units.arrayCapacity === "kW DC"
    && units.quality === "fraction"
  );
}

function validFrame(frame: AtmosphericObservationFrameV1): boolean {
  const values = [
    frame.weather.cloudCoverPct,
    frame.weather.relativeHumidityPct,
    frame.weather.windSpeedMps,
    frame.weather.ambientTemperatureC,
    frame.irradiance.ghiWm2,
    frame.irradiance.dniWm2,
    frame.irradiance.dhiWm2,
    frame.irradiance.effectivePoaWm2,
    frame.energy.acEnergyKWh,
    frame.array.capacityKwDc,
    frame.quality.score,
    frame.quality.completeness,
  ];
  const unavailableLayers = Object.values(frame.unavailableLayers);
  const evidenceRefs = frame.provenance.evidenceRefIds;

  return (
    frame.schemaVersion
      === ATMOSPHERIC_OBSERVATION_FRAME_SCHEMA_VERSION
    && nonEmpty(frame.resultId)
    && Number.isFinite(Date.parse(frame.timestampUtc))
    && frame.intervalSeconds === 3600
    && LIFECYCLES.has(frame.lifecycle)
    && frame.relationship.temporalBasis
      === "coincident-one-hour-interval"
    && frame.relationship.causalityClaim === false
    && values.every(Number.isFinite)
    && within(
      frame.weather.cloudCoverPct,
      FIELD_BOUNDS.cloudCoverPct,
    )
    && within(
      frame.weather.relativeHumidityPct,
      FIELD_BOUNDS.relativeHumidityPct,
    )
    && within(
      frame.weather.windSpeedMps,
      FIELD_BOUNDS.windSpeedMps,
    )
    && within(
      frame.weather.ambientTemperatureC,
      FIELD_BOUNDS.temperatureC,
    )
    && within(frame.irradiance.ghiWm2, FIELD_BOUNDS.ghiWm2)
    && within(frame.irradiance.dniWm2, FIELD_BOUNDS.dniWm2)
    && within(frame.irradiance.dhiWm2, FIELD_BOUNDS.dhiWm2)
    && within(
      frame.irradiance.effectivePoaWm2,
      [0, ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2],
    )
    && frame.energy.acEnergyKWh >= 0
    && frame.energy.acEnergyKWh <= frame.array.capacityKwDc
    && frame.array.capacityKwDc > 0
    && frame.quality.score >= 0
    && frame.quality.score <= 1
    && frame.quality.completeness >= 0
    && frame.quality.completeness <= 1
    && QUALITY_LEVELS.has(frame.quality.level)
    && typeof frame.quality.imputed === "boolean"
    && frame.quality.flags.every(nonEmpty)
    && validUnits(frame)
    && nonEmpty(frame.provenance.provider)
    && nonEmpty(frame.provenance.datasetVersion)
    && nonEmpty(frame.provenance.calculationVersion)
    && evidenceRefs.length > 0
    && evidenceRefs.every(nonEmpty)
    && new Set(evidenceRefs).size === evidenceRefs.length
    && unavailableLayers.length === 7
    && unavailableLayers.every(validUnavailable)
  );
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function invalidFrame(): AtmosphericObservationViewResult {
  return Object.freeze({
    status: "unavailable",
    reason: "invalid-atmospheric-observation-frame",
    summary:
      "The atmospheric frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
  });
}

export function deriveAtmosphericObservationView(
  result: AtmosphericObservationFrameBuildResult,
): AtmosphericObservationViewResult {
  if (result.status === "unavailable") {
    return Object.freeze({
      status: result.status,
      reason: result.reason,
      summary: result.summary,
    });
  }

  try {
    const { frame } = result;
    if (!validFrame(frame)) return invalidFrame();

    return Object.freeze({
      status: "ready",
      view: deepFreeze({
        schemaVersion: frame.schemaVersion,
        resultId: frame.resultId,
        timestampUtc: frame.timestampUtc,
        intervalSeconds: frame.intervalSeconds,
        lifecycle: frame.lifecycle,
        relationship: { ...frame.relationship },
        weather: { ...frame.weather },
        irradiance: { ...frame.irradiance },
        energy: { ...frame.energy },
        array: { ...frame.array },
        quality: {
          ...frame.quality,
          flags: [...frame.quality.flags],
        },
        units: { ...frame.units },
        provenance: {
          ...frame.provenance,
          evidenceRefIds: [...frame.provenance.evidenceRefIds],
        },
        unavailableLayers: {
          windDirection: { ...frame.unavailableLayers.windDirection },
          cloudAltitude: { ...frame.unavailableLayers.cloudAltitude },
          cloudType: { ...frame.unavailableLayers.cloudType },
          cloudGeometry: { ...frame.unavailableLayers.cloudGeometry },
          cloudMotion: { ...frame.unavailableLayers.cloudMotion },
          subHourResponse: {
            ...frame.unavailableLayers.subHourResponse,
          },
          measuredOrLivePlantOutput: {
            ...frame.unavailableLayers.measuredOrLivePlantOutput,
          },
        },
      } satisfies AtmosphericObservationViewV1),
    });
  } catch {
    return invalidFrame();
  }
}
