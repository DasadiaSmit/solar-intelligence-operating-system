import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SYSTEM_CONFIG } from "../lib/sample/defaults.ts";
import { sha256Hex } from "../lib/provenance/hash.ts";
import { loadHistoricalWeatherArchive } from "../lib/research/historical-weather.ts";
import { buildAnnualResearchStudyFromArchive } from "../lib/research/annual-study.ts";
import {
  createFrozenBundle,
  validateFrozenBundle,
  FROZEN_BUNDLE_SCHEMA,
} from "../lib/research/frozen-bundle.ts";

const fixedNow = () => new Date("2026-10-25T12:00:00.000Z");
const metadata = { createdAtUtc: fixedNow().toISOString(), sourceCommit: "test-fixture", purpose: "Offline consistency test; simulated data" };
const archivePromise = loadHistoricalWeatherArchive(DEFAULT_SYSTEM_CONFIG.location, {
  mode: "sample",
  now: fixedNow,
  bypassCache: true,
  fetch: async () => { throw new Error("No network permitted in frozen-bundle tests."); },
  env: { SOLAR_PROVIDER_MODE: "sample", SOLAR_ALLOW_SIMULATED_FALLBACK: "false" },
});
const bundlePromise = archivePromise.then((archive) => createFrozenBundle(DEFAULT_SYSTEM_CONFIG, archive, metadata));

async function copyBundle() { return structuredClone(await bundlePromise); }

// Deliberately recompute the envelope to test semantic checks beneath integrity.
async function resign(bundle) {
  const hashes = { ...bundle.hashes };
  delete hashes.content;
  bundle.hashes.content = await sha256Hex({ ...bundle, hashes });
  return bundle;
}

test("frozen JSON round trip replays the same scientific study without network access", { timeout: 60_000 }, async () => {
  const original = await bundlePromise;
  const archive = await archivePromise;
  const archiveBefore = await sha256Hex(archive);
  const configBefore = await sha256Hex(DEFAULT_SYSTEM_CONFIG);
  const priorFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls += 1; throw new Error("Replay must be offline."); };
  try {
    const decoded = JSON.parse(JSON.stringify(original));
    const restored = await validateFrozenBundle(decoded);
    assert.equal(restored.bundle.schema, FROZEN_BUNDLE_SCHEMA);
    assert.equal(restored.bundle.hashes.content, original.hashes.content);
    assert.deepEqual(restored.archive.evidence.map((row) => row.sourceRecordCount), [8760, 8760, 8784, 8760]);
    assert.deepEqual(restored.archive.evidence.map((row) => row.simulationRecordCount), [8760, 8760, 8760, 8760]);
    assert.equal(restored.archive.evidence[2].leapHoursRemoved, 24);
    assert.equal(restored.archive.datasets[2022].rawPayload.generator, original.archive.datasets[2022].rawPayload.generator);
    const before = await buildAnnualResearchStudyFromArchive(DEFAULT_SYSTEM_CONFIG, archive, fixedNow());
    const replay = await buildAnnualResearchStudyFromArchive(restored.config, restored.archive, new Date("2026-10-26T12:00:00.000Z"));
    assert.equal(replay.studyId, before.studyId);
    assert.equal(replay.representativeYear.id, before.representativeYear.id);
    assert.equal(replay.annualEstimate.centralEstimateKWh, before.annualEstimate.centralEstimateKWh);
    assert.deepEqual(replay.historicalYears, before.historicalYears);
    assert.notEqual(replay.generatedAtUtc, before.generatedAtUtc);
    assert.equal(networkCalls, 0);
    decoded.config.location.name = "Mutated after validation";
    assert.notEqual(restored.config.location.name, decoded.config.location.name);
    assert.equal(await sha256Hex(archive), archiveBefore);
    assert.equal(await sha256Hex(DEFAULT_SYSTEM_CONFIG), configBefore);
  } finally {
    globalThis.fetch = priorFetch;
  }
});

test("complete-envelope hash covers raw payload, provenance, metadata and configuration", { timeout: 60_000 }, async (t) => {
  const cases = [
    ["raw payload", (bundle) => { bundle.archive.datasets[2022].rawPayload.generator = "changed"; }],
    ["provider provenance", (bundle) => { bundle.archive.datasets[2022].provenance.retrievalTimeUtc = "2026-01-01T00:00:00.000Z"; }],
    ["metadata", (bundle) => { bundle.metadata.purpose = "changed"; }],
    ["configuration", (bundle) => { bundle.config.array.tiltDeg += 1; }],
  ];
  for (const [name, alter] of cases) await t.test(name, async () => {
    const bundle = await copyBundle();
    alter(bundle);
    await assert.rejects(validateFrozenBundle(bundle), /complete-envelope content hash does not match/);
  });
});

test("canonical records are rehashed independently of the envelope", { timeout: 30_000 }, async () => {
  const bundle = await copyBundle();
  bundle.archive.datasets[2022].records[12].temperatureC += 1;
  await resign(bundle);
  await assert.rejects(validateFrozenBundle(bundle), /canonical records 2022 content hash does not match/);
});

test("rehashing modified scientific weather cannot bypass canonical regeneration", { timeout: 30_000 }, async () => {
  const bundle = await copyBundle();
  bundle.archive.years[2022][12].temperatureC += 1;
  const alteredHash = await sha256Hex(bundle.archive.years[2022]);
  bundle.hashes.adaptedWeather[2022] = alteredHash;
  bundle.archive.evidence[0].scienceContentHash = alteredHash;
  await resign(bundle);
  await assert.rejects(validateFrozenBundle(bundle), /regenerated scientific weather 2022 does not match/);
});

test("wrong-site reuse fails both the configuration binding and provider snapshot identity", { timeout: 60_000 }, async (t) => {
  await t.test("changed configuration cannot retain the old binding", async () => {
    const bundle = await copyBundle();
    bundle.config.location.latitude += 1;
    bundle.hashes.configuration = await sha256Hex(bundle.config);
    await resign(bundle);
    await assert.rejects(validateFrozenBundle(bundle), /site\/configuration binding does not match/);
  });
  await t.test("a newly generated binding cannot relabel a different site's archive", async () => {
    const config = structuredClone(DEFAULT_SYSTEM_CONFIG);
    config.location.longitude += 1;
    await assert.rejects(createFrozenBundle(config, await archivePromise, metadata), /snapshot\/query identity does not match the configured site/);
  });
});

test("stale versions and semantic substitution fail closed even with a fresh envelope hash", { timeout: 60_000 }, async (t) => {
  const cases = [
    ["bundle schema", (b) => { b.schema = "future-unsupported-version"; }, /unsupported schema version/],
    ["binding adapter", (b) => { b.binding.scienceAdapterVersion = "old-adapter"; }, /stale science adapter version/],
    ["evidence adapter", (b) => { b.archive.evidence[0].scienceAdapterVersion = "old-adapter"; }, /stale science adapter version/],
    ["provider schema", (b) => { b.archive.datasets[2022].provenance.schemaVersion = "old-schema"; }, /unsupported provider schema\/calculation version/],
    ["substituted data", (b) => { b.archive.datasets[2022].provenance.semanticSubstitution = true; }, /mode\/data class or semantic substitution/],
    ["wrong data class", (b) => { b.archive.datasets[2022].provenance.actualDataClass = "reanalysis"; }, /mode\/data class or semantic substitution/],
  ];
  for (const [name, alter, expected] of cases) await t.test(name, async () => {
    const bundle = await copyBundle();
    alter(bundle);
    await resign(bundle);
    await assert.rejects(validateFrozenBundle(bundle), expected);
  });
});

test("calendar, counts and source evidence cannot be forged by resigning", { timeout: 60_000 }, async (t) => {
  const cases = [
    ["missing leap interval", (b) => { b.archive.datasets[2024].records.splice(1416, 1); }, /2024 requires 8784 source intervals/],
    ["duplicate source interval", (b) => { b.archive.datasets[2022].records[1].timestampUtc = b.archive.datasets[2022].records[0].timestampUtc; }, /missing, duplicate or unordered UTC interval/],
    ["reordered evidence", (b) => { b.archive.evidence.reverse(); }, /source evidence must be ordered/],
    ["false derivation count", (b) => { b.archive.evidence[0].derivationCounts.erbsIrradianceHours += 1; }, /source evidence 2022.derivationCounts/],
    ["false source count", (b) => { b.archive.evidence[0].sourceRecordCount -= 1; }, /source evidence 2022.sourceRecordCount/],
  ];
  for (const [name, alter, expected] of cases) await t.test(name, async () => {
    const bundle = await copyBundle();
    alter(bundle);
    await resign(bundle);
    await assert.rejects(validateFrozenBundle(bundle), expected);
  });
});

test("malformed and non-finite JSON cannot become an apparently valid bundle", { timeout: 30_000 }, async (t) => {
  await assert.rejects(validateFrozenBundle(null), /bundle must be an object/);
  await assert.rejects(validateFrozenBundle({ schema: FROZEN_BUNDLE_SCHEMA }), /config must be an object/);
  for (const value of [NaN, Infinity, -Infinity]) await t.test(String(value), async () => {
    const config = structuredClone(DEFAULT_SYSTEM_CONFIG);
    config.array.tiltDeg = value;
    await assert.rejects(createFrozenBundle(config, await archivePromise, metadata), /finite numbers/);
  });
});
