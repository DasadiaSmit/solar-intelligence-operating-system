import type { SystemConfig, WeatherHour } from '../contracts';
import { buildRepresentativeYear } from '../representative-year';
import { simulateSolarYear } from '../solar/simulation';
import { RESEARCH_YEARS, type HistoricalWeatherArchive } from './historical-weather';
import protocol from '../../docs/research/assessment-protocol-02.json';

/** A labelled diagnostic configuration, never a replacement for the original. */
export function controlledReferenceConfiguration(config: SystemConfig): SystemConfig {
  if (config.array.tracking !== 'fixed') throw new Error('Reference protocol requires fixed arrays.');
  return {
    ...config,
    array: { ...config.array, bifaciality: 0, systemAgeYears: 0 },
    losses: Object.fromEntries(Object.keys(config.losses).map(key => [key, 0])) as unknown as SystemConfig['losses'],
  };
}

export function buildReferenceCase(id: string, weather: WeatherHour[], config: SystemConfig) {
  const original = simulateSolarYear(weather, config.location, config.array, config.losses);
  const controlledConfig = controlledReferenceConfiguration(config);
  // Zeroing configured snow alone does not remove dynamic snow loss.
  const controlledWeather = weather.map(hour => ({ ...hour, snowDepthCm: 0 }));
  const controlled = simulateSolarYear(controlledWeather, config.location, controlledConfig.array, controlledConfig.losses);
  const rows = original.hourly.map((hour, index) => {
    const { weather: w, position: p, poa, generation: g } = hour;
    const c = controlled.hourly[index];
    return {
      timestamp: w.timestamp, month: w.month,
      temperatureC: w.temperatureC, windSpeedMps: w.windSpeedMps, surfacePressureHpa: w.surfacePressureHpa,
      albedo: w.albedo, ghiWm2: w.ghiWm2, dniWm2: w.dniWm2, dhiWm2: w.dhiWm2, snowDepthCm: w.snowDepthCm,
      elevationDeg: p.elevationDeg, zenithDeg: p.zenithDeg, azimuthDeg: p.azimuthDeg, apparentElevationDeg: p.apparentElevationDeg,
      directWm2: poa.directWm2, diffuseWm2: poa.diffuseWm2, reflectedWm2: poa.reflectedWm2,
      frontWm2: poa.globalWm2, effectiveWm2: poa.effectiveWm2,
      cellTemperatureC: g.cellTemperatureC, idealDcKWh: g.idealDcKWh,
      temperatureFactor: g.losses.temperature, temperatureAdjustedDcKw: g.idealDcKWh * g.losses.temperature,
      originalAcKw: g.acKWh, controlledPoaWm2: c.poa.effectiveWm2,
      controlledTemperatureC: c.generation.cellTemperatureC, controlledDcKw: c.generation.dcKWh, controlledAcKw: c.generation.acKWh,
    };
  });
  return { id, rows, originalAnnualKWh: original.annualAcKWh, controlledAnnualKWh: controlled.annualAcKWh };
}

export function buildReferenceInputs(config: SystemConfig, archive: HistoricalWeatherArchive) {
  const representative = buildRepresentativeYear(archive.years, 2026, archive.evidence.map(e => e.scienceContentHash).join('|'));
  const cases = [
    ...RESEARCH_YEARS.map(year => buildReferenceCase(String(year), archive.years[year], config)),
    buildReferenceCase('representative-2026', representative.weather, config),
  ];
  const controlledConfig = controlledReferenceConfiguration(config);
  const candidates = protocol.arrayGrid.tiltDeg.flatMap(tiltDeg => protocol.arrayGrid.azimuthDeg.map(azimuthDeg => ({
    id: `tilt-${tiltDeg}_azimuth-${azimuthDeg}`, tiltDeg, azimuthDeg,
  })));
  const arrayCases = RESEARCH_YEARS.flatMap(year => {
    const weather = archive.years[year].map(hour => ({ ...hour, snowDepthCm: 0 }));
    return candidates.map(candidate => {
      const result = simulateSolarYear(weather, config.location, { ...controlledConfig.array, ...candidate }, controlledConfig.losses);
      const monthlyKWh = new Array<number>(12).fill(0);
      for (const hour of result.hourly) monthlyKWh[hour.weather.month - 1] += hour.generation.acKWh;
      return { year, candidate, annualKWh: result.annualAcKWh, monthlyKWh };
    });
  });
  return { schema: 'sios-reference-input-1', config, controlledConfig, protocol, cases, arrayCases };
}
