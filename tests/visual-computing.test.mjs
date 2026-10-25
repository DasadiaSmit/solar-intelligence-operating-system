import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildSceneFrameV1,
} from "../features/visual-computing/build-scene-frame.ts";
import {
  buildRepresentativeHeroScene,
  HERO_LINKED_HOUR_INDEX,
} from "../features/visual-computing/build-hero-scene.ts";
import {
  enuToSunAngles,
  sunAnglesToEnu,
} from "../features/visual-computing/scene-frame.ts";
import {
  PARTICLE_BUDGET_BY_QUALITY,
  resolveHeliosRendererPolicy,
} from "../features/visual-computing/renderer-policy.ts";
import {
  HELIOS_RING_SPECS,
  deriveHeliosHeroVisualState,
} from "../features/visual-computing/helios-hero-model.ts";
import {
  HERO_CAMERA_FINAL,
  HERO_CAMERA_INITIAL,
  coreRingApertureScale,
} from "../features/visual-computing/hero-motion.ts";
import {
  selectSemanticParticles,
} from "../components/3d/particle-model.ts";
import {
  DEFAULT_HELIOS_CAMERA,
  sanitizeHeliosCameraConfiguration,
} from "../components/3d/types.ts";
import {
  ScientificRendererFallback,
} from "../components/ui/ScientificRendererFallback.tsx";
import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import { compactOperatingSnapshot } from "../lib/client-snapshot.ts";
import {
  deriveScenario,
  normalizeSnapshot,
} from "../components/solar-os/model.ts";

const tolerance = 1e-10;

function close(actual, expected, epsilon = tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function normalizedTestSnapshot() {
  return normalizeSnapshot(
    compactOperatingSnapshot(
      buildOperatingSnapshot(),
      "sim_test_visual_computing",
    ),
  );
}

test("SceneFrameV1 uses explicit east-north-up solar vectors", () => {
  assert.deepEqual(sunAnglesToEnu(0, 0), { east: 0, north: 1, up: 0 });
  const east = sunAnglesToEnu(0, 90);
  assert.ok(east);
  close(east.east, 1);
  close(east.north, 0);
  close(east.up, 0);
  const zenith = sunAnglesToEnu(90, 237);
  assert.ok(zenith);
  close(zenith.east, 0);
  close(zenith.north, 0);
  close(zenith.up, 1);
});

test("ENU conversion preserves linked solar angles within visual parity tolerance", () => {
  for (const source of [
    { elevationDeg: -18.5, azimuthDeg: 42.75 },
    { elevationDeg: 0, azimuthDeg: 180 },
    { elevationDeg: 51.25, azimuthDeg: 226.5 },
  ]) {
    const vector = sunAnglesToEnu(source.elevationDeg, source.azimuthDeg);
    assert.ok(vector);
    close(Math.hypot(vector.east, vector.north, vector.up), 1);
    const reconstructed = enuToSunAngles(vector);
    assert.ok(reconstructed);
    close(reconstructed.elevationDeg, source.elevationDeg, 0.25);
    close(reconstructed.azimuthDeg, source.azimuthDeg, 0.25);
  }
});

test("scene adaptation preserves authoritative values, units and provenance", () => {
  const base = normalizedTestSnapshot();
  const result = deriveScenario(base, base.config);
  const selectedIndex = 171 * 24 + 12;
  const hour = result.hours[selectedIndex];
  const built = buildSceneFrameV1({
    base,
    result,
    scenario: base.config,
    selectedIndex,
    lifecycle: "SIMULATED",
  });
  assert.equal(built.status, "ready");
  const { frame } = built;
  assert.equal(frame.timestampUtc, hour.timestamp);
  assert.equal(frame.intervalSeconds, 3600);
  assert.equal(frame.sun.elevationDeg, hour.sunElevationDeg);
  close(frame.sun.azimuthDeg, hour.sunAzimuthDeg);
  assert.equal(frame.irradiance.ghiWm2, hour.ghi);
  assert.equal(frame.irradiance.effectivePoaWm2, hour.poa);
  assert.equal(frame.energy.acEnergyKWh, hour.acKw);
  assert.equal(frame.weather.qualityScore, hour.quality);
  assert.equal(frame.units.intervalEnergy, "kWh/1h");
  assert.equal(frame.provenance.calculationVersion, base.calculationVersion);
  assert.equal(frame.provenance.datasetVersion, base.datasetVersion);
  assert.ok(
    frame.provenance.evidenceRefIds.includes(
      `evidence:${base.resultId}:hour.sun-elevation`,
    ),
  );
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.sun));
  assert.ok(Object.isFrozen(frame.provenance.evidenceRefIds));
});

test("unavailable geometry and radiation remain explicit rather than synthesized", () => {
  const base = normalizedTestSnapshot();
  const result = deriveScenario(base, base.config);
  const built = buildSceneFrameV1({
    base,
    result,
    scenario: base.config,
    selectedIndex: 12,
    lifecycle: "SIMULATED",
  });
  assert.equal(built.status, "ready");
  assert.deepEqual(built.frame.array.geometry.value, null);
  assert.equal(built.frame.array.geometry.status, "unavailable");
  assert.equal(built.frame.environment.terrain.status, "unavailable");
  assert.equal(built.frame.environment.surveyedHorizon.status, "unavailable");
  assert.equal(
    built.frame.irradiance.directNormalWm2.status,
    "unavailable",
  );
  assert.equal("lunarPhase" in built.frame, false);
});

test("invalid solar input fails closed before producing scene coordinates", () => {
  const base = normalizedTestSnapshot();
  const result = deriveScenario(base, base.config);
  const hours = [...result.hours];
  hours[12] = { ...hours[12], sunElevationDeg: Number.NaN };
  const built = buildSceneFrameV1({
    base,
    result: { ...result, hours },
    scenario: base.config,
    selectedIndex: 12,
    lifecycle: "SIMULATED",
  });
  assert.deepEqual(
    { status: built.status, reason: built.reason },
    { status: "unavailable", reason: "invalid-solar-position" },
  );
});

test("negative irradiance and interval energy fail closed", () => {
  const base = normalizedTestSnapshot();
  const result = deriveScenario(base, base.config);
  const hours = [...result.hours];
  hours[12] = { ...hours[12], poa: -1 };
  const built = buildSceneFrameV1({
    base,
    result: { ...result, hours },
    scenario: base.config,
    selectedIndex: 12,
    lifecycle: "SIMULATED",
  });
  assert.deepEqual(
    { status: built.status, reason: built.reason },
    { status: "unavailable", reason: "invalid-scene-value" },
  );
});

test("Hero scene links the established representative hour without mutating science", () => {
  const snapshot = buildOperatingSnapshot();
  const compact = compactOperatingSnapshot(snapshot, "sim_test_hero_scene");
  const built = buildRepresentativeHeroScene(compact);
  assert.equal(built.status, "ready");
  assert.equal(built.frame.lifecycle, "SIMULATED");
  assert.equal(
    built.frame.timestampUtc,
    snapshot.hourly[HERO_LINKED_HOUR_INDEX].timestamp,
  );
  assert.equal(
    built.frame.irradiance.effectivePoaWm2,
    compact.hourly[HERO_LINKED_HOUR_INDEX][1],
  );
});

test("renderer policy sleeps when hidden and retains bounded demand rendering", () => {
  const available = resolveHeliosRendererPolicy({
    webglAvailable: true,
    contextLost: false,
    rendererFailed: false,
    pageVisible: true,
    reducedMotion: false,
    forcedColors: false,
    viewportWidth: 1440,
    devicePixelRatio: 3,
    lowPerformanceDevice: false,
  });
  assert.deepEqual(available, {
    mode: "webgl",
    reason: "available",
    dpr: 1.5,
    frameloop: "demand",
    motion: "animated",
    qualityTier: "cinematic",
    particleBudget: 256,
    antialias: true,
  });
  const reduced = resolveHeliosRendererPolicy({
    webglAvailable: true,
    contextLost: false,
    rendererFailed: false,
    pageVisible: true,
    reducedMotion: true,
    forcedColors: false,
    viewportWidth: 390,
    devicePixelRatio: 3,
    lowPerformanceDevice: true,
  });
  assert.equal(reduced.mode, "webgl");
  assert.equal(reduced.motion, "reduced");
  assert.equal(reduced.dpr, 1);
  assert.equal(reduced.qualityTier, "scientific");
  assert.equal(reduced.particleBudget, 0);
  assert.equal(reduced.antialias, false);
  const hidden = resolveHeliosRendererPolicy({
    webglAvailable: true,
    contextLost: false,
    rendererFailed: false,
    pageVisible: false,
    reducedMotion: false,
    forcedColors: false,
    viewportWidth: 1440,
    devicePixelRatio: 2,
    lowPerformanceDevice: false,
  });
  assert.equal(hidden.mode, "suspended");
  const forcedColors = resolveHeliosRendererPolicy({
    webglAvailable: true,
    contextLost: false,
    rendererFailed: false,
    pageVisible: true,
    reducedMotion: false,
    forcedColors: true,
    viewportWidth: 1440,
    devicePixelRatio: 2,
    lowPerformanceDevice: false,
  });
  assert.equal(forcedColors.mode, "fallback");
});

test("renderer quality boundaries and failure reasons are exact", () => {
  const environment = {
    webglAvailable: true,
    contextLost: false,
    rendererFailed: false,
    pageVisible: true,
    reducedMotion: false,
    forcedColors: false,
    devicePixelRatio: 2,
    lowPerformanceDevice: false,
  };
  assert.equal(
    resolveHeliosRendererPolicy({
      ...environment,
      viewportWidth: 720,
    }).qualityTier,
    "scientific",
  );
  assert.equal(
    resolveHeliosRendererPolicy({
      ...environment,
      viewportWidth: 721,
    }).qualityTier,
    "balanced",
  );
  assert.equal(
    resolveHeliosRendererPolicy({
      ...environment,
      viewportWidth: 1280,
    }).qualityTier,
    "balanced",
  );
  assert.equal(
    resolveHeliosRendererPolicy({
      ...environment,
      viewportWidth: 1281,
    }).qualityTier,
    "cinematic",
  );
  assert.equal(
    resolveHeliosRendererPolicy({
      ...environment,
      viewportWidth: 1281,
      rendererFailed: true,
    }).reason,
    "renderer-failed",
  );
  assert.equal(
    resolveHeliosRendererPolicy({
      ...environment,
      viewportWidth: 1920,
      lowPerformanceDevice: true,
    }).qualityTier,
    "scientific",
    "wide low-capability devices must not receive cinematic instrument geometry",
  );
});

test("camera configuration fails closed and the Hero camera pulls back", () => {
  const invalidCamera = {
    position: [0, 0, 0],
    target: [0, 0, 0],
    fovDeg: Number.NaN,
    near: -1,
    far: 0,
  };
  assert.equal(
    sanitizeHeliosCameraConfiguration(invalidCamera),
    DEFAULT_HELIOS_CAMERA,
  );
  const safeCamera = sanitizeHeliosCameraConfiguration({
    position: [1, 2, 7],
    target: [0, 0, 0],
    fovDeg: 35,
    near: 0.1,
    far: 90,
  });
  assert.deepEqual(safeCamera.position, [1, 2, 7]);
  assert.ok(Object.isFrozen(safeCamera));
  assert.ok(
    HERO_CAMERA_FINAL.z > HERO_CAMERA_INITIAL.z,
    "scroll endpoint must pull the camera away from the Core",
  );
  assert.equal(coreRingApertureScale(0, -1), 1);
  assert.ok(coreRingApertureScale(5, 1) > 1.1);
});

test("Helios Core and Sun inputs are deterministic, clamped and immutable", () => {
  assert.equal(HELIOS_RING_SPECS.length, 6);
  assert.equal(
    new Set(HELIOS_RING_SPECS.map((ring) => ring.id)).size,
    6,
  );
  assert.ok(
    HELIOS_RING_SPECS.every(
      (ring) =>
        ring.periodSeconds >= 90
        && Object.isFrozen(ring)
        && Object.isFrozen(ring.inclination),
    ),
  );
  const snapshot = compactOperatingSnapshot(
    buildOperatingSnapshot(),
    "sim_test_hero_visual_state",
  );
  const scene = buildRepresentativeHeroScene(snapshot);
  const first = deriveHeliosHeroVisualState(scene, 4);
  const second = deriveHeliosHeroVisualState(scene, 4);
  assert.deepEqual(first, second);
  assert.equal(first?.progress, 1);
  assert.ok((first?.irradianceRatio ?? -1) >= 0);
  assert.ok((first?.irradianceRatio ?? 2) <= 1);
  assert.deepEqual(
    first?.sunDirectionThree,
    scene.status === "ready"
      ? [
          scene.frame.sun.directionEnu.east,
          scene.frame.sun.directionEnu.up,
          -scene.frame.sun.directionEnu.north,
        ]
      : undefined,
  );
});

test("semantic particle selection is deterministic, bounded and never random", () => {
  const particles = [
    { id: "photon-01", semantic: "photon", position: [0, 0, 0] },
    { id: "energy-01", semantic: "energy", position: [1, 0, 0] },
    { id: "energy-01", semantic: "energy", position: [1.5, 0, 0] },
    { id: "invalid", semantic: "data", position: [Number.NaN, 0, 0] },
    { id: "data-01", semantic: "data", position: [2, 0, 0] },
  ];
  assert.deepEqual(
    selectSemanticParticles(particles, 3).map((particle) => particle.id),
    ["photon-01", "energy-01", "data-01"],
  );
  assert.equal(PARTICLE_BUDGET_BY_QUALITY.scientific, 48);
  assert.equal(PARTICLE_BUDGET_BY_QUALITY.balanced, 128);
  assert.equal(PARTICLE_BUDGET_BY_QUALITY.cinematic, 256);
});

test("the non-WebGL fallback preserves scientific meaning in semantic HTML", () => {
  const html = renderToStaticMarkup(
    createElement(ScientificRendererFallback, {
      id: "helios-test",
      title: "Linked solar state",
      summary: "Authoritative HTML remains available without WebGL.",
      facts: [
        { label: "Solar elevation", value: "38.2", unit: "deg" },
        { label: "Data quality", value: "96", unit: "%" },
      ],
    }),
  );
  assert.match(html, /aria-labelledby="helios-test-title"/);
  assert.match(html, /Solar elevation/);
  assert.match(html, /38.2 deg/);
  assert.match(html, /Data quality/);
  assert.doesNotMatch(html, /canvas/i);
});
