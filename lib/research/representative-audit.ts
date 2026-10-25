import type { SystemConfig, WeatherHour } from '../contracts';
import { buildRepresentativeYear, type RepresentativeYearOptions } from '../representative-year';
import { RESEARCH_YEARS, type HistoricalWeatherArchive } from './historical-weather';
import { simulateSolarYear } from '../solar/simulation';
import { mean, quantile } from '../solar/math';
import { compareEnergyChoices } from './energy-choice';

export interface ArrayAuditCandidate { id: string; tiltDeg: number; azimuthDeg: number }
export { compareEnergyChoices, type EnergyCase } from './energy-choice';

function simulate(weather: WeatherHour[], config: SystemConfig, candidate?: ArrayAuditCandidate) {
  const array = candidate ? {...config.array,tiltDeg:candidate.tiltDeg,azimuthDeg:candidate.azimuthDeg} : config.array;
  const result = simulateSolarYear(weather,config.location,array,config.losses);
  const monthlyKWh = new Array<number>(12).fill(0);
  for (const hour of result.hourly) monthlyKWh[hour.weather.month-1] += hour.generation.acKWh;
  return {annualKWh:result.annualAcKWh,monthlyKWh};
}

function seams(weather: WeatherHour[]) {
  const result=[];
  for(let i=0;i<weather.length;i++) {
    if(weather[i].day!==1 || weather[i].hour!==0) continue;
    const previous=weather[(i+weather.length-1)%weather.length];
    result.push({month:weather[i].month,temperatureJumpC:Math.abs(weather[i].temperatureC-previous.temperatureC),cloudJumpPct:Math.abs(weather[i].cloudCoverPct-previous.cloudCoverPct)});
  }
  return result;
}

export function buildRepresentativeAudit(config: SystemConfig, archive: HistoricalWeatherArchive, candidates: ArrayAuditCandidate[], tolerance=1e-6) {
  if (config.array.tracking !== 'fixed') throw new Error('This audit requires fixed arrays.');
  if(candidates.length<2 || candidates.some(c=> !c.id || !Number.isFinite(c.tiltDeg)||c.tiltDeg<0||c.tiltDeg>90||!Number.isFinite(c.azimuthDeg)||c.azimuthDeg<0||c.azimuthDeg>=360)) throw new Error('Invalid array candidates.');
  const sourceIdentity=archive.evidence.map(e=>e.scienceContentHash).join('|');
  const historical=RESEARCH_YEARS.map(year=>({year,...simulate(archive.years[year],config)}));
  const totals=historical.map(r=>r.annualKWh);
  const historicalMean=mean(totals), historicalMedian=quantile([...totals].sort((a,b)=>a-b),0.5);
  const variants: Array<{id:string;options:RepresentativeYearOptions}> = [
    {id:'default',options:{}},
    {id:'no-persistence',options:{persistenceWeight:0}},
    {id:'no-continuity',options:{continuityWeight:0}},
    {id:'distribution-only',options:{persistenceWeight:0,continuityWeight:0}},
    ...RESEARCH_YEARS.map(year=>({id:`omit-${year}`,options:{sourceYears:RESEARCH_YEARS.filter(y=>y!==year)}})),
  ];
  const weatherByVariant=new Map<string,WeatherHour[]>();
  const variantsResult=variants.map(variant=>{
    const rep=buildRepresentativeYear(archive.years,2026,sourceIdentity,variant.options);
    weatherByVariant.set(variant.id,rep.weather);
    const energy=simulate(rep.weather,config);
    const seamRows=seams(rep.weather);
    return {id:variant.id,options:variant.options,...energy,diagnostics:rep.diagnostics,seams:seamRows,
      meanSeamTemperatureJumpC:mean(seamRows.map(r=>r.temperatureJumpC)),
      maximumSeamTemperatureJumpC:Math.max(...seamRows.map(r=>r.temperatureJumpC)),
      deviationFromHistoricalMeanPct:historicalMean>0?(energy.annualKWh/historicalMean-1)*100:null,
      deviationFromHistoricalMedianPct:historicalMedian>0?(energy.annualKWh/historicalMedian-1)*100:null};
  });
  const nominalWeather=weatherByVariant.get('default')!;
  const nominal=candidates.map(c=>simulate(nominalWeather,config,c));
  const historicalCases=RESEARCH_YEARS.map(year=>({id:String(year),rows:candidates.map(c=>simulate(archive.years[year],config,c))}));
  const variantCases=variantsResult.map(v=>({id:v.id,rows:candidates.map(c=>simulate(weatherByVariant.get(v.id)!,config,c))}));
  const choice=compareEnergyChoices(candidates.map(c=>c.id),nominal.map(r=>r.annualKWh),historicalCases.map(c=>({id:c.id,annualKWh:c.rows.map(r=>r.annualKWh)})),tolerance);
  return { version:'sios-representative-audit-1',sourceMode:archive.mode,productionTarget:'physics-derived-generation',
    evaluationStatus:'retrospective short-record sensitivity; no fresh holdout or measured production',historicalMeanKWh:historicalMean,historicalMedianKWh:historicalMedian,
    historical,variants:variantsResult,candidates,nominal,historicalCases,variantCases,choice,
    limitations:['Four years only. Omitted-year cases are retrospective diagnostics, not forecasting tests.','Regret improvement is descriptive over the same finite scenarios used to choose the robust option.','Method scores and seam jumps are diagnostics, not proof of measured accuracy.','Options are a bounded hypothetical grid, not surveyed feasibility or a global optimum.','The energy objective does not establish financial value.'] };
}
