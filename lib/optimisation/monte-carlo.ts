import type { MonteCarloSummary } from "../contracts/index";
import { clamp, mulberry32, normalSample, pearsonCorrelation, quantile } from "../solar/math";

export interface MonteCarloVariable {
  name: string;
  mean: number;
  standardDeviation: number;
  minimum: number;
  maximum: number;
}

export interface MonteCarloOptions {
  trials: number;
  seed: number;
  baselineGenerationKWh: number;
  variables?: readonly MonteCarloVariable[];
}

const DEFAULT_VARIABLES: MonteCarloVariable[] = [
  { name: "irradiance", mean: 1, standardDeviation: 0.055, minimum: 0.82, maximum: 1.18 },
  { name: "availability", mean: 0.988, standardDeviation: 0.009, minimum: 0.94, maximum: 1 },
  { name: "soiling", mean: 0.978, standardDeviation: 0.012, minimum: 0.9, maximum: 1 },
  { name: "temperature response", mean: 1, standardDeviation: 0.012, minimum: 0.95, maximum: 1.04 },
];

export function runYieldMonteCarlo(options: MonteCarloOptions): MonteCarloSummary {
  const trials = Math.max(20, Math.floor(options.trials));
  const random = mulberry32(options.seed);
  const variables = options.variables ?? DEFAULT_VARIABLES;
  const samplesByVariable = variables.map(() => new Array<number>(trials));
  const generation = new Array<number>(trials);
  for (let trial = 0; trial < trials; trial += 1) {
    let multiplier = 1;
    for (let index = 0; index < variables.length; index += 1) {
      const variable = variables[index];
      if (!variable) continue;
      const sample = clamp(
        variable.mean + normalSample(random) * variable.standardDeviation,
        variable.minimum,
        variable.maximum,
      );
      if (samplesByVariable[index]) samplesByVariable[index][trial] = sample;
      multiplier *= sample;
    }
    generation[trial] = Math.max(0, options.baselineGenerationKWh * multiplier);
  }
  const sorted = [...generation].sort((a, b) => a - b);
  const average = generation.reduce((total, value) => total + value, 0) / generation.length;
  const standardDeviation = Math.sqrt(
    generation.reduce((total, value) => total + (value - average) ** 2, 0) / generation.length,
  );
  return {
    trials,
    seed: options.seed,
    p05GenerationKWh: quantile(sorted, 0.05),
    p50GenerationKWh: quantile(sorted, 0.5),
    p95GenerationKWh: quantile(sorted, 0.95),
    coefficientOfVariationPct: average > 0 ? standardDeviation / average * 100 : 0,
    sensitivities: variables
      .map((variable, index) => ({
        input: variable.name,
        correlation: pearsonCorrelation(samplesByVariable[index] ?? [], generation),
      }))
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
  };
}
