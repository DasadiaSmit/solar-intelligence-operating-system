import type { PredictionInterval, WeatherHour } from "../contracts/index";
import { clamp } from "../solar/math";
import { calculateValidationMetrics } from "./metrics";

export function seasonalNaiveForecast(
  values: readonly number[],
  seasonLength = 24,
): number[] {
  const forecast = new Array<number>(values.length).fill(Number.NaN);
  for (let index = seasonLength; index < values.length; index += 1) {
    forecast[index] = values[index - seasonLength] ?? Number.NaN;
  }
  return forecast;
}

export function movingAverageForecast(
  values: readonly number[],
  window = 168,
): number[] {
  const forecast = new Array<number>(values.length).fill(Number.NaN);
  let rollingTotal = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) rollingTotal += values[index - 1] ?? 0;
    if (index > window) rollingTotal -= values[index - window - 1] ?? 0;
    const available = Math.min(index, window);
    if (available > 0) forecast[index] = rollingTotal / available;
  }
  return forecast;
}

/** Causal one-step-ahead simple exponential smoothing. */
export function exponentialSmoothingForecast(
  values: readonly number[],
  alpha = 0.24,
): number[] {
  if (values.length === 0) return [];
  const boundedAlpha = clamp(alpha, 0.001, 1);
  const forecast = new Array<number>(values.length).fill(Number.NaN);
  let level = values[0] ?? 0;
  for (let index = 1; index < values.length; index += 1) {
    forecast[index] = level;
    level = boundedAlpha * (values[index] ?? level) + (1 - boundedAlpha) * level;
  }
  return forecast;
}

export interface RegressionSample {
  features: readonly number[];
  target: number;
}

export interface RidgeModel {
  coefficients: number[];
  featureMeans: number[];
  featureScales: number[];
  intercept: number;
  regularization: number;
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index] ?? 0]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row]?.[pivot] ?? 0) > Math.abs(augmented[bestRow]?.[pivot] ?? 0)) {
        bestRow = row;
      }
    }
    [augmented[pivot], augmented[bestRow]] = [augmented[bestRow] ?? [], augmented[pivot] ?? []];
    const pivotValue = augmented[pivot]?.[pivot] ?? 0;
    if (Math.abs(pivotValue) < 1e-12) continue;
    for (let column = pivot; column <= size; column += 1) {
      if (augmented[pivot]) augmented[pivot][column] = (augmented[pivot][column] ?? 0) / pivotValue;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row]?.[pivot] ?? 0;
      if (Math.abs(factor) < 1e-14) continue;
      for (let column = pivot; column <= size; column += 1) {
        if (augmented[row]) {
          augmented[row][column] = (augmented[row][column] ?? 0) - factor * (augmented[pivot]?.[column] ?? 0);
        }
      }
    }
  }
  return augmented.map((row) => row[size] ?? 0);
}

export function trainRidgeRegression(
  samples: readonly RegressionSample[],
  regularization = 0.08,
): RidgeModel {
  const valid = samples.filter(
    (sample) => Number.isFinite(sample.target) && sample.features.every(Number.isFinite),
  );
  const featureCount = valid[0]?.features.length ?? 0;
  if (valid.length === 0 || featureCount === 0) {
    return { coefficients: [], featureMeans: [], featureScales: [], intercept: 0, regularization };
  }
  const featureMeans = new Array<number>(featureCount).fill(0);
  for (const sample of valid) {
    for (let feature = 0; feature < featureCount; feature += 1) {
      featureMeans[feature] += sample.features[feature] ?? 0;
    }
  }
  for (let feature = 0; feature < featureCount; feature += 1) {
    featureMeans[feature] /= valid.length;
  }
  const featureScales = new Array<number>(featureCount).fill(0);
  for (const sample of valid) {
    for (let feature = 0; feature < featureCount; feature += 1) {
      featureScales[feature] += ((sample.features[feature] ?? 0) - (featureMeans[feature] ?? 0)) ** 2;
    }
  }
  for (let feature = 0; feature < featureCount; feature += 1) {
    featureScales[feature] = Math.max(1e-8, Math.sqrt((featureScales[feature] ?? 0) / valid.length));
  }
  const targetMean = valid.reduce((total, sample) => total + sample.target, 0) / valid.length;
  const matrix = Array.from({ length: featureCount }, () => new Array<number>(featureCount).fill(0));
  const vector = new Array<number>(featureCount).fill(0);
  for (const sample of valid) {
    const standardized = sample.features.map(
      (value, index) => (value - (featureMeans[index] ?? 0)) / (featureScales[index] ?? 1),
    );
    for (let row = 0; row < featureCount; row += 1) {
      vector[row] += (standardized[row] ?? 0) * (sample.target - targetMean);
      for (let column = 0; column < featureCount; column += 1) {
        if (matrix[row]) matrix[row][column] += (standardized[row] ?? 0) * (standardized[column] ?? 0);
      }
    }
  }
  for (let diagonal = 0; diagonal < featureCount; diagonal += 1) {
    if (matrix[diagonal]) matrix[diagonal][diagonal] += Math.max(0, regularization) * valid.length;
  }
  return {
    coefficients: solveLinearSystem(matrix, vector),
    featureMeans,
    featureScales,
    intercept: targetMean,
    regularization,
  };
}

export function predictRidge(model: RidgeModel, features: readonly number[]): number {
  let prediction = model.intercept;
  for (let index = 0; index < model.coefficients.length; index += 1) {
    const standardized =
      ((features[index] ?? model.featureMeans[index] ?? 0) - (model.featureMeans[index] ?? 0)) /
      (model.featureScales[index] ?? 1);
    prediction += (model.coefficients[index] ?? 0) * standardized;
  }
  return prediction;
}

export function meteorologicalFeatures(
  weather: Pick<
    WeatherHour,
    "ghiWm2" | "dniWm2" | "dhiWm2" | "temperatureC" | "windSpeedMps" | "cloudCoverPct" | "hour" | "dayOfYear"
  >,
): number[] {
  const hourAngle = 2 * Math.PI * weather.hour / 24;
  const seasonalAngle = 2 * Math.PI * weather.dayOfYear / 365;
  return [
    weather.ghiWm2 / 1000,
    weather.dniWm2 / 1000,
    weather.dhiWm2 / 1000,
    weather.temperatureC / 25,
    weather.windSpeedMps / 10,
    weather.cloudCoverPct / 100,
    Math.sin(hourAngle),
    Math.cos(hourAngle),
    Math.sin(seasonalAngle),
    Math.cos(seasonalAngle),
  ];
}

export interface EnsembleResult {
  point: number[];
  lower: number[];
  upper: number[];
  weights: number[];
  residualScale: number;
}

/** Inverse-MAE calibrated ensemble; weights are learned only from the supplied calibration prefix. */
export function buildProbabilisticEnsemble(
  componentForecasts: readonly (readonly number[])[],
  actualCalibration: readonly number[],
  calibrationCount = actualCalibration.length,
  nominalCoveragePct = 80,
): EnsembleResult {
  if (componentForecasts.length === 0) {
    return { point: [], lower: [], upper: [], weights: [], residualScale: 0 };
  }
  const count = Math.min(...componentForecasts.map((series) => series.length));
  const calibrationEnd = Math.min(count, actualCalibration.length, Math.max(1, calibrationCount));
  const inverseErrors = componentForecasts.map((forecast) => {
    const metrics = calculateValidationMetrics(
      actualCalibration.slice(0, calibrationEnd),
      forecast.slice(0, calibrationEnd),
    );
    return 1 / Math.max(1e-6, metrics.mae);
  });
  const weightTotal = inverseErrors.reduce((total, value) => total + value, 0);
  const weights = inverseErrors.map((value) => value / weightTotal);
  const point = new Array<number>(count).fill(0);
  for (let index = 0; index < count; index += 1) {
    let weighted = 0;
    let validWeight = 0;
    for (let component = 0; component < componentForecasts.length; component += 1) {
      const estimate = componentForecasts[component]?.[index];
      if (!Number.isFinite(estimate)) continue;
      const weight = weights[component] ?? 0;
      weighted += Math.max(0, estimate ?? 0) * weight;
      validWeight += weight;
    }
    point[index] = validWeight > 0 ? weighted / validWeight : 0;
  }
  const calibrationResiduals: number[] = [];
  for (let index = 0; index < calibrationEnd; index += 1) {
    if (Number.isFinite(actualCalibration[index]) && Number.isFinite(point[index])) {
      calibrationResiduals.push(Math.abs((actualCalibration[index] ?? 0) - (point[index] ?? 0)));
    }
  }
  calibrationResiduals.sort((a, b) => a - b);
  const quantileIndex = Math.min(
    calibrationResiduals.length - 1,
    Math.floor(calibrationResiduals.length * nominalCoveragePct / 100),
  );
  const residualScale = calibrationResiduals[Math.max(0, quantileIndex)] ?? 0;
  const lower = point.map((value, index) => {
    const spread = componentSpread(componentForecasts, index);
    return Math.max(0, value - Math.max(residualScale, spread));
  });
  const upper = point.map((value, index) => value + Math.max(residualScale, componentSpread(componentForecasts, index)));
  return { point, lower, upper, weights, residualScale };
}

function componentSpread(forecasts: readonly (readonly number[])[], index: number): number {
  const values = forecasts
    .map((forecast) => forecast[index])
    .filter((value): value is number => Number.isFinite(value));
  if (values.length < 2) return 0;
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.sqrt(values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length);
}

export function intervalForHour(
  p50KWh: number,
  baseHalfWidthKWh: number,
  cloudCoverPct: number,
  maximumKWh: number,
): PredictionInterval {
  const cloudUncertainty = 0.45 + 0.95 * clamp(cloudCoverPct / 100, 0, 1);
  const halfWidth = Math.max(0, baseHalfWidthKWh * cloudUncertainty);
  return {
    p10KWh: Math.max(0, p50KWh - halfWidth),
    p50KWh: Math.max(0, p50KWh),
    p90KWh: Math.min(Math.max(0, maximumKWh), Math.max(0, p50KWh + halfWidth)),
    confidence: clamp(1 - halfWidth / Math.max(0.01, maximumKWh), 0.25, 0.99),
  };
}
