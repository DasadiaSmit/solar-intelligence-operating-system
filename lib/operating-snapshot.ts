import type {
  HistoricalYearComparison,
  HourlyOperatingPoint,
  ModelRecord,
  MonthlyOperatingSummary,
  OperatingSnapshot,
  OperatingSummary,
  ProvenanceRecord,
  SystemConfig,
  WeatherHour,
  WeatherRegime,
} from "./contracts/index";
import {
  CALCULATION_VERSION,
  DATASET_VERSION,
  MODEL_VERSION,
  makeQuality,
} from "./contracts/index";
import { buildDemandProfile, dispatchEnergyYear } from "./energy/index";
import {
  buildModelRegistry,
  buildProbabilisticEnsemble,
  calculateValidationMetrics,
  exponentialSmoothingForecast,
  intervalForHour,
  meteorologicalFeatures,
  movingAverageForecast,
  predictRidge,
  trainRidgeRegression,
  type RegressionSample,
} from "./forecasting/index";
import { optimiseSystem } from "./optimisation/index";
import { buildRepresentativeYear } from "./representative-year/index";
import {
  generateHistoricalSample,
  mergeSystemConfig,
  MONTH_LABELS,
  SAMPLE_YEARS,
  type SampleYear,
} from "./sample/index";
import {
  buildLossChain,
  quantile,
  simulateSolarYear,
  type SolarSimulationResult,
} from "./solar/index";

const ISSUE_TIME = "2026-07-21T00:00:00.000Z";

function measuredPattern(
  physicalKWh: number,
  weather: WeatherHour,
  year: SampleYear,
): number {
  if (physicalKWh <= 0) return 0;
  const residual =
    0.012 * Math.sin(2 * Math.PI * weather.dayOfYear / 17 + year * 0.3) -
    0.009 * Math.cos(2 * Math.PI * weather.hour / 24) -
    0.012 * weather.cloudCoverPct / 100 +
    (year - 2023.5) * 0.0018;
  return Math.max(0, physicalKWh * (1 + residual));
}

function regimeFor(hour: WeatherHour, daylight: boolean): WeatherRegime {
  if (!daylight) return "night";
  if (hour.snowDepthCm > 0.5) return "snow";
  if (hour.precipitationMm > 0.25) return "wet";
  if (hour.cloudCoverPct >= 76) return "overcast";
  if (hour.cloudCoverPct <= 32) return "clear";
  return "variable-cloud";
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildForecastModels(
  historicalWeather: Record<SampleYear, WeatherHour[]>,
  historicalSolar: Record<SampleYear, SolarSimulationResult>,
): { models: ModelRecord[]; residualScale: number } {
  const training: RegressionSample[] = [];
  for (const year of [2022, 2023, 2024] as const) {
    const weather = historicalWeather[year];
    const solar = historicalSolar[year];
    for (let index = 0; index < weather.length; index += 1) {
      const weatherHour = weather[index];
      const physical = solar.hourly[index]?.generation.acKWh;
      if (!weatherHour || physical === undefined) continue;
      training.push({
        features: meteorologicalFeatures(weatherHour),
        target: measuredPattern(physical, weatherHour, year),
      });
    }
  }
  const ridge = trainRidgeRegression(training, 0.015);
  const testWeather = historicalWeather[2025];
  const physical = historicalSolar[2025].hourly.map((hour) => hour.generation.acKWh);
  const actual = testWeather.map((hour, index) => measuredPattern(physical[index] ?? 0, hour, 2025));
  const priorYear = historicalSolar[2024].hourly.map((hour, index) =>
    measuredPattern(hour.generation.acKWh, historicalWeather[2024][index] ?? hour.weather, 2024));
  const seasonalNaive = priorYear.slice(0, actual.length);
  const movingAverage = movingAverageForecast(actual, 168);
  const exponential = exponentialSmoothingForecast(actual, 0.3);
  const regression = testWeather.map((hour) => Math.max(0, predictRidge(ridge, meteorologicalFeatures(hour))));
  const ensemble = buildProbabilisticEnsemble(
    [seasonalNaive, regression, physical],
    actual,
    24 * 120,
    80,
  );
  const months = testWeather.map((hour) => hour.month);
  const models = buildModelRegistry({
    seasonalNaive: calculateValidationMetrics(actual, seasonalNaive, { months }),
    movingAverage: calculateValidationMetrics(actual, movingAverage, { months }),
    exponentialSmoothing: calculateValidationMetrics(actual, exponential, { months }),
    ridgeRegression: calculateValidationMetrics(actual, regression, { months }),
    physical: calculateValidationMetrics(actual, physical, { months }),
    hybrid: calculateValidationMetrics(actual, ensemble.point, {
      months,
      lower: ensemble.lower,
      upper: ensemble.upper,
      nominalCoveragePct: 80,
    }),
  });
  return { models, residualScale: ensemble.residualScale };
}

function buildMonthly(
  hourly: readonly HourlyOperatingPoint[],
  historicalSolar: Record<SampleYear, SolarSimulationResult>,
): MonthlyOperatingSummary[] {
  const records = MONTH_LABELS.map<MonthlyOperatingSummary>((label, index) => ({
    month: index + 1,
    label,
    generationKWh: 0,
    demandKWh: 0,
    selfConsumedKWh: 0,
    gridImportKWh: 0,
    gridExportKWh: 0,
    irradianceKWhM2: 0,
    carbonAvoidedKg: 0,
    p10KWh: 0,
    p90KWh: 0,
    historicalGenerationKWh: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 },
  }));
  for (const point of hourly) {
    const record = records[point.month - 1];
    if (!record) continue;
    record.generationKWh += point.generation.acKWh;
    record.demandKWh += point.flow.demandKWh;
    record.selfConsumedKWh += point.flow.solarToLoadKWh + point.flow.batteryDischargeKWh;
    record.gridImportKWh += point.flow.gridImportKWh;
    record.gridExportKWh += point.flow.gridExportKWh;
    record.irradianceKWhM2 += point.irradiance.effectiveWm2 / 1000;
    record.carbonAvoidedKg += point.flow.carbonAvoidedKg;
  }
  for (const year of SAMPLE_YEARS) {
    for (const hour of historicalSolar[year].hourly) {
      const month = hour.weather.month;
      const record = records[month - 1];
      if (record) record.historicalGenerationKWh[String(year) as keyof typeof record.historicalGenerationKWh] +=
        hour.generation.acKWh;
    }
  }
  for (const record of records) {
    const historical = Object.values(record.historicalGenerationKWh).sort((a, b) => a - b);
    record.p10KWh = quantile(historical, 0.1);
    record.p90KWh = quantile(historical, 0.9);
  }
  return records;
}

function historicalComparisons(
  representativeGenerationKWh: number,
  capacityKw: number,
  historical: Record<SampleYear, SolarSimulationResult>,
): HistoricalYearComparison[] {
  return SAMPLE_YEARS.map((year) => {
    const simulation = historical[year];
    const meanQualityScore = simulation.hourly.reduce(
      (total, hour) => total + hour.weather.quality.score,
      0,
    ) / simulation.hourly.length;
    return {
      year,
      generationKWh: simulation.annualAcKWh,
      specificYieldKWhPerKwp: simulation.annualAcKWh / Math.max(0.001, capacityKw),
      deltaFromRepresentativePct: representativeGenerationKWh > 0
        ? (simulation.annualAcKWh - representativeGenerationKWh) / representativeGenerationKWh * 100
        : 0,
      meanQualityScore,
    };
  });
}

function buildSummary(
  config: SystemConfig,
  solar: SolarSimulationResult,
  flow: ReturnType<typeof dispatchEnergyYear>,
  generationBounds: readonly number[],
  energyValue: number,
): OperatingSummary {
  const selfConsumedKWh = Math.max(0, solar.annualAcKWh - flow.gridExportKWh - flow.curtailedKWh);
  const embodiedCarbon = config.carbon.embodiedCarbonKgCo2ePerKwp * config.array.capacityKwDc;
  return {
    annualGenerationKWh: solar.annualAcKWh,
    annualGenerationMWh: solar.annualAcKWh / 1000,
    specificYieldKWhPerKwp: solar.annualAcKWh / Math.max(0.001, config.array.capacityKwDc),
    capacityFactorPct: solar.annualAcKWh / Math.max(0.001, config.array.capacityKwDc * 8760) * 100,
    performanceRatioPct: solar.performanceRatio * 100,
    p10GenerationKWh: quantile([...generationBounds].sort((a, b) => a - b), 0.1),
    p90GenerationKWh: quantile([...generationBounds].sort((a, b) => a - b), 0.9),
    annualDemandKWh: flow.demandKWh,
    selfConsumedKWh,
    selfConsumptionPct: solar.annualAcKWh > 0 ? selfConsumedKWh / solar.annualAcKWh * 100 : 0,
    solarFractionPct: flow.demandKWh > 0
      ? (flow.solarToLoadKWh + flow.batteryDischargeKWh) / flow.demandKWh * 100
      : 0,
    gridImportKWh: flow.gridImportKWh,
    gridExportKWh: flow.gridExportKWh,
    curtailedKWh: flow.curtailedKWh,
    batteryCycles: flow.batteryCycles,
    importCost: flow.importCost,
    exportRevenue: flow.exportRevenue,
    netEnergyValue: energyValue,
    carbonAvoidedKg: flow.carbonAvoidedKg,
    carbonPaybackYears: flow.carbonAvoidedKg > 0 ? embodiedCarbon / flow.carbonAvoidedKg : 0,
    reliabilityPct: flow.demandKWh > 0
      ? (flow.demandKWh - flow.gridImportKWh) / flow.demandKWh * 100
      : 100,
    peakAcKw: solar.peakAcKw,
    qualityScore: solar.hourly.reduce((total, hour) => total + hour.weather.quality.score, 0) /
      solar.hourly.length,
  };
}

function buildProvenance(config: SystemConfig, qualityScore: number): ProvenanceRecord[] {
  const quality = makeQuality(
    qualityScore,
    ["deterministic-sample", "simulated-not-observed", "complete-hourly-calendar"],
  );
  const keyBase = JSON.stringify({
    dataset: DATASET_VERSION,
    calculation: CALCULATION_VERSION,
    seed: config.seed,
    location: config.location.id,
    capacity: config.array.capacityKwDc,
  });
  const common = {
    issueTime: ISSUE_TIME,
    dataTimestamp: "2022-01-01/2025-12-31 (leap days excluded)",
    resolution: "PT1H",
    units: "SI weather; kWh energy",
    quality,
    calculationVersion: CALCULATION_VERSION,
    reproducibilityKey: `fnv1a-${fnv1a(keyBase)}`,
  };
  return [
    {
      ...common,
      id: "provider-sample-eu",
      kind: "provider",
      name: "Deterministic European proving-weather provider",
      version: DATASET_VERSION,
      status: "simulated",
      provider: "S-IOS offline sample provider",
      assumptions: ["Clear-sky envelope with correlated synthetic cloud regimes."],
      uncertainty: "Not a substitute for measured, reanalysis or operational forecast data.",
      parentIds: [],
    },
    {
      ...common,
      id: "dataset-2022-2025",
      kind: "dataset",
      name: "Hourly proving dataset 2022–2025",
      version: DATASET_VERSION,
      status: "simulated",
      provider: "S-IOS offline sample provider",
      assumptions: ["Every source year normalised to a 365-day calendar."],
      uncertainty: "Interannual variability is synthetic and seeded.",
      parentIds: ["provider-sample-eu"],
    },
    {
      ...common,
      id: "transform-representative-year",
      kind: "transformation",
      name: "Representative-year whole-month selector",
      version: CALCULATION_VERSION,
      status: "experimental",
      provider: "S-IOS scientific core",
      assumptions: ["Finkelstein–Schafer-inspired multivariate CDF score; whole-month selection; persistence and continuity penalties."],
      uncertainty: "Source-year spread and construction deviation are retained in the audit record.",
      parentIds: ["dataset-2022-2025"],
    },
    {
      ...common,
      id: "calculation-physics",
      kind: "calculation",
      name: "Solar and energy-flow digital twin",
      version: CALCULATION_VERSION,
      status: "implemented",
      provider: "S-IOS scientific core",
      assumptions: ["NOAA fractional-year geometry", "Isotropic diffuse transposition", "Faiman generic open-rack thermal coefficients"],
      uncertainty: "Site-specific horizon, module and inverter calibration remain required.",
      parentIds: ["transform-representative-year"],
    },
    {
      ...common,
      id: "model-hybrid",
      kind: "model",
      name: "Physics-informed probabilistic ensemble",
      version: MODEL_VERSION,
      status: "experimental",
      provider: "S-IOS model laboratory",
      assumptions: ["Inverse-MAE weights calibrated on the first 120 days of the test year."],
      uncertainty: "Residual and component-spread intervals; not a production guarantee.",
      parentIds: ["dataset-2022-2025", "calculation-physics"],
    },
    {
      ...common,
      id: "scenario-base",
      kind: "scenario",
      name: "Configured operating scenario",
      version: CALCULATION_VERSION,
      status: "simulated",
      provider: "S-IOS scenario laboratory",
      assumptions: [`Weather scenario: ${config.weatherScenario}`, `Seed: ${config.seed}`],
      uncertainty: "Sensitivity is quantified through deterministic stress cases and seeded Monte Carlo.",
      parentIds: ["calculation-physics"],
    },
  ];
}

/**
 * Builds the complete, serialisable annual operating state. The sample-mode
 * result is deterministic for a given config/seed and requires no credentials.
 */
export function buildOperatingSnapshot(configPatch: Partial<SystemConfig> = {}): OperatingSnapshot {
  const config = mergeSystemConfig(configPatch);
  const historicalWeather = generateHistoricalSample(
    config.location,
    config.seed,
    config.weatherScenario,
  );
  const historicalSolar = {} as Record<SampleYear, SolarSimulationResult>;
  for (const year of SAMPLE_YEARS) {
    historicalSolar[year] = simulateSolarYear(
      historicalWeather[year],
      config.location,
      config.array,
      config.losses,
    );
  }
  const representative = buildRepresentativeYear(historicalWeather);
  const solar = simulateSolarYear(
    representative.weather,
    config.location,
    config.array,
    config.losses,
  );
  representative.record.comparisons = historicalComparisons(
    solar.annualAcKWh,
    config.array.capacityKwDc,
    historicalSolar,
  );
  const demand = buildDemandProfile(representative.weather, config.demand);
  const flow = dispatchEnergyYear(
    solar.hourly.map((hour) => hour.generation.acKWh),
    demand,
    representative.weather,
    config.battery,
    config.tariff,
    config.carbon,
    config.losses.curtailment,
  );
  const forecastModels = buildForecastModels(historicalWeather, historicalSolar);
  const hourly = solar.hourly.map<HourlyOperatingPoint>((hour, index) => {
    const { quality, ...weatherWithoutQuality } = hour.weather;
    const forecast = hour.position.isDaylight
      ? intervalForHour(
          hour.generation.acKWh,
          forecastModels.residualScale,
          hour.weather.cloudCoverPct,
          hour.generation.acCapacityKw,
        )
      : { p10KWh: 0, p50KWh: 0, p90KWh: 0, confidence: 0.99 };
    return {
      index,
      timestamp: hour.weather.timestamp,
      sourceTimestamp: hour.weather.sourceTimestamp,
      sourceYear: hour.weather.sourceYear,
      month: hour.weather.month,
      day: hour.weather.day,
      hour: hour.weather.hour,
      sun: hour.position,
      weather: weatherWithoutQuality,
      irradiance: hour.poa,
      generation: hour.generation,
      flow: flow.flows[index] ?? {
        demandKWh: 0,
        solarToLoadKWh: 0,
        batteryChargeKWh: 0,
        batteryDischargeKWh: 0,
        batterySocKWh: 0,
        gridImportKWh: 0,
        gridExportKWh: 0,
        curtailedKWh: 0,
        importCost: 0,
        exportRevenue: 0,
        carbonAvoidedKg: 0,
      },
      forecast,
      quality,
      regime: regimeFor(hour.weather, hour.position.isDaylight),
    };
  });
  const optimization = optimiseSystem(representative.weather, config);
  const generationBounds = SAMPLE_YEARS.map((year) => historicalSolar[year].annualAcKWh);
  const summary = buildSummary(
    config,
    solar,
    flow,
    generationBounds,
    optimization.baseline.revenue,
  );
  return {
    summary,
    config,
    hourly,
    monthly: buildMonthly(hourly, historicalSolar),
    lossChain: buildLossChain(solar),
    models: forecastModels.models,
    representativeYear: representative.record,
    optimization,
    provenance: buildProvenance(config, summary.qualityScore),
    status: {
      overall: "experimental",
      generatedAt: ISSUE_TIME,
      deterministic: true,
      offlineCapable: true,
      guaranteeNotice: "All production values are estimates, not guaranteed energy yields.",
      capabilities: [
        { id: "physics", label: "Solar physics and loss engine", status: "implemented", detail: CALCULATION_VERSION },
        { id: "annual", label: "8760-hour annual simulation", status: "implemented", detail: "Representative no-leap year" },
        { id: "energy-flow", label: "Battery, tariff, grid and carbon dispatch", status: "implemented", detail: "Hourly greedy self-consumption" },
        { id: "representative-year", label: "Representative-year construction", status: "experimental", detail: "Finkelstein–Schafer-inspired whole-month selection from four source years" },
        { id: "forecasting", label: "Forecast validation and ensemble", status: "experimental", detail: "Sample-mode rolling and holdout evaluation" },
        { id: "optimisation", label: "Grid, Pareto, Monte Carlo and stress analysis", status: "experimental", detail: `${optimization.evaluatedCandidates} evaluated configurations` },
        { id: "deep-learning", label: "TCN, LSTM and transformer training", status: "planned", detail: "Interfaces only; no fabricated model artifacts" },
        { id: "live-data", label: "2022–2025 reanalysis research path", status: "experimental", detail: "Open-Meteo annual-study endpoint uses the configured archive product and is fail-closed; the initial page remains explicitly simulated" },
      ],
      warnings: [
        "Offline sample weather is simulated and must not be represented as an observation.",
        "Generic horizon, thermal and loss parameters require site-specific calibration.",
        "Prediction intervals quantify model/input uncertainty under stated assumptions, not contractual risk.",
      ],
    },
  };
}

export type { OperatingSnapshot, SystemConfig } from "./contracts/index";
