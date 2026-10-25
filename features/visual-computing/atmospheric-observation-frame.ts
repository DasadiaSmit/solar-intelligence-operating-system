import type {
  DataQualityLevel,
} from "@/lib/contracts";
import type {
  SceneLifecycle,
} from "./scene-frame";

export const ATMOSPHERIC_OBSERVATION_FRAME_SCHEMA_VERSION =
  "1.0.0" as const;

/**
 * Conservative fail-closed output guard for the current canonical
 * transposition model. It is derived above the maximum reachable from the
 * provider irradiance bounds plus the model's bounded reflection,
 * bifaciality, and incidence factors. It is not a display-scale clamp.
 */
export const ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2 = 4_200 as const;

export interface UnavailableAtmosphericLayerV1 {
  readonly status: "unavailable";
  readonly reason: string;
  readonly value: null;
}

export interface AtmosphericObservationUnavailableLayersV1 {
  readonly windDirection: UnavailableAtmosphericLayerV1;
  readonly cloudAltitude: UnavailableAtmosphericLayerV1;
  readonly cloudType: UnavailableAtmosphericLayerV1;
  readonly cloudGeometry: UnavailableAtmosphericLayerV1;
  readonly cloudMotion: UnavailableAtmosphericLayerV1;
  readonly subHourResponse: UnavailableAtmosphericLayerV1;
  readonly measuredOrLivePlantOutput: UnavailableAtmosphericLayerV1;
}

export interface AtmosphericObservationFrameV1 {
  readonly schemaVersion:
    typeof ATMOSPHERIC_OBSERVATION_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly timestampUtc: string;
  readonly intervalSeconds: 3600;
  readonly lifecycle: SceneLifecycle;
  readonly relationship: {
    readonly temporalBasis: "coincident-one-hour-interval";
    readonly causalityClaim: false;
  };
  readonly weather: {
    readonly cloudCoverPct: number;
    readonly relativeHumidityPct: number;
    readonly windSpeedMps: number;
    readonly ambientTemperatureC: number;
  };
  readonly irradiance: {
    readonly ghiWm2: number;
    readonly dniWm2: number;
    readonly dhiWm2: number;
    readonly effectivePoaWm2: number;
  };
  readonly energy: {
    readonly acEnergyKWh: number;
  };
  readonly array: {
    readonly capacityKwDc: number;
  };
  readonly quality: {
    readonly score: number;
    readonly level: DataQualityLevel;
    readonly completeness: number;
    readonly imputed: boolean;
    readonly flags: readonly string[];
  };
  readonly units: {
    readonly cloudCover: "%";
    readonly relativeHumidity: "%";
    readonly windSpeed: "m/s";
    readonly ambientTemperature: "°C";
    readonly irradiance: "W/m²";
    readonly acEnergy: "kWh/1h";
    readonly arrayCapacity: "kW DC";
    readonly quality: "fraction";
  };
  readonly provenance: {
    readonly provider: string;
    readonly datasetVersion: string;
    readonly calculationVersion: string;
    readonly evidenceRefIds: readonly string[];
  };
  readonly unavailableLayers:
    AtmosphericObservationUnavailableLayersV1;
}

export type AtmosphericObservationFrameUnavailableReason =
  | "invalid-result-id"
  | "missing-linked-hour"
  | "invalid-linked-time"
  | "invalid-linked-interval"
  | "invalid-observation-value"
  | "missing-provenance"
  | "invalid-lifecycle";

export type AtmosphericObservationFrameBuildResult =
  | {
      readonly status: "ready";
      readonly frame: AtmosphericObservationFrameV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: AtmosphericObservationFrameUnavailableReason;
      readonly summary: string;
    };

export function deepFreezeAtmosphericObservationFrame(
  frame: AtmosphericObservationFrameV1,
): AtmosphericObservationFrameV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(frame);
  return frame;
}
