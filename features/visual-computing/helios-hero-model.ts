import type {
  SceneFrameBuildResult,
  SceneFrameV1,
} from "./scene-frame";

export type HeliosVector3 = readonly [x: number, y: number, z: number];

export interface HeliosRingSpec {
  readonly id:
    | "physical-reality"
    | "energy-conversion"
    | "system-balance"
    | "forecast-evidence"
    | "scientific-memory"
    | "decision-support";
  readonly radius: number;
  readonly tubeRadius: number;
  readonly inclination: HeliosVector3;
  readonly periodSeconds: number;
  readonly direction: 1 | -1;
  readonly colour: string;
  readonly opacity: number;
}

export interface HeliosHeroVisualState {
  readonly frame: SceneFrameV1;
  readonly progress: number;
  readonly sunDirectionThree: HeliosVector3;
  readonly irradianceRatio: number;
  readonly cloudFraction: number;
  readonly qualityScore: number;
  readonly solarElevationRatio: number;
}

export const SOLAR_SURFACE_PERIOD_SECONDS = 180;
export const SOLAR_CORONA_PERIOD_SECONDS = 240;
export const MAGNETIC_FIELD_PERIOD_SECONDS = 300;

const HELIOS_RING_INPUTS: readonly HeliosRingSpec[] = [
  {
    id: "physical-reality",
    radius: 1.36,
    tubeRadius: 0.012,
    inclination: [0.12, 0.08, 0],
    periodSeconds: 96,
    direction: 1,
    colour: "#d9b968",
    opacity: 0.46,
  },
  {
    id: "energy-conversion",
    radius: 1.58,
    tubeRadius: 0.009,
    inclination: [0.58, -0.16, 0.22],
    periodSeconds: 120,
    direction: -1,
    colour: "#a8b995",
    opacity: 0.34,
  },
  {
    id: "system-balance",
    radius: 1.82,
    tubeRadius: 0.008,
    inclination: [-0.34, 0.46, -0.2],
    periodSeconds: 150,
    direction: 1,
    colour: "#7ea89b",
    opacity: 0.31,
  },
  {
    id: "forecast-evidence",
    radius: 2.08,
    tubeRadius: 0.007,
    inclination: [0.76, 0.18, -0.42],
    periodSeconds: 186,
    direction: -1,
    colour: "#789eaa",
    opacity: 0.28,
  },
  {
    id: "scientific-memory",
    radius: 2.34,
    tubeRadius: 0.006,
    inclination: [-0.52, -0.38, 0.34],
    periodSeconds: 234,
    direction: 1,
    colour: "#8d94ad",
    opacity: 0.24,
  },
  {
    id: "decision-support",
    radius: 2.62,
    tubeRadius: 0.005,
    inclination: [0.24, 0.72, 0.48],
    periodSeconds: 300,
    direction: -1,
    colour: "#b7a36f",
    opacity: 0.21,
  },
];

export const HELIOS_RING_SPECS: readonly HeliosRingSpec[] = Object.freeze(
  HELIOS_RING_INPUTS.map((ring) => Object.freeze({
  ...ring,
  inclination: Object.freeze([...ring.inclination]) as HeliosVector3,
  })),
);

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampPointer(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}

export function enuToThreeVector(
  direction: SceneFrameV1["sun"]["directionEnu"],
): HeliosVector3 {
  return [direction.east, direction.up, -direction.north];
}

export function deriveHeliosHeroVisualState(
  scene: SceneFrameBuildResult,
  progress: number,
): HeliosHeroVisualState | null {
  if (scene.status !== "ready") return null;
  const frame = scene.frame;
  return {
    frame,
    progress: clampUnit(progress),
    sunDirectionThree: enuToThreeVector(frame.sun.directionEnu),
    irradianceRatio: clampUnit(frame.irradiance.effectivePoaWm2 / 1_200),
    cloudFraction: clampUnit(frame.weather.cloudFraction),
    qualityScore: clampUnit(frame.weather.qualityScore),
    solarElevationRatio: clampUnit((frame.sun.elevationDeg + 6) / 96),
  };
}
