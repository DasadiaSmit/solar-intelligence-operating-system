import { DEFAULT_SYSTEM_CONFIG } from '../sample/defaults';
import type { AnnualResearchStudy } from './annual-study';
import { buildDecisionReport, type RepresentativeAudit } from './decision-report';
import { compareEnergyChoices } from './representative-audit';

export interface ReportBenchmarkCase {
  id: string;
  title: string;
  stratum: string;
  candidateIds: string[];
  nominalKWh: number[];
  historicalCases: Array<{ id: string; annualKWh: Array<number | null> }>;
  omittedAnnualKWh: number[];
  tamper?: { robustWinnerIds: string[] };
}

const format = (value: number | null) => value === null || !Number.isFinite(value) ? 'missing' : value.toFixed(2);
export const BENCHMARK_SCOPE = 'Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.';

export function fixtureNotice(c: ReportBenchmarkCase): string {
  return `**Arithmetic test fixture ${c.id}: ${c.title}. These are hand-defined verification values, not physics-generated research data. Production formatter wording below is test output, not fixture provenance. Equal monthly splits and zero seam values, where displayed, are test scaffolding outside the scored questions.**\n\n${BENCHMARK_SCOPE}\n\n`;
}

export function scenarioCountText(c: ReportBenchmarkCase) {
  const missing = c.historicalCases.reduce((n, row) => n + row.annualKWh.filter(value => value === null || !Number.isFinite(value)).length, 0);
  const locations = c.historicalCases.flatMap(row => row.annualKWh.flatMap((value, i) => value === null || !Number.isFinite(value) ? [`${row.id} / ${c.candidateIds[i]}`] : []));
  return `Available historical scenarios: **${c.historicalCases.length} / 4**. Missing historical cells: **${missing}**.${locations.length ? ` Missing locations: ${locations.join(', ')}. Present rows with missing cells are not complete scenarios.` : ''}`;
}

function nominalTable(c: ReportBenchmarkCase) {
  return ['| Option | Nominal annual kWh |', '| --- | ---: |', ...c.candidateIds.map((id, i) => `| ${id} | ${format(c.nominalKWh[i])} |`)].join('\n');
}

export function buildPointReport(c: ReportBenchmarkCase) {
  if (c.nominalKWh.length !== c.candidateIds.length || !c.nominalKWh.every(v => Number.isFinite(v) && v >= 0)) throw new Error('Nominal data incomplete');
  const best = Math.max(...c.nominalKWh);
  const ids = c.candidateIds.filter((_, i) => best - c.nominalKWh[i] <= 1e-6);
  return `# Point estimate — ${c.id}\n\n${fixtureNotice(c)}Nominal representative-year winner(s): **${ids.join(', ')}**.\n\n${nominalTable(c)}\n\n${scenarioCountText(c)}\n\nThis summary presents the nominal estimate only. Cross-scenario choice and source-year sensitivity are not assessed in this report.\n`;
}

export function buildTableReport(c: ReportBenchmarkCase) {
  const history = [`| Historical scenario | ${c.candidateIds.join(' | ')} |`, `| --- | ${c.candidateIds.map(() => '---:').join(' | ')} |`,
    ...c.historicalCases.map(row => `| ${row.id} | ${row.annualKWh.map(format).join(' | ')} |`)];
  const omissions = ['| Omission case | Annual kWh |', '| --- | ---: |', ...c.omittedAnnualKWh.map((value, i) => `| omit-${2022 + i} | ${format(value)} |`)];
  return [`# Equal-information tables — ${c.id}`, '', fixtureNotice(c), scenarioCountText(c), '', nominalTable(c), '',
    ...history, '', 'Omission results describe sensitivity, not a confidence interval.', ...omissions,
    ...(c.omittedAnnualKWh.length !== 4 ? ['', 'Sensitivity range unavailable: four omission results were not supplied.'] : []),
    '', 'The decision rule is minimum worst-case energy regret over the four scenarios. Regret means each row’s best energy minus an option’s energy. Nominal sacrifice means the best nominal energy minus a selected option’s nominal energy. All ties within 0.000001 kWh must be retained.', ''].join('\n');
}

/**
 * Synthetic adapter for the existing full-study renderer. The renderer reads
 * only the fields constructed here; this is not an executable weather study.
 * No expected answers are accepted by this adapter.
 */
export function buildBenchmarkAudit(c: ReportBenchmarkCase) {
  const choice = compareEnergyChoices(c.candidateIds, c.nominalKWh, c.historicalCases.map(row => ({ id: row.id, annualKWh: row.annualKWh.map(value => value === null ? Number.NaN : value) })));
  if (c.tamper) choice.robustWinnerIds = [...c.tamper.robustWinnerIds];
  const config = structuredClone(DEFAULT_SYSTEM_CONFIG);
  config.location.name = `ARITHMETIC FIXTURE ${c.id}; no physical simulation`;
  config.array.capacityKwDc = 1;
  const study = { sourceMode: 'simulation', studyId: `fixture_${c.id}`, configuration: config } as unknown as AnnualResearchStudy;
  const energy = (annualKWh: number) => ({ annualKWh, monthlyKWh: new Array<number>(12).fill(annualKWh / 12) });
  const historical = c.historicalCases.map(row => ({ year: Number(row.id), ...energy(row.annualKWh[0] as number) }));
  const totals = historical.map(h => h.annualKWh).sort((a, b) => a - b);
  const audit = {
    version: 'synthetic-report-benchmark', sourceMode: 'sample', productionTarget: 'hand-defined arithmetic fixture',
    evaluationStatus: 'Known-answer software benchmark; not a scientific PV experiment',
    historicalMeanKWh: totals.reduce((a, b) => a + b, 0) / totals.length,
    historicalMedianKWh: (totals[1] + totals[2]) / 2,
    historical,
    variants: [{ id: 'default', ...energy(c.nominalKWh[0]), meanSeamTemperatureJumpC: 0 }, ...c.omittedAnnualKWh.map((value, i) => ({ id: `omit-${2022 + i}`, ...energy(value), meanSeamTemperatureJumpC: 0 }))],
    candidates: c.candidateIds.map((id, i) => ({ id, tiltDeg: 22 + i * 10, azimuthDeg: 180 })),
    nominal: c.nominalKWh.map(energy),
    historicalCases: c.historicalCases.map(row => ({ id: row.id, rows: row.annualKWh.map(value => energy(value as number)) })),
    variantCases: [], choice, limitations: ['Synthetic arithmetic fixture, not a physical simulation.'],
  } as unknown as RepresentativeAudit;
  return { study, audit };
}

export function buildExistingEvidenceExample(c: ReportBenchmarkCase) {
  const { study, audit } = buildBenchmarkAudit(c);
  return fixtureNotice(c) + buildDecisionReport(study, audit);
}
