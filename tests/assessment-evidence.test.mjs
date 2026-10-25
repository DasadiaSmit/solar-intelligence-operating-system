import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sha256Hex } from '../lib/provenance/hash.ts';
import { compareEnergyChoices } from '../lib/research/energy-choice.ts';
import { compareEnergyChoices as legacyCompare } from '../lib/research/representative-audit.ts';
import { ASSESSMENT_EVIDENCE_SHA256, validateAssessmentEvidenceBundle, computeAssessmentSelection, buildAssessmentExport } from '../lib/research/assessment-evidence.ts';

const raw = JSON.parse(await readFile(new URL('../evidence/sheffield-2026-10-25.json', import.meta.url), 'utf8'));
const bundle = await validateAssessmentEvidenceBundle(raw);

test('curated evidence is pinned, complete, immutable and restricted to engineering provenance', () => {
  assert.equal(bundle.integrity.payloadSha256, ASSESSMENT_EVIDENCE_SHA256);
  assert.notEqual(bundle, raw);
  assert.ok(Object.isFrozen(bundle) && Object.isFrozen(bundle.historicalCases[0].annualKWh));
  assert.equal(bundle.baseline.capacityKwDc, 48);
  assert.equal(bundle.candidates.length, 9);
  assert.deepEqual(bundle.source.sourceYears, [2022, 2023, 2024, 2025]);
  assert.deepEqual(bundle.historicalCases.map(row => row.id), ['2022', '2023', '2024', '2025']);
  assert.equal(bundle.source.sourceMode, 'reanalysis');
  assert.doesNotMatch(JSON.stringify(bundle), /\/Users\/|ULTIMATE_PROJECT_KNOWLEDGE|rubric|poster|student|rawPayload|WeatherHour/i);
  assert.throws(() => { bundle.nominalKWh[0] = 0; }, TypeError);
  assert.equal(legacyCompare, compareEnergyChoices, 'old callers retain the exact same comparison implementation');
});

test('JSON ingress rejects tampered energy, false identities, missing cells and missing years', async () => {
  for (const mutate of [
    value => { value.nominalKWh[0] += 1; },
    value => { value.historicalCases[0].annualKWh[0] = null; },
    value => { value.historicalCases.pop(); },
    value => { value.historicalCases[1].id = '2022'; },
    value => { value.candidates[1].id = value.candidates[0].id; },
    value => { value.omissions[0].annualKWh = Infinity; },
    value => { value.nominalKWh[0] = -1; },
    value => { value.baseline.capacityKwDc = 96; },
    value => { value.source.datasets[0].scienceContentHash = 'f'.repeat(64); },
    value => { value.personalNotes = 'not part of the curated evidence'; },
  ]) {
    const value = structuredClone(raw); mutate(value);
    await assert.rejects(validateAssessmentEvidenceBundle(value), /Invalid assessment evidence/);
  }
  const rehashed = structuredClone(raw); rehashed.nominalKWh[0] += 1;
  const { integrity, ...payload } = rehashed;
  integrity.payloadSha256 = await sha256Hex(payload);
  await assert.rejects(validateAssessmentEvidenceBundle(rehashed), /unrecognised frozen payload identity/);
});

test('full-set recommendation retains the recorded zero-benefit result and fixed omission baseline', () => {
  const result = computeAssessmentSelection(bundle);
  assert.deepEqual(result.choice.nominalWinnerIds, ['tilt-42_azimuth-180']);
  assert.deepEqual(result.choice.robustWinnerIds, ['tilt-42_azimuth-180']);
  assert.deepEqual(result.choice.worstRegretReductionKWh, { minimum: 0, maximum: 0 });
  assert.deepEqual(result.choice.nominalYieldSacrificeKWh, [{ id: 'tilt-42_azimuth-180', kWh: 0 }]);
  assert.match(result.reportMarkdown, /zero-benefit result, not evidence of improvement/);
  assert.match(result.reportMarkdown, /fixed omission baseline is 48 kWp at 32° tilt \/ 180° azimuth/);
  assert.match(result.reportMarkdown, /previously inspected/);
  assert.match(result.reportMarkdown, /no fresh holdout or measured production|not a fresh untouched validation set/);
});

test('all 511 selectable nonempty subsets reconcile with independent scalar arithmetic', { timeout: 30000 }, () => {
  const ids = bundle.candidates.map(row => row.id);
  const fixedSensitivity = computeAssessmentSelection(bundle).sensitivity;
  for (let mask = 1; mask < 2 ** ids.length; mask++) {
    const indices = ids.flatMap((_, index) => mask & (1 << index) ? [index] : []);
    const selected = indices.map(index => ids[index]);
    const result = computeAssessmentSelection(bundle, selected);
    const nominal = indices.map(index => bundle.nominalKWh[index]);
    const matrix = bundle.historicalCases.map(row => indices.map(index => row.annualKWh[index]));
    const nominalMaximum = Math.max(...nominal);
    const nominalWinners = selected.filter((_, index) => nominalMaximum - nominal[index] <= 1e-6);
    const worst = selected.map((_, index) => Math.max(...matrix.map(row => Math.max(...row) - row[index])));
    const smallestWorst = Math.min(...worst);
    const robust = selected.filter((_, index) => worst[index] - smallestWorst <= 1e-6);
    const gain = nominalWinners.map(id => worst[selected.indexOf(id)] - smallestWorst);
    assert.deepEqual(result.choice.nominalWinnerIds, nominalWinners);
    assert.deepEqual(result.choice.robustWinnerIds, robust);
    assert.deepEqual(result.choice.candidates.map(row => row.worstRegretKWh), worst);
    assert.deepEqual(result.choice.worstRegretReductionKWh, { minimum: Math.min(...gain), maximum: Math.max(...gain) });
    assert.deepEqual(result.choice.nominalYieldSacrificeKWh, robust.map(id => ({ id, kWh: nominalMaximum - nominal[selected.indexOf(id)] })));
    assert.deepEqual(result.sensitivity, fixedSensitivity);
    assert.equal(result.reportInput.historicalCases.length, 4);
    assert.ok(result.reportInput.historicalCases.every(row => row.annualKWh.length === selected.length));
  }
});

test('selection is canonical, never mutates the source and rejects empty, duplicate or unknown options', () => {
  const ids = bundle.candidates.map(row => row.id);
  assert.deepEqual(computeAssessmentSelection(bundle, [ids[5], ids[1]]), computeAssessmentSelection(bundle, [ids[1], ids[5]]));
  for (const invalid of [[], [ids[0], ids[0]], ['unknown'], new Array(1)]) assert.throws(() => computeAssessmentSelection(bundle, invalid), /select at least one|unique known/);
  const one = computeAssessmentSelection(bundle, [ids[4]]);
  assert.equal(one.choice.candidates[0].worstRegretKWh, 0);
  assert.equal(one.choice.candidates[0].winnerCount, 4);
  assert.deepEqual(one.choice.nominalYieldSacrificeKWh, [{ id: ids[4], kWh: 0 }]);
  assert.equal(bundle.nominalKWh[0], raw.nominalKWh[0]);
});

test('all exports identify the chosen subset, immutable source and 48 kWp baseline', () => {
  const ids = [bundle.candidates[1].id, bundle.candidates[5].id];
  const md = buildAssessmentExport(bundle, ids, 'md');
  const json = buildAssessmentExport(bundle, ids, 'json');
  const csv = buildAssessmentExport(bundle, ids, 'csv');
  for (const artifact of [md, json, csv]) {
    assert.match(artifact.filename, /sheffield-2026-10-25-48kwp-options-2-6/);
    assert.ok(artifact.content.replace(/\\_/g, '_').includes(bundle.source.studyId));
    assert.ok(artifact.content.includes(bundle.integrity.payloadSha256));
    assert.ok(artifact.content.includes(ids[0]) && artifact.content.includes(ids[1]));
    assert.doesNotMatch(artifact.content, /NaN|Infinity|\/Users\//);
  }
  const exported = JSON.parse(json.content);
  assert.deepEqual(exported.selectedCandidateIds, ids);
  assert.equal(exported.candidates.length, 2);
  assert.equal(exported.historicalCases.length, 4);
  assert.equal(exported.omissions.length, 4);
  assert.equal(exported.baseline.tiltDeg, 32);
  assert.equal(exported.baseline.capacityKwDc, 48);
  assert.ok(exported.limitations.some(item => item.includes('baseline')));
  const rows = csv.content.trim().split('\r\n').map(line => [...line.matchAll(/"((?:""|[^"])*)"(?:,|$)/g)].map(match => match[1].replace(/""/g, '"')));
  assert.ok(rows.every(row => row.length === rows[0].length), 'every CSV record must match its header');
  assert.equal(rows.filter(row => row[0] === 'historical').length, 8);
  assert.equal(rows.filter(row => row[0] === 'baseline_omission').length, 4);
  assert.ok(rows.slice(1).every(row => row[7] === '48'));
  assert.throws(() => buildAssessmentExport(bundle, ids, 'pdf'), /unsupported export format/);
});
