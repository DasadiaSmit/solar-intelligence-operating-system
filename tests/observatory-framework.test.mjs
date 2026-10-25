import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OBSERVATORY_INSTRUMENT_RING_RADIUS,
} from "../components/3d/InstrumentRingStructure.tsx";
import {
  observatoryScrollTarget,
  observatoryStateForScroll,
} from "../components/observatory/useObservatoryScrollEngine.ts";
import { HERO_CAMERA_FINAL } from "../features/visual-computing/hero-motion.ts";
import {
  OBSERVATORY_INSTRUMENT_MOUNTS,
} from "../features/visual-computing/observatory-instrument-registry.ts";
import {
  deriveObservatoryInstrumentPresentationState,
} from "../features/visual-computing/observatory-instrument-presentation.ts";
import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  OBSERVATORY_ENTRY_END,
  OBSERVATORY_HANDOFF_START,
  OBSERVATORY_POSITION_COUNT,
  OBSERVATORY_POSITIONS,
  OBSERVATORY_RING_STEP_RADIANS,
  deriveObservatoryPresentationState,
  markerStateForObservatoryPosition,
  progressForObservatoryPosition,
} from "../features/visual-computing/observatory-model.ts";
import {
  OBSERVATORY_CAMERA_ANCHORS,
  OBSERVATORY_HANDOFF_CAMERA_POSE,
  deriveObservatoryCameraPose,
  isFiniteObservatoryCameraPose,
} from "../features/visual-computing/observatory-motion.ts";

const root = new URL("../", import.meta.url);
const TOP_ANGLE_RADIANS = Math.PI / 2;
const tolerance = 1e-10;

function close(actual, expected, epsilon = tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function angleDifference(actual, expected) {
  return Math.atan2(
    Math.sin(actual - expected),
    Math.cos(actual - expected),
  );
}

function poseDistance(first, second) {
  return Math.hypot(
    first.x - second.x,
    first.y - second.y,
    first.z - second.z,
    first.targetX - second.targetX,
    first.targetY - second.targetY,
    first.targetZ - second.targetZ,
    first.fov - second.fov,
  );
}

test("Observatory registry is immutable, ordered, and honest", () => {
  const expectedLabels = [
    "Solar Digital Twin",
    "Atmospheric Observation",
    "Annual Energy Observatory",
    "Solar Array Engineering",
    "Scenario Simulator",
    "Battery & Energy Flow",
    "Regional Solar Intelligence",
  ];

  assert.equal(OBSERVATORY_POSITION_COUNT, 14);
  assert.equal(OBSERVATORY_ACTIVE_POSITION_COUNT, 7);
  assert.equal(OBSERVATORY_POSITIONS.length, 14);
  assert.equal(Object.isFrozen(OBSERVATORY_POSITIONS), true);
  assert.equal(
    new Set(OBSERVATORY_POSITIONS.map((position) => position.id)).size,
    14,
  );
  assert.deepEqual(
    OBSERVATORY_POSITIONS.slice(0, 7).map((position) => position.label),
    expectedLabels,
  );
  assert.deepEqual(
    OBSERVATORY_POSITIONS.map((position) => position.index),
    Array.from({ length: 14 }, (_, index) => index),
  );
  assert.deepEqual(
    OBSERVATORY_POSITIONS.map((position) => position.ordinal),
    Array.from({ length: 14 }, (_, index) => index + 1),
  );
  assert.equal(
    OBSERVATORY_POSITIONS.filter(
      (position) => position.availability === "navigable-instrument",
    ).length,
    6,
  );
  assert.equal(
    OBSERVATORY_POSITIONS.filter(
      (position) => position.availability === "navigable-placeholder",
    ).length,
    1,
  );
  assert.equal(
    OBSERVATORY_POSITIONS.filter(
      (position) => position.availability === "reserved",
    ).length,
    7,
  );
  assert.deepEqual(
    OBSERVATORY_POSITIONS.filter(
      (position) => position.availability === "navigable-instrument",
    ).map((position) => position.index),
    [0, 1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    OBSERVATORY_INSTRUMENT_MOUNTS.map((mount) => mount.instrumentKey),
    [
      "solar-digital-twin",
      "atmospheric-observation",
      "annual-energy-observatory",
      "solar-array-engineering",
      "scenario-comparison",
      "battery-energy-flow",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  );
  assert.ok(OBSERVATORY_POSITIONS.every(Object.isFrozen));
});

test("fourteen engraved positions have equal calibrated angular spacing", () => {
  close(OBSERVATORY_RING_STEP_RADIANS, (Math.PI * 2) / 14);
  close(OBSERVATORY_POSITIONS[0].angleRadians, TOP_ANGLE_RADIANS);
  for (let index = 1; index < OBSERVATORY_POSITIONS.length; index += 1) {
    close(
      OBSERVATORY_POSITIONS[index].angleRadians
        - OBSERVATORY_POSITIONS[index - 1].angleRadians,
      OBSERVATORY_RING_STEP_RADIANS,
    );
  }
  close(
    OBSERVATORY_POSITIONS[0].angleRadians + Math.PI * 2
      - OBSERVATORY_POSITIONS.at(-1).angleRadians,
    OBSERVATORY_RING_STEP_RADIANS,
  );
});

test("position navigation maps only the seven navigable stops", () => {
  const mapped = Array.from(
    { length: OBSERVATORY_ACTIVE_POSITION_COUNT },
    (_, index) => progressForObservatoryPosition(index),
  );
  assert.ok(mapped.every((progress) => progress !== null));
  close(mapped[0], OBSERVATORY_ENTRY_END);
  close(mapped.at(-1), OBSERVATORY_HANDOFF_START);
  for (let index = 1; index < mapped.length; index += 1) {
    assert.ok(mapped[index] > mapped[index - 1]);
  }
  for (const invalid of [-1, 7, 8, 13, 1.5, Number.NaN]) {
    assert.equal(progressForObservatoryPosition(invalid), null);
  }
});

test("native-scroll navigation survives integer-pixel quantization at every stop", () => {
  // Fractional 16% targets previously rounded below Observatory entry.
  for (const maximum of [531, 720, 1125, 5040, 6133, 8765, 12347]) {
    for (let index = 0; index < OBSERVATORY_ACTIVE_POSITION_COUNT; index += 1) {
      const progress = progressForObservatoryPosition(index);
      const target = observatoryScrollTarget(progress, maximum);
      assert.notEqual(target, null);
      assert.ok(target >= 0 && target <= maximum);
      assert.equal(Number.isInteger(target), true);
      assert.ok(Math.abs(target - progress * maximum) < 1);
      // Both integer floor and nearest-pixel browser behaviour preserve it.
      for (const quantize of [Math.floor, Math.round]) {
        const actual = deriveObservatoryPresentationState(quantize(target) / maximum);
        assert.equal(actual.phase, "observatory", `range ${maximum}, stop ${index + 1}`);
        assert.equal(actual.activePositionIndex, index);
      }
    }
  }
  for (const maximum of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(observatoryScrollTarget(OBSERVATORY_ENTRY_END, maximum), null);
  }
  for (const progress of [-1, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(observatoryScrollTarget(progress, 720), null);
  }
});

test("sub-epsilon scrolling commits phase changes in both directions", () => {
  for (const boundary of [OBSERVATORY_ENTRY_END, OBSERVATORY_HANDOFF_START]) {
    const before = deriveObservatoryPresentationState(boundary - 0.00001);
    const after = deriveObservatoryPresentationState(boundary + 0.00001);
    assert.notEqual(before.phase, after.phase);
    assert.deepEqual(observatoryStateForScroll(before, after.progress), after);
    assert.deepEqual(observatoryStateForScroll(after, before.progress), before);
  }
});

test("sub-epsilon scrolling commits active-position changes while retaining idle filtering", () => {
  for (let index = 0; index < OBSERVATORY_ACTIVE_POSITION_COUNT - 1; index += 1) {
    const midpoint = (
      progressForObservatoryPosition(index)
      + progressForObservatoryPosition(index + 1)
    ) / 2;
    const before = deriveObservatoryPresentationState(midpoint - 0.00001);
    const after = deriveObservatoryPresentationState(midpoint + 0.00001);
    assert.equal(before.activePositionIndex, index);
    assert.equal(after.activePositionIndex, index + 1);
    assert.deepEqual(observatoryStateForScroll(before, after.progress), after);
    assert.deepEqual(observatoryStateForScroll(after, before.progress), before);
  }
  const current = deriveObservatoryPresentationState(0.4);
  assert.equal(observatoryStateForScroll(current, 0.40001), current);
  assert.deepEqual(
    observatoryStateForScroll(current, 0.401),
    deriveObservatoryPresentationState(0.401),
  );
});

test("marker sequence distinguishes current, prior, future, and reserved", () => {
  const states = OBSERVATORY_POSITIONS.map((position) =>
    markerStateForObservatoryPosition(position.index, 3));
  assert.deepEqual(states, [
    "previous",
    "previous",
    "previous",
    "current",
    "future",
    "future",
    "future",
    "reserved",
    "reserved",
    "reserved",
    "reserved",
    "reserved",
    "reserved",
    "reserved",
  ]);

  const progress = progressForObservatoryPosition(3);
  assert.notEqual(progress, null);
  const presentation = deriveObservatoryPresentationState(progress);
  const visibility = Object.fromEntries(
    presentation.markers.map((marker) => [
      marker.state,
      Math.max(
        marker.visibility,
        presentation.markers.find(
          (candidate) => candidate.state === marker.state,
        )?.visibility ?? 0,
      ),
    ]),
  );
  assert.ok(visibility.current > visibility.previous);
  assert.ok(visibility.previous > visibility.future);
  assert.ok(visibility.future > visibility.reserved);
});

test("presentation and camera state stay finite, clamped, and immutable", () => {
  const samples = [
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    -2,
    ...Array.from({ length: 201 }, (_, index) => index / 200),
    3,
    Number.POSITIVE_INFINITY,
  ];

  for (const sample of samples) {
    const presentation = deriveObservatoryPresentationState(sample);
    const camera = deriveObservatoryCameraPose(sample);
    assert.ok(presentation.progress >= 0 && presentation.progress <= 1);
    assert.ok(
      presentation.dialPosition >= 0
      && presentation.dialPosition
        <= OBSERVATORY_ACTIVE_POSITION_COUNT - 1,
    );
    assert.ok(
      Number.isInteger(presentation.activePositionIndex)
      && presentation.activePositionIndex >= 0
      && presentation.activePositionIndex
        < OBSERVATORY_ACTIVE_POSITION_COUNT,
    );
    assert.ok([
      presentation.progress,
      presentation.heroProgress,
      presentation.observatoryProgress,
      presentation.handoffProgress,
      presentation.dialPosition,
      presentation.dialRotationRad,
      ...Object.values(presentation.visibility),
      ...presentation.markers.map((marker) => marker.visibility),
    ].every(Number.isFinite));
    assert.ok(
      Object.values(presentation.visibility).every(
        (visibility) => visibility >= 0 && visibility <= 1,
      ),
    );
    assert.equal(isFiniteObservatoryCameraPose(camera), true);
    assert.equal(Object.isFrozen(presentation), true);
    assert.equal(Object.isFrozen(presentation.visibility), true);
    assert.equal(Object.isFrozen(presentation.markers), true);
  }
});

test("camera anchors preserve the Hero endpoint and boundary continuity", () => {
  assert.equal(OBSERVATORY_CAMERA_ANCHORS.length, 7);
  assert.equal(Object.isFrozen(OBSERVATORY_CAMERA_ANCHORS), true);
  assert.equal(OBSERVATORY_CAMERA_ANCHORS[0].pose, HERO_CAMERA_FINAL);
  assert.deepEqual(OBSERVATORY_CAMERA_ANCHORS[0].pose, HERO_CAMERA_FINAL);
  assert.ok(
    OBSERVATORY_CAMERA_ANCHORS.every(
      (anchor) =>
        Object.isFrozen(anchor)
        && Object.isFrozen(anchor.pose)
        && isFiniteObservatoryCameraPose(anchor.pose),
    ),
  );
  assert.equal(
    isFiniteObservatoryCameraPose(OBSERVATORY_HANDOFF_CAMERA_POSE),
    true,
  );

  const epsilon = 1e-7;
  const beforeEntry = deriveObservatoryCameraPose(
    OBSERVATORY_ENTRY_END - epsilon,
  );
  const atEntry = deriveObservatoryCameraPose(OBSERVATORY_ENTRY_END);
  const afterEntry = deriveObservatoryCameraPose(
    OBSERVATORY_ENTRY_END + epsilon,
  );
  assert.equal(beforeEntry, HERO_CAMERA_FINAL);
  assert.equal(atEntry, HERO_CAMERA_FINAL);
  assert.ok(poseDistance(atEntry, afterEntry) < 1e-5);

  const beforeHandoff = deriveObservatoryCameraPose(
    OBSERVATORY_HANDOFF_START - epsilon,
  );
  const atHandoff = deriveObservatoryCameraPose(
    OBSERVATORY_HANDOFF_START,
  );
  const afterHandoff = deriveObservatoryCameraPose(
    OBSERVATORY_HANDOFF_START + epsilon,
  );
  assert.ok(poseDistance(beforeHandoff, atHandoff) < 1e-5);
  assert.ok(poseDistance(atHandoff, afterHandoff) < 1e-5);
});

test("Instrument 02 raises the camera continuously into atmospheric context", () => {
  const digitalTwinPose = OBSERVATORY_CAMERA_ANCHORS[0].pose;
  const atmosphericPose = OBSERVATORY_CAMERA_ANCHORS[1].pose;
  assert.ok(atmosphericPose.y > digitalTwinPose.y);
  assert.ok(atmosphericPose.targetY > digitalTwinPose.targetY);
  assert.ok(atmosphericPose.z > digitalTwinPose.z);

  const atmosphericProgress = progressForObservatoryPosition(1);
  assert.notEqual(atmosphericProgress, null);
  assert.deepEqual(
    deriveObservatoryCameraPose(atmosphericProgress),
    atmosphericPose,
  );

  const halfwayProgress =
    (
      progressForObservatoryPosition(0)
      + atmosphericProgress
    ) / 2;
  const halfwayPose = deriveObservatoryCameraPose(halfwayProgress);
  assert.ok(halfwayPose.y > digitalTwinPose.y);
  assert.ok(halfwayPose.y < atmosphericPose.y);
  assert.equal(isFiniteObservatoryCameraPose(halfwayPose), true);
});

test("Instrument 03 pulls the camera outward for the annual chronology", () => {
  const atmosphericPose = OBSERVATORY_CAMERA_ANCHORS[1].pose;
  const annualPose = OBSERVATORY_CAMERA_ANCHORS[2].pose;
  assert.ok(annualPose.z > atmosphericPose.z);
  assert.ok(annualPose.fov > atmosphericPose.fov);

  const annualProgress = progressForObservatoryPosition(2);
  assert.notEqual(annualProgress, null);
  assert.ok(
    poseDistance(
      deriveObservatoryCameraPose(annualProgress),
      annualPose,
    ) < 1e-12,
  );

  const halfwayProgress =
    (
      progressForObservatoryPosition(1)
      + annualProgress
    ) / 2;
  const halfwayPose = deriveObservatoryCameraPose(halfwayProgress);
  assert.ok(halfwayPose.z > atmosphericPose.z);
  assert.ok(halfwayPose.z < annualPose.z);
  assert.equal(isFiniteObservatoryCameraPose(halfwayPose), true);
});

test("Instrument 06 camera follows the energy ledger and preserves stable endpoints", () => {
  const instrument05Progress = progressForObservatoryPosition(4);
  const instrument06Progress = progressForObservatoryPosition(5);
  assert.notEqual(instrument05Progress, null);
  assert.notEqual(instrument06Progress, null);
  const transitionProgress = (fraction) =>
    instrument05Progress
    + (instrument06Progress - instrument05Progress) * fraction;

  assert.deepEqual(
    deriveObservatoryCameraPose(instrument05Progress),
    OBSERVATORY_CAMERA_ANCHORS[4].pose,
  );
  assert.deepEqual(
    deriveObservatoryCameraPose(instrument06Progress),
    OBSERVATORY_CAMERA_ANCHORS[5].pose,
  );

  const sourceAndBus = deriveObservatoryCameraPose(
    transitionProgress(0.25),
  );
  const batteryAndLoad = deriveObservatoryCameraPose(
    transitionProgress(0.55),
  );
  const gridIntertie = deriveObservatoryCameraPose(
    transitionProgress(0.82),
  );
  close(sourceAndBus.targetX, -0.12);
  close(batteryAndLoad.targetX, 0);
  close(gridIntertie.targetX, 0.1);
  assert.ok([
    sourceAndBus,
    batteryAndLoad,
    gridIntertie,
  ].every(isFiniteObservatoryCameraPose));

  const reducedMotion = deriveObservatoryCameraPose(
    transitionProgress(0.55),
    true,
  );
  assert.notEqual(reducedMotion.targetX, batteryAndLoad.targetX);
  assert.ok(
    reducedMotion.targetX < OBSERVATORY_CAMERA_ANCHORS[4].pose.targetX
    && reducedMotion.targetX > OBSERVATORY_CAMERA_ANCHORS[5].pose.targetX,
  );
  close(reducedMotion.x, batteryAndLoad.x);
  close(reducedMotion.y, batteryAndLoad.y);
  close(reducedMotion.z, batteryAndLoad.z);
  assert.deepEqual(
    deriveObservatoryCameraPose(instrument05Progress, true),
    OBSERVATORY_CAMERA_ANCHORS[4].pose,
  );
  assert.deepEqual(
    deriveObservatoryCameraPose(instrument06Progress, true),
    OBSERVATORY_CAMERA_ANCHORS[5].pose,
  );
});

test("every calibrated marker fits the camera's vertical field of view", () => {
  const fiducialRadialHalfLength = 0.1;
  const requiredHalfHeight =
    OBSERVATORY_INSTRUMENT_RING_RADIUS
    + fiducialRadialHalfLength;

  for (const anchor of OBSERVATORY_CAMERA_ANCHORS) {
    const cameraDistance =
      Math.abs(anchor.pose.z - anchor.pose.targetZ);
    const visibleHalfHeight =
      cameraDistance * Math.tan(anchor.pose.fov * Math.PI / 360);
    assert.ok(
      visibleHalfHeight >= requiredHalfHeight,
      `position ${anchor.positionIndex + 1} clips its top marker`,
    );
  }
});

test("each navigable stop aligns its calibrated marker to the top datum", () => {
  for (
    let index = 0;
    index < OBSERVATORY_ACTIVE_POSITION_COUNT;
    index += 1
  ) {
    const progress = progressForObservatoryPosition(index);
    assert.notEqual(progress, null);
    const presentation = deriveObservatoryPresentationState(progress);
    assert.equal(presentation.activePositionIndex, index);
    close(presentation.dialPosition, index);
    close(
      angleDifference(
        OBSERVATORY_POSITIONS[index].angleRadians
          + presentation.dialRotationRad,
        TOP_ANGLE_RADIANS,
      ),
      0,
    );
  }
});

test("M4 source has one frame owner and no prohibited control or motion path", async () => {
  const paths = [
    "components/3d/ObservatorySceneManager.tsx",
    "components/3d/HeliosFrameRuntime.ts",
    "components/3d/HeliosHeroScene.tsx",
    "components/3d/ObservatoryCameraController.ts",
    "components/3d/InstrumentRingStructure.tsx",
    "components/3d/ObservatoryInstrumentManager.tsx",
    "components/3d/instruments/ObservatoryInstrumentMount.tsx",
    "components/3d/instruments/SolarDigitalTwinInstrument.tsx",
    "components/3d/instruments/AtmosphericObservationInstrument.tsx",
    "components/3d/instruments/AtmosphericObservationPrimitives.tsx",
    "components/3d/instruments/AnnualEnergyInstrument.tsx",
    "components/3d/instruments/ArrayEngineeringInstrument.tsx",
    "components/observatory/ObservatoryStateManager.tsx",
    "components/observatory/ObservatoryNavigation.tsx",
    "components/observatory/ObservatoryReadout.tsx",
    "components/observatory/useObservatoryScrollEngine.ts",
    "components/observatory/Observatory.module.css",
    "features/visual-computing/observatory-model.ts",
    "features/visual-computing/observatory-motion.ts",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(path, root), "utf8")),
  );
  const source = sources.join("\n");
  const sceneAndProxy = `${sources[0]}\n${sources[2]}`;

  assert.equal((sceneAndProxy.match(/\buseFrame\s*\(/g) ?? []).length, 1);
  assert.match(
    sources[0],
    /progressInFlight\s*\|\|\s*pointerInFlight/,
  );
  assert.doesNotMatch(
    sources[0],
    /if\s*\(\s*!reducedMotion\s*\)\s*frameState\.invalidate/,
  );
  assert.match(
    sources[6],
    /if \(presentationSeededRef\.current\) return/,
  );
  assert.match(
    sources[0],
    /instrumentManagerRef\.current\?\.applyPresentation/,
  );
  for (const prohibited of [
    /\bOrbitControls\b/,
    /\bMath\.random\s*\(/,
    /\bDate\.now\s*\(/,
    /\bScrollTrigger\b/,
    /scroll-snap/i,
  ]) {
    assert.doesNotMatch(source, prohibited);
  }
  assert.match(sources[15], /passive:\s*true/);
  assert.doesNotMatch(sources[15], /preventDefault\s*\(/);
});

test("M4 spatial topology mounts I01 through I06 while retaining eight empty anchors", async () => {
  const mounted = OBSERVATORY_INSTRUMENT_MOUNTS.filter(
    (mount) => mount.mountStatus === "mounted",
  );
  const empty = OBSERVATORY_INSTRUMENT_MOUNTS.filter(
    (mount) => mount.mountStatus !== "mounted",
  );
  assert.deepEqual(
    mounted.map((mount) => [
      mount.position.index,
      mount.instrumentKey,
      mount.implementationStatus,
    ]),
    [
      [0, "solar-digital-twin", "implemented"],
      [1, "atmospheric-observation", "implemented"],
      [2, "annual-energy-observatory", "implemented"],
      [3, "solar-array-engineering", "implemented"],
      [4, "scenario-comparison", "implemented"],
      [5, "battery-energy-flow", "implemented"],
    ],
  );
  assert.equal(empty.length, 8);
  assert.deepEqual(
    empty.map((mount) => mount.position.index),
    Array.from({ length: 8 }, (_, index) => index + 6),
  );
  assert.equal(
    empty.filter((mount) => mount.mountStatus === "placeholder").length,
    1,
  );
  assert.equal(
    empty.filter((mount) => mount.mountStatus === "reserved").length,
    7,
  );

  const instrument01At02 =
    deriveObservatoryInstrumentPresentationState(1, 0);
  const instrument02At02 =
    deriveObservatoryInstrumentPresentationState(1, 1);
  assert.equal(instrument01At02.formationProgress, 1);
  assert.equal(instrument01At02.visibility, 0.34);
  assert.equal(instrument02At02.formationProgress, 1);
  assert.equal(instrument02At02.visibility, 1);
  assert.equal(instrument02At02.interactive, true);
  const instrument01At04 =
    deriveObservatoryInstrumentPresentationState(3, 0);
  const instrument02At04 =
    deriveObservatoryInstrumentPresentationState(3, 1);
  const instrument03At04 =
    deriveObservatoryInstrumentPresentationState(3, 2);
  const instrument04At04 =
    deriveObservatoryInstrumentPresentationState(3, 3);
  for (const prior of [
    instrument01At04,
    instrument02At04,
    instrument03At04,
  ]) {
    assert.equal(prior.formationProgress, 1);
    assert.equal(prior.visibility, 0.34);
    assert.equal(prior.interactive, false);
  }
  assert.equal(instrument04At04.formationProgress, 1);
  assert.equal(instrument04At04.visibility, 1);
  assert.equal(instrument04At04.interactive, true);
  const instrumentsAt05 = Array.from({ length: 5 }, (_, index) =>
    deriveObservatoryInstrumentPresentationState(4, index));
  for (const prior of instrumentsAt05.slice(0, 4)) {
    assert.equal(prior.formationProgress, 1);
    assert.equal(prior.visibility, 0.34);
    assert.equal(prior.interactive, false);
  }
  assert.equal(instrumentsAt05[4].formationProgress, 1);
  assert.equal(instrumentsAt05[4].visibility, 1);
  assert.equal(instrumentsAt05[4].interactive, true);
  const instrumentsAt06 = Array.from({ length: 6 }, (_, index) =>
    deriveObservatoryInstrumentPresentationState(5, index));
  for (const prior of instrumentsAt06.slice(0, 5)) {
    assert.equal(prior.formationProgress, 1);
    assert.equal(prior.visibility, 0.34);
    assert.equal(prior.interactive, false);
  }
  assert.equal(instrumentsAt06[5].formationProgress, 1);
  assert.equal(instrumentsAt06[5].visibility, 1);
  assert.equal(instrumentsAt06[5].interactive, true);

  const spatialPaths = [
    "components/3d/ObservatorySceneManager.tsx",
    "components/3d/HeliosHeroScene.tsx",
    "components/3d/ObservatoryCameraController.ts",
    "components/3d/InstrumentRingStructure.tsx",
    "components/3d/ObservatoryInstrumentManager.tsx",
    "components/3d/instruments/ObservatoryInstrumentMount.tsx",
    "components/3d/instruments/SolarDigitalTwinInstrument.tsx",
    "components/3d/instruments/AtmosphericObservationInstrument.tsx",
    "components/3d/instruments/AtmosphericObservationPrimitives.tsx",
    "components/3d/instruments/AnnualEnergyInstrument.tsx",
    "components/3d/instruments/ArrayEngineeringInstrument.tsx",
    "components/3d/instruments/ScenarioComparisonInstrument.tsx",
    "components/3d/instruments/BatteryEnergyFlowInstrument.tsx",
  ];
  const spatialSources = await Promise.all(
    spatialPaths.map((path) => readFile(new URL(path, root), "utf8")),
  );
  const spatialSource = spatialSources.join("\n");
  assert.doesNotMatch(
    spatialSource,
    /<(?:Moon|Terrain)\b|\b(?:lunarPhase|surveyedHorizon|moduleGeometry|directNormal|diffuseHorizontal)\b/i,
  );
  const geometryTags = [
    ...spatialSource.matchAll(/<([A-Za-z]+Geometry)\b/g),
  ].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(geometryTags)].sort(),
    [
      "boxGeometry",
      "circleGeometry",
      "coneGeometry",
      "cylinderGeometry",
      "planeGeometry",
      "sphereGeometry",
      "torusGeometry",
    ],
  );
  assert.match(spatialSource, /placeholderOnly:\s*true/);
  assert.match(
    spatialSources[4],
    /mount\.mountStatus === "mounted" && mount\.instrumentKey/,
  );
  assert.match(
    spatialSources[4],
    /mount\.mountStatus !== "mounted"/,
  );
  assert.match(spatialSources[4], /AtmosphericObservationInstrument/);
  assert.match(spatialSources[4], /AnnualEnergyInstrument/);
  assert.match(spatialSources[4], /ArrayEngineeringInstrument/);
  assert.match(
    spatialSources[4],
    /ScenarioComparisonInstrument:\s*LazyScenarioComparisonInstrument/,
  );
  assert.match(
    spatialSources[4],
    /BatteryEnergyFlowInstrument:\s*LazyBatteryEnergyFlowInstrument/,
  );
  assert.match(
    spatialSources[4],
    /presentation\.presence !== "absent"/,
  );
  assert.match(
    spatialSources[4],
    /key === "battery-energy-flow"[\s\S]*presentation\.presence !== "absent"/,
  );
  assert.match(spatialSource, /physicalReplica:\s*false/);
  assert.match(spatialSource, /energyMagnitudeEncoding:\s*"none"/);
  assert.match(spatialSource, /cloudMotionEncoding:\s*"none"/);
  assert.match(spatialSource, /windDirectionEncoding:\s*"none"/);
  assert.match(spatialSource, /measuredPlantOutputClaim:\s*false/);
  assert.match(spatialSource, /causalityClaim:\s*false/);
  assert.match(spatialSource, /capacityAreaEncoding:\s*"none"/);
  assert.match(spatialSource, /moduleCountEncoding:\s*"none"/);
  assert.match(spatialSource, /shadowClaim:\s*false/);
  assert.match(spatialSource, /terrainClaim:\s*false/);
  assert.match(spatialSource, /physicalWeatherGeometry/);
  assert.match(spatialSource, /probabilityEncoding/);
  assert.match(spatialSource, /animatedParticles:\s*false/);
  assert.match(spatialSource, /livePowerFlow/);
  assert.match(spatialSource, /physicalTopology/);
  assert.match(spatialSource, /gridIntertieCount:\s*1/);
  assert.match(
    spatialSource,
    /magnitudeBasis:\s*"linked-utc-day-accumulated-energy"/,
  );
  assert.match(
    spatialSource,
    /coverage-screen-glyph-not-observed-cloud-geometry/,
  );
  assert.doesNotMatch(
    spatialSources.slice(6).join("\n"),
    /<(?:table|button|input|canvas)\b/i,
  );
  assert.doesNotMatch(
    spatialSources.slice(4).join("\n"),
    /\buseFrame\s*\(/,
  );
  assert.doesNotMatch(
    spatialSource,
    /\b(?:castShadow|receiveShadow)\b|enableShadows=\{true\}/,
  );
});

test("semantic navigation remains complete without WebGL or motion", async () => {
  const [
    navigation,
    readout,
    scrollEngine,
    hero,
    experience,
    observatoryCss,
    heroCss,
    renderer,
    activation,
    shell,
    atmosphericReadout,
    annualEnergyReadout,
    arrayEngineeringReadout,
    scenarioComparisonReadout,
    batteryEnergyFlowReadout,
    heroVisual,
  ] = await Promise.all([
    readFile(
      new URL(
        "components/observatory/ObservatoryNavigation.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL("components/observatory/ObservatoryReadout.tsx", root),
      "utf8",
    ),
    readFile(
      new URL(
        "components/observatory/useObservatoryScrollEngine.ts",
        root,
      ),
      "utf8",
    ),
    readFile(new URL("components/hero/HeliosHero.tsx", root), "utf8"),
    readFile(
      new URL("components/hero/SolarExperience.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("components/observatory/Observatory.module.css", root),
      "utf8",
    ),
    readFile(
      new URL("components/hero/HeliosHero.module.css", root),
      "utf8",
    ),
    readFile(
      new URL("components/3d/HeliosCanvasRenderer.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("features/application-activation.ts", root),
      "utf8",
    ),
    readFile(
      new URL("components/solar-os/SolarOperatingSystem.tsx", root),
      "utf8",
    ),
    readFile(
      new URL(
        "components/observatory/AtmosphericObservationReadout.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "components/observatory/AnnualEnergyReadout.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "components/observatory/ArrayEngineeringReadout.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "components/observatory/ScenarioComparisonReadout.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "components/observatory/BatteryEnergyFlowReadout.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL("components/hero/HeliosHeroVisual.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(navigation, /role="toolbar"/);
  assert.match(navigation, /aria-current=\{current \? "location"/);
  assert.match(navigation, /tabIndex=\{position\.index === rovingIndex/);
  for (const key of [
    "ArrowRight",
    "ArrowDown",
    "ArrowLeft",
    "ArrowUp",
    "Home",
    "End",
  ]) {
    assert.match(navigation, new RegExp(`"${key}"`));
  }
  assert.match(navigation, /<ol[\s\S]*reservedPositions/);
  assert.doesNotMatch(navigation, /\bdisabled\b/);
  assert.match(navigation, /role="status"/);
  assert.match(navigation, /aria-live="polite"/);
  assert.match(
    navigation,
    /data-observatory-initial-focus=\{\s*current \? "true"/,
  );
  assert.match(navigation, /if \(!navigationSettled\) return/);
  assert.match(
    navigation,
    /className=\{styles\.reservedOrdinal\}[\s\S]*aria-hidden="true"/,
  );
  assert.match(
    readout,
    /Configured-orientation system schematic/,
  );
  assert.match(readout, /physical module layout, terrain/);
  assert.match(readout, /deriveSolarDigitalTwinView/);
  assert.match(readout, /deriveAtmosphericObservationView/);
  assert.match(readout, /AtmosphericObservationReadout/);
  assert.match(readout, /deriveAnnualEnergyView/);
  assert.match(readout, /AnnualEnergyReadout/);
  assert.match(readout, /deriveArrayEngineeringView/);
  assert.match(readout, /ArrayEngineeringReadout/);
  assert.match(readout, /deriveScenarioComparisonView/);
  assert.match(readout, /ScenarioComparisonReadout/);
  assert.match(readout, /deriveBatteryEnergyFlowView/);
  assert.match(readout, /BatteryEnergyFlowReadout/);
  assert.match(readout, /activationRequestForObservatoryPosition/);
  assert.match(readout, /Open Solar Digital Twin workspace/);
  assert.match(readout, /Open Weather and Atmosphere workspace/);
  assert.match(readout, /Open Annual Energy Forecast workspace/);
  assert.match(readout, /Open Solar Array Engineering controls/);
  assert.match(readout, /Open Scenario & Resilience workspace/);
  assert.match(readout, /Open Battery & Energy-Flow workspace/);
  assert.match(readout, /Enter existing analytical workspace/);
  assert.match(activation, /workspaceId:\s*"DT"/);
  assert.match(activation, /workspaceId:\s*"WA"/);
  assert.match(activation, /workspaceId:\s*"AF"/);
  assert.match(activation, /workspaceId:\s*"AE"/);
  assert.match(activation, /workspaceId:\s*"SR"/);
  assert.match(activation, /workspaceId:\s*"BE"/);
  assert.match(activation, /source:\s*"observatory-instrument-02"/);
  assert.match(activation, /source:\s*"observatory-instrument-03"/);
  assert.match(activation, /source:\s*"observatory-instrument-04"/);
  assert.match(activation, /source:\s*"observatory-instrument-05"/);
  assert.match(activation, /source:\s*"observatory-instrument-06"/);
  assert.match(activation, /focusTargetId:\s*"scenario-dc-capacity"/);
  assert.match(
    activation,
    /kind:\s*"focus-linked-battery-interval"/,
  );
  assert.match(
    activation,
    /focusTargetId:\s*"battery-linked-interval"/,
  );
  assert.match(activation, /if \(!target\) return null/);
  assert.match(
    navigation,
    /Positions 01 through 06 contain the mounted Solar Digital Twin,\s+Atmospheric Observation, Annual Energy Observatory, and Solar Array\s+Engineering instruments, followed by Scenario Comparison and Battery\s+&amp; Energy Flow\. Position 07 remains a navigable framework placeholder/,
  );
  assert.match(
    atmosphericReadout,
    /one coincident hourly interval/,
  );
  assert.match(
    atmosphericReadout,
    /co-variation is not proof of instant causality/,
  );
  assert.match(atmosphericReadout, /GHI \/ DNI \/ DHI/);
  assert.match(atmosphericReadout, /Cloud \/ humidity/);
  assert.match(
    atmosphericReadout,
    /does not claim live synchronization\s+or instant cloud-to-power causality/,
  );
  assert.match(
    atmosphericReadout,
    /wind direction; cloud geometry,\s+altitude, type, and motion; sub-hour response/,
  );
  assert.match(annualEnergyReadout, /8,760/);
  assert.match(annualEnergyReadout, /winter:\s*"Winter"/);
  assert.match(annualEnergyReadout, /spring:\s*"Spring"/);
  assert.match(annualEnergyReadout, /summer:\s*"Summer"/);
  assert.match(annualEnergyReadout, /autumn:\s*"Autumn"/);
  assert.match(annualEnergyReadout, /not measured or live/);
  assert.match(annualEnergyReadout, /not an issued future forecast/);
  assert.match(arrayEngineeringReadout, /SIMULATED screening/);
  assert.match(
    arrayEngineeringReadout,
    /Array settings never alter the astronomical Sun path/,
  );
  assert.match(arrayEngineeringReadout, /Generic inverter facts \(fixed\)/);
  assert.match(arrayEngineeringReadout, /Configured component loss inputs/);
  assert.match(arrayEngineeringReadout, /Annual canonical loss chain/);
  assert.match(arrayEngineeringReadout, /Unavailable and not synthesized/);
  assert.match(
    scenarioComparisonReadout,
    /SIMULATED deterministic comparison/,
  );
  assert.match(
    scenarioComparisonReadout,
    /signed annual-generation delta/,
  );
  assert.match(
    scenarioComparisonReadout,
    /reliabilityDeltaPct/,
  );
  assert.match(
    scenarioComparisonReadout,
    /Unavailable and not synthesized/,
  );
  assert.match(
    batteryEnergyFlowReadout,
    /SIMULATED greedy self-consumption dispatch/,
  );
  assert.match(
    batteryEnergyFlowReadout,
    /Every route value is interval\s+energy, not instantaneous power/,
  );
  assert.match(batteryEnergyFlowReadout, /Grid import \/ export/);
  assert.match(
    batteryEnergyFlowReadout,
    /Generation retained on site/,
  );
  assert.match(
    batteryEnergyFlowReadout,
    /Local supply delivered to load/,
  );
  assert.match(
    batteryEnergyFlowReadout,
    /Unavailable and not synthesized/,
  );
  assert.match(
    heroVisual,
    /position two contains an evidence-linked Atmospheric Observation schematic/,
  );
  assert.match(
    heroVisual,
    /position three contains an 8,760-sample Annual Energy Observatory/,
  );
  assert.match(
    heroVisual,
    /position four contains a normalized ENU Solar Array Engineering orientation rig/,
  );
  assert.match(
    heroVisual,
    /position five contains five normalized deterministic Scenario Comparison chambers/,
  );
  assert.match(
    heroVisual,
    /position six contains a logical canonical Battery and Energy-Flow routing schematic/,
  );
  assert.match(
    heroVisual,
    /position seven remains a framework placeholder/,
  );
  assert.match(shell, /setWorkspaceId\(requestedWorkspace\)/);
  assert.match(shell, /setSelectedIndex\(safeIndex\)/);
  assert.match(shell, /acknowledgeApplicationActivation/);
  assert.match(shell, /activationRequest\.intent\?\.kind === "open-scenario-controls"/);
  assert.match(
    shell,
    /setInspectorTab\(openScenarioControls \? "scenario" : "mission"\)/,
  );
  assert.match(shell, /if \(openScenarioControls\) setInspectorOpen\(true\)/);
  assert.match(experience, /activationRequest\?\.intent\?\.focusTargetId/);
  assert.match(experience, /acknowledgedActivation !== activationRequest/);
  assert.match(scrollEngine, /if \(reducedMotion\) return/);
  assert.match(scrollEngine, /SCROLL_SETTLED_DELAY_MS/);
  assert.match(scrollEngine, /setNavigationSettled\(false\)/);
  assert.match(scrollEngine, /setNavigationSettled\(true\)/);
  assert.match(
    scrollEngine,
    /setState\(deriveObservatoryPresentationState\(targetProgress\)\)/,
  );
  assert.match(hero, /inert=\{!heroActive\}/);
  assert.match(hero, /inert=\{heroActive\}/);
  assert.match(hero, /aria-hidden="true"[\s\S]*state\.progress/);
  assert.match(experience, /inert=\{!heroComplete\}/);
  assert.match(experience, /data-sios-application-active/);
  assert.match(observatoryCss, /min-width:\s*48px/);
  assert.match(observatoryCss, /prefers-reduced-motion/);
  assert.match(observatoryCss, /forced-colors:\s*active/);
  assert.match(heroCss, /prefers-reduced-motion/);
  assert.match(heroCss, /forced-colors:\s*active/);
  assert.match(renderer, /aria-hidden="true"/);
  assert.match(renderer, /role="presentation"/);
  assert.match(renderer, /pointerEvents:\s*"none"/);
});
