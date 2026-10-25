import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import {
  evaluateConfiguredStressComparison,
} from "../lib/optimisation/system.ts";
import {
  DETERMINISTIC_STRESS_SCENARIO_CATALOG,
} from "../lib/optimisation/stress-scenario-catalog.ts";
import {
  SCENARIO_COMPARISON_BASELINE_ID,
  SCENARIO_COMPARISON_UNAVAILABLE_LAYER_KEYS,
} from "../features/visual-computing/scenario-comparison-frame.ts";
import {
  buildScenarioComparisonFrameV1,
} from "../features/visual-computing/build-scenario-comparison-frame.ts";
import {
  deriveScenarioComparisonView,
} from "../features/visual-computing/scenario-comparison-view.ts";

const resultId = "sim_test_scenario_comparison";
const snapshot = buildOperatingSnapshot();

function readyFrame(source = snapshot) {
  return buildScenarioComparisonFrameV1({
    snapshot: source,
    resultId,
    lifecycle: "SIMULATED",
  });
}

function weatherFromSnapshot(source = snapshot) {
  return source.hourly.map((point) => ({
    ...point.weather,
    quality: { ...point.quality, flags: [...point.quality.flags] },
  }));
}

test("Scenario Comparison preserves one baseline and four canonical stress results", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const { frame } = result;

  assert.equal(frame.resultId, resultId);
  assert.equal(frame.lifecycle, "SIMULATED");
  assert.equal(frame.chronology.recordCount, 8_760);
  assert.equal(frame.chronology.intervalSeconds, 3_600);
  assert.equal(frame.chambers.length, 5);
  assert.deepEqual(
    frame.chambers.map((chamber) => chamber.id),
    [
      SCENARIO_COMPARISON_BASELINE_ID,
      ...DETERMINISTIC_STRESS_SCENARIO_CATALOG.map(
        (scenario) => scenario.id,
      ),
    ],
  );

  const baseline = frame.chambers[0];
  assert.equal(
    baseline.annualGenerationKWh,
    snapshot.optimization.baseline.annualGenerationKWh,
  );
  assert.equal(
    baseline.netEnergyValue,
    snapshot.optimization.baseline.revenue,
  );
  assert.equal(
    baseline.localSupplyPct,
    snapshot.summary.reliabilityPct,
  );
  assert.equal(baseline.generationDeltaPct, 0);
  assert.equal(baseline.energyValueDeltaPct, 0);
  assert.equal(baseline.localSupplyDeltaPercentagePoints, 0);
  assert.equal(baseline.generationIndexRelativeToBaseline, 1);

  for (let index = 0; index < snapshot.optimization.stressScenarios.length; index += 1) {
    const source = snapshot.optimization.stressScenarios[index];
    const chamber = frame.chambers[index + 1];
    assert.equal(chamber.id, source.id);
    assert.equal(chamber.label, source.label);
    assert.equal(chamber.explanation, source.explanation);
    assert.equal(chamber.generationDeltaPct, source.generationDeltaPct);
    assert.equal(chamber.energyValueDeltaPct, source.revenueDeltaPct);
    assert.equal(
      chamber.localSupplyDeltaPercentagePoints,
      source.reliabilityDeltaPct,
    );
    assert.equal(
      chamber.annualGenerationKWh,
      baseline.annualGenerationKWh
        * (1 + source.generationDeltaPct / 100),
    );
    assert.equal(
      chamber.netEnergyValue,
      baseline.netEnergyValue
        + Math.abs(baseline.netEnergyValue)
          * source.revenueDeltaPct / 100,
    );
    assert.equal(
      chamber.localSupplyPct,
      baseline.localSupplyPct + source.reliabilityDeltaPct,
    );
  }
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.chambers));
  assert.ok(frame.chambers.every(Object.isFrozen));
});

test("the comparison boundary and unsupported layers remain explicit", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  assert.deepEqual(result.frame.comparisonBoundary, {
    mode: "stress-summary",
    kind: "configured-baseline-vs-deterministic-stress-results",
    source: "canonical-optimisation-stress-record",
    deterministic: true,
    parallelPresentation: true,
    sameTimestampComparison: false,
    parallelWeatherWorlds: false,
    hourlyStressResultsAvailable: false,
    independentProbabilitiesAvailable: false,
    issuedForecast: false,
    bankableAssessment: false,
  });
  assert.deepEqual(result.frame.metricDefinitions, {
    generationDelta:
      "percent-of-configured-baseline-annual-generation",
    energyValueDelta:
      "percent-of-absolute-configured-baseline-net-energy-value",
    energyValueCurrency: snapshot.config.tariff.currency,
    energyValuePeriod: "annual",
    localSupplyDelta: "percentage-points",
    legacySourceField:
      "reliabilityDeltaPct-calculates-local-supply-delta",
  });
  assert.deepEqual(
    Object.keys(result.frame.unavailableLayers),
    SCENARIO_COMPARISON_UNAVAILABLE_LAYER_KEYS,
  );
  assert.ok(
    Object.values(result.frame.unavailableLayers).every(
      (layer) =>
        layer.status === "unavailable"
        && layer.value === null
        && layer.reason.length > 0,
    ),
  );
});

test("the narrow canonical replay matches the stored optimisation record", () => {
  const replay = evaluateConfiguredStressComparison(
    weatherFromSnapshot(),
    snapshot.config,
  );
  const { paretoOptimal: storedPareto, ...storedBaseline } =
    snapshot.optimization.baseline;
  const { paretoOptimal: replayedPareto, ...replayedBaseline } =
    replay.baseline;
  void storedPareto;
  void replayedPareto;
  assert.deepEqual(replayedBaseline, storedBaseline);
  assert.equal(
    replay.baselineLocalSupplyPct,
    snapshot.summary.reliabilityPct,
  );
  assert.deepEqual(
    replay.stressScenarios,
    snapshot.optimization.stressScenarios,
  );
});

test("plausible contradictory baseline and stress values fail closed", () => {
  const corruptedBaseline = readyFrame({
    ...snapshot,
    optimization: {
      ...snapshot.optimization,
      baseline: {
        ...snapshot.optimization.baseline,
        revenue: snapshot.optimization.baseline.revenue * 0.99,
      },
    },
  });
  assert.equal(corruptedBaseline.status, "unavailable");
  assert.equal(corruptedBaseline.reason, "invalid-baseline");

  const corruptedStress = readyFrame({
    ...snapshot,
    optimization: {
      ...snapshot.optimization,
      stressScenarios: snapshot.optimization.stressScenarios.map(
        (scenario, index) =>
          index === 1
            ? {
                ...scenario,
                generationDeltaPct: scenario.generationDeltaPct * 0.9,
              }
            : scenario,
      ),
    },
  });
  assert.equal(corruptedStress.status, "unavailable");
  assert.equal(
    corruptedStress.reason,
    "stress-scenario-reconciliation-failed",
  );

  const renamedStress = readyFrame({
    ...snapshot,
    optimization: {
      ...snapshot.optimization,
      stressScenarios: snapshot.optimization.stressScenarios.map(
        (scenario, index) =>
          index === 0 ? { ...scenario, label: "Generic hot case" } : scenario,
      ),
    },
  });
  assert.equal(renamedStress.status, "unavailable");
  assert.equal(renamedStress.reason, "invalid-stress-scenarios");
});

test("invalid chronology, replay inputs, and provenance fail closed", () => {
  const invalidChronology = readyFrame({
    ...snapshot,
    hourly: snapshot.hourly.slice(0, -1),
  });
  assert.equal(invalidChronology.status, "unavailable");
  assert.equal(invalidChronology.reason, "invalid-chronology");

  const changedWeather = [...snapshot.hourly];
  const daylightIndex = 171 * 24 + 12;
  changedWeather[daylightIndex] = {
    ...changedWeather[daylightIndex],
    weather: {
      ...changedWeather[daylightIndex].weather,
      temperatureC:
        changedWeather[daylightIndex].weather.temperatureC + 1,
    },
  };
  const contradictoryWeather = readyFrame({
    ...snapshot,
    hourly: changedWeather,
  });
  assert.equal(contradictoryWeather.status, "unavailable");
  assert.equal(contradictoryWeather.reason, "invalid-baseline");

  const missingProvenance = readyFrame({
    ...snapshot,
    provenance: snapshot.provenance.filter(
      (record) => record.kind !== "scenario",
    ),
  });
  assert.equal(missingProvenance.status, "unavailable");
  assert.equal(missingProvenance.reason, "missing-provenance");
});

test("the client view rejects plausible arithmetic corruption", () => {
  const result = readyFrame();
  assert.equal(result.status, "ready");
  const valid = deriveScenarioComparisonView(result);
  assert.equal(valid.status, "ready");
  assert.ok(Object.isFrozen(valid.view));

  const corruptedFrame = structuredClone(result.frame);
  corruptedFrame.chambers[2].netEnergyValue *= 0.99;
  const corrupted = deriveScenarioComparisonView({
    status: "ready",
    frame: corruptedFrame,
  });
  assert.equal(corrupted.status, "unavailable");
  assert.equal(corrupted.reason, "invalid-scenario-comparison-frame");
});
