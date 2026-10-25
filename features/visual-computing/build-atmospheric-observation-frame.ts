import type {
  OperatingSnapshot,
  ProvenanceRecord,
} from "@/lib/contracts";
import {
  FIELD_BOUNDS,
} from "@/lib/providers/conversions";
import {
  ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
  ATMOSPHERIC_OBSERVATION_FRAME_SCHEMA_VERSION,
  deepFreezeAtmosphericObservationFrame,
  type AtmosphericObservationFrameBuildResult,
  type AtmosphericObservationFrameUnavailableReason,
  type AtmosphericObservationFrameV1,
  type UnavailableAtmosphericLayerV1,
} from "./atmospheric-observation-frame";
import type {
  SceneLifecycle,
} from "./scene-frame";

export interface BuildAtmosphericObservationFrameOptions {
  readonly snapshot: OperatingSnapshot;
  readonly resultId: string;
  readonly selectedIndex: number;
  readonly lifecycle: SceneLifecycle;
}

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const VALID_QUALITY_LEVELS = new Set([
  "excellent",
  "good",
  "qualified",
  "low",
]);

function unavailable(reason: string): UnavailableAtmosphericLayerV1 {
  return Object.freeze({
    status: "unavailable",
    reason,
    value: null,
  });
}

function failed(
  reason: AtmosphericObservationFrameUnavailableReason,
  summary: string,
): AtmosphericObservationFrameBuildResult {
  return Object.freeze({ status: "unavailable", reason, summary });
}

function evidenceRef(resultId: string, factKey: string): string {
  return `evidence:${resultId}:${factKey}`;
}

function provenanceRecord(
  records: readonly ProvenanceRecord[],
  kind: ProvenanceRecord["kind"],
): ProvenanceRecord | null {
  return records.find((record) => record.kind === kind) ?? null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function hasHourlyInterval(
  snapshot: OperatingSnapshot,
  selectedIndex: number,
): boolean {
  const current = snapshot.hourly[selectedIndex];
  if (!current) return false;
  const currentMs = Date.parse(current.timestamp);
  const next = snapshot.hourly[selectedIndex + 1];
  const previous = snapshot.hourly[selectedIndex - 1];
  const adjacent = next ?? previous;
  if (!adjacent) return false;
  const adjacentMs = Date.parse(adjacent.timestamp);
  if (!Number.isFinite(currentMs) || !Number.isFinite(adjacentMs)) return false;
  const intervalMs = next
    ? adjacentMs - currentMs
    : currentMs - adjacentMs;
  return intervalMs === 3_600_000;
}

export function buildAtmosphericObservationFrameV1({
  snapshot,
  resultId,
  selectedIndex,
  lifecycle,
}: BuildAtmosphericObservationFrameOptions):
AtmosphericObservationFrameBuildResult {
  if (!nonEmpty(resultId) || resultId === "unidentified-result") {
    return failed(
      "invalid-result-id",
      "A stable result identifier is required before atmospheric evidence can be linked.",
    );
  }
  if (!VALID_LIFECYCLES.has(lifecycle)) {
    return failed(
      "invalid-lifecycle",
      "The atmospheric evidence lifecycle is invalid; no observation frame has been produced.",
    );
  }
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
    return failed(
      "missing-linked-hour",
      "The linked atmospheric interval is unavailable.",
    );
  }

  const hour = snapshot.hourly[selectedIndex];
  if (!hour) {
    return failed(
      "missing-linked-hour",
      "The linked atmospheric interval is unavailable.",
    );
  }
  if (!Number.isFinite(Date.parse(hour.timestamp))) {
    return failed(
      "invalid-linked-time",
      "The linked atmospheric timestamp is invalid.",
    );
  }
  if (!hasHourlyInterval(snapshot, selectedIndex)) {
    return failed(
      "invalid-linked-interval",
      "The linked atmospheric record is not a verified one-hour interval.",
    );
  }

  const values = [
    hour.weather.cloudCoverPct,
    hour.weather.relativeHumidityPct,
    hour.weather.windSpeedMps,
    hour.weather.temperatureC,
    hour.weather.ghiWm2,
    hour.weather.dniWm2,
    hour.weather.dhiWm2,
    hour.irradiance.effectiveWm2,
    hour.generation.acKWh,
    snapshot.config.array.capacityKwDc,
    hour.quality.score,
    hour.quality.completeness,
  ];
  if (
    !values.every(Number.isFinite)
    || !within(
      hour.weather.cloudCoverPct,
      FIELD_BOUNDS.cloudCoverPct,
    )
    || !within(
      hour.weather.relativeHumidityPct,
      FIELD_BOUNDS.relativeHumidityPct,
    )
    || !within(hour.weather.windSpeedMps, FIELD_BOUNDS.windSpeedMps)
    || !within(hour.weather.temperatureC, FIELD_BOUNDS.temperatureC)
    || !within(hour.weather.ghiWm2, FIELD_BOUNDS.ghiWm2)
    || !within(hour.weather.dniWm2, FIELD_BOUNDS.dniWm2)
    || !within(hour.weather.dhiWm2, FIELD_BOUNDS.dhiWm2)
    || !within(
      hour.irradiance.effectiveWm2,
      [0, ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2],
    )
    || hour.generation.acKWh < 0
    || hour.generation.acKWh > snapshot.config.array.capacityKwDc
    || snapshot.config.array.capacityKwDc <= 0
    || hour.quality.score < 0
    || hour.quality.score > 1
    || hour.quality.completeness < 0
    || hour.quality.completeness > 1
    || !VALID_QUALITY_LEVELS.has(hour.quality.level)
    || typeof hour.quality.imputed !== "boolean"
    || !hour.quality.flags.every(
      (flag) => typeof flag === "string" && nonEmpty(flag),
    )
  ) {
    return failed(
      "invalid-observation-value",
      "One or more linked atmospheric values are invalid; no observation frame has been produced.",
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
    return failed(
      "missing-provenance",
      "Atmospheric provenance is incomplete; no observation frame has been produced.",
    );
  }

  const frame: AtmosphericObservationFrameV1 = {
    schemaVersion: ATMOSPHERIC_OBSERVATION_FRAME_SCHEMA_VERSION,
    resultId,
    timestampUtc: hour.timestamp,
    intervalSeconds: 3600,
    lifecycle,
    relationship: {
      temporalBasis: "coincident-one-hour-interval",
      causalityClaim: false,
    },
    weather: {
      cloudCoverPct: hour.weather.cloudCoverPct,
      relativeHumidityPct: hour.weather.relativeHumidityPct,
      windSpeedMps: hour.weather.windSpeedMps,
      ambientTemperatureC: hour.weather.temperatureC,
    },
    irradiance: {
      ghiWm2: hour.weather.ghiWm2,
      dniWm2: hour.weather.dniWm2,
      dhiWm2: hour.weather.dhiWm2,
      effectivePoaWm2: hour.irradiance.effectiveWm2,
    },
    energy: {
      acEnergyKWh: hour.generation.acKWh,
    },
    array: {
      capacityKwDc: snapshot.config.array.capacityKwDc,
    },
    quality: {
      score: hour.quality.score,
      level: hour.quality.level,
      completeness: hour.quality.completeness,
      imputed: hour.quality.imputed,
      flags: [...hour.quality.flags],
    },
    units: {
      cloudCover: "%",
      relativeHumidity: "%",
      windSpeed: "m/s",
      ambientTemperature: "°C",
      irradiance: "W/m²",
      acEnergy: "kWh/1h",
      arrayCapacity: "kW DC",
      quality: "fraction",
    },
    provenance: {
      provider: provider.provider,
      datasetVersion: dataset.version,
      calculationVersion: calculation.calculationVersion,
      evidenceRefIds: [
        evidenceRef(resultId, "hour.cloud"),
        evidenceRef(resultId, "hour.humidity"),
        evidenceRef(resultId, "hour.wind-speed"),
        evidenceRef(resultId, "hour.temperature"),
        evidenceRef(resultId, "hour.ghi"),
        evidenceRef(resultId, "hour.dni"),
        evidenceRef(resultId, "hour.dhi"),
        evidenceRef(resultId, "hour.poa"),
        evidenceRef(resultId, "hour.ac"),
        evidenceRef(resultId, "scenario.capacity"),
      ],
    },
    unavailableLayers: {
      windDirection: unavailable(
        "The canonical operating snapshot does not carry wind direction.",
      ),
      cloudAltitude: unavailable(
        "No attributed cloud-base or cloud-top altitude is attached to this interval.",
      ),
      cloudType: unavailable(
        "No attributed cloud classification is attached to this interval.",
      ),
      cloudGeometry: unavailable(
        "No measured three-dimensional cloud geometry is attached to this interval.",
      ),
      cloudMotion: unavailable(
        "No spatial cloud field or observed advection vector is attached to this interval.",
      ),
      subHourResponse: unavailable(
        "The operating snapshot has one-hour intervals and cannot resolve sub-hour response.",
      ),
      measuredOrLivePlantOutput: unavailable(
        "The linked AC energy is modelled interval output; no measured or live plant telemetry is attached.",
      ),
    },
  };

  return Object.freeze({
    status: "ready",
    frame: deepFreezeAtmosphericObservationFrame(frame),
  });
}
