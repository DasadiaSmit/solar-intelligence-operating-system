import { mean } from '../solar/math';

export interface EnergyCase { id: string; annualKWh: number[] }

/** Finite-scenario energy regret, with no probability or forecast interpretation. */
export function compareEnergyChoices(candidateIds: string[], nominal: number[], cases: EnergyCase[], tolerance = 1e-6) {
  if (candidateIds.length < 1 || new Set(candidateIds).size !== candidateIds.length || cases.length < 1 ||
      new Set(cases.map(c => c.id)).size !== cases.length || !Number.isFinite(tolerance) || tolerance < 0) throw new Error('Invalid candidate/scenario set or tie tolerance.');
  for (const values of [nominal, ...cases.map(c => c.annualKWh)]) {
    if (values.length !== candidateIds.length || !values.every(v => Number.isFinite(v) && v >= 0)) throw new Error('Energy values must be finite, nonnegative and complete.');
  }
  const nominalMaximum = Math.max(...nominal);
  const nominalWinnerIds = candidateIds.filter((_, i) => nominalMaximum - nominal[i] <= tolerance);
  const casesWithRegret = cases.map(c => {
    const best = Math.max(...c.annualKWh);
    return { ...c, winnerIds: candidateIds.filter((_, i) => best - c.annualKWh[i] <= tolerance), regretKWh: c.annualKWh.map(v => best - v) };
  });
  const candidates = candidateIds.map((id, i) => ({
    id, nominalKWh: nominal[i], meanHistoricalKWh: mean(cases.map(c => c.annualKWh[i])),
    worstRegretKWh: Math.max(...casesWithRegret.map(c => c.regretKWh[i])),
    winnerCount: casesWithRegret.filter(c => c.winnerIds.includes(id)).length,
  }));
  const minimumWorstRegret = Math.min(...candidates.map(c => c.worstRegretKWh));
  const robustWinnerIds = candidates.filter(c => c.worstRegretKWh - minimumWorstRegret <= tolerance).map(c => c.id);
  const nominalWorstRegrets = candidates.filter(c => nominalWinnerIds.includes(c.id)).map(c => c.worstRegretKWh);
  const rankReversals = [];
  for (let a=0;a<candidateIds.length;a++) for(let b=a+1;b<candidateIds.length;b++) {
    const positive = cases.filter(c => c.annualKWh[a]-c.annualKWh[b] > tolerance).map(c => c.id);
    const negative = cases.filter(c => c.annualKWh[b]-c.annualKWh[a] > tolerance).map(c => c.id);
    if (positive.length && negative.length) rankReversals.push({a:candidateIds[a],b:candidateIds[b],aBetterIn:positive,bBetterIn:negative});
  }
  return { nominalWinnerIds, robustWinnerIds, candidates, cases: casesWithRegret, rankReversals,
    worstRegretReductionKWh: { minimum: Math.min(...nominalWorstRegrets)-minimumWorstRegret, maximum: Math.max(...nominalWorstRegrets)-minimumWorstRegret },
    nominalYieldSacrificeKWh: robustWinnerIds.map(id => ({id,kWh:nominalMaximum-nominal[candidateIds.indexOf(id)]})),
    interpretation: 'Descriptive minimax regret over tested scenarios, not out-of-sample evidence or future probabilities. Ties are retained.' };
}

