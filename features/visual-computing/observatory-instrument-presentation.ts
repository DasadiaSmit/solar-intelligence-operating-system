import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
} from "./observatory-model";
import {
  OBSERVATORY_INSTRUMENT_MOUNTS,
  instrumentMountAtPosition,
  type ObservatoryInstrumentMount,
} from "./observatory-instrument-registry";

export type ObservatoryInstrumentPresence =
  | "absent"
  | "transitioning"
  | "present";

export interface ObservatoryInstrumentPresentationState {
  readonly mount: ObservatoryInstrumentMount;
  readonly dialPosition: number;
  readonly activePositionIndex: number;
  readonly distanceFromDial: number;
  readonly formationProgress: number;
  readonly visibility: number;
  readonly presence: ObservatoryInstrumentPresence;
  readonly interactive: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function smootherStep(value: number): number {
  const progress = clamp(value, 0, 1);
  return progress * progress * progress
    * (progress * (progress * 6 - 15) + 10);
}

function presenceFor(
  formationProgress: number,
): ObservatoryInstrumentPresence {
  if (formationProgress <= 0) return "absent";
  if (formationProgress >= 1) return "present";
  return "transitioning";
}

export function deriveObservatoryInstrumentPresentationState(
  dialPosition: number,
  positionIndex: number,
): ObservatoryInstrumentPresentationState | null {
  const mount = instrumentMountAtPosition(positionIndex);
  if (!mount) return null;

  const safeDialPosition = clamp(
    dialPosition,
    0,
    OBSERVATORY_ACTIVE_POSITION_COUNT - 1,
  );
  const activePositionIndex = Math.round(safeDialPosition);
  const distanceFromDial = Math.abs(safeDialPosition - positionIndex);
  const reachedProgress =
    mount.mountStatus === "mounted"
      ? positionIndex === 0
        ? 1
        : smootherStep(
            safeDialPosition - (positionIndex - 1),
          )
      : 0;
  const currentEmphasis = smootherStep(1 - distanceFromDial);
  const formationProgress = reachedProgress;
  const visibility =
    reachedProgress * (0.34 + currentEmphasis * 0.66);

  return Object.freeze({
    mount,
    dialPosition: safeDialPosition,
    activePositionIndex,
    distanceFromDial,
    formationProgress,
    visibility,
    presence: presenceFor(formationProgress),
    interactive:
      mount.implementationStatus === "implemented"
      && activePositionIndex === positionIndex
      && formationProgress >= 0.9,
  });
}

export function deriveObservatoryInstrumentPresentationStates(
  dialPosition: number,
): readonly ObservatoryInstrumentPresentationState[] {
  return Object.freeze(
    OBSERVATORY_INSTRUMENT_MOUNTS.map((mount) => {
      const state = deriveObservatoryInstrumentPresentationState(
        dialPosition,
        mount.position.index,
      );
      if (!state) {
        throw new Error("The immutable instrument registry is inconsistent.");
      }
      return state;
    }),
  );
}
