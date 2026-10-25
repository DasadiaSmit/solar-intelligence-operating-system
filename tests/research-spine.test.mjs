import test from "node:test";
import assert from "node:assert/strict";

import { handleAnnualStudyRequest } from "../app/api/v1/studies/annual/handler.ts";
import { DEFAULT_SYSTEM_CONFIG } from "../lib/sample/defaults.ts";
import { DAYS_IN_MONTH, generateSampleWeatherYear } from "../lib/sample/weather.ts";
import { buildRepresentativeYear } from "../lib/representative-year/index.ts";
import { sha256Hex } from "../lib/provenance/index.ts";
import {
  RESEARCH_WEATHER_ADAPTER_VERSION,
  buildAnnualResearchStudyFromArchive,
  canonicalDatasetToWeatherYear,
  loadHistoricalWeatherArchive,
} from "../lib/research/index.ts";
import { calculateSolarPosition } from "../lib/solar/solar-position.ts";
import { decomposeGhiErbs } from "../lib/solar/irradiance.ts";
import { simulateSolarYear } from "../lib/solar/simulation.ts";

const fixedNow = () => new Date("2026-07-22T00:00:00.000Z");
const archivePromise = loadHistoricalWeatherArchive(DEFAULT_SYSTEM_CONFIG.location, {
  mode: "sample",
  now: fixedNow,
  bypassCache: true,
  env: {
    SOLAR_PROVIDER_MODE: "sample",
    SOLAR_ALLOW_SIMULATED_FALLBACK: "false",
  },
});

test("Erbs decomposition preserves irradiance closure", () => {
  const position = calculateSolarPosition(
    "2025-06-21T12:00:00.000Z",
    DEFAULT_SYSTEM_CONFIG.location,
    172,
  );
  const components = decomposeGhiErbs(720, position);
  const cosZenith = Math.max(0, Math.cos(position.zenithDeg * Math.PI / 180));
  assert.ok(components.dniWm2 >= 0);
  assert.ok(components.dhiWm2 >= 0);
  assert.ok(Math.abs(components.ghiWm2 - (components.dniWm2 * cosZenith + components.dhiWm2)) < 1e-9);
  assert.ok(components.diffuseFraction >= 0 && components.diffuseFraction <= 1);

  const horizonPosition = {
    zenithDeg: 86,
    extraterrestrialNormalWm2: 1_361,
    isDaylight: true,
  };
  const horizon = decomposeGhiErbs(1_000, horizonPosition);
  const horizonCosine = Math.cos(horizonPosition.zenithDeg * Math.PI / 180);
  assert.ok(horizon.dniWm2 <= 1_400);
  assert.ok(Math.abs(horizon.ghiWm2 - (horizon.dniWm2 * horizonCosine + horizon.dhiWm2)) < 1e-9);
});

test("canonical 2022–2025 archive enforces one no-leap scientific calendar", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  assert.deepEqual(
    archive.evidence.map((evidence) => evidence.sourceRecordCount),
    [8_760, 8_760, 8_784, 8_760],
  );
  assert.deepEqual(
    archive.evidence.map((evidence) => evidence.simulationRecordCount),
    [8_760, 8_760, 8_760, 8_760],
  );
  assert.equal(archive.evidence[2]?.leapHoursRemoved, 24);
  assert.deepEqual(archive.evidence.map((evidence) => evidence.year), [2022, 2023, 2024, 2025]);
  for (const year of [2022, 2023, 2024, 2025]) {
    const weather = archive.years[year];
    const dataset = archive.datasets[year];
    assert.equal(weather.length, 8_760);
    assert.equal(dataset.records[0]?.timestampUtc, `${year}-01-01T01:00:00.000Z`);
    assert.equal(dataset.records.at(-1)?.timestampUtc, `${year + 1}-01-01T00:00:00.000Z`);
    assert.equal(weather[0]?.timestamp, `${year}-01-01T00:30:00.000Z`);
    assert.equal(weather.at(-1)?.dayOfYear, 365);
    assert.equal(weather.some((hour) => hour.month === 2 && hour.day === 29), false);
    assert.ok(weather.every((hour) => hour.quality.flags.includes("solar-evaluation:interval-midpoint")));
    const timestamps = new Set();
    for (let index = 0; index < weather.length; index += 1) {
      const hour = weather[index];
      const expectedDayOfYear = Math.floor(index / 24) + 1;
      const expected = calendarCoordinates(expectedDayOfYear);
      assert.equal(hour.hour, index % 24);
      assert.equal(hour.dayOfYear, expectedDayOfYear);
      assert.equal(hour.month, expected.month);
      assert.equal(hour.day, expected.day);
      assert.equal(
        hour.timestamp,
        new Date(Date.UTC(year, expected.month - 1, expected.day, index % 24, 30)).toISOString(),
      );
      assert.equal(Date.parse(hour.sourceTimestamp) - Date.parse(hour.timestamp), 30 * 60_000);
      assert.equal(hour.sourceYear, year);
      timestamps.add(hour.timestamp);
    }
    assert.equal(timestamps.size, 8_760);
    const evidence = archive.evidence.find((item) => item.year === year);
    assert.equal(evidence.snapshotId, dataset.provenance.snapshotId);
    assert.equal(evidence.contentHash, dataset.provenance.contentHash);
    assert.match(evidence.scienceContentHash, /^[a-f0-9]{64}$/);
    assert.equal(evidence.scienceAdapterVersion, RESEARCH_WEATHER_ADAPTER_VERSION);
    assert.equal(evidence.providerQualityScore, dataset.provenance.quality.score);
    assert.equal(evidence.providerCompleteness, dataset.provenance.quality.completeness);
    assert.ok(evidence.scienceQualityScore <= evidence.providerQualityScore);
    assert.equal(evidence.scienceCompleteness, 1);
    assert.equal(dataset.provenance.semanticSubstitution, false);
  }
});

test("astronomical geometry follows actual timestamps while model features retain no-leap ordinals", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const weather = archive.years[2024];
  const marchIndex = weather.findIndex((hour) => hour.month === 3 && hour.day === 1 && hour.hour === 12);
  const marchHour = weather[marchIndex];
  assert.ok(marchHour);
  assert.equal(marchHour.dayOfYear, 60);

  const simulated = simulateSolarYear(
    [marchHour],
    DEFAULT_SYSTEM_CONFIG.location,
    DEFAULT_SYSTEM_CONFIG.array,
    DEFAULT_SYSTEM_CONFIG.losses,
  );
  const timestampGeometry = calculateSolarPosition(
    marchHour.timestamp,
    DEFAULT_SYSTEM_CONFIG.location,
  );
  const compressedOrdinalGeometry = calculateSolarPosition(
    marchHour.timestamp,
    DEFAULT_SYSTEM_CONFIG.location,
    marchHour.dayOfYear,
  );
  assert.ok(Math.abs(
    simulated.hourly[0].position.declinationDeg - timestampGeometry.declinationDeg,
  ) < 1e-12);
  assert.ok(Math.abs(
    timestampGeometry.declinationDeg - compressedOrdinalGeometry.declinationDeg,
  ) > 0.05);

  const provingYear = generateSampleWeatherYear(2024, DEFAULT_SYSTEM_CONFIG.location, 91);
  const provingMarch = provingYear.find(
    (hour) => hour.month === 3 && hour.day === 1 && hour.hour === 12,
  );
  const provingPosition = calculateSolarPosition(
    provingMarch.timestamp,
    DEFAULT_SYSTEM_CONFIG.location,
  );
  const provingCosine = Math.max(0, Math.cos(provingPosition.zenithDeg * Math.PI / 180));
  assert.ok(Math.abs(
    provingMarch.ghiWm2 - (provingMarch.dniWm2 * provingCosine + provingMarch.dhiWm2),
  ) < 1e-9);
});

test("representative year selects complete months and keeps chronology internally consistent", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const representative = buildRepresentativeYear(
    archive.years,
    2026,
    archive.evidence.map((evidence) => evidence.scienceContentHash).join("|"),
  );
  const repeated = buildRepresentativeYear(
    archive.years,
    2026,
    archive.evidence.map((evidence) => evidence.scienceContentHash).join("|"),
  );
  const changedIdentity = buildRepresentativeYear(archive.years, 2026, "changed-source-identity");
  assert.equal(representative.weather.length, 8_760);
  assert.equal(repeated.record.id, representative.record.id);
  assert.notEqual(changedIdentity.record.id, representative.record.id);
  assert.equal(representative.record.status, "experimental");
  assert.match(representative.record.method, /Finkelstein/i);
  assert.ok(representative.weather.every((hour) => hour.quality.flags.includes("representative-month-selection")));
  assert.ok(representative.weather.every((hour) => {
    const timestamp = new Date(hour.timestamp);
    const expectedDay = Math.floor(
      (Date.UTC(2026, timestamp.getUTCMonth(), timestamp.getUTCDate()) - Date.UTC(2026, 0, 0)) /
        86_400_000,
    );
    return expectedDay === hour.dayOfYear;
  }));
  const selectedDays = { 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
  for (const month of representative.record.monthlyConstruction) {
    const weights = Object.values(month.sourceYearWeights);
    assert.equal(weights.filter((weight) => weight === 1).length, 1);
    assert.equal(weights.reduce((sum, weight) => sum + weight, 0), 1);
    const selectedYear = Number(
      Object.entries(month.sourceYearWeights).find(([, weight]) => weight === 1)?.[0],
    );
    const monthHours = representative.weather.filter((hour) => hour.month === month.month);
    assert.equal(monthHours.length, DAYS_IN_MONTH[month.month - 1] * 24);
    selectedDays[selectedYear] += DAYS_IN_MONTH[month.month - 1];
    for (const hour of monthHours) {
      assert.equal(hour.sourceYear, selectedYear);
      assert.equal(new Date(Date.parse(hour.sourceTimestamp) - 3_600_000).getUTCFullYear(), selectedYear);
      assert.equal(
        hour.timestamp,
        new Date(Date.UTC(2026, hour.month - 1, hour.day, hour.hour, 30)).toISOString(),
      );
      const coordinates = calendarCoordinates(hour.dayOfYear);
      assert.equal(hour.month, coordinates.month);
      assert.equal(hour.day, coordinates.day);
    }
  }
  assert.ok(Math.abs(Object.values(representative.record.sourceYearWeights)
    .reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
  for (const year of [2022, 2023, 2024, 2025]) {
    assert.ok(Math.abs(representative.record.sourceYearWeights[year] - selectedDays[year] / 365) < 1e-12);
  }
});

test("annual study separates training, calibration and untouched evaluation evidence", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const study = await buildAnnualResearchStudyFromArchive(
    DEFAULT_SYSTEM_CONFIG,
    archive,
    fixedNow(),
  );
  assert.equal(study.sourceMode, "simulation");
  assert.equal(study.productionTarget, "physics-derived-generation");
  assert.deepEqual(study.sourceYears, [2022, 2023, 2024, 2025]);
  assert.equal(study.historicalYears.length, 4);
  assert.equal(study.representativeYear.hours, 8_760);
  assert.equal(study.annualEstimate.uncertainty.sampleSize, 4);
  assert.equal(study.annualEstimate.uncertainty.nominalCoveragePct, null);
  assert.ok(study.annualEstimate.uncertainty.lowerKWh <= study.annualEstimate.uncertainty.medianKWh);
  assert.ok(study.annualEstimate.uncertainty.medianKWh <= study.annualEstimate.uncertainty.upperKWh);
  assert.deepEqual(study.validation.trainingYears, [2022, 2023]);
  assert.equal(study.validation.calibrationYear, 2024);
  assert.equal(study.validation.untouchedEvaluationYear, 2025);
  assert.equal(study.validation.rollingOrigin.length, 6);
  assert.deepEqual(
    study.provenance.orderedScienceContentHashes,
    archive.evidence.map((evidence) => evidence.scienceContentHash),
  );
  assert.equal(
    study.provenance.scienceAdapterVersion,
    archive.evidence[0].scienceAdapterVersion,
  );
  const ridgeRecipe = study.validation.modelRecipes.find(
    (recipe) => recipe.modelId === "meteo-ridge",
  );
  assert.equal(ridgeRecipe?.hyperparameters.regularization, 0.015);
  assert.equal(ridgeRecipe?.featureSchema.length, 10);
  assert.match(ridgeRecipe?.featureSchema[0] ?? "", /ghiWm2/);
  const ensembleRecipe = study.validation.modelRecipes.find(
    (recipe) => recipe.modelId === "hybrid-probabilistic",
  );
  assert.equal(ensembleRecipe?.hyperparameters.nominalCoveragePct, 80);
  const weightTotal = Object.values(study.validation.ensembleWeights)
    .reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(weightTotal - 1) < 1e-9);
  const physical = study.validation.modelEvidence.find((model) => model.id === "physics-reference");
  assert.equal(physical?.metrics, null);
  const hybrid = study.validation.modelEvidence.find((model) => model.id === "hybrid-probabilistic");
  assert.ok(hybrid?.metrics && Number.isFinite(hybrid.metrics.intervalCoveragePct));
  assert.match(study.limitations.join(" "), /No site meter or inverter production series/i);
  assert.doesNotMatch(JSON.stringify(study), /observed production accuracy/i);
});

test("annual study API returns compact scientific evidence and rejects invalid mode", { timeout: 30_000 }, async () => {
  const response = await handleAnnualStudyRequest(
    new Request("http://localhost/api/v1/studies/annual?mode=sample&systemLossPct=20"),
    { SOLAR_PROVIDER_MODE: "sample", SOLAR_ALLOW_SIMULATED_FALLBACK: "false" },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "simulated");
  assert.deepEqual(payload.data.sourceYears, [2022, 2023, 2024, 2025]);
  assert.equal(payload.data.representativeYear.hours, 8_760);
  assert.ok(Math.abs(payload.data.configuration.aggregatePvLossPct - 20) < 1e-9);
  assert.ok(payload.data.configuration.losses.shading > 0);
  assert.equal(payload.meta.dataQuality.length, 4);
  assert.ok(payload.meta.dataQuality.every((quality) => Number.isFinite(quality.scienceScore)));
  assert.doesNotMatch(JSON.stringify(payload), /rawPayload/);

  const customLocationResponse = await handleAnnualStudyRequest(
    new Request(
      "http://localhost/api/v1/studies/annual?mode=sample&latitude=51.5074&longitude=-0.1278",
    ),
    { SOLAR_PROVIDER_MODE: "sample", SOLAR_ALLOW_SIMULATED_FALLBACK: "false" },
  );
  assert.equal(customLocationResponse.status, 200);
  const customLocationPayload = await customLocationResponse.json();
  assert.equal(customLocationPayload.data.configuration.location.name, "Custom UTC research location");
  assert.equal(customLocationPayload.data.configuration.location.timezone, "UTC");
  assert.equal(customLocationPayload.data.configuration.location.standardUtcOffsetMinutes, 0);

  const invalid = await handleAnnualStudyRequest(
    new Request("http://localhost/api/v1/studies/annual?mode=forecast"),
  );
  assert.equal(invalid.status, 400);
  const invalidPayload = await invalid.json();
  assert.equal(invalidPayload.ok, false);
  assert.match(invalidPayload.error.message, /mode must be sample or live/i);
});

test("annual study identity is reproducible and archive provenance fails closed", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const first = await buildAnnualResearchStudyFromArchive(DEFAULT_SYSTEM_CONFIG, archive, fixedNow());
  const second = await buildAnnualResearchStudyFromArchive(
    DEFAULT_SYSTEM_CONFIG,
    archive,
    new Date("2026-07-23T00:00:00.000Z"),
  );
  assert.equal(first.studyId, second.studyId);
  assert.equal(first.representativeYear.id, second.representativeYear.id);
  assert.notEqual(first.generatedAtUtc, second.generatedAtUtc);

  await assert.rejects(
    buildAnnualResearchStudyFromArchive(
      DEFAULT_SYSTEM_CONFIG,
      { ...archive, evidence: [...archive.evidence].reverse() },
      fixedNow(),
    ),
    /evidence must be ordered 2022–2025/i,
  );
  await assert.rejects(
    buildAnnualResearchStudyFromArchive(
      DEFAULT_SYSTEM_CONFIG,
      {
        ...archive,
        evidence: archive.evidence.map((evidence) =>
          evidence.year === 2022 ? { ...evidence, snapshotId: `${evidence.snapshotId}-mismatch` } : evidence,
        ),
      },
      fixedNow(),
    ),
    /evidence identity does not match/i,
  );

  const alteredArchive = structuredClone(archive);
  const alteredHour = alteredArchive.years[2022].find(
    (hour) => hour.month === 6 && hour.day === 1 && hour.hour === 12,
  );
  alteredHour.ghiWm2 *= 0.5;
  alteredHour.dniWm2 *= 0.5;
  alteredHour.dhiWm2 *= 0.5;
  await assert.rejects(
    buildAnnualResearchStudyFromArchive(DEFAULT_SYSTEM_CONFIG, alteredArchive, fixedNow()),
    /science content hash.*does not match/i,
  );

  const revisedArchive = structuredClone(alteredArchive);
  const revisedScienceHash = await sha256Hex(revisedArchive.years[2022]);
  revisedArchive.evidence = revisedArchive.evidence.map((evidence) =>
    evidence.year === 2022
      ? { ...evidence, scienceContentHash: revisedScienceHash }
      : evidence,
  );
  const revised = await buildAnnualResearchStudyFromArchive(
    DEFAULT_SYSTEM_CONFIG,
    revisedArchive,
    fixedNow(),
  );
  assert.notEqual(revised.studyId, first.studyId);
  assert.notEqual(revised.representativeYear.id, first.representativeYear.id);
});

test("annual science adapter rejects unresolved required fields", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const dataset = archive.datasets[2022];
  const records = dataset.records.map((record, index) =>
    index === 100 ? { ...record, temperatureC: null } : { ...record },
  );
  assert.throws(
    () => canonicalDatasetToWeatherYear({ ...dataset, records }, 2022, DEFAULT_SYSTEM_CONFIG.location),
    /not eligible.*temperatureC/i,
  );

  const leapDataset = archive.datasets[2024];
  const incompleteLeapRecords = leapDataset.records.filter(
    (record) => record.timestampUtc !== "2024-02-29T12:00:00.000Z",
  );
  assert.throws(
    () => canonicalDatasetToWeatherYear(
      { ...leapDataset, records: incompleteLeapRecords },
      2024,
      DEFAULT_SYSTEM_CONFIG.location,
    ),
    /complete source intervals/i,
  );

  const unresolvedLeapRecords = leapDataset.records.map((record) =>
    record.timestampUtc === "2024-02-29T12:00:00.000Z"
      ? { ...record, temperatureC: null }
      : { ...record },
  );
  assert.throws(
    () => canonicalDatasetToWeatherYear(
      { ...leapDataset, records: unresolvedLeapRecords },
      2024,
      DEFAULT_SYSTEM_CONFIG.location,
    ),
    /temperatureC/i,
  );
});

test("snow proxy state evolves through the excluded leap day", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const dataset = archive.datasets[2024];
  const records = dataset.records.map((record) => {
    if (record.timestampUtc === "2024-02-29T00:00:00.000Z") {
      return { ...record, snowDepthCm: 0 };
    }
    if (
      record.timestampUtc >= "2024-02-29T01:00:00.000Z" &&
      record.timestampUtc <= "2024-03-01T00:00:00.000Z"
    ) {
      return {
        ...record,
        snowDepthCm: null,
        temperatureC: -2,
        precipitationMm: 1,
      };
    }
    if (record.timestampUtc === "2024-03-01T01:00:00.000Z") {
      return {
        ...record,
        snowDepthCm: null,
        temperatureC: 10,
        precipitationMm: 0,
      };
    }
    return { ...record };
  });
  const weather = canonicalDatasetToWeatherYear(
    { ...dataset, records },
    2024,
    DEFAULT_SYSTEM_CONFIG.location,
  );
  const marchFirst = weather.find(
    (hour) => hour.month === 3 && hour.day === 1 && hour.hour === 0,
  );
  assert.ok(marchFirst);
  assert.ok(Math.abs(marchFirst.snowDepthCm - 15.44) < 1e-9);
  assert.ok(marchFirst.quality.flags.includes("derived:snow-depth-balance-proxy"));
});

test("inconsistent supplied irradiance is closure-corrected and quality-penalised", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const dataset = archive.datasets[2022];
  const targetTimestamp = "2022-06-21T13:00:00.000Z";
  const targetIndex = dataset.records.findIndex(
    (record) => record.timestampUtc === targetTimestamp,
  );
  assert.ok(targetIndex >= 0);
  const records = dataset.records.map((record, index) =>
    index === targetIndex
      ? {
          ...record,
          ghiWm2: 500,
          dniWm2: 1_200,
          dhiWm2: 400,
          snowDepthCm: 0,
        }
      : { ...record },
  );
  const weather = canonicalDatasetToWeatherYear(
    { ...dataset, records },
    2022,
    DEFAULT_SYSTEM_CONFIG.location,
  );
  const corrected = weather.find(
    (hour) => hour.month === 6 && hour.day === 21 && hour.hour === 12,
  );
  assert.ok(corrected);
  const position = calculateSolarPosition(corrected.timestamp, DEFAULT_SYSTEM_CONFIG.location);
  const cosine = Math.max(0, Math.cos(position.zenithDeg * Math.PI / 180));
  assert.ok(Math.abs(
    corrected.ghiWm2 - (corrected.dniWm2 * cosine + corrected.dhiWm2),
  ) < 1e-9);
  assert.ok(corrected.quality.flags.includes("corrected:supplied-irradiance-closure"));
  assert.equal(corrected.quality.imputed, true);
  const expectedScore = Math.min(
    records[targetIndex].qualityScore,
    dataset.provenance.quality.score,
  ) - 0.02;
  assert.ok(Math.abs(corrected.quality.score - expectedScore) < 1e-12);
});

test("missing optional snow depth uses an explicit quality-penalised proxy", { timeout: 30_000 }, async () => {
  const archive = await archivePromise;
  const dataset = archive.datasets[2022];
  const records = dataset.records.map((record, recordIndex) =>
    recordIndex === 0
      ? { ...record, snowDepthCm: null, temperatureC: -2, precipitationMm: 2 }
      : recordIndex === 1
        ? { ...record, snowDepthCm: null, temperatureC: 10, precipitationMm: 0 }
        : { ...record },
  );
  const weather = canonicalDatasetToWeatherYear(
    { ...dataset, records },
    2022,
    DEFAULT_SYSTEM_CONFIG.location,
  );

  assert.equal(weather.length, 8_760);
  assert.ok(Math.abs(weather[0].snowDepthCm - 1.3) < 1e-12);
  assert.ok(Math.abs(weather[1].snowDepthCm - 1.14) < 1e-12);
  for (const index of [0, 1]) {
    const expectedScore = Math.min(
      records[index].qualityScore,
      dataset.provenance.quality.score,
    ) - 0.025;
    assert.equal(weather[index].albedo, 0.58);
    assert.ok(weather[index].quality.flags.includes("derived:snow-depth-balance-proxy"));
    assert.ok(weather[index].quality.flags.includes("derived:albedo-snow"));
    assert.ok(Math.abs(weather[index].quality.score - expectedScore) < 1e-12);
    assert.equal(weather[index].quality.completeness, 1);
    assert.equal(weather[index].quality.imputed, true);
  }
  assert.ok(weather.every((hour) => Number.isFinite(hour.snowDepthCm)));
  assert.ok(weather.every((hour) => hour.snowDepthCm >= 0 && hour.snowDepthCm <= 100));
  assert.notEqual(dataset.records[0].snowDepthCm, null);
});

function calendarCoordinates(ordinal) {
  let remaining = ordinal;
  for (let month = 1; month <= DAYS_IN_MONTH.length; month += 1) {
    const days = DAYS_IN_MONTH[month - 1];
    if (remaining <= days) return { ordinal, month, day: remaining };
    remaining -= days;
  }
  throw new Error(`Invalid no-leap ordinal ${ordinal}.`);
}
