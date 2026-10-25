import { compareEnergyChoices } from './energy-choice';

/** Raw modelled/synthetic evidence. Omission slots follow expectedScenarioIds. */
export interface DecisionEvidenceReportInput {
  candidateIds: string[];
  nominalKWh: Array<number | null>;
  historicalCases: Array<{ id: string; annualKWh: Array<number | null> }>;
  omittedAnnualKWh: Array<number | null>;
  expectedScenarioIds: string[];
  source: string;
  provenance: string;
  cachedRobustWinnerIds?: string[];
}

export const DECISION_EVIDENCE_REPORT_VERSION = 'decision-evidence-report-2.0.0';
const TIE_TOLERANCE_KWH = 1e-6;
const SCOPE = 'Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.';
const number = (value: number) => value.toLocaleString('en-GB', { maximumFractionDigits: 6 });
const display = (value: number | null) => value === null ? 'missing' : number(value);

function identifiers(values: string[], name: string, allowEmpty = false) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0) ||
      Array.from(values).some(value => typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) ||
      new Set(values).size !== values.length) {
    throw new Error(`${name} must contain unique identifiers using letters, numbers, hyphens or underscores.`);
  }
}

function energies(values: Array<number | null>, length: number, name: string) {
  if (!Array.isArray(values) || values.length !== length) throw new Error(`${name} has an invalid dimension; use null for a missing cell.`);
  for (const value of values) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new Error(`${name} must contain finite, nonnegative numbers or explicit null cells.`);
    }
  }
}

function text(value: string, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
  return value.replace(/\s+/g, ' ').trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_[\]|]/g, '\\$&');
}

/**
 * Separately versioned guarded renderer; it never reads or alters the v1 report.
 * Missing evidence yields a partial report. Malformed raw evidence is rejected.
 * Cached choices are advisory only; every available decision is recomputed.
 */
export function buildDecisionEvidenceReport(input: DecisionEvidenceReportInput): string {
  if (!input || typeof input !== 'object') throw new Error('Raw report evidence is required.');
  identifiers(input.candidateIds, 'Candidate identifiers');
  identifiers(input.expectedScenarioIds, 'Expected scenario identifiers');
  const source = text(input.source, 'Source');
  const provenance = text(input.provenance, 'Provenance');
  const count = input.candidateIds.length;
  energies(input.nominalKWh, count, 'Nominal evidence');
  if (!Array.isArray(input.historicalCases)) throw new Error('Historical evidence must be an array.');
  identifiers(input.historicalCases.map(row => row?.id), 'Historical scenario identifiers', true);
  for (const row of input.historicalCases) {
    if (!input.expectedScenarioIds.includes(row.id)) throw new Error(`Unexpected historical scenario: ${row.id}.`);
    energies(row.annualKWh, count, `Historical evidence for ${row.id}`);
  }
  if (!Array.isArray(input.omittedAnnualKWh) || input.omittedAnnualKWh.length > input.expectedScenarioIds.length) {
    throw new Error('Omission evidence has more entries than the expected source scenarios.');
  }
  energies(input.omittedAnnualKWh, input.omittedAnnualKWh.length, 'Omission evidence');
  if (input.cachedRobustWinnerIds !== undefined && !Array.isArray(input.cachedRobustWinnerIds)) {
    throw new Error('Cached winner identifiers must be an array when supplied.');
  }

  const expectedCount = input.expectedScenarioIds.length;
  const rows = new Map(input.historicalCases.map(row => [row.id, row]));
  const orderedRows = input.expectedScenarioIds.flatMap(id => rows.has(id) ? [rows.get(id)!] : []);
  const missingLocations = input.expectedScenarioIds.flatMap(id => input.candidateIds.flatMap((candidate, index) =>
    !rows.has(id) || rows.get(id)!.annualKWh[index] === null ? [`${id} / ${candidate}`] : []));
  const missingRows = input.expectedScenarioIds.filter(id => !rows.has(id));
  const completeRows = orderedRows.filter(row => row.annualKWh.every(value => value !== null)).length;
  const nominalComplete = input.nominalKWh.every(value => value !== null);
  const historyComplete = orderedRows.length === expectedCount && missingLocations.length === 0;
  const nominal = nominalComplete ? input.nominalKWh as number[] : undefined;
  const maximum = nominal ? Math.max(...nominal) : undefined;
  const nominalWinners = nominal ? input.candidateIds.filter((_, index) => maximum! - nominal[index] <= TIE_TOLERANCE_KWH) : [];
  const choice = nominal && historyComplete ? compareEnergyChoices(input.candidateIds, nominal,
    orderedRows.map(row => ({ id: row.id, annualKWh: row.annualKWh as number[] })), TIE_TOLERANCE_KWH) : undefined;
  const omissionValues = input.expectedScenarioIds.map((_, index) => input.omittedAnnualKWh[index] ?? null);
  const omissionComplete = omissionValues.every(value => value !== null);
  const warnings: string[] = [];
  if (input.cachedRobustWinnerIds !== undefined) {
    const cached = Array.from(input.cachedRobustWinnerIds);
    if (!choice) {
      warnings.push('Cached recommendation was not used: the raw nominal or expected historical evidence is incomplete.');
    } else if (cached.length === 0 || new Set(cached).size !== cached.length || cached.some(id => !input.candidateIds.includes(id))) {
      warnings.push('Cached recommendation ignored: it contains unknown, duplicate or no option identifiers. All decision facts below were recomputed from raw evidence.');
    } else if (cached.length !== choice.robustWinnerIds.length || cached.some(id => !choice.robustWinnerIds.includes(id))) {
      warnings.push('Cached recommendation conflicts with the raw evidence and was ignored. All decision facts below were recomputed from raw evidence.');
    } else {
      warnings.push('Cached recommendation agrees with the recomputed result; the report still uses raw evidence.');
    }
  }

  const lines = [
    '# Solar decision evidence report', '', `Report version: ${DECISION_EVIDENCE_REPORT_VERSION}.`, '',
    `Source: ${source}`, '', `Provenance supplied with the evidence: ${provenance}`, '', SCOPE, '',
    'This report checks the supplied arithmetic and completeness. It does not independently authenticate the source or validate a physical model.', '',
    '## Evidence coverage', '',
    `Available historical scenarios: **${orderedRows.length} / ${expectedCount}**. Missing historical cells: **${missingLocations.length}**.${missingLocations.length ? ` Missing locations: ${missingLocations.join(', ')}.` : ''}`,
    `Complete historical scenarios: **${completeRows} / ${expectedCount}**. Available counts refer to present rows; present rows with missing cells are not complete scenarios.`,
    `Expected scenario identifiers: ${input.expectedScenarioIds.join(', ')}.`,
    ...(missingRows.length ? [`Missing historical rows: ${missingRows.join(', ')}.`] : []), '',
    ...warnings.flatMap(warning => [`**Evidence warning:** ${warning}`, '']),
    '## Nominal estimate and finite-scenario choice', '',
    ...(nominal ? [`Nominal representative-year winner(s): **${nominalWinners.join(', ')}**.`] : [
      'Nominal winner and maximum energy are withheld: nominal evidence is incomplete.',
      `Missing nominal options: ${input.candidateIds.filter((_, index) => input.nominalKWh[index] === null).join(', ')}.`,
    ]),
  ];
  if (choice) {
    const gain = choice.worstRegretReductionKWh;
    lines.push(`Minimax-regret winner(s) across the ${expectedCount} expected scenarios: **${choice.robustWinnerIds.join(', ')}**.`);
    lines.push(gain.maximum <= TIE_TOLERANCE_KWH
      ? 'The robust rule does not reduce worst-case regret for the nominal choice in this tested set. This is a zero-benefit result, not evidence of improvement.'
      : `Within the ${expectedCount} tested scenarios, switching from the nominal rule to the minimax-regret rule reduces worst-case regret by ${number(gain.minimum)}–${number(gain.maximum)} kWh (range covers nominal ties). This is an in-scenario comparison, not evidence of future performance.`);
    lines.push(`There are **${choice.rankReversals.length}** option pairs whose relative order reverses between historical scenarios. Winner counts describe this finite set, not probabilities.`);
  } else {
    lines.push('Minimax-regret choice, ranking reversals, regret reduction and nominal sacrifice are withheld until every expected historical cell and nominal value is available. A cached result cannot fill missing evidence.');
  }
  lines.push('', `Ties within ${TIE_TOLERANCE_KWH.toFixed(6)} kWh are retained. Regret is each scenario’s highest yield minus an option’s yield; the robust rule minimises the maximum of those regrets.`, '',
    `| Option | Nominal annual kWh | Difference from nominal maximum (%) |${choice ? ' Worst historical regret (kWh) | Historical winner count |' : ''}`,
    `| --- | ---: | ---: |${choice ? ' ---: | ---: |' : ''}`,
    ...input.candidateIds.map((id, index) => {
      const relative = maximum !== undefined && maximum > 0 && input.nominalKWh[index] !== null
        ? number((input.nominalKWh[index]! / maximum - 1) * 100) : 'undefined';
      const candidate = choice?.candidates[index];
      return `| ${id} | ${display(input.nominalKWh[index])} | ${relative} |${candidate ? ` ${number(candidate.worstRegretKWh)} | ${candidate.winnerCount} / ${expectedCount} |` : ''}`;
    }), '', 'Relative percentages are undefined when the nominal maximum is zero or unavailable; they are not replaced with zero.', '');
  if (choice) {
    lines.push('### Nominal yield sacrificed by each robust option', '',
      'Sacrifice is the highest nominal yield minus the selected option’s nominal yield. It is distinct from regret reduction.', '',
      '| Robust option | Nominal sacrifice (kWh) |', '| --- | ---: |',
      ...choice.nominalYieldSacrificeKWh.map(row => `| ${row.id} | ${number(row.kWh)} |`), '');
  }
  lines.push('## Source-omission sensitivity', '',
    omissionComplete
      ? `Sensitivity range: **${number(Math.min(...omissionValues as number[]))}–${number(Math.max(...omissionValues as number[]))} kWh**. This is a sensitivity range, not a confidence interval.`
      : `Sensitivity range unavailable: ${omissionValues.filter(value => value !== null).length} / ${expectedCount} omission results are available. Every expected omission must be present to report the range.`,
    ...(omissionComplete ? [] : [`Missing omission cases: ${input.expectedScenarioIds.filter((_, index) => omissionValues[index] === null).map(id => `omit-${id}`).join(', ')}.`]), '',
    '| Omission case | Annual kWh |', '| --- | ---: |',
    ...omissionValues.map((value, index) => `| omit-${input.expectedScenarioIds[index]} | ${display(value)} |`), '',
    'Omission results describe sensitivity, not a confidence interval. The series is interpreted as one reference configuration described by the supplied provenance; this report does not verify that assumption. Its range is not an uncertainty bound for every candidate.', '',
    '## Raw historical evidence', '',
    `| Historical scenario | ${input.candidateIds.join(' | ')} |`,
    `| --- | ${input.candidateIds.map(() => '---:').join(' | ')} |`,
    ...orderedRows.map(row => `| ${row.id} | ${row.annualKWh.map(display).join(' | ')} |`), '',
    'All energy values are in kWh. Missing rows and cells remain missing; no zero filling or scenario substitution is performed.', '');
  return lines.join('\n');
}
