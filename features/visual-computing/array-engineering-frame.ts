import type {
  ArrayConfig,
  DataQualityLevel,
  GenerationHour,
  HourlyOperatingPoint,
  LossChainItem,
  LossConfig,
  OperatingSummary,
  PlaneOfArrayIrradiance,
  SolarPosition,
} from "@/lib/contracts";
import type {
  EnuVectorV1,
  SceneLifecycle,
} from "./scene-frame";

export const ARRAY_ENGINEERING_FRAME_SCHEMA_VERSION = "1.0.0" as const;
export const ARRAY_ENGINEERING_LINKED_DAY_SAMPLE_COUNT = 24 as const;
export const ARRAY_ENGINEERING_ANNUAL_RECORD_COUNT = 8_760 as const;

export const ARRAY_ENGINEERING_LOSS_KEYS = Object.freeze([
  "horizon",
  "shading",
  "soiling",
  "dust",
  "snow",
  "mismatch",
  "wiring",
  "strings",
  "availability",
  "curtailment",
] as const satisfies readonly (keyof LossConfig)[]);

export const ARRAY_ENGINEERING_SCREENING_CONTROLS = Object.freeze([
  "capacityKwDc",
  "tiltDeg",
  "azimuthDeg",
  "aggregateSystemLossPct",
] as const);

export type ArrayEngineeringScreeningControl =
  typeof ARRAY_ENGINEERING_SCREENING_CONTROLS[number];

export const ARRAY_ENGINEERING_LOSS_CHAIN_STAGE_IDS = Object.freeze([
  "temperature",
  "horizon",
  "shading",
  "soiling",
  "dust",
  "snow",
  "mismatch",
  "wiring",
  "strings",
  "availability",
  "degradation",
  "inverter",
  "clipping",
] as const);

export interface UnavailableArrayEngineeringLayerV1 {
  readonly status: "unavailable";
  readonly reason: string;
  readonly value: null;
}

export interface ArrayEngineeringQualityV1 {
  readonly score: number;
  readonly level: DataQualityLevel;
  readonly completeness: number;
  readonly imputed: boolean;
  readonly flags: readonly string[];
}

export interface ArrayEngineeringSunSampleV1 {
  readonly index: number;
  readonly timestampUtc: string;
  readonly position: Readonly<SolarPosition>;
  readonly directionEnu: EnuVectorV1;
}

export interface ArrayEngineeringFrameV1 {
  readonly schemaVersion: typeof ARRAY_ENGINEERING_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly lifecycle: SceneLifecycle;
  readonly linkedInterval: {
    readonly selectedIndex: number;
    readonly timestampUtc: string;
    readonly intervalSeconds: 3600;
  };
  readonly coordinateFrame: {
    readonly name: "ENU";
    readonly azimuthConvention: "clockwise-from-true-north";
    readonly rendererMapping: "three-x-east-y-up-z-negative-north";
  };
  readonly configurationBoundary: {
    readonly kind: "fixed-base-configured";
    readonly authoritativeServerRecalculationRequired: true;
    readonly bankableYieldAssessment: false;
  };
  readonly screening: {
    readonly status: "screening-only";
    readonly supportedHtmlControls:
      readonly ArrayEngineeringScreeningControl[];
    readonly aggregateSystemLossPct: number;
    readonly aggregateMethod:
      "multiplicative-configured-inputs-with-0.95-per-factor-screening-cap";
    readonly authoritativeServerRecalculationRequired: true;
    readonly bankableYieldAssessment: false;
  };
  readonly array: {
    readonly configured: Readonly<ArrayConfig>;
    readonly resolved: {
      readonly tiltDeg: number;
      readonly azimuthDeg: number;
    };
  };
  readonly sun: {
    readonly source: "authoritative-linked-hour";
    readonly directionBasis: "apparent-elevation-and-azimuth";
    readonly position: Readonly<SolarPosition>;
    readonly directionEnu: EnuVectorV1;
    readonly linkedUtcDayPath:
      readonly ArrayEngineeringSunSampleV1[];
    readonly arrayConfigurationAffectsSunPath: false;
  };
  readonly weather: Readonly<HourlyOperatingPoint["weather"]>;
  readonly irradiance: Readonly<PlaneOfArrayIrradiance>;
  readonly generation: Readonly<GenerationHour>;
  readonly quality: ArrayEngineeringQualityV1;
  readonly configuredLosses: Readonly<LossConfig>;
  readonly annual: {
    readonly summary: Readonly<OperatingSummary>;
    readonly lossChain: readonly Readonly<LossChainItem>[];
  };
  readonly provenance: {
    readonly provider: string;
    readonly datasetVersion: string;
    readonly calculationVersion: string;
    readonly evidenceRefIds: readonly string[];
  };
  readonly unavailableLayers: {
    readonly moduleCountAndRating:
      UnavailableArrayEngineeringLayerV1;
    readonly physicalArrayAndRowGeometry:
      UnavailableArrayEngineeringLayerV1;
    readonly namedInverterAndCurve:
      UnavailableArrayEngineeringLayerV1;
    readonly moduleEfficiency:
      UnavailableArrayEngineeringLayerV1;
    readonly editableInverterEfficiency:
      UnavailableArrayEngineeringLayerV1;
    readonly physicalShadowField:
      UnavailableArrayEngineeringLayerV1;
    readonly terrain: UnavailableArrayEngineeringLayerV1;
    readonly surveyedHorizon:
      UnavailableArrayEngineeringLayerV1;
    readonly candidateHourlyProduction:
      UnavailableArrayEngineeringLayerV1;
    readonly measuredOrLiveOutput:
      UnavailableArrayEngineeringLayerV1;
    readonly authoritativeClientSideRecalculation:
      UnavailableArrayEngineeringLayerV1;
  };
}

export const ARRAY_ENGINEERING_UNAVAILABLE_LAYER_KEYS = Object.freeze([
  "moduleCountAndRating",
  "physicalArrayAndRowGeometry",
  "namedInverterAndCurve",
  "moduleEfficiency",
  "editableInverterEfficiency",
  "physicalShadowField",
  "terrain",
  "surveyedHorizon",
  "candidateHourlyProduction",
  "measuredOrLiveOutput",
  "authoritativeClientSideRecalculation",
] as const satisfies readonly (
  keyof ArrayEngineeringFrameV1["unavailableLayers"]
)[]);

export type ArrayEngineeringFrameUnavailableReason =
  | "invalid-result-id"
  | "invalid-lifecycle"
  | "missing-linked-hour"
  | "invalid-linked-time"
  | "invalid-linked-day"
  | "invalid-array-configuration"
  | "invalid-loss-configuration"
  | "invalid-sun-position"
  | "invalid-linked-physics"
  | "invalid-quality"
  | "invalid-annual-summary"
  | "invalid-loss-chain"
  | "missing-provenance";

export type ArrayEngineeringFrameBuildResult =
  | {
      readonly status: "ready";
      readonly frame: ArrayEngineeringFrameV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: ArrayEngineeringFrameUnavailableReason;
      readonly summary: string;
    };

/**
 * Matches the existing HTML scenario screen exactly. This is a presentation
 * screening scalar, not a substitute for the configured component loss chain
 * or a STAR Engine recalculation.
 */
export function configuredAggregateSystemLossPct(
  losses: Readonly<LossConfig>,
): number {
  const retained = ARRAY_ENGINEERING_LOSS_KEYS.reduce(
    (product, key) =>
      product * (1 - Math.min(0.95, Math.max(0, losses[key]))),
    1,
  );
  return (1 - retained) * 100;
}

export function arrayEngineeringNumbersReconcile(
  first: number,
  second: number,
): boolean {
  const tolerance = Math.max(
    1e-8,
    Math.max(Math.abs(first), Math.abs(second)) * 1e-10,
  );
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= tolerance;
}

export function arrayEngineeringIrradianceReconciles(
  actual: Readonly<PlaneOfArrayIrradiance>,
  canonical: Readonly<PlaneOfArrayIrradiance>,
): boolean {
  return [
    "globalWm2",
    "directWm2",
    "diffuseWm2",
    "reflectedWm2",
    "rearWm2",
    "effectiveWm2",
    "angleOfIncidenceDeg",
    "incidenceAngleModifier",
    "resolvedTiltDeg",
    "resolvedAzimuthDeg",
  ].every((key) =>
    arrayEngineeringNumbersReconcile(
      actual[key as keyof PlaneOfArrayIrradiance],
      canonical[key as keyof PlaneOfArrayIrradiance],
    ));
}

export function arrayEngineeringGenerationReconciles(
  actual: Readonly<GenerationHour>,
  canonical: Readonly<GenerationHour>,
): boolean {
  const generationMatches = [
    "cellTemperatureC",
    "idealDcKWh",
    "dcKWh",
    "acKWh",
    "acCapacityKw",
    "performanceRatio",
  ].every((key) =>
    arrayEngineeringNumbersReconcile(
      actual[key as Exclude<keyof GenerationHour, "losses">] as number,
      canonical[key as Exclude<keyof GenerationHour, "losses">] as number,
    ));
  const lossMatches = [
    "temperature",
    "horizon",
    "shading",
    "soiling",
    "dust",
    "snow",
    "mismatch",
    "wiring",
    "strings",
    "availability",
    "degradation",
    "inverter",
    "clippingKWh",
  ].every((key) =>
    arrayEngineeringNumbersReconcile(
      actual.losses[key as keyof GenerationHour["losses"]],
      canonical.losses[key as keyof GenerationHour["losses"]],
    ));
  return generationMatches && lossMatches;
}

export function validArrayEngineeringWeatherCalendar(
  weather: Readonly<HourlyOperatingPoint["weather"]>,
): boolean {
  const timestampMs = Date.parse(weather.timestamp);
  const sourceTimestampMs = Date.parse(weather.sourceTimestamp);
  if (
    !Number.isFinite(timestampMs)
    || !Number.isFinite(sourceTimestampMs)
    || new Date(timestampMs).toISOString() !== weather.timestamp
    || new Date(sourceTimestampMs).toISOString() !== weather.sourceTimestamp
  ) {
    return false;
  }
  const timestamp = new Date(timestampMs);
  const sourceTimestamp = new Date(sourceTimestampMs);
  const yearStartMs = Date.UTC(timestamp.getUTCFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((Date.UTC(
      timestamp.getUTCFullYear(),
      timestamp.getUTCMonth(),
      timestamp.getUTCDate(),
    ) - yearStartMs) / 86_400_000) + 1;
  return Number.isInteger(weather.sourceYear)
    && weather.sourceYear === sourceTimestamp.getUTCFullYear()
    && Number.isInteger(weather.dayOfYear)
    && weather.dayOfYear === dayOfYear
    && Number.isInteger(weather.month)
    && weather.month === timestamp.getUTCMonth() + 1
    && Number.isInteger(weather.day)
    && weather.day === timestamp.getUTCDate()
    && Number.isInteger(weather.hour)
    && weather.hour === timestamp.getUTCHours();
}

export function validArrayEngineeringLossChain(
  chain: readonly Readonly<LossChainItem>[],
): boolean {
  if (chain.length !== ARRAY_ENGINEERING_LOSS_CHAIN_STAGE_IDS.length) {
    return false;
  }
  for (let index = 0; index < chain.length; index += 1) {
    const item = chain[index];
    const previous = chain[index - 1];
    const stageId = ARRAY_ENGINEERING_LOSS_CHAIN_STAGE_IDS[index];
    if (
      !item
      || item.id !== stageId
      || item.status !== "implemented"
      || item.label.trim().length === 0
      || item.explanation.trim().length === 0
      || !Number.isFinite(item.inputKWh)
      || item.inputKWh < 0
      || !Number.isFinite(item.outputKWh)
      || item.outputKWh < 0
      || !Number.isFinite(item.lossKWh)
      || item.lossKWh < 0
      || !Number.isFinite(item.lossPct)
      || item.lossPct < 0
      || item.lossPct > 100
      || (
        previous
        && !arrayEngineeringNumbersReconcile(
          item.inputKWh,
          previous.outputKWh,
        )
      )
    ) {
      return false;
    }
    const minimumOutput =
      stageId === "temperature" ? item.inputKWh * 0.65 : 0;
    const maximumOutput =
      stageId === "temperature" ? item.inputKWh * 1.08 : item.inputKWh;
    if (
      item.outputKWh < minimumOutput - 1e-8
      || item.outputKWh > maximumOutput + 1e-8
      || !arrayEngineeringNumbersReconcile(
        item.lossKWh,
        Math.max(0, item.inputKWh - item.outputKWh),
      )
      || !arrayEngineeringNumbersReconcile(
        item.lossPct,
        item.inputKWh > 0
          ? Math.max(0, (1 - item.outputKWh / item.inputKWh) * 100)
          : 0,
      )
    ) {
      return false;
    }
  }
  return true;
}

export function deepFreezeArrayEngineeringFrame(
  frame: ArrayEngineeringFrameV1,
): ArrayEngineeringFrameV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(frame);
  return frame;
}
