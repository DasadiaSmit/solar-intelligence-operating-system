import type {
  SystemConfig,
  ValidationMetrics,
  WeatherHour,
} from "@/lib/contracts";
import { CALCULATION_VERSION, MODEL_VERSION } from "@/lib/contracts";
import {
  calculateValidationMetrics,
  meteorologicalFeatures,
  predictRidge,
  trainRidgeRegression,
  type RegressionSample,
} from "@/lib/forecasting";
import { reproducibleId, sha256Hex } from "@/lib/provenance";
import { buildRepresentativeYear } from "@/lib/representative-year";
import { mergeSystemConfig } from "@/lib/sample";
import type { SampleYear } from "@/lib/sample/weather";
import { SAMPLE_YEARS } from "@/lib/sample/weather";
import { mean, quantile } from "@/lib/solar/math";
import { simulateSolarYear, type SolarSimulationResult } from "@/lib/solar/simulation";
import {
  RESEARCH_WEATHER_ADAPTER_VERSION,
  loadHistoricalWeatherArchive,
  type HistoricalDatasetEvidence,
  type HistoricalWeatherArchive,
  type HistoricalWeatherLoadOptions,
  type ResearchDataMode,
  type ResearchYear,
} from "./historical-weather";

export const ANNUAL_STUDY_VERSION = "sios-annual-study-1.0.0";
const RESEARCH_MODEL_RECIPE_VERSION = "sios-annual-model-recipe-1.0.0";
const RIDGE_REGULARIZATION = 0.015;
const ENSEMBLE_NOMINAL_COVERAGE_PCT = 80;
const METEOROLOGICAL_FEATURE_SCHEMA = [
  "ghiWm2 / 1000",
  "dniWm2 / 1000",
  "dhiWm2 / 1000",
  "temperatureC / 25",
  "windSpeedMps / 10",
  "cloudCoverPct / 100",
  "sin(2π × hour / 24)",
  "cos(2π × hour / 24)",
  "sin(2π × noLeapDayOfYear / 365)",
  "cos(2π × noLeapDayOfYear / 365)",
] as const;

export interface ResearchModelRecipe {
  modelId: ResearchModelEvidence["id"];
  version: string;
  featureSchema: string[];
  hyperparameters: Record<string, string | number | boolean | null>;
}

export interface ResearchModelEvidence {
  id: string;
  name: string;
  family: "baseline" | "statistical" | "machine-learning" | "physical" | "hybrid";
  role: "reference" | "challenger" | "research-candidate";
  status: "implemented" | "experimental";
  task:
    | "full-year-seasonal-holdout"
    | "weather-conditioned-hindcast"
    | "target-definition";
  target: "physics-derived-generation";
  trainingRangeUtc: [string, string] | null;
  calibrationRangeUtc: [string, string] | null;
  evaluationRangeUtc: [string, string];
  horizonHours: number;
  metrics: ValidationMetrics | null;
  annualErrorPct: number | null;
  limitations: string[];
}

export interface RollingOriginEvidence {
  evaluationYear: 2023 | 2024 | 2025;
  trainedThroughYear: 2022 | 2023 | 2024;
  modelId: "seasonal-naive" | "meteo-ridge";
  metrics: ValidationMetrics;
}

export interface AnnualResearchStudy {
  studyId: string;
  version: string;
  generatedAtUtc: string;
  researchQuestion: string;
  sourceMode: "simulation" | "reanalysis";
  productionTarget: "physics-derived-generation";
  sourceYears: [2022, 2023, 2024, 2025];
  configuration: {
    location: SystemConfig["location"];
    array: SystemConfig["array"];
    losses: SystemConfig["losses"];
    aggregatePvLossPct: number;
    calculationVersion: string;
    modelVersion: string;
  };
  datasets: HistoricalDatasetEvidence[];
  historicalYears: Array<{
    year: ResearchYear;
    generationKWh: number;
    specificYieldKWhPerKwp: number;
    monthlyGenerationKWh: number[];
    qualityScore: number;
    datasetSnapshotId: string;
    contentHash: string;
    scienceContentHash: string;
    dataClass: string;
    provider: string;
  }>;
  representativeYear: {
    id: string;
    method: string;
    status: "experimental";
    hours: number;
    annualGenerationKWh: number;
    specificYieldKWhPerKwp: number;
    sourceYearWeights: Record<"2022" | "2023" | "2024" | "2025", number>;
    monthlyConstruction: ReturnType<typeof buildRepresentativeYear>["record"]["monthlyConstruction"];
    assumptions: string[];
  };
  annualEstimate: {
    centralEstimateKWh: number;
    uncertainty: {
      kind: "interannual-non-exceedance-quantiles";
      lowerLabel: "Q10";
      medianLabel: "Q50";
      upperLabel: "Q90";
      lowerKWh: number;
      medianKWh: number;
      upperKWh: number;
      sampleSize: 4;
      nominalCoveragePct: null;
      achievedCoveragePct: null;
      method: string;
      limitations: string[];
    };
  };
  validation: {
    protocol: string;
    trainingYears: [2022, 2023];
    calibrationYear: 2024;
    untouchedEvaluationYear: 2025;
    modelRecipes: ResearchModelRecipe[];
    modelEvidence: ResearchModelEvidence[];
    rollingOrigin: RollingOriginEvidence[];
    ensembleWeights: Record<string, number>;
    intervalNominalCoveragePct: number;
    intervalAchievedCoveragePct: number | null;
  };
  provenance: {
    orderedDatasetSnapshotIds: string[];
    orderedContentHashes: string[];
    orderedScienceContentHashes: string[];
    scienceAdapterVersion: string;
    representativeYearId: string;
    calculationVersion: string;
    modelVersion: string;
  };
  limitations: string[];
  guaranteeNotice: string;
}

export interface BuildAnnualResearchStudyOptions extends HistoricalWeatherLoadOptions {
  archive?: HistoricalWeatherArchive;
}

interface EnsembleCalibration {
  weights: number[];
  residualHalfWidth: number;
  nominalCoveragePct: number;
}

export async function buildAnnualResearchStudy(
  configPatch: Partial<SystemConfig> = {},
  options: BuildAnnualResearchStudyOptions,
): Promise<AnnualResearchStudy> {
  const config = mergeSystemConfig(configPatch);
  const archive = options.archive ?? await loadHistoricalWeatherArchive(config.location, options);
  return buildAnnualResearchStudyFromArchive(config, archive, options.now?.() ?? new Date());
}

export async function buildAnnualResearchStudyFromArchive(
  config: SystemConfig,
  archive: HistoricalWeatherArchive,
  generatedAt: Date,
): Promise<AnnualResearchStudy> {
  await assertArchive(archive);
  const simulations = {} as Record<SampleYear, SolarSimulationResult>;
  for (const year of SAMPLE_YEARS) {
    simulations[year] = simulateSolarYear(
      archive.years[year],
      config.location,
      config.array,
      config.losses,
    );
  }

  const orderedHashes = archive.evidence.map((item) => item.contentHash);
  const orderedScienceHashes = archive.evidence.map((item) => item.scienceContentHash);
  const orderedSnapshotIds = archive.evidence.map((item) => item.snapshotId);
  const representative = buildRepresentativeYear(
    archive.years,
    2026,
    `${RESEARCH_WEATHER_ADAPTER_VERSION}|${orderedScienceHashes.join("|")}`,
  );
  const representativeSimulation = simulateSolarYear(
    representative.weather,
    config.location,
    config.array,
    config.losses,
  );
  const modelValidation = buildModelValidation(archive.years, simulations);
  const annualTotals = SAMPLE_YEARS.map((year) => simulations[year].annualAcKWh)
    .sort((a, b) => a - b);
  const studyId = await reproducibleId("study", {
    version: ANNUAL_STUDY_VERSION,
    datasetSnapshotIds: orderedSnapshotIds,
    datasetContentHashes: orderedHashes,
    scienceContentHashes: orderedScienceHashes,
    scienceAdapterVersion: RESEARCH_WEATHER_ADAPTER_VERSION,
    representativeYearId: representative.record.id,
    modelRecipes: modelValidation.modelRecipes,
    config,
    calculationVersion: CALCULATION_VERSION,
    modelVersion: MODEL_VERSION,
  });
  const evidenceByYear = new Map(archive.evidence.map((item) => [item.year, item]));
  const historicalYears = SAMPLE_YEARS.map((year) => {
    const evidence = evidenceByYear.get(year);
    if (!evidence) throw new Error(`Missing dataset evidence for ${year}.`);
    const simulation = simulations[year];
    return {
      year,
      generationKWh: simulation.annualAcKWh,
      specificYieldKWhPerKwp: simulation.annualAcKWh / Math.max(0.001, config.array.capacityKwDc),
      monthlyGenerationKWh: monthlyGeneration(simulation),
      qualityScore: mean(archive.years[year].map((hour) => hour.quality.score)),
      datasetSnapshotId: evidence.snapshotId,
      contentHash: evidence.contentHash,
      scienceContentHash: evidence.scienceContentHash,
      dataClass: evidence.actualDataClass,
      provider: `${evidence.providerName} / ${evidence.product}`,
    };
  });

  return {
    studyId,
    version: ANNUAL_STUDY_VERSION,
    generatedAtUtc: generatedAt.toISOString(),
    researchQuestion:
      "What hourly photovoltaic electricity generation should be expected over a complete representative year using 2022–2025 weather and solar-radiation evidence?",
    sourceMode: archive.mode === "live" ? "reanalysis" : "simulation",
    productionTarget: "physics-derived-generation",
    sourceYears: [2022, 2023, 2024, 2025],
    configuration: {
      location: config.location,
      array: config.array,
      losses: config.losses,
      aggregatePvLossPct: aggregatePvLossPct(config.losses),
      calculationVersion: CALCULATION_VERSION,
      modelVersion: MODEL_VERSION,
    },
    datasets: archive.evidence,
    historicalYears,
    representativeYear: {
      id: representative.record.id,
      method: representative.record.method,
      status: "experimental",
      hours: representative.weather.length,
      annualGenerationKWh: representativeSimulation.annualAcKWh,
      specificYieldKWhPerKwp:
        representativeSimulation.annualAcKWh / Math.max(0.001, config.array.capacityKwDc),
      sourceYearWeights: representative.record.sourceYearWeights,
      monthlyConstruction: representative.record.monthlyConstruction,
      assumptions: representative.record.assumptions,
    },
    annualEstimate: {
      centralEstimateKWh: representativeSimulation.annualAcKWh,
      uncertainty: {
        kind: "interannual-non-exceedance-quantiles",
        lowerLabel: "Q10",
        medianLabel: "Q50",
        upperLabel: "Q90",
        lowerKWh: quantile(annualTotals, 0.1),
        medianKWh: quantile(annualTotals, 0.5),
        upperKWh: quantile(annualTotals, 0.9),
        sampleSize: 4,
        nominalCoveragePct: null,
        achievedCoveragePct: null,
        method: "Empirical non-exceedance quantiles of four weather-conditioned historical-year simulations.",
        limitations: [
          "Four source years are too few for a calibrated probabilistic annual interval.",
          "The bounds describe interannual weather spread under one configured system, not contractual P-values.",
        ],
      },
    },
    validation: modelValidation,
    provenance: {
      orderedDatasetSnapshotIds: orderedSnapshotIds,
      orderedContentHashes: orderedHashes,
      orderedScienceContentHashes: orderedScienceHashes,
      scienceAdapterVersion: RESEARCH_WEATHER_ADAPTER_VERSION,
      representativeYearId: representative.record.id,
      calculationVersion: CALCULATION_VERSION,
      modelVersion: MODEL_VERSION,
    },
    limitations: [
      archive.mode === "live"
        ? "Open-Meteo archive values are gridded reanalysis, not direct observations or an issued year-ahead forecast; the selected product is retained per dataset."
        : "The active datasets are deterministic simulation data for offline pipeline verification.",
      "No site meter or inverter production series is attached; accuracy metrics measure agreement with a physics-derived generation target, not field accuracy.",
      "The representative-year method has only four source years and remains experimental.",
      "Local horizon, shading, module, inverter, soiling and availability parameters require site-specific calibration.",
    ],
    guaranteeNotice: "All energy values are uncertain estimates and are not guaranteed production.",
  };
}

function aggregatePvLossPct(losses: SystemConfig["losses"]): number {
  const retention = [
    losses.horizon,
    losses.shading,
    losses.soiling,
    losses.dust,
    losses.snow,
    losses.mismatch,
    losses.wiring,
    losses.strings,
    losses.availability,
  ].reduce((product, loss) => product * (1 - Math.min(0.99, Math.max(0, loss))), 1);
  return (1 - retention) * 100;
}

function researchModelRecipes(): ResearchModelRecipe[] {
  return [
    {
      modelId: "seasonal-naive",
      version: RESEARCH_MODEL_RECIPE_VERSION,
      featureSchema: ["prior source year's same no-leap hour index"],
      hyperparameters: { seasonLengthHours: 8_760 },
    },
    {
      modelId: "hourly-climatology",
      version: RESEARCH_MODEL_RECIPE_VERSION,
      featureSchema: ["no-leap hour-of-year index"],
      hyperparameters: { sourceYearCount: 2, aggregation: "arithmetic mean" },
    },
    {
      modelId: "meteo-ridge",
      version: RESEARCH_MODEL_RECIPE_VERSION,
      featureSchema: [...METEOROLOGICAL_FEATURE_SCHEMA],
      hyperparameters: {
        regularization: RIDGE_REGULARIZATION,
        scaling: "train-only z-score",
        outputConstraint: "non-negative clamp",
      },
    },
    {
      modelId: "hybrid-probabilistic",
      version: RESEARCH_MODEL_RECIPE_VERSION,
      featureSchema: ["seasonal-naive", "hourly-climatology", "meteo-ridge"],
      hyperparameters: {
        weighting: "inverse 2024 calibration MAE",
        nominalCoveragePct: ENSEMBLE_NOMINAL_COVERAGE_PCT,
        intervalHalfWidth: "max(2024 absolute-residual quantile, component spread)",
        lowerBound: 0,
      },
    },
    {
      modelId: "physics-reference",
      version: RESEARCH_MODEL_RECIPE_VERSION,
      featureSchema: ["canonical weather", "location", "array", "loss configuration"],
      hyperparameters: { competitiveScoring: false },
    },
  ];
}

function buildModelValidation(
  weather: Record<SampleYear, WeatherHour[]>,
  simulations: Record<SampleYear, SolarSimulationResult>,
): AnnualResearchStudy["validation"] {
  const trainingYears = [2022, 2023] as const;
  const calibrationYear = 2024 as const;
  const evaluationYear = 2025 as const;
  const modelRecipes = researchModelRecipes();
  const trainingSamples = regressionSamples(trainingYears, weather, simulations);
  const ridge = trainRidgeRegression(trainingSamples, RIDGE_REGULARIZATION);
  const actual2024 = generation(simulations[2024]);
  const actual2025 = generation(simulations[2025]);
  const components2024 = [
    generation(simulations[2023]),
    climatology([2022, 2023], simulations),
    weather[2024].map((hour) => Math.max(0, predictRidge(ridge, meteorologicalFeatures(hour)))),
  ];
  const calibration = calibrateEnsemble(
    components2024,
    actual2024,
    ENSEMBLE_NOMINAL_COVERAGE_PCT,
  );
  const components2025 = [
    generation(simulations[2024]),
    climatology([2022, 2023], simulations),
    weather[2025].map((hour) => Math.max(0, predictRidge(ridge, meteorologicalFeatures(hour)))),
  ];
  const ensemble2025 = applyEnsemble(components2025, calibration);
  const months2025 = weather[2025].map((hour) => hour.month);
  const acNameplate2025 = simulations[2025].hourly[0]?.generation.acCapacityKw ?? 0;
  const metricOptions2025 = {
    months: months2025,
    normalizationValue: acNameplate2025,
    mapeFloor: Math.max(0.05, acNameplate2025 * 0.01),
  };
  const seasonalMetrics = calculateValidationMetrics(actual2025, components2025[0] ?? [], {
    ...metricOptions2025,
  });
  const climatologyMetrics = calculateValidationMetrics(actual2025, components2025[1] ?? [], {
    ...metricOptions2025,
  });
  const ridgeMetrics = calculateValidationMetrics(actual2025, components2025[2] ?? [], {
    ...metricOptions2025,
  });
  const hybridMetrics = calculateValidationMetrics(actual2025, ensemble2025.point, {
    ...metricOptions2025,
    lower: ensemble2025.lower,
    upper: ensemble2025.upper,
    nominalCoveragePct: calibration.nominalCoveragePct,
  });
  const common = {
    target: "physics-derived-generation" as const,
    evaluationRangeUtc: ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"] as [string, string],
    horizonHours: 8_760,
  };
  const modelEvidence: ResearchModelEvidence[] = [
    {
      ...common,
      id: "seasonal-naive",
      name: "Prior-year seasonal naive",
      family: "baseline",
      role: "reference",
      status: "implemented",
      task: "full-year-seasonal-holdout",
      trainingRangeUtc: ["2024-01-01T00:00:00.000Z", "2024-12-31T23:59:59.999Z"],
      calibrationRangeUtc: null,
      metrics: seasonalMetrics,
      annualErrorPct: seasonalMetrics.annualGenerationErrorPct,
      limitations: ["Assumes the previous no-leap year repeats hour-for-hour."],
    },
    {
      ...common,
      id: "hourly-climatology",
      name: "2022–2023 hourly climatology",
      family: "statistical",
      role: "reference",
      status: "implemented",
      task: "full-year-seasonal-holdout",
      trainingRangeUtc: ["2022-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
      calibrationRangeUtc: null,
      metrics: climatologyMetrics,
      annualErrorPct: climatologyMetrics.annualGenerationErrorPct,
      limitations: ["Averages only two source years and cannot respond to evaluation-year weather."],
    },
    {
      ...common,
      id: "meteo-ridge",
      name: "Meteorological ridge regression",
      family: "machine-learning",
      role: "challenger",
      status: "implemented",
      task: "weather-conditioned-hindcast",
      trainingRangeUtc: ["2022-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
      calibrationRangeUtc: null,
      metrics: ridgeMetrics,
      annualErrorPct: ridgeMetrics.annualGenerationErrorPct,
      limitations: [
        "Uses realised 2025 reanalysis or sample meteorology; this is a hindcast, not an issued year-ahead forecast.",
        "Linear features cannot represent every nonlinear system response.",
      ],
    },
    {
      ...common,
      id: "hybrid-probabilistic",
      name: "Calibrated research ensemble",
      family: "hybrid",
      role: "research-candidate",
      status: "experimental",
      task: "weather-conditioned-hindcast",
      trainingRangeUtc: ["2022-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
      calibrationRangeUtc: ["2024-01-01T00:00:00.000Z", "2024-12-31T23:59:59.999Z"],
      metrics: hybridMetrics,
      annualErrorPct: hybridMetrics.annualGenerationErrorPct,
      limitations: [
        "Weights and interval width are selected on 2024 and evaluated once on untouched 2025.",
        "The target is physics-derived; champion promotion requires measured production evidence.",
      ],
    },
    {
      ...common,
      id: "physics-reference",
      name: "Physical generation target",
      family: "physical",
      role: "reference",
      status: "implemented",
      task: "target-definition",
      trainingRangeUtc: null,
      calibrationRangeUtc: null,
      metrics: null,
      annualErrorPct: null,
      limitations: ["Defines the current target and therefore is not scored against itself as a competitive forecast."],
    },
  ];

  return {
    protocol:
      "Train on 2022–2023, calibrate ensemble weights/interval width on 2024, evaluate once on untouched 2025; expanding annual folds report stability separately.",
    trainingYears: [2022, 2023],
    calibrationYear,
    untouchedEvaluationYear: evaluationYear,
    modelRecipes,
    modelEvidence,
    rollingOrigin: buildRollingOriginEvidence(weather, simulations),
    ensembleWeights: {
      "seasonal-naive": calibration.weights[0] ?? 0,
      "hourly-climatology": calibration.weights[1] ?? 0,
      "meteo-ridge": calibration.weights[2] ?? 0,
    },
    intervalNominalCoveragePct: calibration.nominalCoveragePct,
    intervalAchievedCoveragePct: hybridMetrics.intervalCoveragePct,
  };
}

function buildRollingOriginEvidence(
  weather: Record<SampleYear, WeatherHour[]>,
  simulations: Record<SampleYear, SolarSimulationResult>,
): RollingOriginEvidence[] {
  const records: RollingOriginEvidence[] = [];
  for (const evaluationYear of [2023, 2024, 2025] as const) {
    const priorYear = (evaluationYear - 1) as 2022 | 2023 | 2024;
    const trainYears = SAMPLE_YEARS.filter((year) => year < evaluationYear);
    const ridge = trainRidgeRegression(
      regressionSamples(trainYears, weather, simulations),
      RIDGE_REGULARIZATION,
    );
    const actual = generation(simulations[evaluationYear]);
    const months = weather[evaluationYear].map((hour) => hour.month);
    const acNameplate = simulations[evaluationYear].hourly[0]?.generation.acCapacityKw ?? 0;
    const metricOptions = {
      months,
      normalizationValue: acNameplate,
      mapeFloor: Math.max(0.05, acNameplate * 0.01),
    };
    records.push({
      evaluationYear,
      trainedThroughYear: priorYear,
      modelId: "seasonal-naive",
      metrics: calculateValidationMetrics(actual, generation(simulations[priorYear]), metricOptions),
    });
    records.push({
      evaluationYear,
      trainedThroughYear: priorYear,
      modelId: "meteo-ridge",
      metrics: calculateValidationMetrics(
        actual,
        weather[evaluationYear].map((hour) => Math.max(0, predictRidge(ridge, meteorologicalFeatures(hour)))),
        metricOptions,
      ),
    });
  }
  return records;
}

function regressionSamples(
  years: readonly SampleYear[],
  weather: Record<SampleYear, WeatherHour[]>,
  simulations: Record<SampleYear, SolarSimulationResult>,
): RegressionSample[] {
  const samples: RegressionSample[] = [];
  for (const year of years) {
    const generationValues = generation(simulations[year]);
    for (let index = 0; index < weather[year].length; index += 1) {
      const hour = weather[year][index];
      const target = generationValues[index];
      if (!hour || target === undefined) continue;
      samples.push({ features: meteorologicalFeatures(hour), target });
    }
  }
  return samples;
}

function generation(simulation: SolarSimulationResult): number[] {
  return simulation.hourly.map((hour) => hour.generation.acKWh);
}

function climatology(
  years: readonly SampleYear[],
  simulations: Record<SampleYear, SolarSimulationResult>,
): number[] {
  return Array.from({ length: 8_760 }, (_, index) =>
    mean(years.map((year) => simulations[year].hourly[index]?.generation.acKWh ?? 0)),
  );
}

function calibrateEnsemble(
  components: readonly (readonly number[])[],
  actual: readonly number[],
  nominalCoveragePct: number,
): EnsembleCalibration {
  const inverseErrors = components.map((component) => {
    const metrics = calculateValidationMetrics(actual, component);
    return 1 / Math.max(1e-6, metrics.mae);
  });
  const total = inverseErrors.reduce((sum, value) => sum + value, 0);
  const weights = inverseErrors.map((value) => value / Math.max(1e-12, total));
  const point = weightedPoint(components, weights);
  const residuals = actual
    .map((value, index) => Math.abs(value - (point[index] ?? 0)))
    .sort((a, b) => a - b);
  return {
    weights,
    residualHalfWidth: quantile(residuals, nominalCoveragePct / 100),
    nominalCoveragePct,
  };
}

function applyEnsemble(
  components: readonly (readonly number[])[],
  calibration: EnsembleCalibration,
) {
  const point = weightedPoint(components, calibration.weights);
  const lower = point.map((value, index) =>
    Math.max(0, value - Math.max(calibration.residualHalfWidth, componentSpread(components, index))),
  );
  const upper = point.map((value, index) =>
    value + Math.max(calibration.residualHalfWidth, componentSpread(components, index)),
  );
  return { point, lower, upper };
}

function weightedPoint(
  components: readonly (readonly number[])[],
  weights: readonly number[],
): number[] {
  const count = Math.min(...components.map((component) => component.length));
  return Array.from({ length: count }, (_, index) =>
    components.reduce(
      (total, component, componentIndex) =>
        total + Math.max(0, component[index] ?? 0) * (weights[componentIndex] ?? 0),
      0,
    ),
  );
}

function componentSpread(components: readonly (readonly number[])[], index: number): number {
  const values = components.map((component) => component[index] ?? 0);
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function monthlyGeneration(simulation: SolarSimulationResult): number[] {
  const values = new Array<number>(12).fill(0);
  for (const hour of simulation.hourly) {
    values[hour.weather.month - 1] += hour.generation.acKWh;
  }
  return values;
}

async function assertArchive(archive: HistoricalWeatherArchive): Promise<void> {
  if (archive.evidence.length !== SAMPLE_YEARS.length) {
    throw new Error("Research archive must contain four ordered dataset evidence records.");
  }
  const expectedDataClass = archive.mode === "live" ? "reanalysis" : "simulation";
  for (const [index, year] of SAMPLE_YEARS.entries()) {
    if (archive.years[year]?.length !== 8_760) {
      throw new Error(`Research archive year ${year} must contain exactly 8,760 eligible hours.`);
    }
    const evidence = archive.evidence[index];
    const dataset = archive.datasets[year];
    if (!evidence || evidence.year !== year) {
      throw new Error(`Research archive evidence must be ordered 2022–2025; position ${index} must describe ${year}.`);
    }
    if (!dataset) throw new Error(`Research archive is missing canonical dataset ${year}.`);
    const expectedSourceHours = year === 2024 ? 8_784 : 8_760;
    if (dataset.records.length !== expectedSourceHours) {
      throw new Error(`Research archive dataset ${year} must contain ${expectedSourceHours} complete source intervals.`);
    }
    if (
      dataset.provenance.actualDataClass !== expectedDataClass ||
      dataset.provenance.semanticSubstitution
    ) {
      throw new Error(`Research archive dataset ${year} must be non-substituted ${expectedDataClass} data.`);
    }
    if (
      evidence.snapshotId !== dataset.provenance.snapshotId ||
      evidence.contentHash !== dataset.provenance.contentHash
    ) {
      throw new Error(`Research archive evidence identity does not match canonical dataset ${year}.`);
    }
    const scienceContentHash = await sha256Hex(archive.years[year]);
    if (
      evidence.scienceContentHash !== scienceContentHash ||
      evidence.scienceAdapterVersion !== RESEARCH_WEATHER_ADAPTER_VERSION
    ) {
      throw new Error(
        `Research archive science content hash or adapter version does not match adapted year ${year}.`,
      );
    }
    if (
      evidence.providerId !== dataset.provenance.provider.id ||
      evidence.actualDataClass !== dataset.provenance.actualDataClass ||
      evidence.requestedDataClass !== dataset.provenance.requestedDataClass
    ) {
      throw new Error(`Research archive evidence provenance does not match canonical dataset ${year}.`);
    }
    if (
      evidence.sourceRecordCount !== dataset.records.length ||
      evidence.simulationRecordCount !== archive.years[year].length ||
      evidence.leapHoursRemoved !== expectedSourceHours - 8_760
    ) {
      throw new Error(`Research archive evidence counts do not match canonical dataset ${year}.`);
    }
  }
}

export function annualStudyMode(value: unknown): ResearchDataMode {
  if (value === undefined || value === null || value === "") return "sample";
  if (value === "sample" || value === "live") return value;
  throw new Error("mode must be sample or live.");
}
