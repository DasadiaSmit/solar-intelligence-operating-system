import type {
  HourlyOperatingPoint,
  OperatingSnapshot,
  OptimisationCandidate,
  StressScenarioResult,
  WeatherHour,
} from "@/lib/contracts";
import {
  evaluateConfiguredStressComparison,
} from "@/lib/optimisation/system";
import {
  DETERMINISTIC_STRESS_SCENARIO_CATALOG,
} from "@/lib/optimisation/stress-scenario-catalog";
import {
  SCENARIO_COMPARISON_ANNUAL_RECORD_COUNT,
  SCENARIO_COMPARISON_BASELINE_ID,
  SCENARIO_COMPARISON_FRAME_SCHEMA_VERSION,
  deepFreezeScenarioComparisonFrame,
  scenarioComparisonNumbersReconcile,
  validScenarioComparisonFrame,
  type ScenarioComparisonChamberV1,
  type ScenarioComparisonFrameBuildResult,
  type ScenarioComparisonFrameUnavailableReason,
  type ScenarioComparisonFrameV1,
  type UnavailableScenarioComparisonLayerV1,
} from "./scenario-comparison-frame";
import type { SceneLifecycle } from "./scene-frame";

export interface BuildScenarioComparisonFrameOptions {
  readonly snapshot: OperatingSnapshot;
  readonly resultId: string;
  readonly lifecycle: SceneLifecycle;
}

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const OPTIMISATION_CANDIDATE_NUMERIC_KEYS = Object.freeze([
  "tiltDeg",
  "azimuthDeg",
  "dcAcRatio",
  "batteryKWh",
  "annualGenerationKWh",
  "selfConsumptionPct",
  "revenue",
  "carbonAvoidedKg",
  "curtailedKWh",
  "score",
] as const satisfies readonly (
  keyof OptimisationCandidate
)[]);
const STRESS_NUMERIC_KEYS = Object.freeze([
  "generationDeltaPct",
  "revenueDeltaPct",
  "reliabilityDeltaPct",
] as const satisfies readonly (keyof StressScenarioResult)[]);

function failed(
  reason: ScenarioComparisonFrameUnavailableReason,
  summary: string,
): ScenarioComparisonFrameBuildResult {
  return Object.freeze({ status: "unavailable", reason, summary });
}

function unavailable(
  reason: string,
): UnavailableScenarioComparisonLayerV1 {
  return Object.freeze({ status: "unavailable", reason, value: null });
}

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

function validIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
}

function validQuality(
  quality: HourlyOperatingPoint["quality"],
): boolean {
  return within(quality.score, 0, 1)
    && within(quality.completeness, 0, 1)
    && typeof quality.imputed === "boolean"
    && quality.flags.every(nonEmpty);
}

function validWeatherValues(
  weather: HourlyOperatingPoint["weather"],
): boolean {
  return [
    weather.temperatureC,
    weather.windSpeedMps,
    weather.relativeHumidityPct,
    weather.cloudCoverPct,
    weather.precipitationMm,
    weather.snowDepthCm,
    weather.surfacePressureHpa,
    weather.albedo,
    weather.ghiWm2,
    weather.dniWm2,
    weather.dhiWm2,
  ].every(Number.isFinite)
    && within(weather.relativeHumidityPct, 0, 100)
    && within(weather.cloudCoverPct, 0, 100)
    && weather.precipitationMm >= 0
    && weather.snowDepthCm >= 0
    && weather.ghiWm2 >= 0
    && weather.dniWm2 >= 0
    && weather.dhiWm2 >= 0
    && within(weather.albedo, 0, 1);
}

function canonicalWeather(
  hourly: readonly HourlyOperatingPoint[],
): WeatherHour[] | null {
  if (hourly.length !== SCENARIO_COMPARISON_ANNUAL_RECORD_COUNT) {
    return null;
  }
  const first = hourly[0];
  const last = hourly.at(-1);
  if (
    !first
    || !last
    || !validIsoTimestamp(first.timestamp)
    || !validIsoTimestamp(last.timestamp)
  ) {
    return null;
  }
  const firstTime = Date.parse(first.timestamp);
  const firstDate = new Date(firstTime);
  const lastDate = new Date(Date.parse(last.timestamp));
  if (
    firstDate.getUTCMonth() !== 0
    || firstDate.getUTCDate() !== 1
    || firstDate.getUTCHours() !== 0
    || lastDate.getUTCFullYear() !== firstDate.getUTCFullYear()
    || lastDate.getUTCMonth() !== 11
    || lastDate.getUTCDate() !== 31
    || lastDate.getUTCHours() !== 23
  ) {
    return null;
  }

  const weather: WeatherHour[] = [];
  for (let index = 0; index < hourly.length; index += 1) {
    const point = hourly[index];
    if (!point) return null;
    const expectedTime = firstTime + index * 3_600_000;
    const timestamp = new Date(expectedTime);
    if (
      point.index !== index
      || !validIsoTimestamp(point.timestamp)
      || Date.parse(point.timestamp) !== expectedTime
      || point.month !== timestamp.getUTCMonth() + 1
      || point.day !== timestamp.getUTCDate()
      || point.hour !== timestamp.getUTCHours()
      || point.weather.timestamp !== point.timestamp
      || point.weather.month !== point.month
      || point.weather.day !== point.day
      || point.weather.hour !== point.hour
      || !validIsoTimestamp(point.weather.sourceTimestamp)
      || !validWeatherValues(point.weather)
      || !validQuality(point.quality)
    ) {
      return null;
    }
    weather.push({
      ...point.weather,
      quality: { ...point.quality, flags: [...point.quality.flags] },
    });
  }
  return weather;
}

function candidateReconciles(
  actual: OptimisationCandidate,
  canonical: OptimisationCandidate,
): boolean {
  return actual.id === canonical.id
    && OPTIMISATION_CANDIDATE_NUMERIC_KEYS.every((key) =>
      scenarioComparisonNumbersReconcile(
        actual[key] as number,
        canonical[key] as number,
      ));
}

function stressReconciles(
  actual: StressScenarioResult,
  canonical: StressScenarioResult,
): boolean {
  return actual.id === canonical.id
    && actual.label === canonical.label
    && actual.status === canonical.status
    && actual.explanation === canonical.explanation
    && STRESS_NUMERIC_KEYS.every((key) =>
      scenarioComparisonNumbersReconcile(
        actual[key] as number,
        canonical[key] as number,
      ));
}

function chamberEvidence(
  resultId: string,
  chamberId: string,
): readonly string[] {
  return Object.freeze([
    `evidence:${resultId}:scenario.${chamberId}.annual-generation`,
    `evidence:${resultId}:scenario.${chamberId}.net-energy-value`,
    `evidence:${resultId}:scenario.${chamberId}.local-supply`,
  ]);
}

function stressChamber(
  resultId: string,
  baseline: ScenarioComparisonChamberV1,
  stress: StressScenarioResult,
  order: number,
): ScenarioComparisonChamberV1 {
  const annualGenerationKWh =
    baseline.annualGenerationKWh
    * (1 + stress.generationDeltaPct / 100);
  const netEnergyValue =
    baseline.netEnergyValue
    + Math.abs(baseline.netEnergyValue)
      * stress.revenueDeltaPct / 100;
  const localSupplyPct =
    baseline.localSupplyPct + stress.reliabilityDeltaPct;
  return {
    id: stress.id as ScenarioComparisonChamberV1["id"],
    order,
    role: "stress",
    status: "simulated",
    label: stress.label,
    explanation: stress.explanation,
    annualGenerationKWh,
    netEnergyValue,
    localSupplyPct,
    generationDeltaPct: stress.generationDeltaPct,
    energyValueDeltaPct: stress.revenueDeltaPct,
    localSupplyDeltaPercentagePoints: stress.reliabilityDeltaPct,
    generationIndexRelativeToBaseline:
      annualGenerationKWh / baseline.annualGenerationKWh,
    evidenceRefIds: chamberEvidence(resultId, stress.id),
  };
}

export function buildScenarioComparisonFrameV1({
  snapshot,
  resultId,
  lifecycle,
}: BuildScenarioComparisonFrameOptions):
ScenarioComparisonFrameBuildResult {
  if (!nonEmpty(resultId)) {
    return failed(
      "invalid-result-id",
      "Scenario comparison requires a non-empty canonical result identity.",
    );
  }
  if (!VALID_LIFECYCLES.has(lifecycle)) {
    return failed(
      "invalid-lifecycle",
      "Scenario comparison lifecycle is outside the Observatory contract.",
    );
  }

  const weather = canonicalWeather(snapshot.hourly);
  if (!weather) {
    return failed(
      "invalid-chronology",
      "Scenario comparison requires one contiguous 8,760-hour UTC chronology.",
    );
  }
  const optimisation = snapshot.optimization;
  if (
    !nonEmpty(optimisation.method)
    || !nonEmpty(optimisation.objective)
    || !nonEmpty(optimisation.baseline.id)
    || !within(snapshot.summary.qualityScore, 0, 1)
  ) {
    return failed(
      "invalid-optimisation-record",
      "The optimisation record is missing its method, objective, baseline, or quality evidence.",
    );
  }

  let canonical;
  try {
    canonical = evaluateConfiguredStressComparison(
      weather,
      snapshot.config,
    );
  } catch {
    return failed(
      "invalid-optimisation-record",
      "The configured deterministic stress calculation could not be replayed.",
    );
  }
  if (
    !candidateReconciles(optimisation.baseline, canonical.baseline)
    || !scenarioComparisonNumbersReconcile(
      snapshot.summary.annualGenerationKWh,
      canonical.baseline.annualGenerationKWh,
    )
    || !scenarioComparisonNumbersReconcile(
      snapshot.summary.netEnergyValue,
      canonical.baseline.revenue,
    )
    || !scenarioComparisonNumbersReconcile(
      snapshot.summary.selfConsumptionPct,
      canonical.baseline.selfConsumptionPct,
    )
    || !scenarioComparisonNumbersReconcile(
      snapshot.summary.solarFractionPct,
      canonical.baselineLocalSupplyPct,
    )
    || !scenarioComparisonNumbersReconcile(
      snapshot.summary.reliabilityPct,
      canonical.baselineLocalSupplyPct,
    )
  ) {
    return failed(
      "invalid-baseline",
      "The configured optimisation baseline does not reconcile with the canonical annual result.",
    );
  }

  if (
    optimisation.stressScenarios.length
      !== DETERMINISTIC_STRESS_SCENARIO_CATALOG.length
    || canonical.stressScenarios.length
      !== DETERMINISTIC_STRESS_SCENARIO_CATALOG.length
  ) {
    return failed(
      "invalid-stress-scenarios",
      "The deterministic stress catalog is incomplete or has an unexpected scenario count.",
    );
  }
  for (
    let index = 0;
    index < DETERMINISTIC_STRESS_SCENARIO_CATALOG.length;
    index += 1
  ) {
    const actual = optimisation.stressScenarios[index];
    const replayed = canonical.stressScenarios[index];
    const catalog = DETERMINISTIC_STRESS_SCENARIO_CATALOG[index];
    if (
      !actual
      || !replayed
      || !catalog
      || actual.id !== catalog.id
      || actual.label !== catalog.label
      || actual.status !== catalog.status
      || actual.explanation !== catalog.explanation
    ) {
      return failed(
        "invalid-stress-scenarios",
        "A deterministic stress scenario is missing, reordered, renamed, or carries an unsupported lifecycle.",
      );
    }
    if (!stressReconciles(actual, replayed)) {
      return failed(
        "stress-scenario-reconciliation-failed",
        "A stored deterministic stress result does not reconcile with the canonical calculation.",
      );
    }
  }

  const dataset = snapshot.provenance.find(
    (record) => record.kind === "dataset",
  );
  const calculation = snapshot.provenance.find(
    (record) => record.kind === "calculation",
  );
  const scenario = snapshot.provenance.find(
    (record) => record.kind === "scenario",
  );
  if (
    !dataset
    || !calculation
    || !scenario
    || !nonEmpty(dataset.version)
    || !nonEmpty(calculation.calculationVersion)
    || !nonEmpty(scenario.version)
    || !nonEmpty(scenario.provider)
  ) {
    return failed(
      "missing-provenance",
      "Scenario comparison requires dataset, calculation, and scenario provenance.",
    );
  }

  const baseline: ScenarioComparisonChamberV1 = {
    id: SCENARIO_COMPARISON_BASELINE_ID,
    order: 0,
    role: "baseline",
    status: "simulated",
    label: "Configured baseline",
    explanation:
      "Canonical configured annual result used as the common comparison reference.",
    annualGenerationKWh: canonical.baseline.annualGenerationKWh,
    netEnergyValue: canonical.baseline.revenue,
    localSupplyPct: canonical.baselineLocalSupplyPct,
    generationDeltaPct: 0,
    energyValueDeltaPct: 0,
    localSupplyDeltaPercentagePoints: 0,
    generationIndexRelativeToBaseline: 1,
    evidenceRefIds: chamberEvidence(
      resultId,
      SCENARIO_COMPARISON_BASELINE_ID,
    ),
  };
  const chambers: readonly ScenarioComparisonChamberV1[] = [
    baseline,
    ...canonical.stressScenarios.map((stress, index) =>
      stressChamber(resultId, baseline, stress, index + 1)),
  ];
  const evidenceRefIds = Object.freeze(
    chambers.flatMap((chamber) => [...chamber.evidenceRefIds]),
  );
  const frame: ScenarioComparisonFrameV1 = {
    schemaVersion: SCENARIO_COMPARISON_FRAME_SCHEMA_VERSION,
    resultId,
    lifecycle,
    comparisonBoundary: {
      mode: "stress-summary",
      kind: "configured-baseline-vs-deterministic-stress-results",
      source: "canonical-optimisation-stress-record",
      deterministic: true,
      parallelPresentation: true,
      sameTimestampComparison: false,
      parallelWeatherWorlds: false,
      hourlyStressResultsAvailable: false,
      independentProbabilitiesAvailable: false,
      issuedForecast: false,
      bankableAssessment: false,
    },
    chronology: {
      recordCount: SCENARIO_COMPARISON_ANNUAL_RECORD_COUNT,
      intervalSeconds: 3_600,
      calendar: "contiguous-no-leap-utc-year",
    },
    metricDefinitions: {
      generationDelta:
        "percent-of-configured-baseline-annual-generation",
      energyValueDelta:
        "percent-of-absolute-configured-baseline-net-energy-value",
      energyValueCurrency: snapshot.config.tariff.currency,
      energyValuePeriod: "annual",
      localSupplyDelta: "percentage-points",
      legacySourceField:
        "reliabilityDeltaPct-calculates-local-supply-delta",
    },
    optimisation: {
      status: optimisation.status,
      method: optimisation.method,
      objective: optimisation.objective,
      baselineCandidateId: canonical.baseline.id,
    },
    annualQualityScore: snapshot.summary.qualityScore,
    chambers,
    visualEncoding: {
      kind:
        "signed-generation-delta-normalized-to-largest-absolute-delta",
      zeroDeltaResponse: 0.5,
      responseRange: [0, 1],
      physicalWeatherGeometry: false,
      probabilityEncoding: false,
      exactValuesRemainHtml: true,
    },
    provenance: {
      provider: scenario.provider,
      datasetVersion: dataset.version,
      calculationVersion: calculation.calculationVersion,
      scenarioVersion: scenario.version,
      evidenceRefIds,
    },
    unavailableLayers: {
      sunnyAndCloudyParallelRuns: unavailable(
        "Sunny and cloudy proving modes exist only as whole-snapshot configurations; parallel annual results are not present in this active result.",
      ),
      dustEventDynamics: unavailable(
        "Dust is a configured static loss factor; no accumulation, deposition, cleaning, or resuspension event model is connected.",
      ),
      hourlyStressTrajectories: unavailable(
        "The optimisation contract publishes annual stress deltas, not serialized hourly stress trajectories.",
      ),
      scenarioProbabilities: unavailable(
        "Named deterministic stress cases have no occurrence probabilities or calibrated likelihoods.",
      ),
      stormDamageAndStructuralRisk: unavailable(
        "The storm case attenuates radiation and elevates wind; it does not calculate structural load, damage, or equipment survival.",
      ),
      heatwaveThresholdAndAttribution: unavailable(
        "The configured +6 °C summer stress is not a validated extreme-heat threshold, return-period estimate, or climate-attribution result.",
      ),
      stormMeteorology: unavailable(
        "The configured storm-week stress does not provide gusts, wind direction, lightning, cloud geometry, or an observed-event classification.",
      ),
      spatialMicroclimateTerrainAndShadows: unavailable(
        "No spatial microclimate, surveyed terrain, obstruction, or physical shadow field is connected to these annual summaries.",
      ),
      measuredOrLiveResponse: unavailable(
        "No measured plant telemetry or live stress response is connected.",
      ),
      issuedForecast: unavailable(
        "The deterministic stress comparison is not an issued weather or production forecast.",
      ),
    },
  };
  if (!validScenarioComparisonFrame(frame)) {
    return failed(
      "invalid-stress-scenarios",
      "The scenario comparison frame failed its renderer-neutral contract.",
    );
  }
  return Object.freeze({
    status: "ready",
    frame: deepFreezeScenarioComparisonFrame(frame),
  });
}
