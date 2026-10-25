import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionReport } from '../lib/research/decision-report.ts';
import { compareEnergyChoices } from '../lib/research/representative-audit.ts';
import { buildRepresentativeYear } from '../lib/representative-year/index.ts';
import { generateSampleWeatherYear } from '../lib/sample/weather.ts';
import { DEFAULT_SYSTEM_CONFIG } from '../lib/sample/defaults.ts';

const years=[2022,2023,2024,2025];
const weather=Object.fromEntries(years.map(year=>[year,generateSampleWeatherYear(year,DEFAULT_SYSTEM_CONFIG.location,20260721)]));

test('finite-scenario regret distinguishes nominal yield from a robust choice',()=>{
 const result=compareEnergyChoices(['A','B'],[100,90],[{id:'sunny',annualKWh:[100,90]},{id:'cloudy',annualKWh:[10,80]}]);
 assert.deepEqual(result.nominalWinnerIds,['A']);assert.deepEqual(result.robustWinnerIds,['B']);
 assert.equal(result.candidates[0].worstRegretKWh,70);assert.equal(result.candidates[1].worstRegretKWh,10);
 assert.deepEqual(result.worstRegretReductionKWh,{minimum:60,maximum:60});
 assert.deepEqual(result.nominalYieldSacrificeKWh,[{id:'B',kWh:10}]);assert.equal(result.rankReversals.length,1);
});
test('dominant option has zero benefit from robust selection, while ties remain explicit',()=>{
 const r=compareEnergyChoices(['A','B'],[100,90],[{id:'x',annualKWh:[100,90]},{id:'y',annualKWh:[80,70]}]);
 assert.deepEqual(r.robustWinnerIds,['A']);assert.equal(r.worstRegretReductionKWh.maximum,0);assert.equal(r.rankReversals.length,0);
 const tied=compareEnergyChoices(['A','B'],[100,100],[{id:'x',annualKWh:[80,80]}]);
 assert.deepEqual(tied.robustWinnerIds,['A','B']);assert.deepEqual(tied.nominalWinnerIds,['A','B']);
});
test('incomplete, non-finite, duplicated and empty comparisons fail closed',()=>{
 for(const args of [ [['A'],[NaN],[{id:'x',annualKWh:[1]}]], [['A','B'],[1,2],[{id:'x',annualKWh:[1]}]], [['A','A'],[1,2],[{id:'x',annualKWh:[1,2]}]], [['A'],[1],[]], [['A'],[1],[{id:'x',annualKWh:[-1]}]] ]) assert.throws(()=>compareEnergyChoices(...args));
});
test('omitted-year diagnostic cannot select the excluded source and preserves complete months',()=>{
 const r=buildRepresentativeYear(weather,2026,'fixture',{sourceYears:[2022,2023,2025]});
 assert.equal(r.weather.length,8760);assert.ok(r.weather.every(h=>h.sourceYear!==2024));
 assert.deepEqual(r.record.sourceYears,[2022,2023,2025]);assert.equal(r.record.sourceYearWeights[2024],0);
 assert.equal(r.diagnostics.candidates.length,36);assert.equal(r.diagnostics.selectionMargins.length,12);
 for(const margin of r.diagnostics.selectionMargins){
  const scores=r.diagnostics.candidates.filter(c=>c.month===margin.month).sort((a,b)=>a.totalScore-b.totalScore||a.year-b.year);
  assert.equal(scores[0].year,margin.selectedYear);assert.equal(scores[0].selected,true);
  assert.ok(Math.abs(margin.margin-(scores[1].totalScore-scores[0].totalScore))<1e-12);
 }
});
test('ablation score components and method identities expose the actual treatment',()=>{
 const def=buildRepresentativeYear(weather,2026,'fixture');
 const ablation=buildRepresentativeYear(weather,2026,'fixture',{persistenceWeight:0,continuityWeight:0});
 assert.notEqual(ablation.record.id,def.record.id);
 assert.ok(ablation.diagnostics.candidates.every(c=>c.totalScore===c.distributionScore));
 assert.ok(def.diagnostics.candidates.every(c=>Math.abs(c.totalScore-(c.distributionScore+.08*c.persistencePenalty+.04*c.continuityPenalty))<1e-12));
 assert.equal(buildRepresentativeYear(weather,2026,'fixture',{sourceYears:[2025,2024,2023,2022]}).record.id,def.record.id);
});
test('invalid source subsets, weights and calendars are rejected',()=>{
 assert.throws(()=>buildRepresentativeYear(weather,2026,'fixture',{sourceYears:[2022,2022]}));
 assert.throws(()=>buildRepresentativeYear(weather,2026,'fixture',{persistenceWeight:-1}));
 assert.throws(()=>buildRepresentativeYear(weather,2026,'fixture',{continuityWeight:NaN}));
 const broken={...weather,2022:weather[2022].slice(1)};assert.throws(()=>buildRepresentativeYear(broken));
 const badCalendar={...weather,2022:[{...weather[2022][0],hour:1},...weather[2022].slice(1)]};assert.throws(()=>buildRepresentativeYear(badCalendar));
});

test('exported model predictions independently reconcile to reported MAE and annual energy bias', {timeout:30000}, async()=>{
 const {loadHistoricalWeatherArchive}=await import('../lib/research/historical-weather.ts');
 const {buildResearchPredictionEvidence}=await import('../lib/research/annual-study.ts');
 const archive=await loadHistoricalWeatherArchive(DEFAULT_SYSTEM_CONFIG.location,{mode:'sample',now:()=>new Date('2026-10-25T00:00:00Z'),bypassCache:true});
 const result=await buildResearchPredictionEvidence(DEFAULT_SYSTEM_CONFIG,archive);
 assert.equal(result.predictions.length,8760);
 const actual=result.predictions.map(r=>r.targetKWh);const annualActual=actual.reduce((a,b)=>a+b,0);
 for(const [id,field] of [['seasonal-naive','seasonalNaiveKWh'],['hourly-climatology','climatologyKWh'],['meteo-ridge','ridgeKWh'],['hybrid-probabilistic','ensembleKWh']]){
  const predicted=result.predictions.map(r=>r[field]);const model=result.validation.modelEvidence.find(m=>m.id===id);
  const mae=predicted.reduce((s,p,i)=>s+Math.abs(p-actual[i]),0)/actual.length;
  const annualError=(predicted.reduce((a,b)=>a+b,0)-annualActual)/annualActual*100;
  assert.ok(Math.abs(mae-model.metrics.mae)<1e-10);assert.ok(Math.abs(annualError-model.annualErrorPct)<1e-10);
 }
 assert.match(result.evaluationStatus,/previously-inspected/);
});


test('decision report preserves zero benefit and confines positive benefit to tested scenarios',()=>{
 const study={sourceMode:'simulation',studyId:'fixture',configuration:DEFAULT_SYSTEM_CONFIG};
 const makeAudit=(second)=>({
  historicalMeanKWh:90,historicalMedianKWh:90,
  variants:[{id:'default',annualKWh:100,meanSeamTemperatureJumpC:1},...years.map(year=>({id:`omit-${year}`,annualKWh:90,meanSeamTemperatureJumpC:1}))],
  candidates:[{id:'A',tiltDeg:22,azimuthDeg:180},{id:'B',tiltDeg:32,azimuthDeg:180}],
  choice:compareEnergyChoices(['A','B'],[100,90],[{id:'x',annualKWh:[100,90]},{id:'y',annualKWh:second}]),
 });
 const zero=buildDecisionReport(study,makeAudit([80,70]));
 assert.match(zero,/zero-benefit result, not evidence of improvement/);
 assert.doesNotMatch(zero,/switching from the nominal rule.*reduces/);
 const positive=buildDecisionReport(study,makeAudit([10,80]));
 assert.match(positive,/reduces worst-case regret by 60–60 kWh/);
 assert.match(positive,/in-scenario comparison, not evidence of future performance/);
 assert.match(positive,/sensitivity range, not a confidence interval/);
 assert.match(positive,/No measured plant output, fresh untouched holdout/);
});
