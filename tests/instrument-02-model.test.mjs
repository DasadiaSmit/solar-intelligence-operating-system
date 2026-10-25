import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import {
  buildAtmosphericObservationFrameV1,
} from "../features/visual-computing/build-atmospheric-observation-frame.ts";
import {
  deriveAtmosphericObservationView,
} from "../features/visual-computing/atmospheric-observation-view.ts";
import {
  ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
} from "../features/visual-computing/atmospheric-observation-frame.ts";

const selectedIndex = 171 * 24 + 12;
const resultId = "sim_test_atmospheric_observation";

function readyFrame() {
  const snapshot = buildOperatingSnapshot();
  const result = buildAtmosphericObservationFrameV1({
    snapshot,
    resultId,
    selectedIndex,
    lifecycle: "SIMULATED",
  });
  return { snapshot, result };
}

test("the atmospheric frame preserves the canonical linked interval", () => {
  const { snapshot, result } = readyFrame();
  assert.equal(result.status, "ready");
  const source = snapshot.hourly[selectedIndex];
  const { frame } = result;

  assert.equal(frame.timestampUtc, source.timestamp);
  assert.equal(frame.intervalSeconds, 3600);
  assert.equal(frame.lifecycle, "SIMULATED");
  assert.equal(
    frame.weather.cloudCoverPct,
    source.weather.cloudCoverPct,
  );
  assert.equal(
    frame.weather.relativeHumidityPct,
    source.weather.relativeHumidityPct,
  );
  assert.equal(frame.weather.windSpeedMps, source.weather.windSpeedMps);
  assert.equal(
    frame.weather.ambientTemperatureC,
    source.weather.temperatureC,
  );
  assert.equal(frame.irradiance.ghiWm2, source.weather.ghiWm2);
  assert.equal(frame.irradiance.dniWm2, source.weather.dniWm2);
  assert.equal(frame.irradiance.dhiWm2, source.weather.dhiWm2);
  assert.equal(
    frame.irradiance.effectivePoaWm2,
    source.irradiance.effectiveWm2,
  );
  assert.equal(frame.energy.acEnergyKWh, source.generation.acKWh);
  assert.equal(
    frame.array.capacityKwDc,
    snapshot.config.array.capacityKwDc,
  );
  assert.deepEqual(frame.quality, source.quality);
  assert.deepEqual(frame.units, {
    cloudCover: "%",
    relativeHumidity: "%",
    windSpeed: "m/s",
    ambientTemperature: "°C",
    irradiance: "W/m²",
    acEnergy: "kWh/1h",
    arrayCapacity: "kW DC",
    quality: "fraction",
  });
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.weather));
  assert.ok(Object.isFrozen(frame.quality.flags));
});

test("the frame preserves attributable provenance and evidence references", () => {
  const { snapshot, result } = readyFrame();
  assert.equal(result.status, "ready");
  const provider = snapshot.provenance.find(
    (record) => record.kind === "provider",
  );
  const dataset = snapshot.provenance.find(
    (record) => record.kind === "dataset",
  );
  const calculation = snapshot.provenance.find(
    (record) => record.kind === "calculation",
  );

  assert.equal(result.frame.provenance.provider, provider.provider);
  assert.equal(result.frame.provenance.datasetVersion, dataset.version);
  assert.equal(
    result.frame.provenance.calculationVersion,
    calculation.calculationVersion,
  );
  assert.deepEqual(result.frame.provenance.evidenceRefIds, [
    `evidence:${resultId}:hour.cloud`,
    `evidence:${resultId}:hour.humidity`,
    `evidence:${resultId}:hour.wind-speed`,
    `evidence:${resultId}:hour.temperature`,
    `evidence:${resultId}:hour.ghi`,
    `evidence:${resultId}:hour.dni`,
    `evidence:${resultId}:hour.dhi`,
    `evidence:${resultId}:hour.poa`,
    `evidence:${resultId}:hour.ac`,
    `evidence:${resultId}:scenario.capacity`,
  ]);
});

test("coincident evidence never becomes a causal or live-output claim", () => {
  const { result } = readyFrame();
  assert.equal(result.status, "ready");
  assert.deepEqual(result.frame.relationship, {
    temporalBasis: "coincident-one-hour-interval",
    causalityClaim: false,
  });
  assert.deepEqual(
    Object.keys(result.frame.unavailableLayers),
    [
      "windDirection",
      "cloudAltitude",
      "cloudType",
      "cloudGeometry",
      "cloudMotion",
      "subHourResponse",
      "measuredOrLivePlantOutput",
    ],
  );
  assert.ok(
    Object.values(result.frame.unavailableLayers).every(
      (layer) =>
        layer.status === "unavailable"
        && layer.value === null
        && layer.reason.length > 0,
    ),
  );
  assert.equal("windDirectionDeg" in result.frame.weather, false);
  assert.equal("cloudVelocity" in result.frame.weather, false);
  assert.equal("measuredPower" in result.frame.energy, false);
});

test("the builder fails closed for invalid values, intervals and provenance", () => {
  const snapshot = buildOperatingSnapshot();
  const hours = [...snapshot.hourly];
  hours[selectedIndex] = {
    ...hours[selectedIndex],
    weather: {
      ...hours[selectedIndex].weather,
      windSpeedMps: Number.NaN,
    },
  };
  const invalidValue = buildAtmosphericObservationFrameV1({
    snapshot: { ...snapshot, hourly: hours },
    resultId,
    selectedIndex,
    lifecycle: "SIMULATED",
  });
  assert.equal(invalidValue.status, "unavailable");
  assert.equal(invalidValue.reason, "invalid-observation-value");

  const shiftedHours = [...snapshot.hourly];
  shiftedHours[selectedIndex + 1] = {
    ...shiftedHours[selectedIndex + 1],
    timestamp: new Date(
      Date.parse(shiftedHours[selectedIndex].timestamp) + 1_800_000,
    ).toISOString(),
  };
  const invalidInterval = buildAtmosphericObservationFrameV1({
    snapshot: { ...snapshot, hourly: shiftedHours },
    resultId,
    selectedIndex,
    lifecycle: "SIMULATED",
  });
  assert.equal(invalidInterval.status, "unavailable");
  assert.equal(invalidInterval.reason, "invalid-linked-interval");

  const missingProvenance = buildAtmosphericObservationFrameV1({
    snapshot: {
      ...snapshot,
      provenance: snapshot.provenance.filter(
        (record) => record.kind !== "dataset",
      ),
    },
    resultId,
    selectedIndex,
    lifecycle: "SIMULATED",
  });
  assert.equal(missingProvenance.status, "unavailable");
  assert.equal(missingProvenance.reason, "missing-provenance");
});

test("finite values outside provider and model-output bounds fail closed", () => {
  const snapshot = buildOperatingSnapshot();
  const source = snapshot.hourly[selectedIndex];
  const mutations = [
    {
      label: "cloud cover",
      hour: {
        ...source,
        weather: { ...source.weather, cloudCoverPct: 101 },
      },
    },
    {
      label: "relative humidity",
      hour: {
        ...source,
        weather: { ...source.weather, relativeHumidityPct: 101 },
      },
    },
    {
      label: "temperature",
      hour: {
        ...source,
        weather: { ...source.weather, temperatureC: 66 },
      },
    },
    {
      label: "wind speed",
      hour: {
        ...source,
        weather: { ...source.weather, windSpeedMps: 111 },
      },
    },
    {
      label: "GHI",
      hour: {
        ...source,
        weather: { ...source.weather, ghiWm2: 1_501 },
      },
    },
    {
      label: "DNI",
      hour: {
        ...source,
        weather: { ...source.weather, dniWm2: 1_601 },
      },
    },
    {
      label: "DHI",
      hour: {
        ...source,
        weather: { ...source.weather, dhiWm2: 1_101 },
      },
    },
    {
      label: "effective POA",
      hour: {
        ...source,
        irradiance: {
          ...source.irradiance,
          effectiveWm2: ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2 + 1,
        },
      },
    },
    {
      label: "one-hour AC energy",
      hour: {
        ...source,
        generation: {
          ...source.generation,
          acKWh: snapshot.config.array.capacityKwDc + 0.001,
        },
      },
    },
  ];

  for (const mutation of mutations) {
    const hours = [...snapshot.hourly];
    hours[selectedIndex] = mutation.hour;
    const result = buildAtmosphericObservationFrameV1({
      snapshot: { ...snapshot, hourly: hours },
      resultId,
      selectedIndex,
      lifecycle: "SIMULATED",
    });
    assert.equal(
      result.status,
      "unavailable",
      `${mutation.label} must not produce a ready frame`,
    );
    assert.equal(result.reason, "invalid-observation-value");
  }
});

test("the view deeply validates and immutably projects the frame", () => {
  const { result } = readyFrame();
  assert.equal(result.status, "ready");
  const projected = deriveAtmosphericObservationView(result);
  assert.equal(projected.status, "ready");
  assert.deepEqual(projected.view, result.frame);
  assert.notEqual(projected.view, result.frame);
  assert.ok(Object.isFrozen(projected.view));
  assert.ok(Object.isFrozen(projected.view.unavailableLayers));
  assert.ok(Object.isFrozen(projected.view.provenance.evidenceRefIds));

  const invalid = deriveAtmosphericObservationView({
    status: "ready",
    frame: {
      ...result.frame,
      relationship: {
        ...result.frame.relationship,
        causalityClaim: true,
      },
    },
  });
  assert.equal(invalid.status, "unavailable");
  assert.equal(
    invalid.reason,
    "invalid-atmospheric-observation-frame",
  );

  const invalidFiniteFrames = [
    {
      label: "cloud cover",
      frame: {
        ...result.frame,
        weather: { ...result.frame.weather, cloudCoverPct: 101 },
      },
    },
    {
      label: "relative humidity",
      frame: {
        ...result.frame,
        weather: { ...result.frame.weather, relativeHumidityPct: 101 },
      },
    },
    {
      label: "wind speed",
      frame: {
        ...result.frame,
        weather: { ...result.frame.weather, windSpeedMps: 111 },
      },
    },
    {
      label: "temperature",
      frame: {
        ...result.frame,
        weather: { ...result.frame.weather, ambientTemperatureC: 66 },
      },
    },
    {
      label: "GHI",
      frame: {
        ...result.frame,
        irradiance: { ...result.frame.irradiance, ghiWm2: 1_501 },
      },
    },
    {
      label: "DNI",
      frame: {
        ...result.frame,
        irradiance: { ...result.frame.irradiance, dniWm2: 1_601 },
      },
    },
    {
      label: "DHI",
      frame: {
        ...result.frame,
        irradiance: { ...result.frame.irradiance, dhiWm2: 1_101 },
      },
    },
    {
      label: "effective POA",
      frame: {
        ...result.frame,
        irradiance: {
          ...result.frame.irradiance,
          effectivePoaWm2:
            ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2 + 1,
        },
      },
    },
    {
      label: "one-hour AC energy",
      frame: {
        ...result.frame,
        energy: {
          acEnergyKWh: result.frame.array.capacityKwDc + 0.001,
        },
      },
    },
  ];
  for (const invalidFinite of invalidFiniteFrames) {
    const extremeFinite = deriveAtmosphericObservationView({
      status: "ready",
      frame: invalidFinite.frame,
    });
    assert.equal(
      extremeFinite.status,
      "unavailable",
      `${invalidFinite.label} must not produce a ready view`,
    );
    assert.equal(
      extremeFinite.reason,
      "invalid-atmospheric-observation-frame",
    );
  }

  const unavailable = deriveAtmosphericObservationView({
    status: "unavailable",
    reason: "missing-linked-hour",
    summary: "The linked atmospheric interval is unavailable.",
  });
  assert.deepEqual(unavailable, {
    status: "unavailable",
    reason: "missing-linked-hour",
    summary: "The linked atmospheric interval is unavailable.",
  });
});
