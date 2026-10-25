import assert from "node:assert/strict";
import test from "node:test";

import {
  BATTERY_ENERGY_FLOW_UNAVAILABLE_LAYER_KEYS,
  batteryEnergyNumbersReconcile,
  validBatteryEnergyFlowFrame,
} from "../features/visual-computing/battery-energy-flow-frame.ts";
import {
  buildBatteryEnergyFlowFrameV1,
} from "../features/visual-computing/build-battery-energy-flow-frame.ts";
import {
  deriveBatteryEnergyFlowView,
} from "../features/visual-computing/battery-energy-flow-view.ts";
import {
  buildDemandProfile,
  dispatchEnergyYear,
} from "../lib/energy/index.ts";
import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";

const selectedIndex = 171 * 24 + 12;
const resultId = "sim_test_battery_energy_flow";
const snapshot = buildOperatingSnapshot();
const disabledBatterySnapshot = buildOperatingSnapshot({
  battery: { enabled: false },
});

function readyFrame(source = snapshot, index = selectedIndex) {
  return buildBatteryEnergyFlowFrameV1({
    snapshot: source,
    resultId,
    selectedIndex: index,
    lifecycle: "SIMULATED",
  });
}

function frameFrom(source = snapshot, index = selectedIndex) {
  const result = readyFrame(source, index);
  assert.equal(result.status, "ready");
  return result.frame;
}

function weatherFrom(source) {
  return source.hourly.map((point) => ({
    ...point.weather,
    quality: {
      ...point.quality,
      flags: [...point.quality.flags],
    },
  }));
}

function canonicalReplay(source) {
  const weather = weatherFrom(source);
  return dispatchEnergyYear(
    source.hourly.map((point) => point.generation.acKWh),
    buildDemandProfile(weather, source.config.demand),
    weather,
    source.config.battery,
    source.config.tariff,
    source.config.carbon,
    source.config.losses.curtailment,
  );
}

function activeBatteryState(source) {
  const config = source.config.battery;
  const capacity = config.enabled ? config.capacityKWh : 0;
  const minimum = capacity * config.minSocFraction;
  const maximum = capacity * config.maxSocFraction;
  return {
    capacity,
    minimum,
    maximum,
    reserve: capacity * config.reserveFraction,
    initial: Math.max(
      minimum,
      Math.min(maximum, capacity * config.initialSocFraction),
    ),
  };
}

function changedHour(source, index, transform) {
  const hourly = [...source.hourly];
  hourly[index] = transform(hourly[index]);
  return { ...source, hourly };
}

function assertReconciles(actual, expected, message) {
  assert.ok(
    batteryEnergyNumbersReconcile(actual, expected),
    `${message}: expected ${expected}, received ${actual}`,
  );
}

test("Battery Energy Flow preserves the exact linked record and its 24-record UTC day", () => {
  const frame = frameFrom();
  const source = snapshot.hourly[selectedIndex];
  const prior = snapshot.hourly[selectedIndex - 1];
  const battery = snapshot.config.battery;
  const state = activeBatteryState(snapshot);
  const afterSelfDischarge = Math.max(
    state.minimum,
    prior.flow.batterySocKWh * (1 - battery.selfDischargePerHour),
  );

  assert.equal(frame.resultId, resultId);
  assert.equal(frame.lifecycle, "SIMULATED");
  assert.deepEqual(frame.chronology, {
    recordCount: 8_760,
    intervalSeconds: 3_600,
    calendar: "contiguous-no-leap-utc-year",
    linkedIndex: selectedIndex,
    linkedTimestampUtc: source.timestamp,
    timestampRole: "canonical-record-anchor",
    intervalBoundaryAttribution: "unavailable",
    linkedDayStartIndex: selectedIndex - 12,
    linkedDayRecordCount: 24,
  });
  assert.equal(frame.linkedInterval.index, source.index);
  assert.equal(frame.linkedInterval.timestampUtc, source.timestamp);
  assert.equal(
    frame.linkedInterval.generationKWh,
    source.generation.acKWh,
  );
  assert.equal(frame.linkedInterval.demandKWh, source.flow.demandKWh);
  assert.equal(
    frame.linkedInterval.solarToLoadKWh,
    source.flow.solarToLoadKWh,
  );
  assert.equal(
    frame.linkedInterval.batteryChargeInputKWh,
    source.flow.batteryChargeKWh,
  );
  assert.equal(
    frame.linkedInterval.batteryDischargeDeliveredKWh,
    source.flow.batteryDischargeKWh,
  );
  assert.equal(
    frame.linkedInterval.batterySocStartKWh,
    prior.flow.batterySocKWh,
  );
  assert.equal(
    frame.linkedInterval.batterySocAfterSelfDischargeKWh,
    afterSelfDischarge,
  );
  assert.equal(
    frame.linkedInterval.batterySocEndKWh,
    source.flow.batterySocKWh,
  );
  assert.equal(
    frame.linkedInterval.gridImportKWh,
    source.flow.gridImportKWh,
  );
  assert.equal(
    frame.linkedInterval.gridExportKWh,
    source.flow.gridExportKWh,
  );
  assert.equal(
    frame.linkedInterval.curtailedKWh,
    source.flow.curtailedKWh,
  );
  assert.equal(frame.linkedInterval.importCost, source.flow.importCost);
  assert.equal(
    frame.linkedInterval.exportRevenue,
    source.flow.exportRevenue,
  );
  assert.equal(
    frame.linkedInterval.carbonAvoidedKg,
    source.flow.carbonAvoidedKg,
  );
  assert.equal(frame.linkedInterval.inputQualityScore, source.quality.score);

  assert.equal(frame.linkedUtcDay.length, 24);
  assert.equal(frame.linkedUtcDay[0].index, selectedIndex - 12);
  assert.equal(frame.linkedUtcDay.at(-1).index, selectedIndex + 11);
  assert.equal(frame.linkedUtcDay[0].timestampUtc.slice(0, 10), "2026-06-21");
  for (const interval of frame.linkedUtcDay) {
    const point = snapshot.hourly[interval.index];
    const previous = snapshot.hourly[interval.index - 1];
    assert.equal(interval.timestampUtc, point.timestamp);
    assert.equal(interval.generationKWh, point.generation.acKWh);
    assert.equal(interval.demandKWh, point.flow.demandKWh);
    assert.equal(interval.solarToLoadKWh, point.flow.solarToLoadKWh);
    assert.equal(
      interval.batteryChargeInputKWh,
      point.flow.batteryChargeKWh,
    );
    assert.equal(
      interval.batteryDischargeDeliveredKWh,
      point.flow.batteryDischargeKWh,
    );
    assert.equal(interval.batterySocStartKWh, previous.flow.batterySocKWh);
    assert.equal(interval.batterySocEndKWh, point.flow.batterySocKWh);
    assert.equal(interval.gridImportKWh, point.flow.gridImportKWh);
    assert.equal(interval.gridExportKWh, point.flow.gridExportKWh);
    assert.equal(interval.curtailedKWh, point.flow.curtailedKWh);
  }
  assert.deepEqual(
    frame.linkedInterval,
    frame.linkedUtcDay[selectedIndex - frame.chronology.linkedDayStartIndex],
  );
});

test("the complete stored dispatch exactly matches a fresh canonical replay", () => {
  const replay = canonicalReplay(snapshot);
  assert.deepEqual(
    replay.flows,
    snapshot.hourly.map((point) => point.flow),
  );

  const frame = frameFrom();
  const generation = snapshot.hourly.reduce(
    (total, point) => total + point.generation.acKWh,
    0,
  );
  const quality = snapshot.hourly.reduce(
    (total, point) => total + point.quality.score,
    0,
  ) / snapshot.hourly.length;

  assert.equal(frame.annual.generationKWh, generation);
  assert.equal(frame.annual.demandKWh, replay.demandKWh);
  assert.equal(frame.annual.solarToLoadKWh, replay.solarToLoadKWh);
  assert.equal(
    frame.annual.batteryChargeInputKWh,
    replay.batteryChargeKWh,
  );
  assert.equal(
    frame.annual.batteryDischargeDeliveredKWh,
    replay.batteryDischargeKWh,
  );
  assert.equal(frame.annual.gridImportKWh, replay.gridImportKWh);
  assert.equal(frame.annual.gridExportKWh, replay.gridExportKWh);
  assert.equal(frame.annual.curtailedKWh, replay.curtailedKWh);
  assert.equal(frame.annual.importCost, replay.importCost);
  assert.equal(frame.annual.exportRevenue, replay.exportRevenue);
  assert.equal(frame.annual.carbonAvoidedKg, replay.carbonAvoidedKg);
  assert.equal(
    frame.annual.equivalentFullCycleThroughputProxy,
    replay.batteryCycles,
  );
  assert.equal(frame.annual.finalSocKWh, replay.finalSocKWh);
  assert.equal(frame.annual.inputQualityScore, quality);
  assert.equal(
    frame.annual.generationRetainedOnSiteKWh,
    generation - replay.gridExportKWh - replay.curtailedKWh,
  );
  assert.equal(
    frame.annual.localSupplyToLoadKWh,
    replay.solarToLoadKWh + replay.batteryDischargeKWh,
  );
  assert.equal(
    frame.annual.generationRetainedOnSiteKWh,
    snapshot.summary.selfConsumedKWh,
  );
  assertReconciles(
    frame.annual.localSupplyToLoadKWh,
    snapshot.summary.annualDemandKWh - snapshot.summary.gridImportKWh,
    "local supply to load versus annual demand less grid imports",
  );
});

test("all 8,760 records conserve PV, demand and SOC while respecting dispatch bounds and exclusivity", () => {
  const battery = snapshot.config.battery;
  const tariff = snapshot.config.tariff;
  const state = activeBatteryState(snapshot);
  const dispatchFloor = Math.max(state.minimum, state.reserve);
  let startSocKWh = state.initial;
  let annualSelfDischargeLossKWh = 0;

  for (const point of snapshot.hourly) {
    const flow = point.flow;
    const afterSelfDischargeKWh = state.capacity > 0
      ? Math.max(
          state.minimum,
          startSocKWh * (1 - battery.selfDischargePerHour),
        )
      : 0;
    const expectedEndSocKWh =
      afterSelfDischargeKWh
      + flow.batteryChargeKWh * battery.chargeEfficiency
      - flow.batteryDischargeKWh / battery.dischargeEfficiency;
    const availableForDischargeKWh =
      Math.max(0, afterSelfDischargeKWh - dispatchFloor)
      * battery.dischargeEfficiency;

    assertReconciles(
      point.generation.acKWh,
      flow.solarToLoadKWh
        + flow.batteryChargeKWh
        + flow.gridExportKWh
        + flow.curtailedKWh,
      `PV balance at index ${point.index}`,
    );
    assertReconciles(
      flow.demandKWh,
      flow.solarToLoadKWh
        + flow.batteryDischargeKWh
        + flow.gridImportKWh,
      `demand balance at index ${point.index}`,
    );
    assertReconciles(
      flow.batterySocKWh,
      expectedEndSocKWh,
      `SOC recurrence at index ${point.index}`,
    );
    assert.ok(flow.batteryChargeKWh <= battery.maxChargeKw + 1e-8);
    assert.ok(flow.batteryDischargeKWh <= battery.maxDischargeKw + 1e-8);
    assert.ok(flow.batteryDischargeKWh <= availableForDischargeKWh + 1e-8);
    assert.ok(flow.gridExportKWh <= tariff.gridExportLimitKw + 1e-8);
    assert.ok(flow.batterySocKWh >= state.minimum - 1e-8);
    assert.ok(flow.batterySocKWh <= state.maximum + 1e-8);
    assert.equal(
      flow.batteryChargeKWh > 1e-8
        && flow.batteryDischargeKWh > 1e-8,
      false,
    );
    assert.equal(
      flow.gridImportKWh > 1e-8 && flow.gridExportKWh > 1e-8,
      false,
    );

    annualSelfDischargeLossKWh +=
      startSocKWh - afterSelfDischargeKWh;
    startSocKWh = flow.batterySocKWh;
  }

  const replay = canonicalReplay(snapshot);
  assertReconciles(
    state.initial
      + replay.batteryChargeKWh * battery.chargeEfficiency,
    replay.finalSocKWh
      + replay.batteryDischargeKWh / battery.dischargeEfficiency
      + annualSelfDischargeLossKWh,
    "annual battery internal-energy balance",
  );
  assertReconciles(
    replay.batteryCycles,
    (
      replay.batteryChargeKWh * battery.chargeEfficiency
      + replay.batteryDischargeKWh / battery.dischargeEfficiency
    ) / (2 * state.capacity),
    "equivalent-full-cycle throughput proxy",
  );
});

test("a disabled battery remains an exact zero-state route while PV, load and grid ledgers remain available", () => {
  const frame = frameFrom(disabledBatterySnapshot);
  const replay = canonicalReplay(disabledBatterySnapshot);
  const viewResult = deriveBatteryEnergyFlowView({
    status: "ready",
    frame,
  });
  assert.equal(viewResult.status, "ready");

  assert.equal(frame.battery.enabled, false);
  assert.equal(frame.battery.minimumSocKWh, 0);
  assert.equal(frame.battery.maximumSocKWh, 0);
  assert.equal(frame.battery.initialSocKWh, 0);
  assert.equal(frame.battery.reserveSocKWh, 0);
  assert.equal(frame.annual.batteryChargeInputKWh, 0);
  assert.equal(frame.annual.batteryDischargeDeliveredKWh, 0);
  assert.equal(frame.annual.equivalentFullCycleThroughputProxy, 0);
  assert.equal(frame.annual.finalSocKWh, 0);
  assert.equal(replay.batteryChargeKWh, 0);
  assert.equal(replay.batteryDischargeKWh, 0);
  assert.ok(
    frame.linkedUtcDay.every(
      (interval) =>
        interval.batteryChargeInputKWh === 0
        && interval.batteryDischargeDeliveredKWh === 0
        && interval.batterySocStartKWh === 0
        && interval.batterySocAfterSelfDischargeKWh === 0
        && interval.batterySocEndKWh === 0,
    ),
  );
  assert.equal(
    viewResult.view.spatial.routes.find(
      (route) => route.id === "pv-to-battery",
    ).activeInLinkedDay,
    false,
  );
  assert.equal(
    viewResult.view.spatial.routes.find(
      (route) => route.id === "battery-to-load",
    ).activeInLinkedDay,
    false,
  );
  assert.equal(viewResult.view.spatial.batteryOperatingBandFill, 0);
});

test("the renderer-neutral frame and derived spatial view are deeply frozen and semantically bounded", () => {
  const frame = frameFrom();
  assert.equal(validBatteryEnergyFlowFrame(frame), true);
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.battery));
  assert.ok(Object.isFrozen(frame.linkedInterval));
  assert.ok(Object.isFrozen(frame.linkedUtcDay));
  assert.ok(frame.linkedUtcDay.every(Object.isFrozen));
  assert.ok(Object.isFrozen(frame.provenance.evidenceRefIds));
  assert.ok(Object.values(frame.unavailableLayers).every(Object.isFrozen));
  assert.deepEqual(
    Object.keys(frame.unavailableLayers),
    BATTERY_ENERGY_FLOW_UNAVAILABLE_LAYER_KEYS,
  );
  assert.ok(
    Object.values(frame.unavailableLayers).every(
      (layer) =>
        layer.status === "unavailable"
        && layer.value === null
        && layer.reason.length > 0,
    ),
  );
  assert.equal(frame.dispatchBoundary.liveControl, false);
  assert.equal(frame.dispatchBoundary.measuredTelemetry, false);
  assert.equal(frame.dispatchBoundary.tariffOptimized, false);
  assert.equal(frame.visualEncoding.physicalTopology, false);
  assert.equal(frame.visualEncoding.livePowerFlow, false);
  assert.equal(frame.visualEncoding.animatedParticles, false);
  assert.equal(frame.visualEncoding.exactValuesRemainHtml, true);

  const projected = deriveBatteryEnergyFlowView({
    status: "ready",
    frame,
  });
  assert.equal(projected.status, "ready");
  assert.notEqual(projected.view, frame);
  assert.notEqual(projected.view.linkedInterval, frame.linkedInterval);
  assert.notEqual(projected.view.linkedUtcDay, frame.linkedUtcDay);
  assert.ok(Object.isFrozen(projected.view));
  assert.ok(Object.isFrozen(projected.view.spatial));
  assert.ok(Object.isFrozen(projected.view.spatial.routes));
  assert.equal(projected.view.spatial.routes.length, 6);
  assert.equal(
    Math.max(
      ...projected.view.spatial.routes.map(
        (route) => route.normalizedDayMagnitude,
      ),
    ),
    1,
  );
  assert.ok(
    projected.view.spatial.routes.every(
      (route) =>
        route.normalizedDayMagnitude >= 0
        && route.normalizedDayMagnitude <= 1,
    ),
  );
  const pvToGrid = projected.view.spatial.routes.find(
    (route) => route.id === "pv-to-grid",
  );
  assert.equal(
    pvToGrid.linkedIntervalEnergyKWh,
    frame.linkedInterval.gridExportKWh,
  );
  assert.equal(
    pvToGrid.linkedDayEnergyKWh,
    frame.linkedUtcDay.reduce(
      (total, interval) => total + interval.gridExportKWh,
      0,
    ),
  );
});

test("invalid result identity, lifecycle, linked index, chronology and configuration fail closed", async (context) => {
  await context.test("result identity", () => {
    const result = buildBatteryEnergyFlowFrameV1({
      snapshot,
      resultId: " ",
      selectedIndex,
      lifecycle: "SIMULATED",
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "invalid-result-id");
  });

  await context.test("lifecycle", () => {
    const result = buildBatteryEnergyFlowFrameV1({
      snapshot,
      resultId,
      selectedIndex,
      lifecycle: "BROKEN",
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "invalid-lifecycle");
  });

  await context.test("linked index", () => {
    for (const invalidIndex of [-1, 8_760, 1.5]) {
      const result = readyFrame(snapshot, invalidIndex);
      assert.equal(result.status, "unavailable");
      assert.equal(result.reason, "invalid-linked-index");
    }
  });

  await context.test("truncated chronology", () => {
    const result = readyFrame({
      ...snapshot,
      hourly: snapshot.hourly.slice(0, -1),
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "invalid-chronology");
  });

  await context.test("contradictory row index", () => {
    const source = changedHour(snapshot, selectedIndex, (point) => ({
      ...point,
      index: point.index + 1,
    }));
    const result = readyFrame(source);
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "invalid-chronology");
  });

  await context.test("non-contiguous timestamp", () => {
    const source = changedHour(snapshot, selectedIndex + 1, (point) => ({
      ...point,
      timestamp: new Date(
        Date.parse(point.timestamp) + 1_800_000,
      ).toISOString(),
    }));
    const result = readyFrame(source);
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "invalid-chronology");
  });

  await context.test("battery reserve outside configured SOC band", () => {
    const result = readyFrame({
      ...snapshot,
      config: {
        ...snapshot.config,
        battery: {
          ...snapshot.config.battery,
          reserveFraction:
            snapshot.config.battery.maxSocFraction + 0.01,
        },
      },
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "invalid-battery-configuration");
  });
});

test("plausible hourly flow, annual summary and provenance corruption fail closed", async (context) => {
  await context.test("stored dispatch route", () => {
    const source = changedHour(snapshot, selectedIndex, (point) => ({
      ...point,
      flow: {
        ...point.flow,
        solarToLoadKWh: point.flow.solarToLoadKWh + 0.1,
      },
    }));
    const result = readyFrame(source);
    assert.equal(result.status, "unavailable");
    assert.equal(
      result.reason,
      "stored-dispatch-reconciliation-failed",
    );
  });

  await context.test("stored SOC", () => {
    const source = changedHour(snapshot, selectedIndex, (point) => ({
      ...point,
      flow: {
        ...point.flow,
        batterySocKWh: point.flow.batterySocKWh - 0.1,
      },
    }));
    const result = readyFrame(source);
    assert.equal(result.status, "unavailable");
    assert.equal(
      result.reason,
      "stored-dispatch-reconciliation-failed",
    );
  });

  await context.test("annual retained-on-site summary", () => {
    const result = readyFrame({
      ...snapshot,
      summary: {
        ...snapshot.summary,
        selfConsumedKWh: snapshot.summary.selfConsumedKWh + 1,
      },
    });
    assert.equal(result.status, "unavailable");
    assert.equal(
      result.reason,
      "annual-summary-reconciliation-failed",
    );
  });

  await context.test("annual cycle summary", () => {
    const result = readyFrame({
      ...snapshot,
      summary: {
        ...snapshot.summary,
        batteryCycles: snapshot.summary.batteryCycles * 0.99,
      },
    });
    assert.equal(result.status, "unavailable");
    assert.equal(
      result.reason,
      "annual-summary-reconciliation-failed",
    );
  });

  await context.test("calculation provenance", () => {
    const result = readyFrame({
      ...snapshot,
      provenance: snapshot.provenance.filter(
        (record) => record.kind !== "calculation",
      ),
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "missing-provenance");
  });
});

test("the client view rejects conservation, SOC, chronology, cycle and unavailable-schema corruption", async (context) => {
  const frame = frameFrom();

  async function rejects(name, mutate) {
    await context.test(name, () => {
      const corrupted = structuredClone(frame);
      mutate(corrupted);
      const result = deriveBatteryEnergyFlowView({
        status: "ready",
        frame: corrupted,
      });
      assert.equal(result.status, "unavailable");
      assert.equal(result.reason, "invalid-battery-energy-flow-frame");
    });
  }

  await rejects("linked PV balance", (corrupted) => {
    corrupted.linkedInterval.solarToLoadKWh += 0.1;
  });

  await rejects("linked SOC bounds", (corrupted) => {
    corrupted.linkedInterval.batterySocEndKWh =
      corrupted.battery.minimumSocKWh - 0.1;
  });

  await rejects("annual retained-on-site balance", (corrupted) => {
    corrupted.annual.generationRetainedOnSiteKWh += 1;
  });

  await rejects("annual cycle proxy", (corrupted) => {
    corrupted.annual.equivalentFullCycleThroughputProxy += 1;
  });

  await rejects("cross-date linked-day shift", (corrupted) => {
    for (const interval of corrupted.linkedUtcDay) {
      interval.timestampUtc = new Date(
        Date.parse(interval.timestampUtc) + 3_600_000,
      ).toISOString();
    }
    const offset =
      corrupted.chronology.linkedIndex
      - corrupted.chronology.linkedDayStartIndex;
    corrupted.linkedInterval.timestampUtc =
      corrupted.linkedUtcDay[offset].timestampUtc;
    corrupted.chronology.linkedTimestampUtc =
      corrupted.linkedInterval.timestampUtc;
  });

  await rejects("invented unavailable layer", (corrupted) => {
    corrupted.unavailableLayers.inventedBatteryPrediction = {
      status: "unavailable",
      reason: "Invented schema entry.",
      value: null,
    };
  });
});
