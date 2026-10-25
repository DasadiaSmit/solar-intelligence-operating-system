import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import {
  ARRAY_ENGINEERING_SCREENING_CONTROLS,
  configuredAggregateSystemLossPct,
} from "../features/visual-computing/array-engineering-frame.ts";
import {
  buildArrayEngineeringFrameV1,
} from "../features/visual-computing/build-array-engineering-frame.ts";
import {
  deriveArrayEngineeringView,
} from "../features/visual-computing/array-engineering-view.ts";
import {
  sunAnglesToEnu,
} from "../features/visual-computing/scene-frame.ts";

const selectedIndex = 171 * 24 + 12;
const resultId = "sim_test_array_engineering";
const snapshot = buildOperatingSnapshot();

function readyFrame(source = snapshot) {
  return buildArrayEngineeringFrameV1({
    snapshot: source,
    resultId,
    selectedIndex,
    lifecycle: "SIMULATED",
  });
}

test("Array Engineering preserves the exact configured and linked physics state", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const source = snapshot.hourly[selectedIndex];
  const { frame } = result;

  assert.equal(frame.resultId, resultId);
  assert.equal(frame.lifecycle, "SIMULATED");
  assert.deepEqual(frame.linkedInterval, {
    selectedIndex,
    timestampUtc: source.timestamp,
    intervalSeconds: 3600,
  });
  assert.deepEqual(frame.array.configured, snapshot.config.array);
  assert.deepEqual(frame.configuredLosses, snapshot.config.losses);
  assert.deepEqual(frame.array.resolved, {
    tiltDeg: source.irradiance.resolvedTiltDeg,
    azimuthDeg: source.irradiance.resolvedAzimuthDeg,
  });
  assert.deepEqual(frame.sun.position, source.sun);
  assert.deepEqual(
    frame.sun.directionEnu,
    sunAnglesToEnu(
      source.sun.apparentElevationDeg,
      source.sun.azimuthDeg,
    ),
  );
  assert.deepEqual(frame.weather, source.weather);
  assert.deepEqual(frame.irradiance, source.irradiance);
  assert.deepEqual(frame.generation, source.generation);
  assert.deepEqual(frame.quality, source.quality);
  assert.deepEqual(frame.annual.summary, snapshot.summary);
  assert.deepEqual(frame.annual.lossChain, snapshot.lossChain);
  assert.ok(
    frame.annual.lossChain[0].outputKWh
      > frame.annual.lossChain[0].inputKWh,
  );
  assert.equal(frame.annual.lossChain[0].lossKWh, 0);
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.array.configured));
  assert.ok(Object.isFrozen(frame.generation.losses));
  assert.ok(Object.isFrozen(frame.annual.lossChain));
});

test("the linked UTC day contains exactly 24 attributable Sun samples", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { linkedUtcDayPath } = result.frame.sun;

  assert.equal(linkedUtcDayPath.length, 24);
  const firstMs = Date.parse(linkedUtcDayPath[0].timestampUtc);
  for (let offset = 0; offset < linkedUtcDayPath.length; offset += 1) {
    const sample = linkedUtcDayPath[offset];
    const source = snapshot.hourly[sample.index];
    assert.equal(
      Date.parse(sample.timestampUtc),
      firstMs + offset * 3_600_000,
    );
    assert.equal(
      sample.timestampUtc.slice(0, 10),
      linkedUtcDayPath[0].timestampUtc.slice(0, 10),
    );
    assert.deepEqual(sample.position, source.sun);
    assert.deepEqual(
      sample.directionEnu,
      sunAnglesToEnu(
        source.sun.apparentElevationDeg,
        source.sun.azimuthDeg,
      ),
    );
  }
  assert.ok(
    linkedUtcDayPath.some((sample) => sample.index === selectedIndex),
  );
});

test("screening remains subordinate to a fixed authoritative base", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { frame } = result;

  assert.deepEqual(frame.configurationBoundary, {
    kind: "fixed-base-configured",
    authoritativeServerRecalculationRequired: true,
    bankableYieldAssessment: false,
  });
  assert.equal(frame.sun.arrayConfigurationAffectsSunPath, false);
  assert.equal(frame.screening.status, "screening-only");
  assert.deepEqual(
    frame.screening.supportedHtmlControls,
    ARRAY_ENGINEERING_SCREENING_CONTROLS,
  );
  assert.equal(
    frame.screening.aggregateSystemLossPct,
    configuredAggregateSystemLossPct(snapshot.config.losses),
  );
  assert.equal(
    frame.screening.authoritativeServerRecalculationRequired,
    true,
  );
  assert.equal(frame.screening.bankableYieldAssessment, false);
});

test("unsupported engineering layers remain explicit and unsynthesized", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  assert.deepEqual(Object.keys(result.frame.unavailableLayers), [
    "moduleCountAndRating",
    "physicalArrayAndRowGeometry",
    "namedInverterAndCurve",
    "moduleEfficiency",
    "editableInverterEfficiency",
    "physicalShadowField",
    "terrain",
    "surveyedHorizon",
    "candidateHourlyProduction",
    "measuredOrLiveOutput",
    "authoritativeClientSideRecalculation",
  ]);
  assert.ok(
    Object.values(result.frame.unavailableLayers).every(
      (layer) =>
        layer.status === "unavailable"
        && layer.value === null
        && layer.reason.length > 0,
    ),
  );
  assert.equal("moduleCount" in result.frame.array.configured, false);
  assert.equal("moduleRating" in result.frame.array.configured, false);
  assert.equal("moduleEfficiency" in result.frame.array.configured, false);
  assert.equal("inverterModel" in result.frame.array.configured, false);
  assert.equal("shadowField" in result.frame, false);
});

test("invalid time, configuration, physics and provenance fail closed", () => {
  const invalidTimeHours = [...snapshot.hourly];
  invalidTimeHours[selectedIndex] = {
    ...invalidTimeHours[selectedIndex],
    timestamp: "not-a-time",
  };
  const invalidTime = readyFrame({
    ...snapshot,
    hourly: invalidTimeHours,
  });
  assert.equal(invalidTime.status, "unavailable");
  assert.equal(invalidTime.reason, "invalid-linked-time");

  const invalidDayHours = [...snapshot.hourly];
  const adjacentIndex = selectedIndex + 1;
  invalidDayHours[adjacentIndex] = {
    ...invalidDayHours[adjacentIndex],
    timestamp: new Date(
      Date.parse(invalidDayHours[adjacentIndex].timestamp) + 1_800_000,
    ).toISOString(),
  };
  const invalidDay = readyFrame({
    ...snapshot,
    hourly: invalidDayHours,
  });
  assert.equal(invalidDay.status, "unavailable");
  assert.equal(invalidDay.reason, "invalid-linked-day");

  const invalidConfig = readyFrame({
    ...snapshot,
    config: {
      ...snapshot.config,
      array: { ...snapshot.config.array, tiltDeg: 91 },
    },
  });
  assert.equal(invalidConfig.status, "unavailable");
  assert.equal(invalidConfig.reason, "invalid-array-configuration");

  const invalidLoss = readyFrame({
    ...snapshot,
    config: {
      ...snapshot.config,
      losses: { ...snapshot.config.losses, shading: Number.NaN },
    },
  });
  assert.equal(invalidLoss.status, "unavailable");
  assert.equal(invalidLoss.reason, "invalid-loss-configuration");

  const invalidPhysicsHours = [...snapshot.hourly];
  invalidPhysicsHours[selectedIndex] = {
    ...invalidPhysicsHours[selectedIndex],
    irradiance: {
      ...invalidPhysicsHours[selectedIndex].irradiance,
      angleOfIncidenceDeg: 181,
    },
  };
  const invalidPhysics = readyFrame({
    ...snapshot,
    hourly: invalidPhysicsHours,
  });
  assert.equal(invalidPhysics.status, "unavailable");
  assert.equal(invalidPhysics.reason, "invalid-linked-physics");

  const plausibleIrradianceHours = [...snapshot.hourly];
  plausibleIrradianceHours[selectedIndex] = {
    ...plausibleIrradianceHours[selectedIndex],
    irradiance: {
      ...plausibleIrradianceHours[selectedIndex].irradiance,
      directWm2:
        plausibleIrradianceHours[selectedIndex].irradiance.directWm2 * 0.9,
    },
  };
  const plausibleIrradiance = readyFrame({
    ...snapshot,
    hourly: plausibleIrradianceHours,
  });
  assert.equal(plausibleIrradiance.status, "unavailable");
  assert.equal(plausibleIrradiance.reason, "invalid-linked-physics");

  const plausibleGenerationHours = [...snapshot.hourly];
  plausibleGenerationHours[selectedIndex] = {
    ...plausibleGenerationHours[selectedIndex],
    generation: {
      ...plausibleGenerationHours[selectedIndex].generation,
      performanceRatio:
        plausibleGenerationHours[selectedIndex].generation.performanceRatio
        * 0.9,
    },
  };
  const plausibleGeneration = readyFrame({
    ...snapshot,
    hourly: plausibleGenerationHours,
  });
  assert.equal(plausibleGeneration.status, "unavailable");
  assert.equal(plausibleGeneration.reason, "invalid-linked-physics");

  const invalidCalendarHours = [...snapshot.hourly];
  invalidCalendarHours[selectedIndex] = {
    ...invalidCalendarHours[selectedIndex],
    month: 1,
    weather: {
      ...invalidCalendarHours[selectedIndex].weather,
      month: 1,
    },
  };
  const invalidCalendar = readyFrame({
    ...snapshot,
    hourly: invalidCalendarHours,
  });
  assert.equal(invalidCalendar.status, "unavailable");
  assert.equal(invalidCalendar.reason, "invalid-linked-physics");

  const invalidQualityHours = [...snapshot.hourly];
  invalidQualityHours[selectedIndex] = {
    ...invalidQualityHours[selectedIndex],
    quality: {
      ...invalidQualityHours[selectedIndex].quality,
      score: 2,
    },
  };
  const invalidQuality = readyFrame({
    ...snapshot,
    hourly: invalidQualityHours,
  });
  assert.equal(invalidQuality.status, "unavailable");
  assert.equal(invalidQuality.reason, "invalid-quality");

  const missingProvenance = readyFrame({
    ...snapshot,
    provenance: snapshot.provenance.filter(
      (record) => record.kind !== "dataset",
    ),
  });
  assert.equal(missingProvenance.status, "unavailable");
  assert.equal(missingProvenance.reason, "missing-provenance");
});

test("invalid annual summaries and loss chains fail closed", () => {
  const invalidAnnual = readyFrame({
    ...snapshot,
    summary: {
      ...snapshot.summary,
      annualGenerationMWh: snapshot.summary.annualGenerationMWh + 1,
    },
  });
  assert.equal(invalidAnnual.status, "unavailable");
  assert.equal(invalidAnnual.reason, "invalid-annual-summary");

  const scaledAnnual = readyFrame({
    ...snapshot,
    summary: {
      ...snapshot.summary,
      annualGenerationKWh: snapshot.summary.annualGenerationKWh * 2,
      annualGenerationMWh: snapshot.summary.annualGenerationMWh * 2,
      specificYieldKWhPerKwp:
        snapshot.summary.specificYieldKWhPerKwp * 2,
      capacityFactorPct: snapshot.summary.capacityFactorPct * 2,
      performanceRatioPct: snapshot.summary.performanceRatioPct * 2,
    },
  });
  assert.equal(scaledAnnual.status, "unavailable");
  assert.equal(scaledAnnual.reason, "invalid-annual-summary");

  const invalidLossChain = readyFrame({
    ...snapshot,
    lossChain: snapshot.lossChain.map((item, index) =>
      index === 0 ? { ...item, lossKWh: item.lossKWh + 1 } : item),
  });
  assert.equal(invalidLossChain.status, "unavailable");
  assert.equal(invalidLossChain.reason, "invalid-loss-chain");

  const energyGainChain = snapshot.lossChain.map((item, index) =>
    index === 1
      ? {
          ...item,
          outputKWh: item.inputKWh * 1.01,
          lossKWh: 0,
          lossPct: 0,
        }
      : item);
  const invalidEnergyGain = readyFrame({
    ...snapshot,
    lossChain: energyGainChain,
  });
  assert.equal(invalidEnergyGain.status, "unavailable");
  assert.equal(invalidEnergyGain.reason, "invalid-loss-chain");

  const renamedChain = snapshot.lossChain.map((item, index) =>
    index === 1 ? { ...item, id: "invented-stage" } : item);
  const invalidStageId = readyFrame({
    ...snapshot,
    lossChain: renamedChain,
  });
  assert.equal(invalidStageId.status, "unavailable");
  assert.equal(invalidStageId.reason, "invalid-loss-chain");

  const discontinuousChain = snapshot.lossChain.map((item, index) => {
    if (index !== 1) return item;
    const inputKWh = item.inputKWh + 100;
    const outputKWh = item.outputKWh + 100;
    return {
      ...item,
      inputKWh,
      outputKWh,
      lossPct: item.lossKWh / inputKWh * 100,
    };
  });
  const invalidContinuity = readyFrame({
    ...snapshot,
    lossChain: discontinuousChain,
  });
  assert.equal(invalidContinuity.status, "unavailable");
  assert.equal(invalidContinuity.reason, "invalid-loss-chain");
});

test("the view deeply validates, clones and freezes the frame", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const projected = deriveArrayEngineeringView(result);
  assert.equal(projected.status, "ready");
  assert.deepEqual(projected.view, result.frame);
  assert.notEqual(projected.view, result.frame);
  assert.notEqual(projected.view.array, result.frame.array);
  assert.notEqual(
    projected.view.sun.linkedUtcDayPath,
    result.frame.sun.linkedUtcDayPath,
  );
  assert.notEqual(
    projected.view.generation.losses,
    result.frame.generation.losses,
  );
  assert.notEqual(
    projected.view.annual.lossChain,
    result.frame.annual.lossChain,
  );
  assert.ok(Object.isFrozen(projected.view));
  assert.ok(Object.isFrozen(projected.view.sun.linkedUtcDayPath));
  assert.ok(Object.isFrozen(projected.view.quality.flags));

  const invalid = deriveArrayEngineeringView({
    status: "ready",
    frame: {
      ...result.frame,
      sun: {
        ...result.frame.sun,
        arrayConfigurationAffectsSunPath: true,
      },
    },
  });
  assert.equal(invalid.status, "unavailable");
  assert.equal(invalid.reason, "invalid-array-engineering-frame");

  const invalidAggregate = deriveArrayEngineeringView({
    status: "ready",
    frame: {
      ...result.frame,
      screening: {
        ...result.frame.screening,
        aggregateSystemLossPct:
          result.frame.screening.aggregateSystemLossPct + 1,
      },
    },
  });
  assert.equal(invalidAggregate.status, "unavailable");
  assert.equal(
    invalidAggregate.reason,
    "invalid-array-engineering-frame",
  );

  const invalidPhysics = deriveArrayEngineeringView({
    status: "ready",
    frame: {
      ...result.frame,
      generation: {
        ...result.frame.generation,
        performanceRatio: result.frame.generation.performanceRatio * 0.9,
      },
    },
  });
  assert.equal(invalidPhysics.status, "unavailable");
  assert.equal(
    invalidPhysics.reason,
    "invalid-array-engineering-frame",
  );

  const invalidCalendar = deriveArrayEngineeringView({
    status: "ready",
    frame: {
      ...result.frame,
      weather: {
        ...result.frame.weather,
        month: 1,
      },
    },
  });
  assert.equal(invalidCalendar.status, "unavailable");
  assert.equal(
    invalidCalendar.reason,
    "invalid-array-engineering-frame",
  );

  const entries = Object.entries(result.frame.unavailableLayers);
  const invalidUnavailableLayers = Object.fromEntries(
    entries.map(([key, layer], index) => [
      index === 0 ? "inventedLayer" : key,
      layer,
    ]),
  );
  const invalidUnavailableSchema = deriveArrayEngineeringView({
    status: "ready",
    frame: {
      ...result.frame,
      unavailableLayers: invalidUnavailableLayers,
    },
  });
  assert.equal(invalidUnavailableSchema.status, "unavailable");
  assert.equal(
    invalidUnavailableSchema.reason,
    "invalid-array-engineering-frame",
  );
});
