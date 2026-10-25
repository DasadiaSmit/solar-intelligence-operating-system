import test from 'node:test';
import assert from 'node:assert/strict';
import { controlledReferenceConfiguration, buildReferenceCase } from '../lib/research/reference-export.ts';
import { DEFAULT_SYSTEM_CONFIG } from '../lib/sample/defaults.ts';
import { generateSampleWeatherYear } from '../lib/sample/weather.ts';
import { simulateSolarYear } from '../lib/solar/simulation.ts';

test('controlled diagnostic removes rear, age and loss allowances without mutating original configuration', () => {
  const original = structuredClone(DEFAULT_SYSTEM_CONFIG);
  const before = structuredClone(original);
  const controlled = controlledReferenceConfiguration(original);
  assert.deepEqual(original, before);
  assert.equal(controlled.array.bifaciality, 0);
  assert.equal(controlled.array.systemAgeYears, 0);
  assert.ok(Object.values(controlled.losses).every(v => v === 0));
  assert.equal(controlled.array.capacityKwDc, original.array.capacityKwDc);
  assert.equal(controlled.array.dcAcRatio, original.array.dcAcRatio);
  assert.throws(() => controlledReferenceConfiguration({ ...original, array: { ...original.array, tracking: 'dual-axis' } }));
});

test('snow diagnostic is copied explicitly while original calculations, timestamps and units remain intact', () => {
  const config = structuredClone(DEFAULT_SYSTEM_CONFIG);
  const weather = generateSampleWeatherYear(2023, config.location, 42).slice(170 * 24 + 11, 170 * 24 + 14).map(w => ({ ...w, snowDepthCm: 7 }));
  const before = structuredClone(weather);
  const result = buildReferenceCase('fixture', weather, config);
  const original = simulateSolarYear(weather, config.location, config.array, config.losses);
  const controlled = controlledReferenceConfiguration(config);
  const expected = simulateSolarYear(weather.map(w => ({ ...w, snowDepthCm: 0 })), config.location, controlled.array, controlled.losses);
  assert.deepEqual(weather, before);
  assert.equal(result.originalAnnualKWh, original.annualAcKWh);
  assert.equal(result.controlledAnnualKWh, expected.annualAcKWh);
  assert.ok(result.controlledAnnualKWh > result.originalAnnualKWh);
  for (const [i, row] of result.rows.entries()) {
    assert.equal(row.timestamp, weather[i].timestamp);
    assert.equal(row.snowDepthCm, 7);
    assert.equal(row.controlledPoaWm2, row.frontWm2);
    assert.equal(row.originalAcKw, original.hourly[i].generation.acKWh);
    assert.equal(row.controlledAcKw, expected.hourly[i].generation.acKWh);
  }
});
