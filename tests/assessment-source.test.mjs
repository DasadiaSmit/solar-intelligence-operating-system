import test from "node:test";
import assert from "node:assert/strict";
import { assertAssessmentSources } from "../lib/research/assessment-source.ts";

function fixture() {
  const source = {
    providerId: "open-meteo",
    product: "Historical Weather API (era5)",
    requestedDataClass: "reanalysis",
    actualDataClass: "reanalysis",
  };
  const years = [2022, 2023, 2024, 2025];
  return {
    manifest: { mode: "live" },
    archive: {
      mode: "live",
      years: Object.fromEntries(years.map((year) => [year, []])),
      datasets: Object.fromEntries(years.map((year) => [year, {
        provenance: {
          provider: { id: source.providerId, product: source.product },
          requestedDataClass: source.requestedDataClass,
          actualDataClass: source.actualDataClass,
          semanticSubstitution: false,
        },
        rawPayload: { hourly: { time: [`${year}-01-01T01:00`] } },
      }])),
      evidence: years.map((year) => ({ year, ...source })),
    },
  };
}

test("the fixed source policy accepts a complete live ERA5 identity without mutating it", () => {
  const value = fixture();
  const before = structuredClone(value);
  assert.doesNotThrow(() => assertAssessmentSources(value.manifest, value.archive));
  assert.deepEqual(value, before);
});

test("a valid sample label cannot masquerade as this ERA5 assessment protocol", async (t) => {
  for (const field of ["manifest", "archive"]) await t.test(field, () => {
    const value = fixture();
    value[field].mode = "sample";
    assert.throws(() => assertAssessmentSources(value.manifest, value.archive), /mode must be live/);
  });
});

test("the policy rejects alternate provider/model and mismatched source-evidence identities", async (t) => {
  const cases = [
    ["alternate model", (a) => { a.datasets[2022].provenance.provider.product = "Historical Weather API (era5_land)"; }, /must identify Historical Weather API \(era5\)/],
    ["alternate provider", (a) => { a.datasets[2022].provenance.provider.id = "pvgis"; }, /must identify Open-Meteo/],
    ["evidence model", (a) => { a.evidence[0].product = "Historical Weather API (best_match)"; }, /must identify Historical Weather API \(era5\)/],
    ["evidence provider", (a) => { a.evidence[0].providerId = "sample"; }, /must identify Open-Meteo/],
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const { manifest, archive } = fixture();
    mutate(archive);
    assert.throws(() => assertAssessmentSources(manifest, archive), pattern);
  });
});

test("missing, extra, duplicated and unordered source years fail the fixed protocol", async (t) => {
  const cases = [
    ["missing canonical year", (a) => { delete a.datasets[2024]; }],
    ["missing adapted year", (a) => { delete a.years[2025]; }],
    ["extra year", (a) => { a.years[2021] = []; }],
    ["missing evidence year", (a) => { a.evidence.pop(); }],
    ["duplicated evidence year", (a) => { a.evidence[1].year = 2022; }],
    ["unordered evidence", (a) => { a.evidence.reverse(); }],
  ];
  for (const [name, mutate] of cases) await t.test(name, () => {
    const { manifest, archive } = fixture();
    mutate(archive);
    assert.throws(() => assertAssessmentSources(manifest, archive), /years|2022–2025/);
  });
});

test("raw inputs must be retained and cannot be absent or empty placeholders", async (t) => {
  for (const rawPayload of [undefined, null, {}, "", []]) await t.test(JSON.stringify(rawPayload) ?? "missing", () => {
    const { manifest, archive } = fixture();
    archive.datasets[2023].rawPayload = rawPayload;
    assert.throws(() => assertAssessmentSources(manifest, archive), /raw payload/);
  });
});

test("requested/actual simulation and explicit or unknown substitution are rejected", async (t) => {
  const cases = [
    ["requested simulation", (a) => { a.datasets[2022].provenance.requestedDataClass = "simulation"; }],
    ["actual simulation", (a) => { a.datasets[2022].provenance.actualDataClass = "simulation"; }],
    ["evidence simulation", (a) => { a.evidence[0].actualDataClass = "simulation"; }],
    ["substitution", (a) => { a.datasets[2022].provenance.semanticSubstitution = true; }],
    ["unspecified substitution", (a) => { delete a.datasets[2022].provenance.semanticSubstitution; }],
  ];
  for (const [name, mutate] of cases) await t.test(name, () => {
    const { manifest, archive } = fixture();
    mutate(archive);
    assert.throws(() => assertAssessmentSources(manifest, archive), /reanalysis|substitution/);
  });
});
