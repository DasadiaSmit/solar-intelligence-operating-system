import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  OBSERVATORY_POSITIONS,
  type ObservatoryPosition,
} from "./observatory-model";

export type ObservatoryInstrumentId =
  | "I01"
  | "I02"
  | "I03"
  | "I04"
  | "I05"
  | "I06"
  | "I07"
  | "I08"
  | "I09"
  | "I10"
  | "I11"
  | "I12"
  | "I13"
  | "I14";

export type ObservatoryInstrumentMountStatus =
  | "mounted"
  | "placeholder"
  | "reserved";

export type ObservatoryInstrumentImplementationStatus =
  | "implemented"
  | "planned"
  | "reserved";

export type ObservatoryInstrumentKey =
  | "solar-digital-twin"
  | "atmospheric-observation"
  | "annual-energy-observatory"
  | "solar-array-engineering"
  | "scenario-comparison"
  | "battery-energy-flow";

export interface ObservatoryInstrumentMount {
  readonly instrumentId: ObservatoryInstrumentId;
  readonly position: ObservatoryPosition;
  readonly mountStatus: ObservatoryInstrumentMountStatus;
  readonly implementationStatus: ObservatoryInstrumentImplementationStatus;
  /**
   * Renderer-neutral key. A null key means no spatial instrument may be
   * instantiated for this position.
   */
  readonly instrumentKey: ObservatoryInstrumentKey | null;
}

const MOUNTED_INSTRUMENT_KEYS:
readonly ObservatoryInstrumentKey[] = Object.freeze([
  "solar-digital-twin",
  "atmospheric-observation",
  "annual-energy-observatory",
  "solar-array-engineering",
  "scenario-comparison",
  "battery-energy-flow",
]);

function instrumentIdFor(index: number): ObservatoryInstrumentId {
  return `I${String(index + 1).padStart(2, "0")}` as ObservatoryInstrumentId;
}

export const OBSERVATORY_INSTRUMENT_MOUNTS:
readonly ObservatoryInstrumentMount[] = Object.freeze(
  OBSERVATORY_POSITIONS.map((position) => {
    const instrumentKey =
      MOUNTED_INSTRUMENT_KEYS[position.index] ?? null;
    const mountStatus: ObservatoryInstrumentMountStatus =
      instrumentKey
        ? "mounted"
        : position.index < OBSERVATORY_ACTIVE_POSITION_COUNT
          ? "placeholder"
          : "reserved";
    const implementationStatus: ObservatoryInstrumentImplementationStatus =
      mountStatus === "mounted"
        ? "implemented"
        : mountStatus === "placeholder"
          ? "planned"
          : "reserved";

    return Object.freeze({
      instrumentId: instrumentIdFor(position.index),
      position,
      mountStatus,
      implementationStatus,
      instrumentKey,
    }) satisfies ObservatoryInstrumentMount;
  }),
);

export function instrumentMountAtPosition(
  positionIndex: number,
): ObservatoryInstrumentMount | null {
  if (
    !Number.isInteger(positionIndex)
    || positionIndex < 0
    || positionIndex >= OBSERVATORY_INSTRUMENT_MOUNTS.length
  ) {
    return null;
  }
  return OBSERVATORY_INSTRUMENT_MOUNTS[positionIndex] ?? null;
}
