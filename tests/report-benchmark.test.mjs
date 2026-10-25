import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPointReport, buildTableReport, buildBenchmarkAudit } from '../lib/research/report-benchmark.ts';

const sample = () => ({id:'test-only',title:'Software fixture outside the frozen evaluation set',stratum:'unit-test',candidateIds:['X','Y'],nominalKWh:[20,20],historicalCases:[{id:'2022',annualKWh:[20,10]},{id:'2023',annualKWh:[10,20]},{id:'2024',annualKWh:[15,15]},{id:'2025',annualKWh:[17,17]}],omittedAnnualKWh:[18,19,21,22]});

test('point comparator preserves nominal ties and declares its scope without inventing robust conclusions',()=>{
  const text=buildPointReport(sample());
  assert.match(text,/winner\(s\): \*\*X, Y\*\*/);
  assert.match(text,/hand-defined verification values, not physics-generated/);
  assert.match(text,/Cross-scenario choice and source-year sensitivity are not assessed/);
  assert.doesNotMatch(text,/Minimax-regret winner/);
});

test('table comparator preserves missing cells and identifies their locations rather than turning them into zero',()=>{
  const data=sample();data.historicalCases[1].annualKWh[1]=null;
  const text=buildTableReport(data);
  assert.match(text,/\| 2023 \| 10\.00 \| missing \|/);
  assert.match(text,/Missing historical cells: \*\*1\*\*/);
  assert.match(text,/2023 \/ Y/);
  assert.match(text,/not complete scenarios/);
  assert.throws(()=>buildBenchmarkAudit(data),/finite/);
});

test('adapter uses supplied numbers only and leaves input data unchanged',()=>{
  const data=sample();const before=structuredClone(data);
  const {study,audit}=buildBenchmarkAudit(data);
  assert.deepEqual(data,before);assert.equal(study.sourceMode,'simulation');
  assert.equal(audit.nominal[0].annualKWh,20);
  assert.equal(audit.historicalCases.length,4);
  assert.deepEqual(audit.choice.nominalWinnerIds,['X','Y']);
  assert.equal(audit.variants.filter(v=>v.id.startsWith('omit-')).length,4);
});
