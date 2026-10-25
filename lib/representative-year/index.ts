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

export interface RepresentativeYearOptions {
  sourceYears?: readonly SampleYear[];
  persistenceWeight?: number;
  continuityWeight?: number;
}

export interface MonthCandidateScore {
  month: number;
  year: SampleYear;
  distributionScore: number;
  persistencePenalty: number;
  continuityPenalty: number;
  totalScore: number;
  selected: boolean;
}

export interface RepresentativeYearBuild {
  weather: WeatherHour[];
  record: RepresentativeYearRecord;
  diagnostics: {
    sourceYears: SampleYear[];
    persistenceWeight: number;
    continuityWeight: number;
    candidates: MonthCandidateScore[];
    selectionMargins: Array<{ month: number; selectedYear: SampleYear; margin: number }>;
  };
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
  sourceYears: readonly SampleYear[],
): Map<number, DailyCandidate[]> {
  const result = new Map<number, DailyCandidate[]>();
  for (const year of sourceYears) {
    const weather = historical[year];
    if (!weather || weather.length !== 8760) throw new Error(`Source year ${year} must have 8760 complete no-leap hours.`);
    for (let index = 0; index < weather.length; index++) {
      const hour = weather[index];
      if (hour.sourceYear !== year || hour.hour !== index % 24 || hour.dayOfYear !== Math.floor(index / 24) + 1 ||
          hour.day < 1 || hour.day > (DAYS_IN_MONTH[hour.month - 1] ?? 0) ||
          noLeapDayOfYear(hour.month, hour.day) !== hour.dayOfYear) {
        throw new Error(`Source year ${year} has an invalid no-leap calendar at hour ${index}.`);
      }
    }
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
  sourceYears: readonly SampleYear[],
): number {
  const regimes = ["clear", "overcast", "wet"];
  let total = 0;
  for (const regime of regimes) {
    const referenceRuns = sourceYears.map((year) => longestRun(candidatesByYear.get(year) ?? [], regime));
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
  options: RepresentativeYearOptions = {},
): RepresentativeYearBuild {
  const sourceYears = [...(options.sourceYears ?? SAMPLE_YEARS)].sort((a,b) => a-b);
  if (sourceYears.length < 2 || new Set(sourceYears).size !== sourceYears.length ||
      sourceYears.some(year => !SAMPLE_YEARS.includes(year))) throw new Error("Select at least two distinct supported source years.");
  const persistenceWeight = options.persistenceWeight ?? 0.08;
  const continuityWeight = options.continuityWeight ?? 0.04;
  if (![persistenceWeight, continuityWeight].every(v => Number.isFinite(v) && v >= 0)) throw new Error("Selection weights must be finite and nonnegative.");
  const isDefault = sourceYears.join() === SAMPLE_YEARS.join() && persistenceWeight === 0.08 && continuityWeight === 0.04;
  const methodIdentity = isDefault ? REPRESENTATIVE_YEAR_METHOD_VERSION :
    `${REPRESENTATIVE_YEAR_METHOD_VERSION}|audit-1|${sourceYears.join(',')}|${persistenceWeight}|${continuityWeight}`;
  const diagnostics: RepresentativeYearBuild["diagnostics"] = { sourceYears, persistenceWeight, continuityWeight, candidates: [], selectionMargins: [] };
  const grouped = groupDaily(historical, sourceYears);
  const output: WeatherHour[] = [];
  const monthlyConstruction: RepresentativeMonthRecord[] = [];
  const annualCounts: Record<SampleYear, number> = { 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
  const selectedYears: SampleYear[] = [];
  let priorMonthLastDay: DailyCandidate | null = null;

  for (let month = 1; month <= 12; month += 1) {
    const candidates = grouped.get(month) ?? [];
    const requiredDays = DAYS_IN_MONTH[month - 1] ?? 0;
    const candidatesByYear = new Map<SampleYear, DailyCandidate[]>();
    for (const year of sourceYears) {
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

    for (const year of sourceYears) {
      const monthDays = candidatesByYear.get(year) ?? [];
      const fsScore =
        0.45 * finkelsteinSchaferStatistic(monthDays.map((day) => day.irradiationKWhM2), longTerm.irradiation) +
        0.25 * finkelsteinSchaferStatistic(monthDays.map((day) => day.meanTemperatureC), longTerm.temperature) +
        0.1 * finkelsteinSchaferStatistic(monthDays.map((day) => day.meanWindSpeedMps), longTerm.wind) +
        0.15 * finkelsteinSchaferStatistic(monthDays.map((day) => day.meanCloudPct), longTerm.cloud) +
        0.05 * finkelsteinSchaferStatistic(monthDays.map((day) => day.precipitationMm), longTerm.precipitation);
      const persistence = persistencePenalty(monthDays, candidatesByYear, sourceYears);
      const continuity = boundaryPenalty(priorMonthLastDay, monthDays[0]);
      const score = fsScore + persistenceWeight * persistence + continuityWeight * continuity;
      diagnostics.candidates.push({month, year, distributionScore: fsScore, persistencePenalty: persistence, continuityPenalty: continuity, totalScore: score, selected: false});
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

    const scores = diagnostics.candidates.filter(candidate => candidate.month === month);
    for (const score of scores) score.selected = score.year === selectedYear;
    const ordered = [...scores].sort((a,b) => a.totalScore - b.totalScore || a.year - b.year);
    diagnostics.selectionMargins.push({month, selectedYear, margin: ordered[1].totalScore - ordered[0].totalScore});
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
    id: `representative-${targetYear}-${sourceFingerprint(`${sourceIdentity}|${selectedYears.join("-")}|${methodIdentity}`)}`,
    method: "Finkelstein–Schafer-inspired multivariate whole-month selection",
    status: "experimental",
    sourceYears,
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
      sourceYears.length === 4 ? "Only four source years are available, so this is an experimental representative year rather than a standards-compliant long-term TMY." : `Only ${sourceYears.length} selected source years are available; this is a retrospective short-record diagnostic, not a long-term TMY.`,
      `Method version: ${methodIdentity}.`,
    ],
    uncertaintyMethod: `Q10–Q90 interannual source-year generation spread (n=${sourceYears.length}); not a calibrated forecast interval`,
  };
  return { weather: output, record, diagnostics };
}

export function percentileRank(value: number, values: readonly number[]): number {
  if (values.length === 0) return 0;
  let count = 0;
  for (const item of values) if (item <= value) count += 1;
  return clamp(count / values.length, 0, 1);
}
