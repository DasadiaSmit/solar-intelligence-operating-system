import { clampUnit } from "./helios-hero-model";

export interface HeroCameraPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetZ: number;
  readonly fov: number;
}

export const HERO_CAMERA_INITIAL: Readonly<HeroCameraPose> = Object.freeze({
  x: 0.12,
  y: 0.08,
  z: 7.4,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
  fov: 31,
});

export const HERO_CAMERA_FINAL: Readonly<HeroCameraPose> = Object.freeze({
  x: -0.34,
  y: 0.04,
  z: 8.65,
  targetX: 0.12,
  targetY: 0,
  targetZ: 0,
  fov: 34,
});

export function coreRingApertureScale(
  ringIndex: number,
  progress: number,
): number {
  const safeIndex = Number.isFinite(ringIndex)
    ? Math.max(0, Math.min(5, Math.trunc(ringIndex)))
    : 0;
  return 1 + clampUnit(progress) * (0.035 + safeIndex * 0.018);
}
