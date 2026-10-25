import type { SystemConfig } from '../contracts';
import { sha256Hex } from '../provenance/hash';
import { compareEnergyChoices } from './energy-choice';
import { buildDecisionEvidenceReport, DECISION_EVIDENCE_REPORT_VERSION, type DecisionEvidenceReportInput } from './decision-evidence-report';

export const ASSESSMENT_EVIDENCE_ID = 'sheffield-2026-10-25';
export const ASSESSMENT_EVIDENCE_SHA256 = 'b65dd7925d2e1168ba50c8f6d1c1aed961dfd8c04580adbc00d1b80831aa2c5c';
const EXPECTED_YEARS = [2022, 2023, 2024, 2025];
const SCOPE = 'Retrospective modelled energy for the selected options across four recorded ERA5 years. No measured plant accuracy, future probability, global optimum, financial benefit or human decision improvement is established.';

export interface AssessmentEvidenceBundle {
  schema: 'sios-assessment-evidence-bundle-1';
  evidenceId: string;
  title: string;
  source: {
    studyId: string;
    sourceMode: 'reanalysis';
    sourceYears: number[];
    provider: string;
    product: string;
    studyManifestSha256: string;
    auditSha256: string;
    studySha256: string;
    protocolSha256: string;
    sourceCommit: string;
    generatedAtUtc: string;
    calculationVersion: string;
    modelVersion: string;
    scienceAdapterVersion: string;
    representativeYearId: string;
    datasets: Array<{ year: number; snapshotId: string; contentHash: string; scienceContentHash: string; sourceRecordCount: number; simulationRecordCount: number; leapHoursRemoved: number }>;
    attributionUrl: string;
  };
  baseline: {
    location: SystemConfig['location'];
    capacityKwDc: number;
    tiltDeg: number;
    azimuthDeg: number;
    aggregatePvLossPct: number;
    annualKWh: number;
    configuration: { array: SystemConfig['array']; losses: SystemConfig['losses'] };
  };
  candidates: Array<{ id: string; tiltDeg: number; azimuthDeg: number }>;
  nominalKWh: number[];
  historicalCases: Array<{ id: string; annualKWh: number[] }>;
  omissions: Array<{ excludedScenarioId: string; annualKWh: number }>;
  limitations: string[];
  integrity: { algorithm: 'SHA-256'; payloadSha256: string };
}

export interface AssessmentSelection {
  selectionId: string;
  candidateIds: string[];
  candidates: AssessmentEvidenceBundle['candidates'];
  choice: ReturnType<typeof compareEnergyChoices>;
  sensitivity: { minimumKWh: number; maximumKWh: number; baselineAnnualKWh: number };
  reportInput: DecisionEvidenceReportInput;
  reportMarkdown: string;
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid assessment evidence: ${message}`);
}
function object(value: unknown, name: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} must be an object.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string): asserts value is string {
  requireValue(typeof value === 'string' && value.trim().length > 0, `${name} must be a nonempty string.`);
}
function numeric(value: unknown, name: string, minimum = 0, maximum = Number.MAX_VALUE): asserts value is number {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum, `${name} is outside its finite range.`);
}
function energyVector(value: unknown, length: number, name: string) {
  requireValue(Array.isArray(value) && value.length === length, `${name} must contain ${length} cells.`);
  for (const entry of value) numeric(entry, name);
}
function hash(value: unknown, name: string) {
  requireValue(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), `${name} must be a SHA-256 digest.`);
}

/** Shape checks also run before synchronous subset arithmetic; hash verification is the ingress boundary. */
function assertBundleShape(value: unknown): asserts value is AssessmentEvidenceBundle {
  const root = object(value, 'bundle');
  requireValue(root.schema === 'sios-assessment-evidence-bundle-1' && root.evidenceId === ASSESSMENT_EVIDENCE_ID, 'unsupported schema or evidence identity.');
  string(root.title, 'title');
  const integrity = object(root.integrity, 'integrity');
  requireValue(integrity.algorithm === 'SHA-256' && integrity.payloadSha256 === ASSESSMENT_EVIDENCE_SHA256, 'unrecognised frozen payload identity.');
  const source = object(root.source, 'source');
  requireValue(source.sourceMode === 'reanalysis', 'the recorded source must be reanalysis.');
  requireValue(Array.isArray(source.sourceYears) && source.sourceYears.length === 4 && source.sourceYears.every((year, index) => year === EXPECTED_YEARS[index]), 'all four ordered source years are required.');
  for (const key of ['studyId', 'provider', 'product', 'sourceCommit', 'generatedAtUtc', 'calculationVersion', 'modelVersion', 'scienceAdapterVersion', 'representativeYearId', 'attributionUrl']) string(source[key], `source.${key}`);
  requireValue(Number.isFinite(Date.parse(source.generatedAtUtc as string)), 'source generation date is invalid.');
  for (const key of ['studyManifestSha256', 'auditSha256', 'studySha256', 'protocolSha256']) hash(source[key], `source.${key}`);
  requireValue(Array.isArray(source.datasets) && source.datasets.length === 4, 'four source dataset identities are required.');
  source.datasets.forEach((entry, index) => {
    const dataset = object(entry, 'source dataset');
    requireValue(dataset.year === EXPECTED_YEARS[index], 'dataset years must match the ordered source years.');
    string(dataset.snapshotId, 'dataset snapshot');
    hash(dataset.contentHash, 'canonical dataset hash'); hash(dataset.scienceContentHash, 'adapted dataset hash');
    requireValue(dataset.sourceRecordCount === (dataset.year === 2024 ? 8784 : 8760) && dataset.simulationRecordCount === 8760 && dataset.leapHoursRemoved === (dataset.year === 2024 ? 24 : 0), 'dataset calendar counts are inconsistent.');
  });
  const baseline = object(root.baseline, 'baseline');
  requireValue(baseline.capacityKwDc === 48, 'the frozen baseline must remain 48 kWp.');
  numeric(baseline.tiltDeg, 'baseline tilt', 0, 90); numeric(baseline.azimuthDeg, 'baseline azimuth', 0, 360);
  numeric(baseline.aggregatePvLossPct, 'baseline losses', 0, 100); numeric(baseline.annualKWh, 'baseline generation');
  const location = object(baseline.location, 'baseline location');
  string(location.name, 'baseline site'); numeric(location.latitude, 'latitude', -90, 90); numeric(location.longitude, 'longitude', -180, 180); numeric(location.elevationM, 'elevation', -500, 9000);
  const configuration = object(baseline.configuration, 'baseline configuration');
  const array = object(configuration.array, 'baseline array');
  requireValue(array.capacityKwDc === baseline.capacityKwDc && array.tiltDeg === baseline.tiltDeg && array.azimuthDeg === baseline.azimuthDeg && array.tracking === 'fixed', 'baseline engineering fields disagree.');
  const losses = object(configuration.losses, 'baseline loss assumptions');
  for (const [key, entry] of Object.entries(losses)) numeric(entry, `loss ${key}`, 0, 1);
  requireValue(Array.isArray(root.candidates) && root.candidates.length === 9, 'the frozen bundle must contain the nine recorded candidate options.');
  const candidateIds = root.candidates.map(entry => {
    const candidate = object(entry, 'candidate');
    requireValue(typeof candidate.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(candidate.id), 'candidate identifiers are invalid.');
    numeric(candidate.tiltDeg, 'candidate tilt', 0, 90); numeric(candidate.azimuthDeg, 'candidate azimuth', 0, 359.999999);
    return candidate.id;
  });
  requireValue(new Set(candidateIds).size === candidateIds.length, 'candidate identifiers must be unique.');
  energyVector(root.nominalKWh, candidateIds.length, 'nominal energies');
  requireValue(Array.isArray(root.historicalCases) && root.historicalCases.length === 4, 'four historical scenarios are required.');
  root.historicalCases.forEach((entry, index) => {
    const row = object(entry, 'historical scenario');
    requireValue(row.id === String(EXPECTED_YEARS[index]), 'historical rows must match each expected year once, in order.');
    energyVector(row.annualKWh, candidateIds.length, `historical ${row.id}`);
  });
  requireValue(Array.isArray(root.omissions) && root.omissions.length === 4, 'four baseline omission values are required.');
  root.omissions.forEach((entry, index) => {
    const row = object(entry, 'omission');
    requireValue(row.excludedScenarioId === String(EXPECTED_YEARS[index]), 'omissions must match each expected source year once, in order.');
    numeric(row.annualKWh, 'omission energy');
  });
  requireValue(Array.isArray(root.limitations) && root.limitations.length > 0, 'scope limitations are required.');
  root.limitations.forEach(entry => string(entry, 'limitation'));
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => freeze(child));
    Object.freeze(value);
  }
  return value;
}

/** Validate fetched JSON before use. The pinned hash binds this deployment to the reviewed source projection. */
export async function validateAssessmentEvidenceBundle(value: unknown): Promise<AssessmentEvidenceBundle> {
  assertBundleShape(value);
  const { integrity, ...payload } = value;
  requireValue(await sha256Hex(payload) === integrity.payloadSha256, 'payload digest mismatch.');
  return freeze(structuredClone(value));
}

/** Cheap deterministic arithmetic only; callers first validate the bundle at their JSON ingress boundary. */
export function computeAssessmentSelection(bundle: AssessmentEvidenceBundle, ids?: string[]): AssessmentSelection {
  assertBundleShape(bundle);
  const allIds = bundle.candidates.map(candidate => candidate.id);
  const requested = ids ?? allIds;
  requireValue(Array.isArray(requested) && requested.length > 0, 'select at least one option.');
  requireValue(new Set(requested).size === requested.length && Array.from(requested).every(id => allIds.includes(id)), 'selected options must be unique known candidate identifiers.');
  const indices = allIds.flatMap((id, index) => requested.includes(id) ? [index] : []);
  const candidateIds = indices.map(index => allIds[index]);
  const candidates = indices.map(index => ({ ...bundle.candidates[index] }));
  const nominalKWh = indices.map(index => bundle.nominalKWh[index]);
  const historicalCases = bundle.historicalCases.map(row => ({ id: row.id, annualKWh: indices.map(index => row.annualKWh[index]) }));
  const choice = compareEnergyChoices(candidateIds, nominalKWh, historicalCases);
  const selectionId = `${bundle.evidenceId}:options:${indices.map(index => index + 1).join('-')}`;
  const sensitivity = { minimumKWh: Math.min(...bundle.omissions.map(row => row.annualKWh)), maximumKWh: Math.max(...bundle.omissions.map(row => row.annualKWh)), baselineAnnualKWh: bundle.baseline.annualKWh };
  const reportInput: DecisionEvidenceReportInput = {
    candidateIds, nominalKWh, historicalCases,
    omittedAnnualKWh: bundle.omissions.map(row => row.annualKWh), expectedScenarioIds: bundle.source.sourceYears.map(String),
    source: `${bundle.source.provider} / ${bundle.source.product}, ${bundle.source.sourceYears.join('–')}; frozen previously inspected computational study.`,
    provenance: `Study ${bundle.source.studyId}; evidence ${bundle.evidenceId}; selected options ${candidateIds.join(', ')}; selection ${selectionId}. All options use the recorded ${bundle.baseline.capacityKwDc} kWp configuration at ${bundle.baseline.location.name}. Source-omission sensitivity belongs only to the recorded ${bundle.baseline.tiltDeg} degree tilt / ${bundle.baseline.azimuthDeg} degree azimuth baseline. Payload SHA-256 ${bundle.integrity.payloadSha256}; source manifest SHA-256 ${bundle.source.studyManifestSha256}; audit SHA-256 ${bundle.source.auditSha256}; study SHA-256 ${bundle.source.studySha256}; protocol SHA-256 ${bundle.source.protocolSha256}; calculation ${bundle.source.calculationVersion}; science adapter ${bundle.source.scienceAdapterVersion}.`,
  };
  const reportMarkdown = `${buildDecisionEvidenceReport(reportInput)}\n## Recorded baseline and selection scope\n\n${SCOPE}\n\nSelected ${candidateIds.length} of ${allIds.length} recorded options. Every selected option is evaluated across all four years; regret is relative to the selected subset’s best option in each year. Excluding an option can change both the comparison and its winner.\n\nThe fixed omission baseline is ${bundle.baseline.capacityKwDc} kWp at ${bundle.baseline.tiltDeg}° tilt / ${bundle.baseline.azimuthDeg}° azimuth, with ${bundle.baseline.annualKWh} kWh nominal generation. The baseline loss estimate is ${bundle.baseline.aggregatePvLossPct}% under the recorded assumptions.\n\n${bundle.limitations.map(item => `- ${item}`).join('\n')}\n\nWeather attribution: ${bundle.source.attributionUrl}\n`;
  return { selectionId, candidateIds, candidates, choice, sensitivity, reportInput, reportMarkdown };
}

export type AssessmentExportFormat = 'md' | 'json' | 'csv';
export function buildAssessmentExport(bundle: AssessmentEvidenceBundle, ids: string[] | undefined, format: AssessmentExportFormat): { filename: string; mimeType: string; content: string } {
  const selection = computeAssessmentSelection(bundle, ids);
  const suffix = selection.selectionId.split(':').at(-1);
  const stem = `${bundle.evidenceId}-48kwp-options-${suffix}`;
  if (format === 'md') return { filename: `${stem}.md`, mimeType: 'text/markdown;charset=utf-8', content: selection.reportMarkdown };
  if (format === 'json') {
    const content = { schema: 'sios-assessment-selection-1', evidenceId: bundle.evidenceId, selectionId: selection.selectionId, sourceBundleSha256: bundle.integrity.payloadSha256, reportVersion: DECISION_EVIDENCE_REPORT_VERSION, source: bundle.source, baseline: bundle.baseline, selectedCandidateIds: selection.candidateIds, candidates: selection.candidates, nominalKWh: selection.reportInput.nominalKWh, historicalCases: selection.reportInput.historicalCases, omissions: bundle.omissions, choice: selection.choice, sensitivity: selection.sensitivity, scope: SCOPE, limitations: bundle.limitations };
    return { filename: `${stem}.json`, mimeType: 'application/json;charset=utf-8', content: JSON.stringify(content, null, 2) + '\n' };
  }
  requireValue(format === 'csv', 'unsupported export format.');
  const columns = ['record_type', 'evidence_id', 'selection_id', 'bundle_sha256', 'study_id', 'source_mode', 'source_years', 'baseline_capacity_kwp', 'baseline_tilt_deg', 'baseline_azimuth_deg', 'baseline_annual_kwh', 'scenario_id', 'candidate_id', 'tilt_deg', 'azimuth_deg', 'annual_kwh', 'worst_regret_kwh', 'nominal_sacrifice_kwh', 'winner_count', 'nominal_winner', 'robust_winner', 'note'];
  const common = [bundle.evidenceId, selection.selectionId, bundle.integrity.payloadSha256, bundle.source.studyId, bundle.source.sourceMode, bundle.source.sourceYears.join('|'), bundle.baseline.capacityKwDc, bundle.baseline.tiltDeg, bundle.baseline.azimuthDeg, bundle.baseline.annualKWh];
  const rows: Array<Array<string | number | boolean>> = [['scope', ...common, '', '', '', '', '', '', '', '', '', '', `${SCOPE} Selected candidates: ${selection.candidateIds.join('|')}. Attribution: ${bundle.source.attributionUrl}. Source manifest SHA-256: ${bundle.source.studyManifestSha256}.`]];
  selection.candidates.forEach((candidate, index) => {
    const diagnostics = selection.choice.candidates[index];
    const sacrifice = selection.choice.nominalYieldSacrificeKWh.find(row => row.id === candidate.id);
    rows.push(['nominal_and_choice', ...common, 'representative', candidate.id, candidate.tiltDeg, candidate.azimuthDeg, diagnostics.nominalKWh, diagnostics.worstRegretKWh, sacrifice?.kWh ?? '', diagnostics.winnerCount, selection.choice.nominalWinnerIds.includes(candidate.id), selection.choice.robustWinnerIds.includes(candidate.id), 'Regret is relative to the selected subset; winner counts are finite-case counts.']);
    for (const row of selection.reportInput.historicalCases) rows.push(['historical', ...common, row.id, candidate.id, candidate.tiltDeg, candidate.azimuthDeg, row.annualKWh[index]!, '', '', '', '', '', 'Modelled historical energy; no new simulation.']);
  });
  for (const row of bundle.omissions) rows.push(['baseline_omission', ...common, `omit-${row.excludedScenarioId}`, '', bundle.baseline.tiltDeg, bundle.baseline.azimuthDeg, row.annualKWh, '', '', '', '', '', 'Fixed recorded baseline sensitivity; not a confidence interval or a selected-winner range.']);
  const csv = (row: Array<string | number | boolean>) => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
  return { filename: `${stem}.csv`, mimeType: 'text/csv;charset=utf-8', content: [csv(columns), ...rows.map(csv)].join('\r\n') + '\r\n' };
}
