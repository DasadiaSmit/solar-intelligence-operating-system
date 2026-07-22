import type { ValidationMetrics } from "../contracts/index";

export interface MetricOptions {
  months?: readonly number[];
  lower?: readonly number[];
  upper?: readonly number[];
  mapeFloor?: number;
  normalizationValue?: number;
  nominalCoveragePct?: number;
}

function seasonForMonth(month: number): keyof ValidationMetrics["seasonalMae"] {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

/** Metrics are calculated only for finite paired values. MAPE excludes near-zero observations. */
export function calculateValidationMetrics(
  actual: readonly number[],
  predicted: readonly number[],
  options: MetricOptions = {},
): ValidationMetrics {
  const count = Math.min(actual.length, predicted.length);
  const pairs: Array<{ actual: number; predicted: number; sourceIndex: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const observed = actual[index];
    const estimate = predicted[index];
    if (Number.isFinite(observed) && Number.isFinite(estimate)) {
      pairs.push({ actual: observed ?? 0, predicted: estimate ?? 0, sourceIndex: index });
    }
  }
  if (pairs.length === 0) {
    return {
      sampleCount: 0,
      mae: 0,
      rmse: 0,
      mapePct: null,
      normalizedMaePct: 0,
      bias: 0,
      rSquared: null,
      seasonalMae: { winter: 0, spring: 0, summer: 0, autumn: 0 },
      annualGenerationErrorPct: 0,
      peakOutputErrorPct: 0,
      intervalCoveragePct: null,
      calibrationErrorPct: null,
    };
  }
  let absoluteError = 0;
  let squaredError = 0;
  let signedError = 0;
  let actualTotal = 0;
  let predictedTotal = 0;
  let actualPeak = 0;
  let predictedPeak = 0;
  const meanActual = pairs.reduce((total, pair) => total + pair.actual, 0) / pairs.length;
  let totalVariance = 0;
  let mapeTotal = 0;
  let mapeCount = 0;
  const floor = options.mapeFloor ?? Math.max(0.05, meanActual * 0.1);
  const seasonalTotals: ValidationMetrics["seasonalMae"] = {
    winter: 0,
    spring: 0,
    summer: 0,
    autumn: 0,
  };
  const seasonalCounts: Record<keyof ValidationMetrics["seasonalMae"], number> = {
    winter: 0,
    spring: 0,
    summer: 0,
    autumn: 0,
  };
  let covered = 0;
  let intervalCount = 0;

  for (const pair of pairs) {
    const error = pair.predicted - pair.actual;
    const absError = Math.abs(error);
    absoluteError += absError;
    squaredError += error * error;
    signedError += error;
    actualTotal += pair.actual;
    predictedTotal += pair.predicted;
    actualPeak = Math.max(actualPeak, pair.actual);
    predictedPeak = Math.max(predictedPeak, pair.predicted);
    totalVariance += (pair.actual - meanActual) ** 2;
    if (Math.abs(pair.actual) > floor) {
      mapeTotal += absError / Math.abs(pair.actual);
      mapeCount += 1;
    }
    const month = options.months?.[pair.sourceIndex] ?? Math.min(12, Math.floor(pair.sourceIndex / 730) + 1);
    const season = seasonForMonth(month);
    seasonalTotals[season] += absError;
    seasonalCounts[season] += 1;
    const lower = options.lower?.[pair.sourceIndex];
    const upper = options.upper?.[pair.sourceIndex];
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      intervalCount += 1;
      if (pair.actual >= (lower ?? 0) && pair.actual <= (upper ?? 0)) covered += 1;
    }
  }
  for (const season of Object.keys(seasonalTotals) as Array<keyof typeof seasonalTotals>) {
    seasonalTotals[season] = seasonalCounts[season] > 0
      ? seasonalTotals[season] / seasonalCounts[season]
      : 0;
  }
  const intervalCoveragePct = intervalCount > 0 ? covered / intervalCount * 100 : null;
  const nominalCoverage = options.nominalCoveragePct ?? 80;
  return {
    sampleCount: pairs.length,
    mae: absoluteError / pairs.length,
    rmse: Math.sqrt(squaredError / pairs.length),
    mapePct: mapeCount >= Math.min(24, Math.ceil(pairs.length * 0.02))
      ? mapeTotal / mapeCount * 100
      : null,
    normalizedMaePct: Math.abs(options.normalizationValue ?? meanActual) > Number.EPSILON
      ? absoluteError / pairs.length / Math.abs(options.normalizationValue ?? meanActual) * 100
      : 0,
    bias: signedError / pairs.length,
    rSquared: totalVariance > Number.EPSILON ? 1 - squaredError / totalVariance : null,
    seasonalMae: seasonalTotals,
    annualGenerationErrorPct: Math.abs(actualTotal) > Number.EPSILON
      ? (predictedTotal - actualTotal) / actualTotal * 100
      : 0,
    peakOutputErrorPct: actualPeak > Number.EPSILON
      ? (predictedPeak - actualPeak) / actualPeak * 100
      : 0,
    intervalCoveragePct,
    calibrationErrorPct: intervalCoveragePct === null
      ? null
      : Math.abs(intervalCoveragePct - nominalCoverage),
  };
}
