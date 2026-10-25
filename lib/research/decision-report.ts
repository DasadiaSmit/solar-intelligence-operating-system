import type { AnnualResearchStudy } from './annual-study';
import type { buildRepresentativeAudit } from './representative-audit';

export type RepresentativeAudit = ReturnType<typeof buildRepresentativeAudit>;
const number = (v:number) => v.toLocaleString('en-GB',{maximumFractionDigits:2});

/** Text is derived from computed evidence; no unconstrained generated recommendation. */
export function buildDecisionReport(study:AnnualResearchStudy,audit:RepresentativeAudit) {
 const baseline=audit.variants.find(v=>v.id==='default')!;
 const omitted=audit.variants.filter(v=>v.id.startsWith('omit-'));
 const choice=audit.choice;
 const improvement=choice.worstRegretReductionKWh;
 const benefit=improvement.maximum<=1e-6
  ? 'The robust rule does not reduce worst-case regret for the nominal choice in this tested set. This is a zero-benefit result, not evidence of improvement.'
  : `Within the four tested historical scenarios, switching from the nominal rule to the minimax-regret rule reduces worst-case regret by ${number(improvement.minimum)}–${number(improvement.maximum)} kWh (range covers nominal ties). This is an in-scenario comparison, not evidence of future performance.`;
 const lines=[
  '# Solar estimate and design stability report','',
  `Source: ${study.sourceMode}. Target: physics-derived generation. Study: ${study.studyId}.`,
  `This is a retrospective computational study of the hypothetical ${study.configuration.location.name} configuration. No measured plant output, fresh untouched holdout, financial optimum or calibrated future probability is claimed.`,'',
  study.sourceMode==='reanalysis' ? 'Weather data: [Open-Meteo](https://open-meteo.com/) / ECMWF ERA5 reanalysis, 2022–2025. [Data attribution terms](https://open-meteo.com/en/licence). The project adapts the hourly inputs, removes leap day for like-for-like simulation, derives missing snow depth with a proxy and computes PV generation. Retrieval times, complete transformations and raw inputs are retained in the frozen bundle.' : 'Source data are simulated proving inputs; this is not an ERA5 study.','',
  '## Annual estimate and its dependence on source years','',
  `The default representative-year estimate is **${number(baseline.annualKWh)} kWh**. The mean of the four individual-year simulations is **${number(audit.historicalMeanKWh)} kWh**, and their median is **${number(audit.historicalMedianKWh)} kWh**.`,
  `Removing one source year at a time changes the representative estimate across **${number(Math.min(...omitted.map(v=>v.annualKWh)))}–${number(Math.max(...omitted.map(v=>v.annualKWh)))} kWh**. This is a sensitivity range, not a confidence interval.`,
  '', '| Selection case | Annual kWh | Change from default (%) | Mean boundary temperature jump (C) |', '| --- | ---: | ---: | ---: |',
  ...audit.variants.map(v=>`| ${v.id} | ${number(v.annualKWh)} | ${baseline.annualKWh>0?number((v.annualKWh/baseline.annualKWh-1)*100):'undefined'} | ${number(v.meanSeamTemperatureJumpC)} |`),
  '', 'Boundary jumps include the December-to-January wrap for diagnosis. The existing selection algorithm is greedy and does not optimise that wrap. A smaller jump does not by itself demonstrate better physical accuracy.',
  '', `## Array decision within the ${audit.candidates.length} tested options`,'',
  `Nominal representative-year winner(s): **${choice.nominalWinnerIds.join(', ')}**.`,
  `Minimax-regret winner(s) across the four source years: **${choice.robustWinnerIds.join(', ')}**.`,
  benefit,
  `There are **${choice.rankReversals.length}** option pairs whose relative order reverses between source years. Winner counts below describe this finite set, not probabilities.`,
  '', '| Option | Tilt / azimuth (degrees) | Nominal annual kWh | Worst historical regret (kWh) | Historical winner count |', '| --- | --- | ---: | ---: | ---: |',
  ...choice.candidates.map(c=>{const design=audit.candidates.find(a=>a.id===c.id)!;return `| ${c.id} | ${design.tiltDeg} / ${design.azimuthDeg} | ${number(c.nominalKWh)} | ${number(c.worstRegretKWh)} | ${c.winnerCount} / 4 |`;}),
  '', `Every option has the same ${number(study.configuration.array.capacityKwDc)} kWp DC capacity, inverter and other settings. This bounded grid does not establish a global optimum or surveyed roof feasibility. The loss and technology assumptions remain those of the research scenario.`,
  '', '## What the analysis adds','',
  'The report exposes source-year sensitivity, competing month-selection scores, seasonal outputs and ranking changes that a single point estimate hides. Its benefit is the ability to inspect stability and qualify a recommendation. A forecast-accuracy or human decision-quality benefit has not been established.',
  '', '## Evidence and reproduction','',
  '- `audit.json`: complete computed diagnostics and choice comparison.',
  '- `annual-monthly.csv`: source-year and selection-case energy.',
  '- `month-candidate-scores.csv`: all available candidate scores, chosen months and margins.',
  '- `array-comparison.csv`: candidate yields for historical and constructed-weather cases.',
  '- `predictions-2025.csv` and `model-metrics.csv`: historical reference-agreement comparison; weather-conditioned models use different information from seasonal baselines.',
  '- `frozen-bundle.json.gz`: locally frozen canonical/raw/adapted inputs and configuration, integrity-checked before replay.',
  '- `reproduction.json` and `manifest.json`: baseline equality, source version, protocol identity and output file hashes.',
  '', 'The four-year weather record is short. Model-to-model reference agreement and sensitivity diagnostics do not establish measured plant accuracy. Independent model/reference validation remains future work.',
 ];
 return lines.join('\n')+'\n';
}
