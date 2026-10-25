import {
  HERO_CAMERA_FINAL,
  type HeroCameraPose,
} from "./hero-motion";
import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  deriveObservatoryPresentationState,
  progressForObservatoryPosition,
} from "./observatory-model";

export interface ObservatoryCameraAnchor {
  readonly positionIndex: number;
  readonly progress: number;
  readonly pose: Readonly<HeroCameraPose>;
}

function freezePose(pose: HeroCameraPose): Readonly<HeroCameraPose> {
  return Object.freeze({ ...pose });
}

const STRUCTURAL_CAMERA_POSES: readonly Readonly<HeroCameraPose>[] =
  Object.freeze([
    HERO_CAMERA_FINAL,
    freezePose({
      x: -0.24,
      y: 0.42,
      z: 8.86,
      targetX: 0.07,
      targetY: 0.12,
      targetZ: 0,
      fov: 34.35,
    }),
    freezePose({
      x: -0.1,
      y: 0.08,
      z: 9.7,
      targetX: 0.025,
      targetY: 0.01,
      targetZ: 0,
      fov: 36.1,
    }),
    freezePose({
      x: 0,
      y: 0.12,
      z: 9.05,
      targetX: 0,
      targetY: 0.02,
      targetZ: 0,
      fov: 34.5,
    }),
    freezePose({
      x: 0.13,
      y: 0.1,
      z: 9.18,
      targetX: -0.04,
      targetY: 0.015,
      targetZ: 0,
      fov: 34.65,
    }),
    freezePose({
      x: 0.24,
      y: 0.07,
      z: 9.3,
      targetX: -0.08,
      targetY: 0.01,
      targetZ: 0,
      fov: 34.8,
    }),
    freezePose({
      x: 0.31,
      y: 0.04,
      z: 9.42,
      targetX: -0.1,
      targetY: 0,
      targetZ: 0,
      fov: 35,
    }),
  ]);

export const OBSERVATORY_CAMERA_ANCHORS:
readonly ObservatoryCameraAnchor[] = Object.freeze(
  STRUCTURAL_CAMERA_POSES.map((pose, positionIndex) =>
    Object.freeze({
      positionIndex,
      progress:
        progressForObservatoryPosition(positionIndex) ?? 0,
      pose,
    })),
);

export const OBSERVATORY_HANDOFF_CAMERA_POSE: Readonly<HeroCameraPose> =
  freezePose({
    x: 0.18,
    y: 0.02,
    z: 9.75,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 36,
  });

export function isFiniteObservatoryCameraPose(
  pose: HeroCameraPose,
): boolean {
  return [
    pose.x,
    pose.y,
    pose.z,
    pose.targetX,
    pose.targetY,
    pose.targetZ,
    pose.fov,
  ].every(Number.isFinite)
    && pose.fov > 0
    && pose.fov < 180;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function smootherStep(value: number): number {
  const progress = clampUnit(value);
  return progress * progress * progress * (
    progress * (progress * 6 - 15) + 10
  );
}

function interpolateNumber(
  from: number,
  to: number,
  progress: number,
): number {
  return from + (to - from) * progress;
}

function batteryFlowLookTargetX(
  from: number,
  to: number,
  progress: number,
): number {
  const safeProgress = clampUnit(progress);
  if (safeProgress === 0) return from;
  if (safeProgress === 1) return to;

  if (safeProgress < 0.25) {
    return interpolateNumber(
      from,
      -0.12,
      smootherStep(safeProgress / 0.25),
    );
  }
  if (safeProgress < 0.55) {
    return interpolateNumber(
      -0.12,
      0,
      smootherStep((safeProgress - 0.25) / 0.3),
    );
  }
  if (safeProgress < 0.82) {
    return interpolateNumber(
      0,
      0.1,
      smootherStep((safeProgress - 0.55) / 0.27),
    );
  }
  return interpolateNumber(
    0.1,
    to,
    smootherStep((safeProgress - 0.82) / 0.18),
  );
}

export function interpolateObservatoryCameraPose(
  from: HeroCameraPose,
  to: HeroCameraPose,
  progress: number,
): Readonly<HeroCameraPose> {
  const safeFrom = isFiniteObservatoryCameraPose(from)
    ? from
    : HERO_CAMERA_FINAL;
  const safeTo = isFiniteObservatoryCameraPose(to)
    ? to
    : safeFrom;
  const safeProgress = clampUnit(progress);
  if (safeProgress === 0) return safeFrom;
  if (safeProgress === 1) return safeTo;

  return freezePose({
    x: interpolateNumber(safeFrom.x, safeTo.x, safeProgress),
    y: interpolateNumber(safeFrom.y, safeTo.y, safeProgress),
    z: interpolateNumber(safeFrom.z, safeTo.z, safeProgress),
    targetX: interpolateNumber(
      safeFrom.targetX,
      safeTo.targetX,
      safeProgress,
    ),
    targetY: interpolateNumber(
      safeFrom.targetY,
      safeTo.targetY,
      safeProgress,
    ),
    targetZ: interpolateNumber(
      safeFrom.targetZ,
      safeTo.targetZ,
      safeProgress,
    ),
    fov: interpolateNumber(safeFrom.fov, safeTo.fov, safeProgress),
  });
}

export function deriveObservatoryCameraPose(
  progress: number,
  reducedMotion = false,
): Readonly<HeroCameraPose> {
  const presentation = deriveObservatoryPresentationState(progress);
  if (presentation.phase === "hero") return HERO_CAMERA_FINAL;

  const lastAnchor =
    OBSERVATORY_CAMERA_ANCHORS[
      OBSERVATORY_ACTIVE_POSITION_COUNT - 1
    ] ?? OBSERVATORY_CAMERA_ANCHORS[0];
  if (!lastAnchor) return HERO_CAMERA_FINAL;

  if (presentation.phase === "handoff") {
    return interpolateObservatoryCameraPose(
      lastAnchor.pose,
      OBSERVATORY_HANDOFF_CAMERA_POSE,
      smootherStep(presentation.handoffProgress),
    );
  }

  const lowerIndex = Math.max(
    0,
    Math.min(
      OBSERVATORY_ACTIVE_POSITION_COUNT - 1,
      Math.floor(presentation.dialPosition),
    ),
  );
  const upperIndex = Math.min(
    OBSERVATORY_ACTIVE_POSITION_COUNT - 1,
    lowerIndex + 1,
  );
  const lower =
    OBSERVATORY_CAMERA_ANCHORS[lowerIndex]
    ?? OBSERVATORY_CAMERA_ANCHORS[0];
  const upper = OBSERVATORY_CAMERA_ANCHORS[upperIndex] ?? lower;
  if (!lower || !upper) return HERO_CAMERA_FINAL;

  const transitionProgress = clampUnit(
    presentation.dialPosition - lowerIndex,
  );
  const pose = interpolateObservatoryCameraPose(
    lower.pose,
    upper.pose,
    smootherStep(transitionProgress),
  );
  if (
    reducedMotion
    || lowerIndex !== 4
    || upperIndex !== 5
    || transitionProgress === 0
  ) {
    return pose;
  }

  return freezePose({
    ...pose,
    targetX: batteryFlowLookTargetX(
      lower.pose.targetX,
      upper.pose.targetX,
      transitionProgress,
    ),
  });
}
