export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function quantile(sortedValues: readonly number[], probability: number): number {
  if (sortedValues.length === 0) return 0;
  const p = clamp(probability, 0, 1);
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower] ?? 0;
  const fraction = index - lower;
  return (sortedValues[lower] ?? 0) * (1 - fraction) + (sortedValues[upper] ?? 0) * fraction;
}

export function pearsonCorrelation(a: readonly number[], b: readonly number[]): number {
  const count = Math.min(a.length, b.length);
  if (count < 2) return 0;
  let sumA = 0;
  let sumB = 0;
  for (let index = 0; index < count; index += 1) {
    sumA += a[index] ?? 0;
    sumB += b[index] ?? 0;
  }
  const meanA = sumA / count;
  const meanB = sumB / count;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < count; index += 1) {
    const da = (a[index] ?? 0) - meanA;
    const db = (b[index] ?? 0) - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  const denominator = Math.sqrt(varianceA * varianceB);
  return denominator <= Number.EPSILON ? 0 : covariance / denominator;
}

/** Fast deterministic 32-bit generator suitable for reproducible simulations, not security. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function normalSample(random: () => number): number {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
