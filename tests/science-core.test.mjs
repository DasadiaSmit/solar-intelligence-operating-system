import test from "node:test";
import assert from "node:assert/strict";

import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import { DEFAULT_SYSTEM_CONFIG } from "../lib/sample/defaults.ts";
import { generateHistoricalSample, generateSampleWeatherYear } from "../lib/sample/weather.ts";
import { buildRepresentativeYear } from "../lib/representative-year/index.ts";
import {
  calculateClearSkyIrradiance,
  calculateSolarPosition,
} from "../lib/solar/solar-position.ts";
import { transposeToPlaneOfArray } from "../lib/solar/irradiance.ts";
import { faimanCellTemperatureC } from "../lib/solar/power.ts";
import { dispatchEnergyYear, energyBalanceResidual } from "../lib/energy/dispatch.ts";
import { calculateValidationMetrics } from "../lib/forecasting/metrics.ts";
import {
  predictRidge,
  trainRidgeRegression,
} from "../lib/forecasting/models.ts";
import {
  rollingOriginEvaluate,
  seasonalNaiveOriginForecaster,
} from "../lib/forecasting/validation.ts";
import { paretoFront } from "../lib/optimisation/grid.ts";
import { runYieldMonteCarlo } from "../lib/optimisation/monte-carlo.ts";
import {
  depthToCentimetres,
  pressureToHpa,
  speedToMetresPerSecond,
  temperatureToCelsius,
} from "../lib/providers/conversions.ts";
import { parseWeatherQuery } from "../lib/providers/query.ts";
import { DeterministicSampleProvider } from "../lib/providers/sample.ts";
import { getWeatherDataset } from "../lib/providers/service.ts";
import {
  deriveScenario,
  normalizeSnapshot,
} from "../components/solar-os/model.ts";

test("NOAA geometry distinguishes equatorial noon and night", () => {
  const location = { latitude: 0, longitude: 0, elevationM: 0 };
  const noon = calculateSolarPosition("2025-03-20T12:00:00.000Z", location, 79);
  const night = calculateSolarPosition("2025-03-20T00:00:00.000Z", location, 79);
  assert.ok(noon.elevationDeg > 85);
  assert.ok(noon.azimuthDeg >= 0 && noon.azimuthDeg < 360);
  assert.equal(noon.isDaylight, true);
  assert.ok(night.elevationDeg < -85);
  assert.equal(night.isDaylight, false);
  const clearSky = calculateClearSkyIrradiance(noon);
  assert.ok(clearSky.ghiWm2 > 900);
  assert.ok(clearSky.dniWm2 >= 0 && clearSky.dhiWm2 >= 0);
});

test("plane-of-array irradiance is bounded and applies an optical AOI modifier", () => {
  const position = calculateSolarPosition(
    "2025-06-21T12:00:00.000Z",
    DEFAULT_SYSTEM_CONFIG.location,
    172,
  );
  const poa = transposeToPlaneOfArray(
    { ghiWm2: 800, dniWm2: 700, dhiWm2: 150, albedo: 0.2 },
    position,
    DEFAULT_SYSTEM_CONFIG.array,
  );
  assert.ok(poa.globalWm2 >= 0);
  assert.ok(poa.directWm2 <= 700 + 1e-9);
  assert.ok(poa.incidenceAngleModifier >= 0 && poa.incidenceAngleModifier <= 1);
  assert.ok(poa.angleOfIncidenceDeg >= 0 && poa.angleOfIncidenceDeg <= 180);
});

test("Faiman temperature responds to irradiance and cooling wind", () => {
  const still = faimanCellTemperatureC(20, 900, 0);
  const windy = faimanCellTemperatureC(20, 900, 8);
  assert.ok(still > 20);
  assert.ok(windy > 20);
  assert.ok(windy < still);
});

test("sample provider and representative-year construction are deterministic 8760-hour products", () => {
  const first = generateSampleWeatherYear(2022, DEFAULT_SYSTEM_CONFIG.location, 77);
  const second = generateSampleWeatherYear(2022, DEFAULT_SYSTEM_CONFIG.location, 77);
  assert.equal(first.length, 8760);
  assert.equal(second[4321]?.ghiWm2, first[4321]?.ghiWm2);
  const historical = generateHistoricalSample(DEFAULT_SYSTEM_CONFIG.location, 77);
  const representative = buildRepresentativeYear(historical);
  assert.equal(representative.weather.length, 8760);
  assert.equal(representative.record.monthlyConstruction.length, 12);
  const weight = Object.values(representative.record.sourceYearWeights)
    .reduce((total, value) => total + value, 0);
  assert.ok(Math.abs(weight - 1) < 1e-12);
  assert.ok(representative.weather.every((hour) => hour.quality.flags.includes("representative-month-selection")));
});

test("battery dispatch conserves solar energy and respects state limits", () => {
  const weather = [{ hour: 12 }, { hour: 20 }];
  const battery = {
    ...DEFAULT_SYSTEM_CONFIG.battery,
    enabled: true,
    capacityKWh: 10,
    maxChargeKw: 10,
    maxDischargeKw: 10,
    minSocFraction: 0,
    maxSocFraction: 1,
    initialSocFraction: 0,
    reserveFraction: 0,
    selfDischargePerHour: 0,
  };
  const dispatch = dispatchEnergyYear(
    [10, 0],
    [2, 5],
    weather,
    battery,
    DEFAULT_SYSTEM_CONFIG.tariff,
    DEFAULT_SYSTEM_CONFIG.carbon,
  );
  assert.equal(dispatch.flows.length, 2);
  assert.ok(dispatch.flows.every((flow) => flow.batterySocKWh >= 0 && flow.batterySocKWh <= 10));
  assert.ok(dispatch.flows.every((flow, index) =>
    Math.abs(energyBalanceResidual([10, 0][index], flow)) < 1e-9));
  assert.ok(Math.abs(dispatch.demandKWh - 7) < 1e-9);
});

test("an unchanged scenario preserves production for any recorded base orientation", () => {
  const normalized = normalizeSnapshot(buildOperatingSnapshot());
  const arbitraryConfig = {
    ...normalized.config,
    tiltDeg: 57,
    azimuthDeg: 103,
  };
  const arbitraryBase = { ...normalized, config: arbitraryConfig };
  const result = deriveScenario(arbitraryBase, { ...arbitraryConfig });
  assert.equal(result.changed, false);
  assert.ok(Math.abs(result.productionFactor - 1) < 1e-12);
  assert.ok(Math.abs(result.summary.annualKwh - normalized.hours.reduce((sum, hour) => sum + hour.acKw, 0)) < 1e-6);
});

test("forecast metrics, ridge fit and rolling-origin validation are numerical", () => {
  const metrics = calculateValidationMetrics([1, 2, 3, 4], [1, 2, 3, 4]);
  assert.equal(metrics.mae, 0);
  assert.equal(metrics.rmse, 0);
  assert.equal(metrics.rSquared, 1);
  const ridge = trainRidgeRegression(
    Array.from({ length: 30 }, (_, value) => ({ features: [value, value % 3], target: 3 + 2 * value })),
    0.000001,
  );
  assert.ok(Math.abs(predictRidge(ridge, [31, 1]) - 65) < 0.1);
  const series = Array.from({ length: 120 }, (_, index) => index % 24);
  const rolling = rollingOriginEvaluate(series, seasonalNaiveOriginForecaster(24), {
    initialTrainSize: 48,
    horizon: 24,
    step: 24,
  });
  assert.equal(rolling.metrics.mae, 0);
  assert.equal(rolling.origins.length, 3);
});

test("Pareto filtering and seeded Monte Carlo are deterministic", () => {
  const candidates = [
    { id: "a", yield: 10, cost: 5 },
    { id: "b", yield: 12, cost: 8 },
    { id: "c", yield: 9, cost: 9 },
  ];
  const front = paretoFront(candidates, [
    { value: (candidate) => candidate.yield, direction: "maximize" },
    { value: (candidate) => candidate.cost, direction: "minimize" },
  ]);
  assert.deepEqual(front.map((candidate) => candidate.id).sort(), ["a", "b"]);
  const first = runYieldMonteCarlo({ trials: 80, seed: 42, baselineGenerationKWh: 40_000 });
  const second = runYieldMonteCarlo({ trials: 80, seed: 42, baselineGenerationKWh: 40_000 });
  assert.deepEqual(first, second);
  assert.ok(first.p05GenerationKWh < first.p95GenerationKWh);
});

test("provider contracts preserve units, UTC validation and explicit fallback semantics", async () => {
  assert.ok(Math.abs(temperatureToCelsius(68, "°F") - 20) < 1e-12);
  assert.ok(Math.abs(speedToMetresPerSecond(36, "km/h") - 10) < 1e-12);
  assert.equal(pressureToHpa(101_325, "Pa"), 1013.25);
  assert.equal(depthToCentimetres(0.12, "m"), 12);
  assert.throws(
    () => parseWeatherQuery({ startUtc: "2025-01-01T00:00:00", endUtc: "2025-01-01T01:00:00" }),
    /explicit UTC offset|Z suffix/,
  );

  const query = parseWeatherQuery({
    latitude: 53.38,
    longitude: -1.47,
    startUtc: "2025-06-01T00:00:00Z",
    endUtc: "2025-06-02T23:00:00Z",
    dataClass: "simulation",
    provider: "sample",
    mode: "sample",
  });
  const provider = new DeterministicSampleProvider();
  const context = { fetch: globalThis.fetch, now: () => new Date("2026-07-21T00:00:00Z") };
  const first = await provider.fetch(query, context);
  const second = await provider.fetch(query, context);
  assert.equal(first.records.length, 48);
  assert.deepEqual(first.records, second.records);

  const requestedReanalysis = parseWeatherQuery({
    ...query,
    dataClass: "reanalysis",
    provider: "auto",
    mode: "auto",
    allowSimulatedFallback: true,
  });
  const fallback = await getWeatherDataset(requestedReanalysis, {
    env: { SOLAR_PROVIDER_MODE: "sample", SOLAR_ALLOW_SIMULATED_FALLBACK: "true" },
    now: () => new Date("2026-07-21T00:00:00Z"),
    bypassCache: true,
  });
  assert.equal(fallback.provenance.requestedDataClass, "reanalysis");
  assert.equal(fallback.provenance.actualDataClass, "simulation");
  assert.equal(fallback.provenance.semanticSubstitution, true);
});

test("operating snapshot integrates a complete auditable annual system", { timeout: 30_000 }, () => {
  const snapshot = buildOperatingSnapshot();
  assert.equal(snapshot.hourly.length, 8760);
  assert.equal(snapshot.monthly.length, 12);
  assert.equal(snapshot.representativeYear.comparisons.length, 4);
  assert.ok(snapshot.summary.annualGenerationKWh > 0);
  assert.ok(snapshot.summary.p10GenerationKWh <= snapshot.summary.p90GenerationKWh);
  assert.ok(snapshot.lossChain.length >= 10);
  assert.ok(snapshot.models.some((model) => model.id === "hybrid-probabilistic" && model.metrics));
  assert.ok(snapshot.models.some((model) => model.status === "planned" && model.metrics === null));
  assert.ok(snapshot.optimization.evaluatedCandidates > 1);
  assert.ok(snapshot.provenance.every((record) => record.reproducibilityKey.length > 8));
  assert.equal(snapshot.status.deterministic, true);
  assert.match(snapshot.status.guaranteeNotice, /not guaranteed/i);
});
