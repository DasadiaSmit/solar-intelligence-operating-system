import type { ModelRecord, ValidationMetrics } from "../contracts/index";
import { MODEL_VERSION } from "../contracts/index";

export interface ImplementedModelMetrics {
  seasonalNaive: ValidationMetrics;
  movingAverage: ValidationMetrics;
  exponentialSmoothing: ValidationMetrics;
  ridgeRegression: ValidationMetrics;
  physical: ValidationMetrics;
  hybrid: ValidationMetrics;
}

export function buildModelRegistry(metrics: ImplementedModelMetrics): ModelRecord[] {
  const implemented: ModelRecord[] = [
    {
      id: "seasonal-naive",
      name: "Seasonal naive",
      family: "baseline",
      version: MODEL_VERSION,
      status: "implemented",
      role: "reference",
      trainedThrough: null,
      metrics: metrics.seasonalNaive,
      description: "Prior-year aligned hourly production reference.",
      limitations: ["Cannot respond to forecast weather departures or system changes."],
    },
    {
      id: "moving-average",
      name: "168-hour moving average",
      family: "baseline",
      version: MODEL_VERSION,
      status: "implemented",
      role: "reference",
      trainedThrough: "rolling",
      metrics: metrics.movingAverage,
      description: "Causal one-step rolling mean baseline.",
      limitations: ["Smooths diurnal peaks and is not intended for long horizons."],
    },
    {
      id: "exponential-smoothing",
      name: "Exponential smoothing",
      family: "statistical",
      version: MODEL_VERSION,
      status: "implemented",
      role: "challenger",
      trainedThrough: "rolling",
      metrics: metrics.exponentialSmoothing,
      description: "Causal one-step level update with fixed smoothing coefficient.",
      limitations: ["Level-only formulation omits explicit seasonal states."],
    },
    {
      id: "meteo-ridge",
      name: "Meteorological ridge regression",
      family: "machine-learning",
      version: MODEL_VERSION,
      status: "implemented",
      role: "challenger",
      trainedThrough: "2024-12-31",
      metrics: metrics.ridgeRegression,
      description: "Regularised regression on radiation, temperature, wind, cloud and cyclic time features.",
      limitations: ["Linear feature response; trained only on deterministic proving data in sample mode."],
    },
    {
      id: "physics-reference",
      name: "Physical digital-twin reference",
      family: "physical",
      version: MODEL_VERSION,
      status: "implemented",
      role: "reference",
      trainedThrough: null,
      metrics: metrics.physical,
      description: "NOAA geometry, irradiance transposition, thermal response and explicit system losses.",
      limitations: ["Generic thermal and shading parameters require site calibration."],
    },
    {
      id: "hybrid-probabilistic",
      name: "Physics-informed probabilistic ensemble",
      family: "hybrid",
      version: MODEL_VERSION,
      status: "experimental",
      role: "research-candidate",
      trainedThrough: "2024-12-31",
      metrics: metrics.hybrid,
      description: "Inverse-error blend of physical, meteorological and seasonal proving estimates with residual intervals.",
      limitations: [
        "The bundled ledger uses simulated reference production and cannot support champion promotion.",
        "Intervals describe proving-data uncertainty and are not contractual guarantees.",
      ],
    },
  ];
  const plannedNames: Array<[string, string, ModelRecord["family"]]> = [
    ["sarima", "ARIMA / SARIMA", "statistical"],
    ["random-forest", "Random forest", "machine-learning"],
    ["gradient-boosting", "Gradient boosting", "machine-learning"],
    ["tcn", "Temporal convolutional network", "machine-learning"],
    ["lstm", "Long short-term memory network", "machine-learning"],
    ["timeseries-transformer", "Time-series transformer", "machine-learning"],
  ];
  return [
    ...implemented,
    ...plannedNames.map<ModelRecord>(([id, name, family]) => ({
      id,
      name,
      family,
      version: "untrained",
      status: "planned",
      role: "research-candidate",
      trainedThrough: null,
      metrics: null,
      description: "Research-pipeline interface reserved; no trained artifact is bundled.",
      limitations: ["No validated model artifact or performance claim is available."],
    })),
  ];
}
