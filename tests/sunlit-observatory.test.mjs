import assert from "node:assert/strict";
import test from "node:test";
import { CALCULATION_VERSION } from "../lib/contracts/index.ts";
import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import { reproducibleId } from "../lib/provenance/index.ts";
import { compactOperatingSnapshot } from "../lib/client-snapshot.ts";
import { activationRequestForObservatoryPosition } from "../features/application-activation.ts";
import { buildSunlitFrame, SunlitFrameError } from "../features/sunlit-observatory/build-frame.ts";
import { DEFAULT_SUNLIT_INDEX, isSunlitDateUtc } from "../features/sunlit-observatory/frame.ts";
import { GET } from "../app/api/v1/observatory/route.ts";

const snapshot = buildOperatingSnapshot();
const resultId = await reproducibleId("sim", {
  config: snapshot.config,
  calculationVersion: CALCULATION_VERSION,
  representativeYearId: snapshot.representativeYear.id,
});
const build = (options = {}) => buildSunlitFrame({ snapshot, resultId, ...options });

test("sunlit UTC-day evidence preserves all canonical values and the existing compact transport", () => {
  const frame = build();
  assert.equal(frame.schemaVersion, "1.0.0");
  assert.equal(frame.resultId, resultId);
  assert.equal(frame.dateUtc, "2026-06-21");
  assert.equal(frame.initialIndex, DEFAULT_SUNLIT_INDEX);
  assert.equal(frame.hours.length, 24);
  assert.equal(frame.lifecycle, "SIMULATED");
  assert.equal(frame.intervalSeconds, 3600);
  assert.equal(frame.timestampRole, "canonical-record-anchor");
  assert.equal(frame.provenance.scenario, "canonical-baseline");
  assert.equal(frame.provider, snapshot.provenance.find((record) => record.kind === "provider").provider);
  assert.equal(frame.datasetVersion, snapshot.provenance.find((record) => record.kind === "dataset").version);
  assert.equal(frame.calculationVersion, CALCULATION_VERSION);
  assert.equal(frame.site.timeZone, snapshot.config.location.timezone);
  for (const hour of frame.hours) {
    const point = snapshot.hourly[hour.index];
    assert.deepEqual(hour, {
      index: point.index,
      timestampUtc: point.timestamp,
      solarElevationDeg: point.sun.apparentElevationDeg,
      solarAzimuthDeg: point.sun.azimuthDeg,
      isDaylight: point.sun.isDaylight,
      incidenceDeg: point.irradiance.angleOfIncidenceDeg,
      arrayTiltDeg: point.irradiance.resolvedTiltDeg,
      arrayAzimuthDeg: point.irradiance.resolvedAzimuthDeg,
      generationKWh: point.generation.acKWh,
      demandKWh: point.flow.demandKWh,
      solarToLoadKWh: point.flow.solarToLoadKWh,
      batteryChargeInputKWh: point.flow.batteryChargeKWh,
      batteryDischargeDeliveredKWh: point.flow.batteryDischargeKWh,
      batterySocKWh: point.flow.batterySocKWh,
      gridImportKWh: point.flow.gridImportKWh,
      gridExportKWh: point.flow.gridExportKWh,
      curtailedKWh: point.flow.curtailedKWh,
      ghiWm2: point.weather.ghiWm2,
      poaWm2: point.irradiance.effectiveWm2,
      temperatureC: point.weather.temperatureC,
      cloudCoverPct: point.weather.cloudCoverPct,
      humidityPct: point.weather.relativeHumidityPct,
      windSpeedMs: point.weather.windSpeedMps,
      qualityScore: point.quality.score,
    });
  }
  const compact = compactOperatingSnapshot(snapshot, resultId);
  assert.equal(compact.transport.format, "sios-hour-tuple-v1");
  assert.ok(compact.hourly.every((row) => row.length === 14));
  assert.ok(JSON.stringify(frame).length < 30_000, "One bounded UTC day must not transport the full year.");
  assert.ok(Object.isFrozen(frame) && Object.isFrozen(frame.hours) && Object.isFrozen(frame.hours[0]));
});

test("sunlit dates preserve exact annual boundaries without UTC day rollover", () => {
  const first = build({ dateUtc: "2026-01-01", selectedIndex: 0 });
  const last = build({ dateUtc: "2026-12-31", selectedIndex: 8759 });
  assert.equal(first.initialIndex, 0);
  assert.equal(first.hours[0].index, 0);
  assert.equal(first.hours[23].index, 23);
  assert.equal(last.initialIndex, 8759);
  assert.equal(last.hours[0].index, 8736);
  assert.equal(last.hours[23].index, 8759);
  assert.equal(build({ dateUtc: "2026-01-02" }).initialIndex, 36);
  assert.equal(build({ selectedIndex: 24 }).dateUtc, "2026-01-02");
  assert.equal(first.minDateUtc, "2026-01-01");
  assert.equal(last.maxDateUtc, "2026-12-31");
});

test("sunlit date and linked-index validation rejects impossible or mismatched selections", () => {
  for (const dateUtc of ["", "2026-2-01", "2026-02-29", "2026-04-31", "2026-13-01", " 2026-06-21", "2026-06-21T00:00:00Z", "2025-12-31", "2027-01-01"]) {
    assert.throws(() => build({ dateUtc }), (error) => error instanceof SunlitFrameError && error.kind === "invalid-query");
  }
  for (const selectedIndex of [-1, 8760, 12.5, NaN, Infinity]) {
    assert.throws(() => build({ selectedIndex }), (error) => error instanceof SunlitFrameError && error.kind === "invalid-query");
  }
  assert.throws(() => build({ dateUtc: "2026-01-01", selectedIndex: DEFAULT_SUNLIT_INDEX }), /belong to the requested/);
  assert.equal(isSunlitDateUtc("2024-02-29"), true);
  assert.equal(isSunlitDateUtc("2026-02-29"), false);
});

test("sunlit frames fail closed on chronology, flow, provenance or storage corruption", () => {
  const sourceAt = (index, transform) => ({
    ...snapshot,
    hourly: snapshot.hourly.map((point, candidate) => candidate === index ? transform(point) : point),
  });
  for (const source of [
    { ...snapshot, hourly: snapshot.hourly.slice(1) },
    sourceAt(0, (point) => ({ ...point, index: 1 })),
    sourceAt(8000, (point) => ({ ...point, timestamp: snapshot.hourly[7999].timestamp })),
    sourceAt(DEFAULT_SUNLIT_INDEX, (point) => ({ ...point, flow: { ...point.flow, gridExportKWh: point.flow.gridExportKWh + 1 } })),
    sourceAt(DEFAULT_SUNLIT_INDEX, (point) => ({ ...point, flow: { ...point.flow, batterySocKWh: 999 } })),
    sourceAt(DEFAULT_SUNLIT_INDEX, (point) => ({ ...point, weather: { ...point.weather, temperatureC: NaN } })),
    { ...snapshot, provenance: [] },
  ]) {
    assert.throws(() => build({ snapshot: source }), (error) => error instanceof SunlitFrameError && error.kind === "invalid-source");
  }
});

test("selected sunlit hours retain canonical night, dispatch and exact-index workspace handoffs", () => {
  const frame = build({ dateUtc: "2026-01-01" });
  assert.ok(frame.hours.some((hour) => !hour.isDaylight));
  assert.ok(frame.hours.some((hour) => hour.isDaylight));
  for (const hour of frame.hours) {
    if (!hour.isDaylight) assert.equal(hour.generationKWh, 0);
    assert.ok(hour.batterySocKWh <= frame.battery.capacityKWh * frame.battery.maxSocFraction + 1e-7);
    assert.ok(!(hour.batteryChargeInputKWh > 0 && hour.batteryDischargeDeliveredKWh > 0));
    assert.ok(!(hour.gridImportKWh > 0 && hour.gridExportKWh > 0));
    assert.ok(Math.abs(hour.generationKWh - hour.solarToLoadKWh - hour.batteryChargeInputKWh - hour.gridExportKWh - hour.curtailedKWh) < 1e-7);
    assert.ok(Math.abs(hour.demandKWh - hour.solarToLoadKWh - hour.batteryDischargeDeliveredKWh - hour.gridImportKWh) < 1e-7);
    const battery = activationRequestForObservatoryPosition(5, hour.index);
    assert.equal(battery.target.workspaceId, "BE");
    assert.equal(battery.target.selectedIndex, hour.index);
    assert.equal(battery.intent.focusTargetId, "battery-linked-interval");
    const array = activationRequestForObservatoryPosition(3, hour.index);
    assert.equal(array.target.workspaceId, "AE");
    assert.equal(array.target.selectedIndex, hour.index);
  }
  const midday = build().hours.find((hour) => hour.index === DEFAULT_SUNLIT_INDEX);
  assert.ok(Math.abs(midday.batterySocKWh - 22.8) < 1e-10);
  assert.ok(Math.abs(midday.batterySocKWh / snapshot.config.battery.capacityKWh - 0.95) < 1e-10);
});

test("horizon records preserve canonical daylight and all six handoffs preserve annual indices", () => {
  // The solar model includes the visible disk near the horizon. A client must
  // not silently replace this with an apparent-elevation > 0 classification.
  const horizon = build({ selectedIndex: 544 }).hours.find((hour) => hour.index === 544);
  assert.equal(horizon.timestampUtc, "2026-01-23T16:30:00.000Z");
  assert.equal(horizon.isDaylight, true);
  assert.ok(horizon.solarElevationDeg < 0 && horizon.solarElevationDeg > -0.833);
  assert.equal(horizon.generationKWh, 0);

  const workspaces = ["DT", "WA", "AF", "AE", "SR", "BE"];
  for (const index of [0, 23, 24, 544, DEFAULT_SUNLIT_INDEX, 8759]) {
    const frame = build({ selectedIndex: index });
    const hour = frame.hours.find((candidate) => candidate.index === index);
    assert.equal(hour.timestampUtc, snapshot.hourly[index].timestamp);
    for (const [position, workspaceId] of workspaces.entries()) {
      const activation = activationRequestForObservatoryPosition(position, hour.index);
      assert.equal(activation.target.workspaceId, workspaceId);
      assert.equal(activation.target.selectedIndex, index);
      assert.equal(activation.requestFocus, true);
    }
  }
});

test("observatory endpoint returns the same canonical identity and bounded date evidence", async () => {
  const response = await GET(new Request("http://local.test/api/v1/observatory?date=2026-12-31", {
    headers: { "x-request-id": "sunlit-test-request-0001" },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "private, max-age=300");
  assert.equal(response.headers.get("x-request-id"), "sunlit-test-request-0001");
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.apiVersion, "v1");
  assert.equal(payload.status, "simulated");
  assert.deepEqual(payload.data, build({ dateUtc: "2026-12-31" }));
  const defaultPayload = await (await GET(new Request("http://local.test/api/v1/observatory"))).json();
  assert.equal(defaultPayload.data.initialIndex, DEFAULT_SUNLIT_INDEX);
  assert.equal(defaultPayload.data.resultId, resultId);
});

test("observatory endpoint rejects malformed, duplicate and unavailable UTC dates with stable API errors", async () => {
  for (const query of ["date=", "date=2026-02-29", "date=2026-06", "date=2026-06-21&date=2026-06-22", "date=2025-01-01", "date=2027-01-01", "date=2026-06-21T12%3A30%3A00Z"]) {
    const response = await GET(new Request(`http://local.test/api/v1/observatory?${query}`));
    assert.equal(response.status, 400, query);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error.code, "INVALID_QUERY");
    assert.equal(payload.error.retryable, false);
  }
});
