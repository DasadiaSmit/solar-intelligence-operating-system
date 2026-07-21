import type {
  RepresentativeMonthRecord,
  RepresentativeYearRecord,
  WeatherHour,
} from "../contracts/index";
import { DATASET_VERSION, makeQuality } from "../contracts/index";
import type { SampleYear } from "../sample/weather";
import { DAYS_IN_MONTH, SAMPLE_YEARS } from "../sample/weather";
import { clamp, mean, quantile } from "../solar/math";

interface DailyCandidate {
  year: SampleYear;
  month: number;
  day: number;
  hours: WeatherHour[];
  irradiationKWhM2: number;
  meanTemperatureC: number;
  meanCloudPct: number;
  precipitationMm: number;
  snowHours: number;
  regime: string;
}

export interface RepresentativeYearBuild {
  weather: WeatherHour[];
  record: RepresentativeYearRecord;
}

function dailyRegime(candidate: Omit<DailyCandidate, "regime">): string {
  if (candidate.snowHours >= 4) return "snow";
  if (candidate.precipitationMm >= 3) return "wet";
  if (candidate.meanCloudPct >= 75) return "overcast";
  if (candidate.meanCloudPct <= 32) return "clear";
  return "variable-cloud";
}

function groupDaily(
  historical: Record<SampleYear, WeatherHour[]>,
): Map<number, DailyCandidate[]> {
  const result = new Map<number, DailyCandidate[]>();
  for (const year of SAMPLE_YEARS) {
    const weather = historical[year];
    for (let offset = 0; offset < weather.length; offset += 24) {
      const hours = weather.slice(offset, offset + 24);
      const first = hours[0];
      if (!first || hours.length !== 24) continue;
      const base = {
        year,
        month: first.month,
        day: first.day,
        hours,
        irradiationKWhM2: hours.reduce((total, hour) => total + hour.ghiWm2 / 1000, 0),
        meanTemperatureC: mean(hours.map((hour) => hour.temperatureC)),
        meanCloudPct: mean(hours.map((hour) => hour.cloudCoverPct)),
        precipitationMm: hours.reduce((total, hour) => total + hour.precipitationMm, 0),
        snowHours: hours.filter((hour) => hour.snowDepthCm > 0.5).length,
      };
      const candidate: DailyCandidate = { ...base, regime: dailyRegime(base) };
      const monthCandidates = result.get(first.month) ?? [];
      monthCandidates.push(candidate);
      result.set(first.month, monthCandidates);
    }
  }
  return result;
}

function normalizedDifference(value: number, target: number, values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const scale = Math.max(0.001, quantile(sorted, 0.9) - quantile(sorted, 0.1));
  return Math.abs(value - target) / scale;
}

function remapHour(hour: WeatherHour, targetYear: number, month: number, day: number): WeatherHour {
  const timestamp = new Date(Date.UTC(targetYear, month - 1, day, hour.hour, 30)).toISOString();
  return {
    ...hour,
    timestamp,
    sourceTimestamp: hour.sourceTimestamp,
    month,
    day,
    quality: makeQuality(
      Math.max(0, hour.quality.score - 0.025),
      [...hour.quality.flags, "representative-day-selection"],
      hour.quality.completeness,
      hour.quality.imputed,
    ),
  };
}

/**
 * Builds a distribution-matched synthetic year. Each monthly sequence draws
 * whole historical days against irradiance, temperature and cloud quantiles,
 * with source-balance, no-reuse and boundary-continuity penalties. This retains
 * physically coherent intraday weather instead of averaging individual hours.
 */
export function buildRepresentativeYear(
  historical: Record<SampleYear, WeatherHour[]>,
  targetYear = 2026,
): RepresentativeYearBuild {
  const grouped = groupDaily(historical);
  const output: WeatherHour[] = [];
  const monthlyConstruction: RepresentativeMonthRecord[] = [];
  const annualCounts: Record<SampleYear, number> = { 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
  let priorDay: DailyCandidate | null = null;

  for (let month = 1; month <= 12; month += 1) {
    const candidates = grouped.get(month) ?? [];
    const requiredDays = DAYS_IN_MONTH[month - 1] ?? 0;
    if (candidates.length < requiredDays) {
      throw new Error(`Insufficient source days for representative month ${month}`);
    }
    const irradianceValues = candidates.map((day) => day.irradiationKWhM2);
    const temperatureValues = candidates.map((day) => day.meanTemperatureC);
    const cloudValues = candidates.map((day) => day.meanCloudPct);
    const sortedIrradiance = [...irradianceValues].sort((a, b) => a - b);
    const sortedTemperature = [...temperatureValues].sort((a, b) => a - b);
    const sortedCloud = [...cloudValues].sort((a, b) => a - b);
    const selected = new Set<string>();
    const monthCounts: Record<SampleYear, number> = { 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
    const chosen: DailyCandidate[] = [];
    let continuityTotal = 0;

    for (let targetDay = 1; targetDay <= requiredDays; targetDay += 1) {
      // Golden-ratio sequences avoid arranging the synthetic month from dark to bright.
      const qIrr = ((targetDay * 0.61803398875 + month * 0.173) % 1 + 1) % 1;
      const qTemp = ((targetDay * 0.41421356237 + month * 0.297) % 1 + 1) % 1;
      const qCloud = ((targetDay * 0.73205080757 + month * 0.119) % 1 + 1) % 1;
      const targetIrradiance = quantile(sortedIrradiance, qIrr);
      const targetTemperature = quantile(sortedTemperature, qTemp);
      const targetCloud = quantile(sortedCloud, qCloud);
      let best: DailyCandidate | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      let bestContinuity = 0;
      for (const candidate of candidates) {
        const key = `${candidate.year}-${candidate.month}-${candidate.day}`;
        if (selected.has(key)) continue;
        const distributionScore =
          0.52 * normalizedDifference(candidate.irradiationKWhM2, targetIrradiance, irradianceValues) +
          0.25 * normalizedDifference(candidate.meanTemperatureC, targetTemperature, temperatureValues) +
          0.23 * normalizedDifference(candidate.meanCloudPct, targetCloud, cloudValues);
        const sourceShare = monthCounts[candidate.year] / Math.max(1, targetDay - 1);
        const balancePenalty = Math.max(0, sourceShare - 0.32) * 0.7;
        let continuityPenalty = 0;
        if (priorDay) {
          const priorLast = priorDay.hours[23];
          const candidateFirst = candidate.hours[0];
          if (priorLast && candidateFirst) {
            continuityPenalty =
              Math.abs(priorLast.temperatureC - candidateFirst.temperatureC) / 30 * 0.08 +
              Math.abs(priorLast.cloudCoverPct - candidateFirst.cloudCoverPct) / 100 * 0.05;
          }
        }
        const score = distributionScore + balancePenalty + continuityPenalty;
        if (score < bestScore) {
          best = candidate;
          bestScore = score;
          bestContinuity = continuityPenalty;
        }
      }
      if (!best) throw new Error(`Representative selection failed for month ${month}`);
      selected.add(`${best.year}-${best.month}-${best.day}`);
      monthCounts[best.year] += 1;
      annualCounts[best.year] += 1;
      continuityTotal += bestContinuity;
      chosen.push(best);
      for (const hour of best.hours) output.push(remapHour(hour, targetYear, month, targetDay));
      priorDay = best;
    }

    const chosenIrradiance = chosen.map((day) => day.irradiationKWhM2).sort((a, b) => a - b);
    let percentileDeviation = 0;
    for (const probability of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const sourceValue = quantile(sortedIrradiance, probability);
      percentileDeviation += Math.abs(quantile(chosenIrradiance, probability) - sourceValue) /
        Math.max(0.01, sourceValue);
    }
    const regimeCounts: Record<string, number> = {};
    for (const day of chosen) regimeCounts[day.regime] = (regimeCounts[day.regime] ?? 0) + 1;
    monthlyConstruction.push({
      month,
      sourceYearWeights: {
        2022: monthCounts[2022] / requiredDays,
        2023: monthCounts[2023] / requiredDays,
        2024: monthCounts[2024] / requiredDays,
        2025: monthCounts[2025] / requiredDays,
      },
      irradiancePercentileDeviation: percentileDeviation / 5,
      temperatureDeviationC:
        mean(chosen.map((day) => day.meanTemperatureC)) - mean(temperatureValues),
      continuityPenalty: continuityTotal / requiredDays,
      regimeCounts,
    });
  }

  if (output.length !== 8760) throw new Error(`Representative year must contain 8760 hours, got ${output.length}`);
  const record: RepresentativeYearRecord = {
    id: `representative-${targetYear}-${DATASET_VERSION}`,
    method: "Monthly multivariate quantile matching with whole-day resampling and continuity penalty",
    status: "experimental",
    sourceYears: [...SAMPLE_YEARS],
    hours: output.length,
    sourceYearWeights: {
      2022: annualCounts[2022] / 365,
      2023: annualCounts[2023] / 365,
      2024: annualCounts[2024] / 365,
      2025: annualCounts[2025] / 365,
    },
    monthlyConstruction,
    comparisons: [],
    assumptions: [
      "Source days are deterministic simulated proving data, not observations.",
      "Leap days are excluded so all source years contain 8760 comparable hours.",
      "Whole days preserve intraday covariance; joins are continuity-penalised but remain synthetic.",
      "Monthly distributions target irradiance, temperature and cloud quantiles without trend projection.",
    ],
    uncertaintyMethod: "Interannual source spread plus deterministic residual-ensemble intervals",
  };
  return { weather: output, record };
}

export function percentileRank(value: number, values: readonly number[]): number {
  if (values.length === 0) return 0;
  let count = 0;
  for (const item of values) if (item <= value) count += 1;
  return clamp(count / values.length, 0, 1);
}
