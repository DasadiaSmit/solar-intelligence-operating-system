import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionEvidenceReport } from '../lib/research/decision-evidence-report.ts';

// Development fixtures deliberately use values outside the frozen benchmark.
const evidence = () => ({
  candidateIds: ['east', 'west', 'south'], nominalKWh: [120, 115, 100],
  expectedScenarioIds: ['dry', 'wet', 'mixed'],
  historicalCases: [
    { id: 'dry', annualKWh: [120, 100, 95] },
    { id: 'wet', annualKWh: [50, 100, 80] },
    { id: 'mixed', annualKWh: [105, 95, 85] },
  ],
  omittedAnnualKWh: [111, 123, 118], source: 'Unit-test arithmetic', provenance: 'Hand-defined values; no physical simulation.',
});

test('recomputes a conflicting cache and distinguishes regret benefit from nominal sacrifice', () => {
  const input = { ...evidence(), cachedRobustWinnerIds: ['east'] };
  const before = structuredClone(input);
  const report = buildDecisionEvidenceReport(input);
  assert.match(report, /Cached recommendation conflicts with the raw evidence and was ignored/);
  assert.match(report, /Nominal representative-year winner\(s\): \*\*east\*\*/);
  assert.match(report, /Minimax-regret winner\(s\) across the 3 expected scenarios: \*\*west\*\*/);
  assert.match(report, /reduces worst-case regret by 30–30 kWh/);
  assert.match(report, /There are \*\*2\*\* option pairs/);
  assert.match(report, /\| west \| 5 \|/);
  assert.match(report, /Sensitivity range: \*\*111–123 kWh\*\*/);
  assert.match(report, /\| wet \| 50 \| 100 \| 80 \|/);
  assert.deepEqual(input, before);
});

test('retains every minimax tie and its distinct sacrifice, and states zero benefit', () => {
  const input = evidence();
  input.candidateIds = ['roofA', 'roofB', 'roofC'];
  input.nominalKWh = [83, 79, 71];
  input.historicalCases = [
    { id: 'dry', annualKWh: [70, 63, 40] },
    { id: 'wet', annualKWh: [63, 70, 40] },
    { id: 'mixed', annualKWh: [66, 66, 40] },
  ];
  const report = buildDecisionEvidenceReport(input);
  assert.match(report, /Minimax-regret winner\(s\).*\*\*roofA, roofB\*\*/);
  assert.match(report, /zero-benefit result, not evidence of improvement/);
  assert.match(report, /\| roofA \| 0 \|\n\| roofB \| 4 \|/);
  assert.doesNotMatch(report, /reduces worst-case regret by/);
});

test('retains nominal ties and gives the benefit range across all nominal choices', () => {
  const input = evidence();
  input.nominalKWh = [120, 120, 100];
  const report = buildDecisionEvidenceReport(input);
  assert.match(report, /Nominal representative-year winner\(s\): \*\*east, west\*\*/);
  assert.match(report, /reduces worst-case regret by 0–30 kWh/);
  assert.match(report, /\| west \| 0 \|/);
});

test('a missing row and null cell retain nominal and sensitivity facts while withholding the choice', () => {
  const input = evidence();
  input.historicalCases.pop();
  input.historicalCases[1].annualKWh[1] = null;
  input.cachedRobustWinnerIds = ['west'];
  const report = buildDecisionEvidenceReport(input);
  assert.match(report, /Available historical scenarios: \*\*2 \/ 3\*\*\. Missing historical cells: \*\*4\*\*/);
  assert.match(report, /Complete historical scenarios: \*\*1 \/ 3\*\*/);
  assert.match(report, /Missing locations: wet \/ west, mixed \/ east, mixed \/ west, mixed \/ south/);
  assert.match(report, /Missing historical rows: mixed/);
  assert.match(report, /\| wet \| 50 \| missing \| 80 \|/);
  assert.match(report, /Nominal representative-year winner/);
  assert.match(report, /Sensitivity range: \*\*111–123 kWh\*\*/);
  assert.match(report, /Cached recommendation was not used/);
  assert.doesNotMatch(report, /Minimax-regret winner\(s\)/);
  assert.doesNotMatch(report, /\| Robust option \|/);
});

test('incomplete omissions withhold only sensitivity, never printing infinite bounds', () => {
  for (const omissions of [[], [111, null, 118], [111]]) {
    const report = buildDecisionEvidenceReport({ ...evidence(), omittedAnnualKWh: omissions });
    assert.match(report, /Sensitivity range unavailable/);
    assert.match(report, /Missing omission cases:/);
    assert.match(report, /Minimax-regret winner\(s\)/);
    assert.doesNotMatch(report, /Infinity|NaN|∞/);
  }
});

test('missing nominal evidence does not erase independent sensitivity or invent a winner', () => {
  const input = evidence(); input.nominalKWh[1] = null;
  const report = buildDecisionEvidenceReport(input);
  assert.match(report, /Nominal winner and maximum energy are withheld/);
  assert.match(report, /Missing nominal options: west/);
  assert.match(report, /Sensitivity range: \*\*111–123 kWh\*\*/);
  assert.doesNotMatch(report, /winner\(s\):/);
});

test('zero nominal energy retains ties and marks relative percentages undefined', () => {
  const input = evidence();
  input.nominalKWh = [0, 0, 0];
  input.historicalCases.forEach(row => { row.annualKWh = [0, 0, 0]; });
  input.omittedAnnualKWh = [0, 0, 0];
  const report = buildDecisionEvidenceReport(input);
  assert.match(report, /Nominal representative-year winner\(s\): \*\*east, west, south\*\*/);
  assert.match(report, /Minimax-regret winner\(s\).*\*\*east, west, south\*\*/);
  assert.match(report, /\| east \| 0 \| undefined \| 0 \| 3 \/ 3 \|/);
  assert.match(report, /\| east \| 0 \|\n\| west \| 0 \|\n\| south \| 0 \|/);
  assert.doesNotMatch(report, /Infinity|NaN|∞/);
});

test('invalid caches never override valid evidence; cache order alone is not a conflict', () => {
  for (const cachedRobustWinnerIds of [[], ['unknown'], ['west', 'west'], new Array(1)]) {
    const report = buildDecisionEvidenceReport({ ...evidence(), cachedRobustWinnerIds });
    assert.match(report, /Cached recommendation ignored/);
    assert.match(report, /Minimax-regret winner\(s\).*\*\*west\*\*/);
  }
  const input = evidence();
  input.historicalCases.forEach(row => { row.annualKWh = [60, 60, 60]; });
  input.cachedRobustWinnerIds = ['south', 'west', 'east'];
  assert.match(buildDecisionEvidenceReport(input), /Cached recommendation agrees/);
});

test('rejects malformed raw identifiers, dimensions, numbers and provenance instead of manufacturing evidence', () => {
  const mutations = [
    input => { input.candidateIds = ['east', 'east', 'south']; },
    input => { input.candidateIds = new Array(3); },
    input => { input.expectedScenarioIds = ['dry', 'dry', 'mixed']; },
    input => { input.expectedScenarioIds = []; },
    input => { input.historicalCases[1].id = 'dry'; },
    input => { input.historicalCases[1].id = 'unexpected'; },
    input => { input.nominalKWh.pop(); },
    input => { input.historicalCases[1].annualKWh.pop(); },
    input => { input.omittedAnnualKWh.push(80); },
    input => { input.nominalKWh[0] = NaN; },
    input => { input.historicalCases[0].annualKWh[0] = Infinity; },
    input => { input.omittedAnnualKWh[0] = -1; },
    input => { input.nominalKWh[0] = undefined; },
    input => { input.source = ''; },
    input => { input.provenance = ' '; },
  ];
  for (const mutate of mutations) {
    const input = evidence(); mutate(input);
    assert.throws(() => buildDecisionEvidenceReport(input));
  }
});
