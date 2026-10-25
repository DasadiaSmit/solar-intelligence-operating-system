import assert from "node:assert/strict";
import test from "node:test";

import { compactOperatingSnapshot } from "../lib/client-snapshot.ts";
import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import {
  deriveScenario,
  normalizeSnapshot,
} from "../components/solar-os/model.ts";
import { buildSceneFrameV1 } from "../features/visual-computing/build-scene-frame.ts";
import {
  OBSERVATORY_INSTRUMENT_MOUNTS,
  instrumentMountAtPosition,
} from "../features/visual-computing/observatory-instrument-registry.ts";
import {
  deriveObservatoryInstrumentPresentationState,
  deriveObservatoryInstrumentPresentationStates,
} from "../features/visual-computing/observatory-instrument-presentation.ts";
import {
  deriveSolarDigitalTwinView,
} from "../features/visual-computing/solar-digital-twin-view.ts";
import {
  activationRequestForObservatoryPosition,
} from "../features/application-activation.ts";

function readyScene() {
  const snapshot = buildOperatingSnapshot();
  const base = normalizeSnapshot(
    compactOperatingSnapshot(snapshot, "sim_test_instrument_01"),
  );
  const result = deriveScenario(base, base.config);
  return buildSceneFrameV1({
    base,
    result,
    scenario: base.config,
    selectedIndex: 171 * 24 + 12,
    lifecycle: "SIMULATED",
  });
}

test("the immutable registry preserves I01 through I05 while mounting implemented I06", () => {
  assert.equal(OBSERVATORY_INSTRUMENT_MOUNTS.length, 14);
  assert.equal(
    OBSERVATORY_INSTRUMENT_MOUNTS.filter(
      (mount) => mount.mountStatus === "mounted",
    ).length,
    6,
  );
  assert.equal(
    OBSERVATORY_INSTRUMENT_MOUNTS.filter(
      (mount) => mount.mountStatus === "placeholder",
    ).length,
    1,
  );
  assert.equal(
    OBSERVATORY_INSTRUMENT_MOUNTS.filter(
      (mount) => mount.mountStatus === "reserved",
    ).length,
    7,
  );

  const instrument01 = OBSERVATORY_INSTRUMENT_MOUNTS[0];
  assert.equal(instrument01.instrumentId, "I01");
  assert.equal(instrument01.implementationStatus, "implemented");
  assert.equal(instrument01.instrumentKey, "solar-digital-twin");
  const instrument02 = OBSERVATORY_INSTRUMENT_MOUNTS[1];
  assert.equal(instrument02.instrumentId, "I02");
  assert.equal(instrument02.mountStatus, "mounted");
  assert.equal(instrument02.implementationStatus, "implemented");
  assert.equal(instrument02.instrumentKey, "atmospheric-observation");
  const instrument03 = OBSERVATORY_INSTRUMENT_MOUNTS[2];
  assert.equal(instrument03.instrumentId, "I03");
  assert.equal(instrument03.mountStatus, "mounted");
  assert.equal(instrument03.implementationStatus, "implemented");
  assert.equal(instrument03.instrumentKey, "annual-energy-observatory");
  const instrument04 = OBSERVATORY_INSTRUMENT_MOUNTS[3];
  assert.equal(instrument04.instrumentId, "I04");
  assert.equal(instrument04.mountStatus, "mounted");
  assert.equal(instrument04.implementationStatus, "implemented");
  assert.equal(instrument04.instrumentKey, "solar-array-engineering");
  const instrument05 = OBSERVATORY_INSTRUMENT_MOUNTS[4];
  assert.equal(instrument05.instrumentId, "I05");
  assert.equal(instrument05.mountStatus, "mounted");
  assert.equal(instrument05.implementationStatus, "implemented");
  assert.equal(instrument05.instrumentKey, "scenario-comparison");
  const instrument06 = OBSERVATORY_INSTRUMENT_MOUNTS[5];
  assert.equal(instrument06.instrumentId, "I06");
  assert.equal(instrument06.mountStatus, "mounted");
  assert.equal(instrument06.implementationStatus, "implemented");
  assert.equal(instrument06.instrumentKey, "battery-energy-flow");
  assert.ok(
    OBSERVATORY_INSTRUMENT_MOUNTS.slice(6).every(
      (mount) => mount.instrumentKey === null,
    ),
  );
  assert.ok(Object.isFrozen(OBSERVATORY_INSTRUMENT_MOUNTS));
  assert.ok(OBSERVATORY_INSTRUMENT_MOUNTS.every(Object.isFrozen));
  assert.equal(instrumentMountAtPosition(-1), null);
  assert.equal(instrumentMountAtPosition(14), null);
});

test("instrument formation is deterministic and follows calibrated dial position", () => {
  const atInstrument01 = deriveObservatoryInstrumentPresentationStates(0);
  const repeated = deriveObservatoryInstrumentPresentationStates(0);
  assert.deepEqual(atInstrument01, repeated);
  assert.equal(atInstrument01[0].formationProgress, 1);
  assert.equal(atInstrument01[0].presence, "present");
  assert.equal(atInstrument01[0].interactive, true);
  assert.ok(
    atInstrument01.slice(1).every(
      (state) =>
        state.formationProgress === 0
        && state.visibility === 0
        && state.presence === "absent"
        && state.interactive === false,
    ),
  );

  const betweenPositions =
    deriveObservatoryInstrumentPresentationState(0.5, 0);
  assert.ok(betweenPositions);
  assert.equal(betweenPositions.formationProgress, 1);
  assert.equal(betweenPositions.presence, "present");
  assert.ok(
    betweenPositions.visibility > 0.34
    && betweenPositions.visibility < 1,
  );
  assert.equal(betweenPositions.interactive, false);

  const atPosition02 =
    deriveObservatoryInstrumentPresentationState(1, 0);
  assert.ok(atPosition02);
  assert.equal(atPosition02.formationProgress, 1);
  assert.equal(atPosition02.visibility, 0.34);
  assert.equal(atPosition02.presence, "present");
  const formingInstrument02 =
    deriveObservatoryInstrumentPresentationState(0.5, 1);
  assert.ok(formingInstrument02);
  assert.equal(formingInstrument02.formationProgress, 0.5);
  assert.equal(formingInstrument02.visibility, 0.335);
  assert.equal(formingInstrument02.presence, "transitioning");
  assert.equal(formingInstrument02.interactive, false);
  const activeInstrument02 =
    deriveObservatoryInstrumentPresentationState(1, 1);
  assert.ok(activeInstrument02);
  assert.equal(activeInstrument02.formationProgress, 1);
  assert.equal(activeInstrument02.visibility, 1);
  assert.equal(activeInstrument02.presence, "present");
  assert.equal(activeInstrument02.interactive, true);
  const priorInstrument02 =
    deriveObservatoryInstrumentPresentationState(2, 1);
  assert.ok(priorInstrument02);
  assert.equal(priorInstrument02.formationProgress, 1);
  assert.equal(priorInstrument02.visibility, 0.34);
  assert.equal(priorInstrument02.presence, "present");
  assert.equal(priorInstrument02.interactive, false);
  assert.equal(
    deriveObservatoryInstrumentPresentationState(0, 14),
    null,
  );
});

test("the Solar Digital Twin view preserves authoritative scene facts", () => {
  const scene = readyScene();
  assert.equal(scene.status, "ready");
  const derived = deriveSolarDigitalTwinView(scene);
  assert.equal(derived.status, "ready");
  const { frame } = scene;
  const { view } = derived;

  assert.equal(view.resultId, frame.resultId);
  assert.equal(view.timestampUtc, frame.timestampUtc);
  assert.equal(view.intervalSeconds, frame.intervalSeconds);
  assert.equal(view.lifecycle, frame.lifecycle);
  assert.deepEqual(view.coordinateFrame, frame.coordinateFrame);
  assert.deepEqual(view.site, frame.site);
  assert.deepEqual(view.sun, frame.sun);
  assert.equal(view.irradiance.ghiWm2, frame.irradiance.ghiWm2);
  assert.equal(
    view.irradiance.effectivePoaWm2,
    frame.irradiance.effectivePoaWm2,
  );
  assert.deepEqual(view.weather, frame.weather);
  assert.deepEqual(view.energy, frame.energy);
  assert.deepEqual(view.units, frame.units);
  assert.deepEqual(view.provenance, frame.provenance);
  assert.ok(Object.isFrozen(view));
  assert.ok(Object.isFrozen(view.provenance.evidenceRefIds));
  assert.ok(Object.isFrozen(view.unavailableLayers));
});

test("unavailable physical layers remain explicit and unsynthesized", () => {
  const scene = readyScene();
  assert.equal(scene.status, "ready");
  const derived = deriveSolarDigitalTwinView(scene);
  assert.equal(derived.status, "ready");

  assert.deepEqual(
    Object.keys(derived.view.unavailableLayers).sort(),
    [
      "arrayGeometry",
      "diffuseHorizontalIrradiance",
      "directNormalIrradiance",
      "groundReflectedIrradiance",
      "surveyedHorizon",
      "terrain",
    ],
  );
  assert.ok(
    Object.values(derived.view.unavailableLayers).every(
      (layer) =>
        layer.status === "unavailable"
        && layer.value === null
        && layer.reason.length > 0,
    ),
  );
  assert.equal("moduleCount" in derived.view.array, false);
  assert.equal("layout" in derived.view.array, false);
  assert.equal("lunarPhase" in derived.view, false);
  assert.equal("efficiency" in derived.view, false);
  assert.equal("losses" in derived.view, false);
});

test("unavailable and inconsistent scene frames fail closed", () => {
  const unavailable = deriveSolarDigitalTwinView({
    status: "unavailable",
    reason: "missing-provenance",
    summary: "No attributable scene is available.",
  });
  assert.deepEqual(unavailable, {
    status: "unavailable",
    reason: "missing-provenance",
    summary: "No attributable scene is available.",
  });

  const scene = readyScene();
  assert.equal(scene.status, "ready");
  const invalid = deriveSolarDigitalTwinView({
    status: "ready",
    frame: {
      ...scene.frame,
      energy: {
        ...scene.frame.energy,
        acEnergyKWh: Number.NaN,
      },
    },
  });
  assert.equal(invalid.status, "unavailable");
  assert.equal(invalid.reason, "invalid-scene-frame");
});

test("mounted instruments retain typed linked workspace handoffs", () => {
  const request = activationRequestForObservatoryPosition(0, 4_116);
  assert.deepEqual(request, {
    source: "observatory-instrument-01",
    requestFocus: true,
    target: {
      workspaceId: "DT",
      selectedIndex: 4_116,
    },
  });
  assert.ok(Object.isFrozen(request));
  assert.ok(Object.isFrozen(request.target));
  const atmosphericRequest =
    activationRequestForObservatoryPosition(1, 4_116);
  assert.deepEqual(atmosphericRequest, {
    source: "observatory-instrument-02",
    requestFocus: true,
    target: {
      workspaceId: "WA",
      selectedIndex: 4_116,
    },
  });
  assert.ok(Object.isFrozen(atmosphericRequest));
  assert.ok(Object.isFrozen(atmosphericRequest.target));
  const annualRequest =
    activationRequestForObservatoryPosition(2, 4_116);
  assert.deepEqual(annualRequest, {
    source: "observatory-instrument-03",
    requestFocus: true,
    target: {
      workspaceId: "AF",
      selectedIndex: 4_116,
    },
  });
  assert.ok(Object.isFrozen(annualRequest));
  assert.ok(Object.isFrozen(annualRequest.target));
  const arrayEngineeringRequest =
    activationRequestForObservatoryPosition(3, 4_116);
  assert.deepEqual(arrayEngineeringRequest, {
    source: "observatory-instrument-04",
    requestFocus: true,
    intent: {
      kind: "open-scenario-controls",
      focusTargetId: "scenario-dc-capacity",
    },
    target: {
      workspaceId: "AE",
      selectedIndex: 4_116,
    },
  });
  assert.ok(Object.isFrozen(arrayEngineeringRequest));
  assert.ok(Object.isFrozen(arrayEngineeringRequest.intent));
  assert.ok(Object.isFrozen(arrayEngineeringRequest.target));
  const scenarioComparisonRequest =
    activationRequestForObservatoryPosition(4, 4_116);
  assert.deepEqual(scenarioComparisonRequest, {
    source: "observatory-instrument-05",
    requestFocus: true,
    target: {
      workspaceId: "SR",
      selectedIndex: 4_116,
    },
  });
  assert.ok(Object.isFrozen(scenarioComparisonRequest));
  assert.ok(Object.isFrozen(scenarioComparisonRequest.target));
  const batteryEnergyFlowRequest =
    activationRequestForObservatoryPosition(5, 4_116);
  assert.deepEqual(batteryEnergyFlowRequest, {
    source: "observatory-instrument-06",
    requestFocus: true,
    intent: {
      kind: "focus-linked-battery-interval",
      focusTargetId: "battery-linked-interval",
    },
    target: {
      workspaceId: "BE",
      selectedIndex: 4_116,
    },
  });
  assert.ok(Object.isFrozen(batteryEnergyFlowRequest));
  assert.ok(Object.isFrozen(batteryEnergyFlowRequest.intent));
  assert.ok(Object.isFrozen(batteryEnergyFlowRequest.target));
  assert.equal(activationRequestForObservatoryPosition(7, 4_116), null);
  assert.equal(activationRequestForObservatoryPosition(0, -1), null);
  assert.equal(activationRequestForObservatoryPosition(0, 1.5), null);
});
