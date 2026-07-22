import type {
  RepresentativeMonthRecord,
  RepresentativeYearRecord,
  WeatherHour,
} from "../contracts/index";
import { DATASET_VERSION, makeQuality } from "../contracts/index";
import type { SampleYear } from "../sample/weather";
import { DAYS_IN_MONTH, SAMPLE_YEARS } from "../sample/weather";
import { clamp, mean, quantile } from "../solar/math";

const REPRESENTATIVE_YEAR_METHOD_VERSION = "sios-fs-month-selection-1.0.0";

interface DailyCandidate {
  year: SampleYear;
  month: number;
  day: number;
  hours: WeatherHour[];
  irradiationKWhM2: number;
  meanTemperatureC: number;
  meanWindSpeedMps: number;
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
        meanWindSpeedMps: mean(hours.map((hour) => hour.windSpeedMps)),
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

function upperBound(sorted: readonly number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((sorted[middle] ?? 0) <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Mean absolute separation between a candidate-month and long-term empirical CDF. */
function finkelsteinSchaferStatistic(
  candidate: readonly number[],
  longTerm: readonly number[],
): number {
  if (candidate.length === 0 || longTerm.length === 0) return Number.POSITIVE_INFINITY;
  const candidateSorted = [...candidate].sort((a, b) => a - b);
  const longTermSorted = [...longTerm].sort((a, b) => a - b);
  let difference = 0;
  for (let index = 0; index < longTermSorted.length; index += 1) {
    const value = longTermSorted[index] ?? 0;
    const longTermCdf = (index + 1) / longTermSorted.length;
    const candidateCdf = upperBound(candidateSorted, value) / candidateSorted.length;
    difference += Math.abs(candidateCdf - longTermCdf);
  }
  return difference / longTermSorted.length;
}

function longestRun(days: readonly DailyCandidate[], regime: string): number {
  let longest = 0;
  let current = 0;
  for (const day of days) {
    if (day.regime === regime) {
      current += 1;
      longest = Math.max(longest, current);
    } else current = 0;
  }
  return longest;
}

function persistencePenalty(
  candidate: readonly DailyCandidate[],
  candidatesByYear: Map<SampleYear, DailyCandidate[]>,
): number {
  const regimes = ["clear", "overcast", "wet"];
  let total = 0;
  for (const regime of regimes) {
    const referenceRuns = SAMPLE_YEARS.map((year) => longestRun(candidatesByYear.get(year) ?? [], regime));
    const reference = mean(referenceRuns);
    total += Math.abs(longestRun(candidate, regime) - reference) / Math.max(1, reference);
  }
  return total / regimes.length;
}

function noLeapDayOfYear(month: number, day: number): number {
  return DAYS_IN_MONTH.slice(0, month - 1).reduce((total, value) => total + value, 0) + day;
}

function remapHour(hour: WeatherHour, targetYear: number, month: number, day: number): WeatherHour {
  const timestamp = new Date(Date.UTC(targetYear, month - 1, day, hour.hour, 30)).toISOString();
  return {
    ...hour,
    timestamp,
    sourceTimestamp: hour.sourceTimestamp,
    dayOfYear: noLeapDayOfYear(month, day),
    month,
    day,
    quality: makeQuality(
      Math.max(0, hour.quality.score - 0.02),
      [...new Set([...hour.quality.flags, "representative-month-selection"])],
      hour.quality.completeness,
      hour.quality.imputed,
    ),
  };
}

function boundaryPenalty(prior: DailyCandidate | null, next: DailyCandidate | undefined): number {
  const priorLast = prior?.hours[23];
  const nextFirst = next?.hours[0];
  if (!priorLast || !nextFirst) return 0;
  return (
    Math.abs(priorLast.temperatureC - nextFirst.temperatureC) / 30 * 0.6 +
    Math.abs(priorLast.cloudCoverPct - nextFirst.cloudCoverPct) / 100 * 0.4
  );
}

function sourceFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Constructs a TMY-like no-leap year by selecting one complete source month
 * for each calendar month. Candidate months are ranked with a
 * Finkelstein–Schafer-inspired multivariate empirical-CDF score, persistence
 * and boundary-continuity penalties. With only four source years this remains
 * an experimental representative year, not a standards-compliant long-term
 * TMY product.
 */
export function buildRepresentativeYear(
  historical: Record<SampleYear, WeatherHour[]>,
  targetYear = 2026,
  sourceIdentity = DATASET_VERSION,
): RepresentativeYearBuild {
  const grouped = groupDaily(historical);
  const output: WeatherHour[] = [];
  const monthlyConstruction: RepresentativeMonthRecord[] = [];
  const annualCounts: Record<SampleYear, number> = { 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
  const selectedYears: SampleYear[] = [];
  let priorMonthLastDay: DailyCandidate | null = null;

  for (let month = 1; month <= 12; month += 1) {
    const candidates = grouped.get(month) ?? [];
    const requiredDays = DAYS_IN_MONTH[month - 1] ?? 0;
    const candidatesByYear = new Map<SampleYear, DailyCandidate[]>();
    for (const year of SAMPLE_YEARS) {
      const yearCandidates = candidates
        .filter((candidate) => candidate.year === year)
        .sort((a, b) => a.day - b.day);
      if (yearCandidates.length !== requiredDays) {
        throw new Error(
          `Representative month ${month} for ${year} requires ${requiredDays} complete days; received ${yearCandidates.length}.`,
        );
      }
      candidatesByYear.set(year, yearCandidates);
    }

    const longTerm = {
      irradiation: candidates.map((day) => day.irradiationKWhM2),
      temperature: candidates.map((day) => day.meanTemperatureC),
      wind: candidates.map((day) => day.meanWindSpeedMps),
      cloud: candidates.map((day) => day.meanCloudPct),
      precipitation: candidates.map((day) => day.precipitationMm),
    };
    let selectedYear: SampleYear | null = null;
    let selectedDays: DailyCandidate[] = [];
    let selectedScore = Number.POSITIVE_INFINITY;
    let selectedContinuity = 0;

    for (const year of SAMPLE_YEARS) {
      const monthDays = candidatesByYear.get(year) ?? [];
      const fsScore =
        0.45 * finkelsteinSchaferStatistic(monthDays.map((day) => day.irradiationKWhM2), longTerm.irradiation) +
        0.25 * finkelsteinSchaferStatistic(monthDays.map((day) => day.meanTemperatureC), longTerm.temperature) +
        0.1 * finkelsteinSchaferStatistic(monthDays.map((day) => day.meanWindSpeedMps), longTerm.wind) +
        0.15 * finkelsteinSchaferStatistic(monthDays.map((day) => day.meanCloudPct), longTerm.cloud) +
        0.05 * finkelsteinSchaferStatistic(monthDays.map((day) => day.precipitationMm), longTerm.precipitation);
      const persistence = persistencePenalty(monthDays, candidatesByYear);
      const continuity = boundaryPenalty(priorMonthLastDay, monthDays[0]);
      const score = fsScore + 0.08 * persistence + 0.04 * continuity;
      if (score < selectedScore) {
        selectedYear = year;
        selectedDays = monthDays;
        selectedScore = score;
        selectedContinuity = continuity;
      }
    }
    if (selectedYear === null || selectedDays.length !== requiredDays) {
      throw new Error(`Representative selection failed for month ${month}.`);
    }

    selectedYears.push(selectedYear);
    annualCounts[selectedYear] += requiredDays;
    const sourceYearWeights: Record<SampleYear, number> = { 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
    sourceYearWeights[selectedYear] = 1;
    const regimeCounts: Record<string, number> = {};
    for (const day of selectedDays) {
      regimeCounts[day.regime] = (regimeCounts[day.regime] ?? 0) + 1;
      for (const hour of day.hours) output.push(remapHour(hour, targetYear, month, day.day));
    }
    priorMonthLastDay = selectedDays.at(-1) ?? null;

    const chosenIrradiance = selectedDays.map((day) => day.irradiationKWhM2).sort((a, b) => a - b);
    const sortedLongTermIrradiance = [...longTerm.irradiation].sort((a, b) => a - b);
    const percentileDeviation = [0.1, 0.25, 0.5, 0.75, 0.9]
      .map((probability) => {
        const reference = quantile(sortedLongTermIrradiance, probability);
        return Math.abs(quantile(chosenIrradiance, probability) - reference) / Math.max(0.01, reference);
      })
      .reduce((total, value) => total + value, 0) / 5;
    monthlyConstruction.push({
      month,
      sourceYearWeights,
      irradiancePercentileDeviation: percentileDeviation,
      temperatureDeviationC:
        mean(selectedDays.map((day) => day.meanTemperatureC)) - mean(longTerm.temperature),
      continuityPenalty: selectedContinuity,
      regimeCounts,
    });
  }

  if (output.length !== 8_760) {
    throw new Error(`Representative year must contain 8,760 hours, got ${output.length}.`);
  }
  const usesSimulatedSources = output.every((hour) =>
    hour.quality.flags.some((flag) => /sample|simulat/i.test(flag)),
  );
  const record: RepresentativeYearRecord = {
    id: `representative-${targetYear}-${sourceFingerprint(`${sourceIdentity}|${selectedYears.join("-")}|${REPRESENTATIVE_YEAR_METHOD_VERSION}`)}`,
    method: "Finkelstein–Schafer-inspired multivariate whole-month selection",
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
      usesSimulatedSources
        ? "Source months are deterministic simulated proving data, not observations."
        : "Source months are weather-model reanalysis and are not direct station observations.",
      "Each selected month comes intact from one source year; 29 February is excluded for a 365-day comparison calendar.",
      "Candidate ranking uses multivariate empirical-CDF, weather-persistence and month-boundary continuity scores.",
      "Only four source years are available, so this is an experimental representative year rather than a standards-compliant long-term TMY.",
      `Method version: ${REPRESENTATIVE_YEAR_METHOD_VERSION}.`,
    ],
    uncertaintyMethod: "Q10–Q90 interannual source-year generation spread (n=4); not a calibrated forecast interval",
  };
  return { weather: output, record };
}

export function percentileRank(value: number, values: readonly number[]): number {
  if (values.length === 0) return 0;
  let count = 0;
  for (const item of values) if (item <= value) count += 1;
  return clamp(count / values.length, 0, 1);
}
