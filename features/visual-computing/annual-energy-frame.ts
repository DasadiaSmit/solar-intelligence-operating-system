import type {
  SceneLifecycle,
} from "./scene-frame";

export const ANNUAL_ENERGY_FRAME_SCHEMA_VERSION = "1.0.0" as const;
export const ANNUAL_ENERGY_RECORD_COUNT = 8_760 as const;

export type AnnualEnergyHemisphere = "northern" | "southern";
export type MeteorologicalSeason =
  | "winter"
  | "spring"
  | "summer"
  | "autumn";

export interface UnavailableAnnualEnergyLayerV1 {
  readonly status: "unavailable";
  readonly reason: string;
  readonly value: null;
}

export interface AnnualEnergyFrameV1 {
  readonly schemaVersion: typeof ANNUAL_ENERGY_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly lifecycle: SceneLifecycle;
  readonly calendar: {
    readonly startTimestampUtc: string;
    readonly endTimestampUtc: string;
    readonly intervalSeconds: 3600;
    readonly recordCount: typeof ANNUAL_ENERGY_RECORD_COUNT;
    readonly calendarYearUtc: number;
    readonly noLeap: true;
    readonly hemisphere: AnnualEnergyHemisphere;
  };
  readonly series: {
    readonly generationAcKWh: readonly number[];
    readonly qualityScores: readonly number[];
  };
  readonly summary: {
    readonly capacityKwDc: number;
    readonly peakAcKw: number;
    readonly annualGenerationKWh: number;
    readonly specificYieldKWhPerKwp: number;
    readonly annualMeanQualityScore: number;
  };
  readonly monthly: readonly {
    readonly month: number;
    readonly generationKWh: number;
  }[];
  readonly seasons: readonly {
    readonly season: MeteorologicalSeason;
    readonly months: readonly number[];
    readonly generationKWh: number;
  }[];
  readonly empiricalSpread: {
    readonly basis: "four-source-year-annual-generation";
    readonly quantileMethod:
      "linear-interpolation-between-ordered-values";
    readonly sourceYears: readonly number[];
    readonly sourceAnnualGenerationKWh: readonly number[];
    readonly p10KWh: number;
    readonly p50KWh: number;
    readonly p90KWh: number;
    readonly calibratedProbabilisticInterval: false;
    readonly forecastGuarantee: false;
  };
  readonly representativeYear: {
    readonly id: string;
    readonly method: string;
    readonly sourceYears: readonly number[];
  };
  readonly units: {
    readonly intervalEnergy: "kWh/1h";
    readonly annualEnergy: "kWh";
    readonly peakPower: "kW";
    readonly arrayCapacity: "kW DC";
    readonly specificYield: "kWh/kWp";
    readonly quality: "fraction";
  };
  readonly provenance: {
    readonly provider: string;
    readonly datasetVersion: string;
    readonly calculationVersion: string;
    readonly evidenceRefIds: readonly string[];
  };
  readonly unavailableLayers: {
    readonly measuredOrLivePlantOutput:
      UnavailableAnnualEnergyLayerV1;
    readonly issuedFutureForecast: UnavailableAnnualEnergyLayerV1;
    readonly intraHourVariation: UnavailableAnnualEnergyLayerV1;
    readonly spatialGenerationField: UnavailableAnnualEnergyLayerV1;
    readonly causalClimateAttribution: UnavailableAnnualEnergyLayerV1;
  };
}

export type AnnualEnergyFrameUnavailableReason =
  | "invalid-result-id"
  | "invalid-lifecycle"
  | "invalid-annual-calendar"
  | "invalid-hourly-energy"
  | "invalid-hourly-quality"
  | "invalid-annual-summary"
  | "invalid-monthly-summary"
  | "invalid-seasonality"
  | "invalid-empirical-spread"
  | "missing-representative-year"
  | "missing-provenance";

export type AnnualEnergyFrameBuildResult =
  | {
      readonly status: "ready";
      readonly frame: AnnualEnergyFrameV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: AnnualEnergyFrameUnavailableReason;
      readonly summary: string;
    };

export function deepFreezeAnnualEnergyFrame(
  frame: AnnualEnergyFrameV1,
): AnnualEnergyFrameV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(frame);
  return frame;
}
