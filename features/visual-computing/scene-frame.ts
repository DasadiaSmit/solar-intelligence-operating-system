export const SCENE_FRAME_SCHEMA_VERSION = "1.0.0" as const;

export type SceneLifecycle =
  | "IMPLEMENTED"
  | "EXPERIMENTAL"
  | "SIMULATED"
  | "PLANNED";

export interface EnuVectorV1 {
  readonly east: number;
  readonly north: number;
  readonly up: number;
}

export interface SunAnglesV1 {
  readonly elevationDeg: number;
  readonly azimuthDeg: number;
}

export interface UnavailableSceneLayerV1 {
  readonly status: "unavailable";
  readonly reason: string;
  readonly value: null;
}

export interface SceneFrameV1 {
  readonly schemaVersion: typeof SCENE_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly timestampUtc: string;
  readonly intervalSeconds: number;
  readonly lifecycle: SceneLifecycle;
  readonly coordinateFrame: {
    readonly name: "ENU";
    readonly azimuthConvention: "clockwise-from-true-north";
    readonly rendererMapping: "three-x-east-y-up-z-negative-north";
  };
  readonly site: {
    readonly latitudeDeg: number | null;
    readonly longitudeDeg: number | null;
    readonly elevationM: number | null;
    readonly originStatus: "configured" | "unavailable";
  };
  readonly sun: {
    readonly elevationDeg: number;
    readonly azimuthDeg: number;
    readonly directionEnu: EnuVectorV1;
    readonly source: "authoritative-linked-hour";
  };
  readonly irradiance: {
    readonly ghiWm2: number;
    readonly effectivePoaWm2: number;
    readonly directNormalWm2: UnavailableSceneLayerV1;
    readonly diffuseHorizontalWm2: UnavailableSceneLayerV1;
    readonly groundReflectedWm2: UnavailableSceneLayerV1;
  };
  readonly weather: {
    readonly cloudFraction: number;
    readonly ambientTemperatureC: number;
    readonly qualityScore: number;
  };
  readonly array: {
    readonly capacityKwDc: number;
    readonly tiltDeg: number;
    readonly azimuthDeg: number;
    readonly geometry: UnavailableSceneLayerV1;
  };
  readonly energy: {
    readonly acEnergyKWh: number;
    readonly demandEnergyKWh: number;
    readonly batteryStateOfChargeKWh: number;
    readonly gridImportEnergyKWh: number;
    readonly gridExportEnergyKWh: number;
  };
  readonly environment: {
    readonly terrain: UnavailableSceneLayerV1;
    readonly surveyedHorizon: UnavailableSceneLayerV1;
  };
  readonly units: {
    readonly angle: "deg";
    readonly irradiance: "W/m²";
    readonly intervalEnergy: "kWh/1h";
    readonly batteryState: "kWh";
    readonly temperature: "°C";
    readonly quality: "fraction";
  };
  readonly provenance: {
    readonly provider: string;
    readonly datasetVersion: string;
    readonly calculationVersion: string;
    readonly evidenceRefIds: readonly string[];
  };
}

export type SceneFrameUnavailableReason =
  | "missing-linked-hour"
  | "invalid-linked-time"
  | "invalid-solar-position"
  | "invalid-scene-value"
  | "missing-provenance";

export type SceneFrameBuildResult =
  | {
      readonly status: "ready";
      readonly frame: SceneFrameV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: SceneFrameUnavailableReason;
      readonly summary: string;
    };

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function normalizedAzimuth(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function sunAnglesToEnu(
  elevationDeg: number,
  azimuthDeg: number,
): EnuVectorV1 | null {
  if (
    !Number.isFinite(elevationDeg)
    || !Number.isFinite(azimuthDeg)
    || elevationDeg < -90
    || elevationDeg > 90
  ) {
    return null;
  }
  const elevationRad = elevationDeg * DEG_TO_RAD;
  const azimuthRad = normalizedAzimuth(azimuthDeg) * DEG_TO_RAD;
  const horizontal = Math.cos(elevationRad);
  return {
    east: horizontal * Math.sin(azimuthRad),
    north: horizontal * Math.cos(azimuthRad),
    up: Math.sin(elevationRad),
  };
}

export function enuToSunAngles(vector: EnuVectorV1): SunAnglesV1 | null {
  const { east, north, up } = vector;
  if (![east, north, up].every(Number.isFinite)) return null;
  const magnitude = Math.hypot(east, north, up);
  if (magnitude <= Number.EPSILON) return null;
  const normalizedUp = Math.max(-1, Math.min(1, up / magnitude));
  return {
    elevationDeg: Math.asin(normalizedUp) * RAD_TO_DEG,
    azimuthDeg: normalizedAzimuth(Math.atan2(east, north) * RAD_TO_DEG),
  };
}

export function deepFreezeSceneFrame(frame: SceneFrameV1): SceneFrameV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(frame);
  return frame;
}
