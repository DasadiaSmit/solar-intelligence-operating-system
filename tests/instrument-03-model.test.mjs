import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import { quantile } from "../lib/solar/math.ts";
import {
  buildAnnualEnergyFrameV1,
} from "../features/visual-computing/build-annual-energy-frame.ts";
import {
  deriveAnnualEnergyView,
} from "../features/visual-computing/annual-energy-view.ts";

const snapshot = buildOperatingSnapshot();
const resultId = "sim_test_annual_energy";

function readyFrame(source = snapshot) {
  return buildAnnualEnergyFrameV1({
    snapshot: source,
    resultId,
    lifecycle: "SIMULATED",
  });
}

test("Annual Energy preserves all 8,760 unrounded canonical samples", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { frame } = result;

  assert.equal(frame.calendar.recordCount, 8_760);
  assert.equal(frame.calendar.intervalSeconds, 3600);
  assert.equal(frame.calendar.noLeap, true);
  assert.equal(frame.calendar.calendarYearUtc, 2026);
  assert.equal(
    frame.calendar.startTimestampUtc,
    snapshot.hourly[0].timestamp,
  );
  assert.equal(
    frame.calendar.endTimestampUtc,
    snapshot.hourly.at(-1).timestamp,
  );
  assert.deepEqual(
    frame.series.generationAcKWh,
    snapshot.hourly.map((point) => point.generation.acKWh),
  );
  assert.deepEqual(
    Object.keys(frame.series),
    ["generationAcKWh", "qualityScores"],
  );
  assert.deepEqual(
    frame.series.qualityScores,
    snapshot.hourly.map((point) => point.quality.score),
  );
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.series.generationAcKWh));
  assert.ok(Object.isFrozen(frame.seasons));
});

test("hourly, monthly and annual generation reconcile without rounding", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { frame } = result;
  const hourly = frame.series.generationAcKWh.reduce(
    (total, value) => total + value,
    0,
  );
  const monthly = frame.monthly.reduce(
    (total, record) => total + record.generationKWh,
    0,
  );

  assert.equal(hourly, snapshot.summary.annualGenerationKWh);
  assert.ok(Math.abs(monthly - hourly) < 1e-8);
  assert.equal(
    frame.summary.annualGenerationKWh,
    snapshot.summary.annualGenerationKWh,
  );
  assert.equal(frame.summary.peakAcKw, snapshot.summary.peakAcKw);
  assert.equal(
    frame.summary.specificYieldKWhPerKwp,
    snapshot.summary.specificYieldKWhPerKwp,
  );
  assert.ok(
    frame.series.generationAcKWh.every(
      (value) =>
        value >= 0 && value <= frame.summary.capacityKwDc,
    ),
  );
});

test("meteorological seasons follow the configured hemisphere", () => {
  const northern = readyFrame();
  assert.equal(northern.status, "ready");
  assert.equal(northern.frame.calendar.hemisphere, "northern");
  assert.deepEqual(
    northern.frame.seasons.map((season) => [
      season.season,
      season.months,
    ]),
    [
      ["winter", [12, 1, 2]],
      ["spring", [3, 4, 5]],
      ["summer", [6, 7, 8]],
      ["autumn", [9, 10, 11]],
    ],
  );
  assert.ok(
    Math.abs(
      northern.frame.seasons.reduce(
        (total, season) => total + season.generationKWh,
        0,
      ) - northern.frame.summary.annualGenerationKWh,
    ) < 1e-8,
  );

  const southern = readyFrame({
    ...snapshot,
    config: {
      ...snapshot.config,
      location: {
        ...snapshot.config.location,
        latitude: -33.8688,
      },
    },
  });
  assert.equal(southern.status, "ready");
  assert.equal(southern.frame.calendar.hemisphere, "southern");
  assert.deepEqual(
    southern.frame.seasons.map((season) => [
      season.season,
      season.months,
    ]),
    [
      ["summer", [12, 1, 2]],
      ["autumn", [3, 4, 5]],
      ["winter", [6, 7, 8]],
      ["spring", [9, 10, 11]],
    ],
  );
});

test("four source years produce an honest empirical annual spread", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { empiricalSpread, representativeYear } = result.frame;
  const comparisons = [...snapshot.representativeYear.comparisons].sort(
    (first, second) => first.year - second.year,
  );
  const ordered = comparisons
    .map((comparison) => comparison.generationKWh)
    .sort((first, second) => first - second);

  assert.equal(
    empiricalSpread.basis,
    "four-source-year-annual-generation",
  );
  assert.equal(
    empiricalSpread.quantileMethod,
    "linear-interpolation-between-ordered-values",
  );
  assert.deepEqual(
    empiricalSpread.sourceYears,
    comparisons.map((comparison) => comparison.year),
  );
  assert.deepEqual(
    empiricalSpread.sourceAnnualGenerationKWh,
    comparisons.map((comparison) => comparison.generationKWh),
  );
  assert.equal(empiricalSpread.p10KWh, quantile(ordered, 0.1));
  assert.equal(empiricalSpread.p50KWh, quantile(ordered, 0.5));
  assert.equal(empiricalSpread.p90KWh, quantile(ordered, 0.9));
  assert.equal(empiricalSpread.calibratedProbabilisticInterval, false);
  assert.equal(empiricalSpread.forecastGuarantee, false);
  assert.equal(representativeYear.id, snapshot.representativeYear.id);
  assert.equal(representativeYear.method, snapshot.representativeYear.method);
  assert.deepEqual(
    representativeYear.sourceYears,
    snapshot.representativeYear.sourceYears,
  );
});

test("provenance and unavailable scientific layers remain explicit", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { frame } = result;
  const provider = snapshot.provenance.find(
    (record) => record.kind === "provider",
  );
  const dataset = snapshot.provenance.find(
    (record) => record.kind === "dataset",
  );
  const calculation = snapshot.provenance.find(
    (record) => record.kind === "calculation",
  );
  assert.equal(frame.provenance.provider, provider.provider);
  assert.equal(frame.provenance.datasetVersion, dataset.version);
  assert.equal(
    frame.provenance.calculationVersion,
    calculation.calculationVersion,
  );
  assert.ok(frame.provenance.evidenceRefIds.length >= 12);
  assert.deepEqual(
    Object.keys(frame.unavailableLayers),
    [
      "measuredOrLivePlantOutput",
      "issuedFutureForecast",
      "intraHourVariation",
      "spatialGenerationField",
      "causalClimateAttribution",
    ],
  );
  assert.ok(
    Object.values(frame.unavailableLayers).every(
      (layer) =>
        layer.status === "unavailable"
        && layer.value === null
        && layer.reason.length > 0,
    ),
  );
});

test("invalid calendars, energy, summaries and spread fail closed", () => {
  const missingHour = readyFrame({
    ...snapshot,
    hourly: snapshot.hourly.slice(0, -1),
  });
  assert.equal(missingHour.status, "unavailable");
  assert.equal(missingHour.reason, "invalid-annual-calendar");

  const shifted = [...snapshot.hourly];
  shifted[4_000] = {
    ...shifted[4_000],
    timestamp: new Date(
      Date.parse(shifted[4_000].timestamp) + 1_800_000,
    ).toISOString(),
  };
  const nonContiguous = readyFrame({ ...snapshot, hourly: shifted });
  assert.equal(nonContiguous.status, "unavailable");
  assert.equal(nonContiguous.reason, "invalid-annual-calendar");

  const invalidEnergyHours = [...snapshot.hourly];
  invalidEnergyHours[4_000] = {
    ...invalidEnergyHours[4_000],
    generation: {
      ...invalidEnergyHours[4_000].generation,
      acKWh: snapshot.config.array.capacityKwDc + 1,
    },
  };
  const invalidEnergy = readyFrame({
    ...snapshot,
    hourly: invalidEnergyHours,
  });
  assert.equal(invalidEnergy.status, "unavailable");
  assert.equal(invalidEnergy.reason, "invalid-hourly-energy");

  const invalidSummary = readyFrame({
    ...snapshot,
    summary: {
      ...snapshot.summary,
      annualGenerationKWh:
        snapshot.summary.annualGenerationKWh + 1,
    },
  });
  assert.equal(invalidSummary.status, "unavailable");
  assert.equal(invalidSummary.reason, "invalid-annual-summary");

  const invalidSpread = readyFrame({
    ...snapshot,
    representativeYear: {
      ...snapshot.representativeYear,
      comparisons: snapshot.representativeYear.comparisons.slice(0, 3),
    },
  });
  assert.equal(invalidSpread.status, "unavailable");
  assert.equal(invalidSpread.reason, "invalid-empirical-spread");
});

test("the view clones, revalidates and fails closed", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const projected = deriveAnnualEnergyView(result);
  assert.equal(projected.status, "ready");
  assert.deepEqual(projected.view, result.frame);
  assert.notEqual(projected.view, result.frame);
  assert.notEqual(
    projected.view.series.generationAcKWh,
    result.frame.series.generationAcKWh,
  );
  assert.ok(Object.isFrozen(projected.view));
  assert.ok(Object.isFrozen(projected.view.series.generationAcKWh));

  const invalid = deriveAnnualEnergyView({
    status: "ready",
    frame: {
      ...result.frame,
      empiricalSpread: {
        ...result.frame.empiricalSpread,
        forecastGuarantee: true,
      },
    },
  });
  assert.equal(invalid.status, "unavailable");
  assert.equal(invalid.reason, "invalid-annual-energy-frame");
});
