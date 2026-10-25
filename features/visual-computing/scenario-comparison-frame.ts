import type {
  LifecycleStatus,
  TariffConfig,
} from "@/lib/contracts";
import {
  DETERMINISTIC_STRESS_SCENARIO_CATALOG,
  type DeterministicStressScenarioId,
} from "@/lib/optimisation/stress-scenario-catalog";
import type { SceneLifecycle } from "./scene-frame";

export const SCENARIO_COMPARISON_FRAME_SCHEMA_VERSION = "1.0.0" as const;
export const SCENARIO_COMPARISON_ANNUAL_RECORD_COUNT = 8_760 as const;
export const SCENARIO_COMPARISON_BASELINE_ID =
  "configured-baseline" as const;
export const SCENARIO_COMPARISON_CHAMBER_COUNT =
  DETERMINISTIC_STRESS_SCENARIO_CATALOG.length + 1;

export type ScenarioComparisonChamberId =
  | typeof SCENARIO_COMPARISON_BASELINE_ID
  | DeterministicStressScenarioId;

export interface UnavailableScenarioComparisonLayerV1 {
  readonly status: "unavailable";
  readonly reason: string;
  readonly value: null;
}

export interface ScenarioComparisonChamberV1 {
  readonly id: ScenarioComparisonChamberId;
  readonly order: number;
  readonly role: "baseline" | "stress";
  readonly status: "simulated";
  readonly label: string;
  readonly explanation: string;
  readonly annualGenerationKWh: number;
  readonly netEnergyValue: number;
  readonly localSupplyPct: number;
  readonly generationDeltaPct: number;
  readonly energyValueDeltaPct: number;
  readonly localSupplyDeltaPercentagePoints: number;
  readonly generationIndexRelativeToBaseline: number;
  readonly evidenceRefIds: readonly string[];
}

export interface ScenarioComparisonFrameV1 {
  readonly schemaVersion:
    typeof SCENARIO_COMPARISON_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly lifecycle: SceneLifecycle;
  readonly comparisonBoundary: {
    readonly mode: "stress-summary";
    readonly kind:
      "configured-baseline-vs-deterministic-stress-results";
    readonly source: "canonical-optimisation-stress-record";
    readonly deterministic: true;
    readonly parallelPresentation: true;
    readonly sameTimestampComparison: false;
    readonly parallelWeatherWorlds: false;
    readonly hourlyStressResultsAvailable: false;
    readonly independentProbabilitiesAvailable: false;
    readonly issuedForecast: false;
    readonly bankableAssessment: false;
  };
  readonly chronology: {
    readonly recordCount:
      typeof SCENARIO_COMPARISON_ANNUAL_RECORD_COUNT;
    readonly intervalSeconds: 3_600;
    readonly calendar: "contiguous-no-leap-utc-year";
  };
  readonly metricDefinitions: {
    readonly generationDelta:
      "percent-of-configured-baseline-annual-generation";
    readonly energyValueDelta:
      "percent-of-absolute-configured-baseline-net-energy-value";
    readonly energyValueCurrency: TariffConfig["currency"];
    readonly energyValuePeriod: "annual";
    readonly localSupplyDelta: "percentage-points";
    readonly legacySourceField:
      "reliabilityDeltaPct-calculates-local-supply-delta";
  };
  readonly optimisation: {
    readonly status: LifecycleStatus;
    readonly method: string;
    readonly objective: string;
    readonly baselineCandidateId: string;
  };
  readonly annualQualityScore: number;
  readonly chambers: readonly ScenarioComparisonChamberV1[];
  readonly visualEncoding: {
    readonly kind:
      "signed-generation-delta-normalized-to-largest-absolute-delta";
    readonly zeroDeltaResponse: 0.5;
    readonly responseRange: readonly [0, 1];
    readonly physicalWeatherGeometry: false;
    readonly probabilityEncoding: false;
    readonly exactValuesRemainHtml: true;
  };
  readonly provenance: {
    readonly provider: string;
    readonly datasetVersion: string;
    readonly calculationVersion: string;
    readonly scenarioVersion: string;
    readonly evidenceRefIds: readonly string[];
  };
  readonly unavailableLayers: {
    readonly sunnyAndCloudyParallelRuns:
      UnavailableScenarioComparisonLayerV1;
    readonly dustEventDynamics:
      UnavailableScenarioComparisonLayerV1;
    readonly hourlyStressTrajectories:
      UnavailableScenarioComparisonLayerV1;
    readonly scenarioProbabilities:
      UnavailableScenarioComparisonLayerV1;
    readonly stormDamageAndStructuralRisk:
      UnavailableScenarioComparisonLayerV1;
    readonly heatwaveThresholdAndAttribution:
      UnavailableScenarioComparisonLayerV1;
    readonly stormMeteorology:
      UnavailableScenarioComparisonLayerV1;
    readonly spatialMicroclimateTerrainAndShadows:
      UnavailableScenarioComparisonLayerV1;
    readonly measuredOrLiveResponse:
      UnavailableScenarioComparisonLayerV1;
    readonly issuedForecast:
      UnavailableScenarioComparisonLayerV1;
  };
}

export const SCENARIO_COMPARISON_UNAVAILABLE_LAYER_KEYS = Object.freeze([
  "sunnyAndCloudyParallelRuns",
  "dustEventDynamics",
  "hourlyStressTrajectories",
  "scenarioProbabilities",
  "stormDamageAndStructuralRisk",
  "heatwaveThresholdAndAttribution",
  "stormMeteorology",
  "spatialMicroclimateTerrainAndShadows",
  "measuredOrLiveResponse",
  "issuedForecast",
] as const satisfies readonly (
  keyof ScenarioComparisonFrameV1["unavailableLayers"]
)[]);

export type ScenarioComparisonFrameUnavailableReason =
  | "invalid-result-id"
  | "invalid-lifecycle"
  | "invalid-chronology"
  | "invalid-optimisation-record"
  | "invalid-baseline"
  | "invalid-stress-scenarios"
  | "stress-scenario-reconciliation-failed"
  | "missing-provenance";

export type ScenarioComparisonFrameBuildResult =
  | {
      readonly status: "ready";
      readonly frame: ScenarioComparisonFrameV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: ScenarioComparisonFrameUnavailableReason;
      readonly summary: string;
    };

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const VALID_OPTIMISATION_STATUSES = new Set<LifecycleStatus>([
  "implemented",
  "experimental",
  "simulated",
  "planned",
]);

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function within(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return Number.isFinite(value)
    && value >= minimum
    && value <= maximum;
}

export function scenarioComparisonNumbersReconcile(
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

function validUnavailableLayer(
  layer: UnavailableScenarioComparisonLayerV1,
): boolean {
  return layer.status === "unavailable"
    && layer.value === null
    && nonEmpty(layer.reason);
}

function expectedChamberMetadata(order: number): {
  readonly id: ScenarioComparisonChamberId;
  readonly label: string;
  readonly explanation: string;
  readonly role: ScenarioComparisonChamberV1["role"];
} | null {
  if (order === 0) {
    return {
      id: SCENARIO_COMPARISON_BASELINE_ID,
      label: "Configured baseline",
      explanation:
        "Canonical configured annual result used as the common comparison reference.",
      role: "baseline",
    };
  }
  const scenario = DETERMINISTIC_STRESS_SCENARIO_CATALOG[order - 1];
  return scenario
    ? {
        id: scenario.id,
        label: scenario.label,
        explanation: scenario.explanation,
        role: "stress",
      }
    : null;
}

function validChamberMetadata(
  chamber: ScenarioComparisonChamberV1,
  order: number,
): boolean {
  const expected = expectedChamberMetadata(order);
  return Boolean(
    expected
    && chamber.id === expected.id
    && chamber.order === order
    && chamber.role === expected.role
    && chamber.status === "simulated"
    && chamber.label === expected.label
    && chamber.explanation === expected.explanation
    && chamber.evidenceRefIds.length === 3
    && new Set(chamber.evidenceRefIds).size === 3
    && chamber.evidenceRefIds.every(nonEmpty)
    && within(chamber.annualGenerationKWh, 0, Number.MAX_VALUE)
    && Number.isFinite(chamber.netEnergyValue)
    && within(chamber.localSupplyPct, 0, 100)
    && within(chamber.generationDeltaPct, -100, 10_000)
    && within(chamber.energyValueDeltaPct, -10_000, 10_000)
    && within(
      chamber.localSupplyDeltaPercentagePoints,
      -100,
      100,
    )
    && within(
      chamber.generationIndexRelativeToBaseline,
      0,
      101,
    ),
  );
}

export function validScenarioComparisonFrame(
  frame: ScenarioComparisonFrameV1,
): boolean {
  const {
    chambers,
    comparisonBoundary,
    chronology,
    metricDefinitions,
    optimisation,
    provenance,
    unavailableLayers,
    visualEncoding,
  } = frame;
  if (
    frame.schemaVersion !== SCENARIO_COMPARISON_FRAME_SCHEMA_VERSION
    || !nonEmpty(frame.resultId)
    || !VALID_LIFECYCLES.has(frame.lifecycle)
    || comparisonBoundary.mode !== "stress-summary"
    || comparisonBoundary.kind
      !== "configured-baseline-vs-deterministic-stress-results"
    || comparisonBoundary.source
      !== "canonical-optimisation-stress-record"
    || comparisonBoundary.deterministic !== true
    || comparisonBoundary.parallelPresentation !== true
    || comparisonBoundary.sameTimestampComparison !== false
    || comparisonBoundary.parallelWeatherWorlds !== false
    || comparisonBoundary.hourlyStressResultsAvailable !== false
    || comparisonBoundary.independentProbabilitiesAvailable !== false
    || comparisonBoundary.issuedForecast !== false
    || comparisonBoundary.bankableAssessment !== false
    || chronology.recordCount
      !== SCENARIO_COMPARISON_ANNUAL_RECORD_COUNT
    || chronology.intervalSeconds !== 3_600
    || chronology.calendar !== "contiguous-no-leap-utc-year"
    || metricDefinitions.generationDelta
      !== "percent-of-configured-baseline-annual-generation"
    || metricDefinitions.energyValueDelta
      !== "percent-of-absolute-configured-baseline-net-energy-value"
    || !["GBP", "EUR", "USD"].includes(
      metricDefinitions.energyValueCurrency,
    )
    || metricDefinitions.energyValuePeriod !== "annual"
    || metricDefinitions.localSupplyDelta !== "percentage-points"
    || metricDefinitions.legacySourceField
      !== "reliabilityDeltaPct-calculates-local-supply-delta"
    || !VALID_OPTIMISATION_STATUSES.has(optimisation.status)
    || !nonEmpty(optimisation.method)
    || !nonEmpty(optimisation.objective)
    || !nonEmpty(optimisation.baselineCandidateId)
    || !within(frame.annualQualityScore, 0, 1)
    || chambers.length !== SCENARIO_COMPARISON_CHAMBER_COUNT
    || visualEncoding.kind
      !== "signed-generation-delta-normalized-to-largest-absolute-delta"
    || visualEncoding.zeroDeltaResponse !== 0.5
    || visualEncoding.responseRange.length !== 2
    || visualEncoding.responseRange[0] !== 0
    || visualEncoding.responseRange[1] !== 1
    || visualEncoding.physicalWeatherGeometry !== false
    || visualEncoding.probabilityEncoding !== false
    || visualEncoding.exactValuesRemainHtml !== true
    || !nonEmpty(provenance.provider)
    || !nonEmpty(provenance.datasetVersion)
    || !nonEmpty(provenance.calculationVersion)
    || !nonEmpty(provenance.scenarioVersion)
    || provenance.evidenceRefIds.length === 0
    || new Set(provenance.evidenceRefIds).size
      !== provenance.evidenceRefIds.length
    || !provenance.evidenceRefIds.every(nonEmpty)
    || Object.keys(unavailableLayers).length
      !== SCENARIO_COMPARISON_UNAVAILABLE_LAYER_KEYS.length
    || SCENARIO_COMPARISON_UNAVAILABLE_LAYER_KEYS.some(
      (key) => !validUnavailableLayer(unavailableLayers[key]),
    )
  ) {
    return false;
  }

  const baseline = chambers[0];
  if (
    !baseline
    || !validChamberMetadata(baseline, 0)
    || baseline.annualGenerationKWh <= 0
    || !scenarioComparisonNumbersReconcile(
      baseline.generationDeltaPct,
      0,
    )
    || !scenarioComparisonNumbersReconcile(
      baseline.energyValueDeltaPct,
      0,
    )
    || !scenarioComparisonNumbersReconcile(
      baseline.localSupplyDeltaPercentagePoints,
      0,
    )
    || !scenarioComparisonNumbersReconcile(
      baseline.generationIndexRelativeToBaseline,
      1,
    )
  ) {
    return false;
  }

  for (let order = 1; order < chambers.length; order += 1) {
    const chamber = chambers[order];
    if (!chamber || !validChamberMetadata(chamber, order)) return false;
    const expectedGeneration =
      baseline.annualGenerationKWh
      * (1 + chamber.generationDeltaPct / 100);
    const expectedValue =
      baseline.netEnergyValue
      + Math.abs(baseline.netEnergyValue)
        * chamber.energyValueDeltaPct / 100;
    const expectedLocalSupply =
      baseline.localSupplyPct
      + chamber.localSupplyDeltaPercentagePoints;
    const expectedGenerationIndex =
      chamber.annualGenerationKWh / baseline.annualGenerationKWh;
    if (
      !scenarioComparisonNumbersReconcile(
        chamber.annualGenerationKWh,
        expectedGeneration,
      )
      || !scenarioComparisonNumbersReconcile(
        chamber.netEnergyValue,
        expectedValue,
      )
      || !scenarioComparisonNumbersReconcile(
        chamber.localSupplyPct,
        expectedLocalSupply,
      )
      || !scenarioComparisonNumbersReconcile(
        chamber.generationIndexRelativeToBaseline,
        expectedGenerationIndex,
      )
    ) {
      return false;
    }
  }
  return true;
}

export function deepFreezeScenarioComparisonFrame(
  frame: ScenarioComparisonFrameV1,
): ScenarioComparisonFrameV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return;
    }
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(frame);
  return frame;
}
