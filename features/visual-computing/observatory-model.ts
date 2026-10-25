export const OBSERVATORY_POSITION_COUNT = 14;
export const OBSERVATORY_ACTIVE_POSITION_COUNT = 7;
export const OBSERVATORY_RING_STEP_RADIANS =
  (Math.PI * 2) / OBSERVATORY_POSITION_COUNT;
export const OBSERVATORY_ENTRY_END = 0.16;
export const OBSERVATORY_HANDOFF_START = 0.94;

const DIAL_TOP_ANGLE_RADIANS = Math.PI / 2;

const NAVIGABLE_PLACEHOLDER_LABELS = Object.freeze([
  "Solar Digital Twin",
  "Atmospheric Observation",
  "Annual Energy Observatory",
  "Solar Array Engineering",
  "Scenario Simulator",
  "Battery & Energy Flow",
  "Regional Solar Intelligence",
] as const);

export type ObservatoryPositionAvailability =
  | "navigable-instrument"
  | "navigable-placeholder"
  | "reserved";

export interface ObservatoryPosition {
  readonly id: `observatory-position-${string}`;
  /** Zero-based position used by the presentation and navigation contracts. */
  readonly index: number;
  /** One-based position engraved in the visual dial. */
  readonly ordinal: number;
  readonly label: string;
  readonly availability: ObservatoryPositionAvailability;
  readonly angleRadians: number;
}

export type ObservatoryMarkerState =
  | "current"
  | "previous"
  | "future"
  | "reserved";

export interface ObservatoryMarkerPresentation {
  readonly position: ObservatoryPosition;
  readonly state: ObservatoryMarkerState;
  readonly visibility: number;
  readonly navigable: boolean;
}

export interface ObservatoryVisibility {
  readonly hero: number;
  readonly observatory: number;
  readonly handoff: number;
  readonly core: number;
  readonly instrumentRing: number;
}

export interface ObservatoryPresentationState {
  readonly phase: "hero" | "observatory" | "handoff";
  readonly progress: number;
  readonly heroProgress: number;
  readonly observatoryProgress: number;
  readonly handoffProgress: number;
  /** Continuous calibrated-dial position from the first to seventh mount. */
  readonly dialPosition: number;
  /** Nearest navigable position, always zero through six. */
  readonly activePositionIndex: number;
  readonly dialRotationRad: number;
  readonly visibility: ObservatoryVisibility;
  readonly markers: readonly ObservatoryMarkerPresentation[];
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function progressBetween(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return clampUnit((value - start) / (end - start));
}

function smootherStep(value: number): number {
  const progress = clampUnit(value);
  return progress * progress * progress * (
    progress * (progress * 6 - 15) + 10
  );
}

function positionLabel(index: number): string {
  return NAVIGABLE_PLACEHOLDER_LABELS[index]
    ?? `Reserved position ${String(index + 1).padStart(2, "0")}`;
}

export const OBSERVATORY_POSITIONS: readonly ObservatoryPosition[] =
  Object.freeze(
    Array.from({ length: OBSERVATORY_POSITION_COUNT }, (_, index) =>
      Object.freeze({
        id: `observatory-position-${String(index + 1).padStart(2, "0")}`,
        index,
        ordinal: index + 1,
        label: positionLabel(index),
        availability:
          index < 6
            ? "navigable-instrument"
            : index < OBSERVATORY_ACTIVE_POSITION_COUNT
              ? "navigable-placeholder"
              : "reserved",
        angleRadians:
          DIAL_TOP_ANGLE_RADIANS
          + index * OBSERVATORY_RING_STEP_RADIANS,
      }) satisfies ObservatoryPosition),
  );

export function markerStateForObservatoryPosition(
  positionIndex: number,
  activePositionIndex: number,
): ObservatoryMarkerState {
  if (
    !Number.isInteger(positionIndex)
    || positionIndex < 0
    || positionIndex >= OBSERVATORY_ACTIVE_POSITION_COUNT
  ) {
    return "reserved";
  }
  const safeActiveIndex = Number.isFinite(activePositionIndex)
    ? Math.max(
        0,
        Math.min(
          OBSERVATORY_ACTIVE_POSITION_COUNT - 1,
          Math.round(activePositionIndex),
        ),
      )
    : 0;
  if (positionIndex === safeActiveIndex) return "current";
  return positionIndex < safeActiveIndex ? "previous" : "future";
}

export function progressForObservatoryPosition(
  positionIndex: number,
): number | null {
  if (
    !Number.isInteger(positionIndex)
    || positionIndex < 0
    || positionIndex >= OBSERVATORY_ACTIVE_POSITION_COUNT
  ) {
    return null;
  }
  const positionProgress =
    positionIndex / (OBSERVATORY_ACTIVE_POSITION_COUNT - 1);
  return OBSERVATORY_ENTRY_END
    + positionProgress
      * (OBSERVATORY_HANDOFF_START - OBSERVATORY_ENTRY_END);
}

function markerVisibility(
  state: ObservatoryMarkerState,
  ringVisibility: number,
): number {
  const visibilityByState: Readonly<Record<ObservatoryMarkerState, number>> = {
    current: 1,
    previous: 0.46,
    future: 0.2,
    reserved: 0.07,
  };
  return clampUnit(visibilityByState[state] * ringVisibility);
}

export function deriveObservatoryPresentationState(
  progress: number,
): ObservatoryPresentationState {
  const safeProgress = clampUnit(progress);
  const heroProgress = progressBetween(
    safeProgress,
    0,
    OBSERVATORY_ENTRY_END,
  );
  const observatoryProgress = progressBetween(
    safeProgress,
    OBSERVATORY_ENTRY_END,
    OBSERVATORY_HANDOFF_START,
  );
  const handoffProgress = progressBetween(
    safeProgress,
    OBSERVATORY_HANDOFF_START,
    1,
  );
  const dialPosition =
    observatoryProgress * (OBSERVATORY_ACTIVE_POSITION_COUNT - 1);
  const activePositionIndex = Math.max(
    0,
    Math.min(
      OBSERVATORY_ACTIVE_POSITION_COUNT - 1,
      Math.round(dialPosition),
    ),
  );
  const entryBlend = smootherStep(
    progressBetween(
      safeProgress,
      OBSERVATORY_ENTRY_END * 0.72,
      OBSERVATORY_ENTRY_END,
    ),
  );
  const handoffBlend = smootherStep(handoffProgress);
  const instrumentRingVisibility = clampUnit(
    entryBlend * (1 - handoffBlend),
  );
  const visibility = Object.freeze({
    hero: clampUnit(1 - entryBlend),
    observatory: instrumentRingVisibility,
    handoff: handoffBlend,
    core: 1,
    instrumentRing: instrumentRingVisibility,
  }) satisfies ObservatoryVisibility;
  const markers = Object.freeze(
    OBSERVATORY_POSITIONS.map((position) => {
      const state = markerStateForObservatoryPosition(
        position.index,
        activePositionIndex,
      );
      return Object.freeze({
        position,
        state,
        visibility: markerVisibility(state, instrumentRingVisibility),
        navigable: position.availability !== "reserved",
      }) satisfies ObservatoryMarkerPresentation;
    }),
  );
  const phase: ObservatoryPresentationState["phase"] =
    safeProgress < OBSERVATORY_ENTRY_END
      ? "hero"
      : safeProgress <= OBSERVATORY_HANDOFF_START
        ? "observatory"
        : "handoff";

  return Object.freeze({
    phase,
    progress: safeProgress,
    heroProgress,
    observatoryProgress,
    handoffProgress,
    dialPosition,
    activePositionIndex,
    dialRotationRad:
      -dialPosition * OBSERVATORY_RING_STEP_RADIANS,
    visibility,
    markers,
  });
}
