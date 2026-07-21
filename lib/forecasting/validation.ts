import type { ValidationMetrics } from "../contracts/index";
import { calculateValidationMetrics } from "./metrics";

export interface RollingOriginOptions {
  initialTrainSize: number;
  horizon: number;
  step: number;
  maximumOrigins?: number;
}

export interface RollingOriginResult {
  origins: number[];
  actual: number[];
  predicted: number[];
  metrics: ValidationMetrics;
}

export type OriginForecaster = (training: readonly number[], horizon: number) => readonly number[];

/** Expanding-window rolling-origin evaluation with non-overwriting chronological folds. */
export function rollingOriginEvaluate(
  series: readonly number[],
  forecaster: OriginForecaster,
  options: RollingOriginOptions,
): RollingOriginResult {
  if (options.initialTrainSize < 1 || options.horizon < 1 || options.step < 1) {
    throw new Error("Rolling-origin sizes must be positive");
  }
  const origins: number[] = [];
  const actual: number[] = [];
  const predicted: number[] = [];
  const maximum = options.maximumOrigins ?? Number.POSITIVE_INFINITY;
  for (
    let origin = options.initialTrainSize;
    origin + options.horizon <= series.length && origins.length < maximum;
    origin += options.step
  ) {
    const forecast = forecaster(series.slice(0, origin), options.horizon);
    origins.push(origin);
    for (let offset = 0; offset < options.horizon; offset += 1) {
      actual.push(series[origin + offset] ?? Number.NaN);
      predicted.push(forecast[offset] ?? Number.NaN);
    }
  }
  return { origins, actual, predicted, metrics: calculateValidationMetrics(actual, predicted) };
}

export function seasonalNaiveOriginForecaster(seasonLength: number): OriginForecaster {
  return (training, horizon) => {
    const result = new Array<number>(horizon);
    for (let offset = 0; offset < horizon; offset += 1) {
      const source = training.length - seasonLength + (offset % seasonLength);
      result[offset] = training[Math.max(0, source)] ?? training[training.length - 1] ?? 0;
    }
    return result;
  };
}

export function movingAverageOriginForecaster(window: number): OriginForecaster {
  return (training, horizon) => {
    const history = training.slice();
    const result: number[] = [];
    for (let offset = 0; offset < horizon; offset += 1) {
      const available = history.slice(Math.max(0, history.length - window));
      const estimate = available.length > 0
        ? available.reduce((total, value) => total + value, 0) / available.length
        : 0;
      result.push(estimate);
      history.push(estimate);
    }
    return result;
  };
}
