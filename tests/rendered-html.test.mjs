import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { POST as simulate } from "../app/api/v1/simulate/route.ts";
import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import { buildBatteryEnergyFlowFrameV1 } from "../features/visual-computing/build-battery-energy-flow-frame.ts";
import { deriveBatteryEnergyFlowView } from "../features/visual-computing/battery-energy-flow-view.ts";
import { buildSunlitFrame } from "../features/sunlit-observatory/build-frame.ts";

const root = new URL("../", import.meta.url);

function manifestClosure(manifest, entryKeys) {
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    const entry = manifest[key];
    assert.ok(entry, `missing manifest entry: ${key}`);
    visited.add(key);
    for (const dependency of entry.imports ?? []) visit(dependency);
  };
  for (const key of entryKeys) visit(key);
  return visited;
}

async function closureSize(manifest, entryKeys, excludedKeys = new Set()) {
  const closure = manifestClosure(manifest, entryKeys);
  let bytes = 0;
  for (const key of closure) {
    if (excludedKeys.has(key)) continue;
    const entry = manifest[key];
    const asset = new URL(`../dist/client/${entry.file}`, import.meta.url);
    bytes += (await stat(asset)).size;
  }
  return bytes;
}

test("simulation API returns a complete, labelled and reproducible annual result", { timeout: 30_000 }, async () => {
  const response = await simulate(new Request("http://local.test/api/v1/simulate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "test-simulate-0001" },
    body: JSON.stringify({ config: { array: { capacityKwDc: 48, tiltDeg: 31, azimuthDeg: 178 } } }),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-request-id"), "test-simulate-0001");
  const payload = await response.json();
  assert.equal(payload.apiVersion, "v1");
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "simulated");
  assert.equal(payload.data.hourly.length, 8760);
  assert.equal(payload.data.monthly.length, 12);
  assert.equal(payload.data.config.array.capacityKwDc, 48);
  assert.ok(payload.data.summary.annualGenerationKWh > 0);
  assert.ok(payload.data.summary.p10GenerationKWh <= payload.data.summary.p90GenerationKWh);
  assert.match(payload.meta.resultId, /^sim_/);
  assert.match(payload.meta.guaranteeNotice, /not guaranteed/i);
  for (const field of ["provider", "modelName", "resolution", "units", "dataQuality", "calculationVersion", "assumptions", "uncertainty"]) {
    assert.ok(field in payload.meta, `missing scientific result metadata: ${field}`);
  }
});

test("simulation API rejects invalid engineering bounds", async () => {
  const response = await simulate(new Request("http://local.test/api/v1/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ config: { array: { capacityKwDc: -3 } } }),
  }));
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_QUERY");
});

test("Instrument 06 renders its canonical ledger and limitations without WebGL", async () => {
  // Node does not load CSS modules. Stub only this stylesheet; the actual
  // component, formatter, canonical frame, and React renderer execute intact.
  const stylesheetUrl = new URL("../components/observatory/Observatory.module.css", import.meta.url).href;
  register(`data:text/javascript,${encodeURIComponent(`
    export async function load(url, context, nextLoad) {
      if (url === ${JSON.stringify(stylesheetUrl)}) {
        return { format: "module", shortCircuit: true, source: "export default {};" };
      }
      return nextLoad(url, context);
    }
  `)}`, import.meta.url);
  const { BatteryEnergyFlowReadout } = await import("../components/observatory/BatteryEnergyFlowReadout.tsx");
  const frame = buildBatteryEnergyFlowFrameV1({
    snapshot: buildOperatingSnapshot(),
    resultId: "sim_i06_html_release",
    selectedIndex: 8_759,
    lifecycle: "SIMULATED",
  });
  const result = deriveBatteryEnergyFlowView(frame);
  assert.equal(result.status, "ready");
  const html = renderToStaticMarkup(createElement(BatteryEnergyFlowReadout, {
    limitationId: "i06-release-limitations",
    view: result.view,
  }));

  assert.match(html, /SIMULATED greedy self-consumption dispatch/);
  assert.match(html, /data-live-control="false"/);
  assert.match(html, /data-measured-telemetry="false"/);
  assert.match(html, /UTC · index 8759 · 3600 seconds/);
  assert.match(html, /<caption>Logical energy-allocation routes for the linked record and UTC day<\/caption>/);
  assert.equal((html.match(/scope="row"/g) ?? []).length, 6);
  const energyFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 });
  for (const route of result.view.spatial.routes) {
    assert.ok(html.includes(
      `<th scope="row">${route.label}</th><td>${energyFormat.format(route.linkedIntervalEnergyKWh)} kWh / 1h</td><td>${energyFormat.format(route.linkedDayEnergyKWh)} kWh / day</td>`,
    ), `${route.id} must display the canonical linked-record and day values`);
  }
  assert.match(html, /kWh \/ 1h/);
  assert.match(html, /kWh \/ day/);
  assert.match(html, /PV \/ demand \/ SOC balance residual/);
  assert.match(html, /Generation retained on site/);
  assert.match(html, /Local supply delivered to load/);
  assert.match(html, /not a lifetime or warranty prediction/);
  assert.match(html, /evidence:sim_i06_html_release:annual.energy-ledger/);
  assert.match(html, /aria-labelledby="i06-release-limitations-title"/);
  assert.equal((html.match(/<li>/g) ?? []).length, 11);
  assert.match(html, /BMS voltage, current, temperature, and alarms/);
  assert.match(html, /separate client screening calculation/);
  assert.doesNotMatch(html, /NaN|Infinity|Invalid Date|<canvas\b/);
});

test("Sunlit views render canonical UTC evidence and usable scene fallbacks without WebGL", async () => {
  const stylesheets = [
    "../components/sunlit/SunlitObservatory.module.css",
    "../components/sunlit/SunlitScene.module.css",
    "../components/hero/HeliosHero.module.css",
  ].map((path) => new URL(path, import.meta.url).href);
  register(`data:text/javascript,${encodeURIComponent(`
    const stylesheets = new Set(${JSON.stringify(stylesheets)});
    export async function load(url, context, nextLoad) {
      if (stylesheets.has(url)) {
        return { format: "module", shortCircuit: true, source: "export default {};" };
      }
      return nextLoad(url, context);
    }
  `)}`, import.meta.url);
  const [{ default: SunlitScene }, { SunlitObservatory }, { SolarExperience }] = await Promise.all([
    import("../components/sunlit/SunlitScene.tsx"),
    import("../components/sunlit/SunlitObservatory.tsx"),
    import("../components/hero/SolarExperience.tsx"),
  ]);
  const snapshot = buildOperatingSnapshot();
  const frame = buildSunlitFrame({ snapshot, resultId: "sim_sunlit_html_release", selectedIndex: 544 });
  const hour = frame.hours.find((candidate) => candidate.index === frame.initialIndex);
  for (const mode of ["overview", "array", "battery"]) {
    const html = renderToStaticMarkup(createElement(SunlitScene, {
      mode, hour, array: frame.array, battery: frame.battery, reducedMotion: true,
    }));
    assert.match(html, new RegExp(`data-sunlit-scene="${mode}"`));
    assert.match(html, /data-scene-renderer="simplified"/);
    assert.match(html, /<svg[^>]+role="img"[^>]+aria-label=/);
    assert.doesNotMatch(html, /NaN|Infinity|Invalid Date|<canvas\b/);
    if (mode === "array") {
      assert.ok(html.includes(`Array orientation schematic, ${hour.arrayTiltDeg} degree tilt and ${hour.arrayAzimuthDeg} degree azimuth`));
      assert.match(html, /Below horizon/);
    }
    if (mode === "battery") {
      assert.ok(html.includes(`Battery contains ${hour.batterySocKWh.toFixed(2)} of ${frame.battery.capacityKWh} kilowatt-hours`));
      assert.ok(html.includes(`${Math.round(hour.batterySocKWh / frame.battery.capacityKWh * 100)} percent stored`));
    }
  }
  const disabledBattery = renderToStaticMarkup(createElement(SunlitScene, {
    mode: "battery", hour: { ...hour, batterySocKWh: 0 }, array: frame.array,
    battery: { capacityKWh: 0, maxSocFraction: frame.battery.maxSocFraction }, reducedMotion: true,
  }));
  assert.match(disabledBattery, /0 percent stored/);
  assert.doesNotMatch(disabledBattery, /NaN|Infinity/);

  const html = renderToStaticMarkup(createElement(SolarExperience, {
    hero: createElement(SunlitObservatory, { initialFrame: frame }),
    application: createElement("div", null, "Analytical workspace"),
  }));
  assert.match(html, /aria-label="Sunlit solar observatory"/);
  assert.match(html, /value="2026-01-23"/);
  assert.match(html, /dateTime="2026-01-23T16:30:00.000Z"/i);
  assert.match(html, /16:30 UTC/);
  assert.match(html, /Daylight record/);
  assert.match(html, /min="0" max="23"[^>]+value="16"/);
  for (const label of ["Observation settings", "Play hourly replay", "Previous observation day", "Next observation day"]) {
    assert.ok(html.includes(`aria-label="${label}"`));
  }
  assert.match(html, /data-sios-application-active="false"/);
  assert.doesNotMatch(html, /NaN|Infinity|Invalid Date|<canvas\b/);
});

test("the daylight dashboard renders all fourteen full workspace names with one current destination", async () => {
  const stylesheets = [
    "../components/solar-os/sunlit-workspace.css",
    "../components/solar-os/sunlit-navigation.css",
    "../components/solar-os/assessment-evidence.css",
    "../components/hero/HeliosHero.module.css",
  ].map((path) => new URL(path, import.meta.url).href);
  register(`data:text/javascript,${encodeURIComponent(`
    const stylesheets = new Set(${JSON.stringify(stylesheets)});
    export async function load(url, context, nextLoad) {
      if (stylesheets.has(url)) {
        return { format: "module", shortCircuit: true, source: "export default {};" };
      }
      return nextLoad(url, context);
    }
  `)}`, import.meta.url);
  const [{ SolarOperatingSystem }, { WORKSPACES }] = await Promise.all([
    import("../components/solar-os/SolarOperatingSystem.tsx"),
    import("../components/solar-os/workspaces.tsx"),
  ]);
  const html = renderToStaticMarkup(createElement(SolarOperatingSystem, { snapshot: buildOperatingSnapshot() }));
  assert.match(html, /data-theme="daylight"/);
  assert.match(html, /data-active-workspace="AF"/);
  assert.match(html, /data-selected-index="4116"/);
  assert.match(html, /aria-label="Switch to observatory theme"/);
  assert.match(html, /class="solar-os [^"]*inspector-hidden"/);
  const navigation = html.match(/<nav\b[^>]*aria-label="Solar operating system workspaces"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(navigation, "the rendered dashboard must expose its workspace navigation landmark");
  const buttons = [...navigation.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length, 14);
  assert.equal(buttons.filter(([, attributes]) => attributes.includes('aria-current="page"')).length, 1);
  for (const workspace of WORKSPACES) {
    const matches = buttons.filter(([, attributes]) => attributes.includes(`data-testid="workspace-nav-${workspace.id}"`));
    assert.equal(matches.length, 1, `${workspace.id} must appear once in navigation`);
    const [, attributes, content] = matches[0];
    assert.ok(content.includes(renderToStaticMarkup(createElement("span", null, workspace.name))), `${workspace.id} must display its full name, not only its abbreviation`);
    assert.ok(attributes.includes(`, ${workspace.status.toLowerCase()}"`), `${workspace.id} must retain its accessible lifecycle label`);
    assert.equal(attributes.includes('aria-current="page"'), workspace.id === "AF");
    assert.doesNotMatch(attributes, /\bdisabled(?:=|\s|$)/, "planned workspaces must remain reachable for their honest status boundary");
  }
});

test("application source contains the complete mission shell and honest status boundary", async () => {
  const [
    page,
    layout,
    shell,
    workspaces,
    css,
    manifest,
    heliosCanvas,
    heliosRenderer,
    heliosCamera,
    particleSystem,
    particleModel,
    rendererPolicy,
    rendererFallback,
    hero,
    heroEntry,
    heroVisual,
    experience,
    heroCss,
    heroPanelsCss,
    heroVisualCss,
    heroScene,
    observatoryScene,
    heliosFrameRuntime,
    observatoryCameraController,
    heliosCore,
    solarBody,
    postProcessing,
    digitalTwinInstrument,
    atmosphericInstrument,
    atmosphericPrimitives,
    annualEnergyInstrument,
    arrayEngineeringInstrument,
    scenarioComparisonInstrument,
    batteryEnergyFlowInstrument,
    instrumentManager,
    observatoryReadout,
    atmosphericReadout,
    annualEnergyReadout,
    arrayEngineeringReadout,
    scenarioComparisonReadout,
    batteryEnergyFlowReadout,
    atmosphericFrameBuilder,
    atmosphericView,
    annualEnergyFrameBuilder,
    annualEnergyView,
    arrayEngineeringFrameBuilder,
    arrayEngineeringView,
    scenarioComparisonFrameBuilder,
    scenarioComparisonView,
    batteryEnergyFlowFrameBuilder,
    batteryEnergyFlowView,
    scenarioModel,
    activation,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/solar-os/SolarOperatingSystem.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/solar-os/workspaces.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/site.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosCanvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosCanvasRenderer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosCamera.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/ParticleSystem.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/particle-model.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/renderer-policy.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/ScientificRendererFallback.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/HeliosHero.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/HeliosHeroEntry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/HeliosHeroVisual.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/SolarExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/HeliosHero.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/HeliosHeroPanels.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/hero/HeliosHeroVisual.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosHeroScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/ObservatorySceneManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosFrameRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/ObservatoryCameraController.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosCore.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/SolarBody.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/HeliosPostProcessing.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/SolarDigitalTwinInstrument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/AtmosphericObservationInstrument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/AtmosphericObservationPrimitives.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/AnnualEnergyInstrument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/ArrayEngineeringInstrument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/ScenarioComparisonInstrument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/instruments/BatteryEnergyFlowInstrument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/3d/ObservatoryInstrumentManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/observatory/ObservatoryReadout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/observatory/AtmosphericObservationReadout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/observatory/AnnualEnergyReadout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/observatory/ArrayEngineeringReadout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/observatory/ScenarioComparisonReadout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/observatory/BatteryEnergyFlowReadout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/build-atmospheric-observation-frame.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/atmospheric-observation-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/build-annual-energy-frame.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/annual-energy-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/build-array-engineering-frame.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/array-engineering-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/build-scenario-comparison-frame.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/scenario-comparison-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/build-battery-energy-flow-frame.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/visual-computing/battery-energy-flow-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/solar-os/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/application-activation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /buildOperatingSnapshot/);
  assert.match(page, /buildRepresentativeHeroScene/);
  assert.match(page, /buildAtmosphericObservationFrameV1/);
  assert.match(page, /buildAnnualEnergyFrameV1/);
  assert.match(page, /buildArrayEngineeringFrameV1/);
  assert.match(page, /buildScenarioComparisonFrameV1/);
  assert.match(page, /buildBatteryEnergyFlowFrameV1/);
  assert.match(page, /snapshot:\s*operatingSnapshot/);
  assert.match(page, /selectedIndex:\s*HERO_LINKED_HOUR_INDEX/);
  assert.match(page, /<SolarExperience/);
  assert.match(layout, /Solar Intelligence Operating System/);
  assert.match(shell, /SOLAR INTELLIGENCE/);
  assert.match(shell, /MISSION INTELLIGENCE/);
  assert.match(shell, /MissionLedger/);
  assert.doesNotMatch(shell, /chat bubble|typing indicator|prompt the assistant/i);
  assert.match(shell, /ESTIMATES ARE NOT GUARANTEED PRODUCTION/);
  assert.match(shell, /OFFLINE \/ SAMPLE ACTIVE/);
  const navigation = await readFile(new URL("../components/solar-os/WorkspaceNavigation.tsx", import.meta.url), "utf8");
  assert.match(shell, /<WorkspaceNavigation/);
  assert.match(navigation, /aria-label="Solar operating system workspaces"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width:\s*720px/);
  assert.doesNotMatch(`${page}\n${layout}`, /Your site is taking shape|SkeletonPreview/);
  const workspaceIds = [...workspaces.matchAll(/id:\s*"([A-Z]{2})"/g)].map((match) => match[1]);
  assert.equal(new Set(workspaceIds).size, 14);
  assert.match(workspaces, /IMPLEMENTED|implemented/);
  assert.match(workspaces, /EXPERIMENTAL|experimental/);
  assert.match(workspaces, /PLANNED|planned/);
  assert.match(workspaces, /MissionObjectTarget/);
  assert.match(manifest, /Solar Intelligence Operating System/);
  assert.match(heliosCanvas, /lazy\(\s*\(\)\s*=>\s*import\("\.\/HeliosCanvasRenderer"\)/);
  assert.match(heliosCanvas, /data-helios-fallback/);
  assert.match(heliosRenderer, /frameloop=\{policy\.frameloop\}/);
  assert.match(heliosRenderer, /onContextLost/);
  assert.match(heliosRenderer, /WebGL2RenderingContext/);
  assert.match(heliosRenderer, /ACESFilmicToneMapping/);
  assert.match(heliosCamera, /useThree/);
  assert.doesNotMatch(heliosCamera, /@react-three\/drei|makeDefault/);
  assert.match(rendererPolicy, /prefers-reduced-motion|reducedMotion/);
  assert.match(rendererPolicy, /forced-colors|forcedColors/);
  assert.match(rendererPolicy, /mode:\s*"suspended"/);
  assert.match(rendererFallback, /data-scientific-renderer-fallback/);
  const heroSource = `${hero}\n${heroEntry}`;
  assert.match(heroSource, /Solar Intelligence Operating System/);
  assert.match(
    heroSource,
    /Reveal the invisible journey of sunlight—from photon to power/,
  );
  assert.match(heroSource, />\s*Begin Observation\s*</);
  assert.match(heroSource, />\s*Project Overview\s*</);
  assert.match(heroSource, /Effective plane-of-array irradiance/);
  assert.match(heroSource, /Dataset/);
  assert.match(heroSource, /Calculation/);
  assert.match(heroSource, /procedural explanatory visualizations/);
  assert.doesNotMatch(heroSource, /CONNECTED|SYSTEM READY/);
  assert.match(experience, /data-helios-intro-active/);
  assert.match(experience, /inert=\{!heroComplete\}/);
  assert.match(experience, /#primary-stage/);
  assert.match(shell, /data-sios-application-active='true'/);
  assert.match(heroVisual, /lazy\(\s*\(\)\s*=>\s*import\("@\/components\/3d\/HeliosHeroScene"\)/);
  assert.match(heroVisual, /@\/components\/3d\/HeliosCanvas/);
  assert.match(
    heroVisual,
    /LazyBatteryEnergyFlowInstrumentType\s*=\s*lazy\(\s*\(\)\s*=>\s*import\("@\/components\/3d\/instruments\/BatteryEnergyFlowInstrument"\)/,
  );
  assert.doesNotMatch(heroVisual, /components\/3d["']/);
  assert.match(heroCss, /max-width:\s*1024px/);
  assert.match(heroCss, /max-width:\s*640px/);
  assert.match(
    `${heroCss}\n${heroPanelsCss}\n${heroVisualCss}`,
    /prefers-reduced-motion/,
  );
  assert.match(heroScene, /ObservatorySceneManager/);
  assert.match(
    observatoryCameraController,
    /gsap\.timeline\(\{\s*paused:\s*true\s*\}\)/,
  );
  assert.equal(
    (
      `${heroScene}\n${observatoryScene}`.match(/useFrame\(/g) ?? []
    ).length,
    1,
  );
  assert.match(heliosFrameRuntime, /coreRingApertureScale/);
  assert.match(heliosCore, /helios-engraved-index-marks/);
  assert.match(solarBody, /plasmaFbm/);
  assert.doesNotMatch(solarBody, /TextureLoader|https?:\/\//);
  assert.match(postProcessing, /Bloom/);
  assert.match(postProcessing, /N8AO/);
  assert.match(postProcessing, /Vignette/);
  assert.match(digitalTwinInstrument, /configured-orientation-logical-system-schematic/);
  assert.match(digitalTwinInstrument, /physicalReplica:\s*false/);
  assert.doesNotMatch(digitalTwinInstrument, /<(?:table|button|input|canvas)\b/i);
  assert.match(
    atmosphericInstrument,
    /linked-hour-atmospheric-transfer-schematic/,
  );
  assert.match(atmosphericInstrument, /causalityClaim:\s*false/);
  assert.match(atmosphericInstrument, /cloudMotionEncoding:\s*"none"/);
  assert.match(atmosphericInstrument, /windDirectionEncoding:\s*"none"/);
  assert.match(
    atmosphericInstrument,
    /measuredPlantOutputClaim:\s*false/,
  );
  assert.match(
    atmosphericPrimitives,
    /coverage-screen-glyph-not-observed-cloud-geometry/,
  );
  assert.doesNotMatch(
    `${atmosphericInstrument}\n${atmosphericPrimitives}`,
    /<(?:table|button|input|canvas)\b/i,
  );
  assert.match(annualEnergyInstrument, /annual-energy-observatory-instrument/);
  assert.match(annualEnergyInstrument, /instanceCount|8_760/);
  assert.match(annualEnergyInstrument, /meteorological-season/);
  assert.doesNotMatch(
    annualEnergyInstrument,
    /<(?:table|button|input|canvas)\b|\buseFrame\s*\(/i,
  );
  assert.match(
    arrayEngineeringInstrument,
    /solar-array-engineering-instrument/,
  );
  assert.match(
    arrayEngineeringInstrument,
    /normalized-aperture-not-module-geometry/,
  );
  assert.match(arrayEngineeringInstrument, /capacityAreaEncoding:\s*"none"/);
  assert.match(arrayEngineeringInstrument, /shadowClaim:\s*false/);
  assert.doesNotMatch(
    arrayEngineeringInstrument,
    /<(?:table|button|input|canvas)\b|\buseFrame\s*\(/i,
  );
  assert.match(
    scenarioComparisonInstrument,
    /normalized-parallel-deterministic-comparison-chambers/,
  );
  assert.match(
    scenarioComparisonInstrument,
    /signed-delta-normalized-to-largest-absolute-delta/,
  );
  assert.match(
    scenarioComparisonInstrument,
    /physicalWeatherGeometry/,
  );
  assert.match(
    scenarioComparisonInstrument,
    /probabilityEncoding/,
  );
  assert.doesNotMatch(
    scenarioComparisonInstrument,
    /<(?:table|button|input|canvas)\b|\buseFrame\s*\(/i,
  );
  assert.match(batteryEnergyFlowInstrument, /normalized-logical-energy-allocation/);
  assert.match(batteryEnergyFlowInstrument, /gridIntertieCount:\s*1/);
  assert.match(batteryEnergyFlowInstrument, /configured-operating-soc-band/);
  assert.match(batteryEnergyFlowInstrument, /linked-utc-day-accumulated-energy/);
  assert.match(batteryEnergyFlowInstrument, /animatedParticles:\s*false/);
  assert.match(batteryEnergyFlowInstrument, /scientificAuthority:\s*"linked-html-energy-ledger"/);
  assert.doesNotMatch(
    batteryEnergyFlowInstrument,
    /<(?:table|button|input|canvas)\b|\b(?:useFrame|useThree|requestAnimationFrame|setInterval|setTimeout|invalidate)\s*\(|Math\.random|Date\.now|TextureLoader|useTexture|ParticleSystem|castShadow|receiveShadow|EffectComposer|OrbitControls/i,
    "Instrument 06 must remain a static presentation consumer without another renderer, clock, or interaction owner",
  );
  assert.match(
    instrumentManager,
    /"atmospheric-observation"[\s\S]*AtmosphericObservationInstrument/,
  );
  assert.match(
    instrumentManager,
    /"annual-energy-observatory"[\s\S]*AnnualEnergyInstrument/,
  );
  assert.match(
    instrumentManager,
    /"solar-array-engineering"[\s\S]*ArrayEngineeringInstrument/,
  );
  assert.match(
    instrumentManager,
    /ScenarioComparisonInstrument:\s*LazyScenarioComparisonInstrument/,
  );
  assert.match(
    instrumentManager,
    /BatteryEnergyFlowInstrument:\s*LazyBatteryEnergyFlowInstrument/,
  );
  assert.match(
    instrumentManager,
    /if \(key === "battery-energy-flow"\)\s*\{[\s\S]*?result\?\.status === "ready"\s*&& presentation\.presence !== "absent"[\s\S]*?<BatteryEnergyFlowInstrument/,
    "Instrument 06 must not mount or load its spatial chunk before its position is reached",
  );
  assert.match(
    instrumentManager,
    /presentation\.presence !== "absent"/,
  );
  assert.match(observatoryReadout, /Open Solar Digital Twin workspace/);
  assert.match(
    observatoryReadout,
    /Open Weather and Atmosphere workspace/,
  );
  assert.match(
    observatoryReadout,
    /deriveAtmosphericObservationView/,
  );
  assert.match(observatoryReadout, /deriveAnnualEnergyView/);
  assert.match(observatoryReadout, /deriveArrayEngineeringView/);
  assert.match(observatoryReadout, /deriveScenarioComparisonView/);
  assert.match(observatoryReadout, /deriveBatteryEnergyFlowView/);
  assert.match(observatoryReadout, /Open Battery & Energy-Flow workspace/);
  assert.match(observatoryReadout, /batteryEnergyFlowView\.status === "ready"/);
  assert.match(
    observatoryReadout,
    /Open Annual Energy Forecast workspace/,
  );
  assert.match(
    observatoryReadout,
    /Open Solar Array Engineering controls/,
  );
  assert.match(
    observatoryReadout,
    /Open Scenario & Resilience workspace/,
  );
  assert.match(observatoryReadout, /Linked time/);
  assert.match(observatoryReadout, /GHI \/ effective POA/);
  assert.match(observatoryReadout, /dataset/);
  assert.match(observatoryReadout, /physical module layout, terrain/);
  assert.match(atmosphericReadout, /Cloud \/ humidity/);
  assert.match(atmosphericReadout, /Wind speed \/ temperature/);
  assert.match(atmosphericReadout, /GHI \/ DNI \/ DHI/);
  assert.match(
    atmosphericReadout,
    /co-variation is not proof of instant causality/,
  );
  assert.match(
    atmosphericReadout,
    /does not claim live synchronization\s+or instant cloud-to-power causality/,
  );
  assert.match(annualEnergyReadout, /8,760/);
  assert.match(annualEnergyReadout, /Winter/);
  assert.match(annualEnergyReadout, /Spring/);
  assert.match(annualEnergyReadout, /Summer/);
  assert.match(annualEnergyReadout, /Autumn/);
  assert.match(
    annualEnergyReadout,
    /not a calibrated\s+probabilistic forecast interval/i,
  );
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
  for (const fact of [
    /SIMULATED greedy self-consumption dispatch/,
    /PV AC generation \/ on-site demand/,
    /Battery charge input \/ discharge to load/,
    /Battery SOC start \/ after self-discharge \/ end/,
    /PV \/ demand \/ SOC balance residual/,
    /Generation retained on site/,
    /Local supply delivered to load/,
    /Equivalent-full-cycle throughput proxy/,
    /kWh \/ 1h/,
    /view\.provenance\.evidenceRefIds/,
    /Unavailable and not synthesized/,
    /BMS voltage, current, temperature, and alarms/,
    /State of health, degradation, warranty use, and lifetime/,
  ]) {
    assert.match(batteryEnergyFlowReadout, fact);
  }
  assert.match(batteryEnergyFlowReadout, /<table\b/);
  assert.match(batteryEnergyFlowReadout, /<caption>/);
  assert.match(batteryEnergyFlowReadout, /scope="row"/);
  assert.match(batteryEnergyFlowReadout, /scope="col"/);
  assert.match(batteryEnergyFlowReadout, /aria-labelledby=\{limitationTitleId\}/);
  assert.match(batteryEnergyFlowReadout, /modified branch is a separate client screening calculation/);
  assert.match(
    atmosphericFrameBuilder,
    /temporalBasis:\s*"coincident-one-hour-interval"/,
  );
  assert.match(atmosphericFrameBuilder, /causalityClaim:\s*false/);
  assert.match(
    atmosphericFrameBuilder,
    /measuredOrLivePlantOutput:\s*unavailable/,
  );
  assert.match(
    atmosphericFrameBuilder,
    /no measured or live plant telemetry is attached/i,
  );
  assert.match(
    atmosphericView,
    /frame\.relationship\.causalityClaim === false/,
  );
  assert.match(
    annualEnergyFrameBuilder,
    /recordCount:\s*ANNUAL_ENERGY_RECORD_COUNT/,
  );
  assert.match(
    annualEnergyFrameBuilder,
    /calibratedProbabilisticInterval:\s*false/,
  );
  assert.match(annualEnergyFrameBuilder, /forecastGuarantee:\s*false/);
  assert.match(annualEnergyView, /ANNUAL_ENERGY_RECORD_COUNT/);
  assert.match(
    arrayEngineeringFrameBuilder,
    /arrayConfigurationAffectsSunPath:\s*false/,
  );
  assert.match(
    arrayEngineeringFrameBuilder,
    /authoritativeServerRecalculationRequired:\s*true/,
  );
  assert.match(
    arrayEngineeringFrameBuilder,
    /bankableYieldAssessment:\s*false/,
  );
  assert.match(
    arrayEngineeringView,
    /ARRAY_ENGINEERING_LINKED_DAY_SAMPLE_COUNT/,
  );
  assert.match(
    scenarioComparisonFrameBuilder,
    /evaluateConfiguredStressComparison/,
  );
  assert.match(
    scenarioComparisonFrameBuilder,
    /independentProbabilitiesAvailable:\s*false/,
  );
  assert.match(
    scenarioComparisonFrameBuilder,
    /stormDamageAndStructuralRisk:\s*unavailable/,
  );
  assert.match(
    scenarioComparisonView,
    /validScenarioComparisonFrame/,
  );
  assert.match(batteryEnergyFlowFrameBuilder, /dispatchEnergy/);
  assert.match(batteryEnergyFlowFrameBuilder, /measuredTelemetry:\s*false/);
  assert.match(batteryEnergyFlowFrameBuilder, /liveControl:\s*false/);
  assert.match(batteryEnergyFlowFrameBuilder, /tariffOptimized:\s*false/);
  assert.match(batteryEnergyFlowFrameBuilder, /intervalBoundaryAttribution:\s*"unavailable"/);
  assert.match(batteryEnergyFlowView, /validBatteryEnergyFlowFrame/);
  assert.match(scenarioModel, /if \(scenarioEquals\(base\.config, scenario\)\)\s*\{\s*return\s*\{\s*hours: base\.hours,\s*months: base\.months,\s*summary: base\.summary,/);
  assert.match(shell, /resultForScenario\(base, scenario\)/);
  assert.match(workspaces, /id=\{linked \? "battery-linked-interval" : undefined\}/);
  assert.match(workspaces, /aria-current=\{linked \? "time" : undefined\}/);
  assert.match(workspaces, /tabIndex=\{linked \? 0 : -1\}/);
  assert.match(workspaces, /onKeyDown=\{\(event\) => moveInterval\(event, offset\)\}/);
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    assert.ok(workspaces.includes(`key === "${key}"`));
  }
  assert.match(workspaces, /grid import[\s\S]*kilowatt-hours in this one-hour record; grid export/);
  assert.match(activation, /workspaceId:\s*"DT"/);
  assert.match(activation, /workspaceId:\s*"WA"/);
  assert.match(activation, /workspaceId:\s*"AF"/);
  assert.match(activation, /source:\s*"observatory-instrument-02"/);
  assert.match(activation, /source:\s*"observatory-instrument-03"/);
  assert.match(activation, /workspaceId:\s*"AE"/);
  assert.match(activation, /source:\s*"observatory-instrument-04"/);
  assert.match(activation, /workspaceId:\s*"SR"/);
  assert.match(activation, /source:\s*"observatory-instrument-05"/);
  assert.match(activation, /workspaceId:\s*"BE"/);
  assert.match(activation, /source:\s*"observatory-instrument-06"/);
  assert.match(activation, /kind:\s*"focus-linked-battery-interval"/);
  assert.match(activation, /focusTargetId:\s*"battery-linked-interval"/);
  assert.match(activation, /workspaceId: target\.workspaceId,\s*selectedIndex,/);
  assert.match(shell, /const acknowledgeActivation = solarExperience\?\.acknowledgeApplicationActivation/);
  assert.match(shell, /selectedIndex !== safeIndex[\s\S]*acknowledgeActivation\?\.\(activationRequest\)/);
  assert.match(activation, /focusTargetId:\s*"scenario-dc-capacity"/);
  assert.doesNotMatch(
    `${heliosCanvas}\n${heliosRenderer}\n${heliosCamera}\n${particleSystem}\n${heroScene}\n${observatoryScene}\n${observatoryCameraController}`,
    /OrbitControls|Math\.random|Date\.now/i,
  );
  assert.doesNotMatch(`${particleSystem}\n${particleModel}`, /Math\.random/);
});

test("production output, migration, hosting bindings and worker safeguards are present", async () => {
  const [assets, hosting, worker, migration, buildManifestRaw] = await Promise.all([
    readdir(new URL("../dist/client/assets/", import.meta.url)),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_wealthy_johnny_storm.sql", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/.vite/manifest.json", import.meta.url), "utf8"),
  ]);
  assert.ok(assets.some((name) => name.startsWith("SolarOperatingSystem-") && name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
  const hostingConfig = JSON.parse(hosting);
  assert.match(hostingConfig.project_id, /^appgprj_[a-z0-9]+$/, "Sites project identity must be persisted after creation");
  assert.deepEqual({ d1: hostingConfig.d1, r2: hostingConfig.r2 }, { d1: "DB", r2: "SNAPSHOTS" });
  assert.match(worker, /runScheduledIngestion/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Permissions-Policy/);
  assert.ok((migration.match(/CREATE TABLE/gi) ?? []).length >= 12);
  await access(new URL("../dist/server/index.js", import.meta.url));
  const buildManifest = JSON.parse(buildManifestRaw);
  const shellEntryKey = "components/solar-os/SolarOperatingSystem.tsx";
  const heroVisualEntryKey = "components/hero/HeliosHeroVisual.tsx";
  const rendererEntryKey = "components/3d/HeliosCanvasRenderer.tsx";
  const sceneEntryKey = "components/3d/HeliosHeroScene.tsx";
  const scenarioComparisonEntryKey =
    "components/3d/instruments/ScenarioComparisonInstrument.tsx";
  const batteryEnergyFlowEntryKey =
    "components/3d/instruments/BatteryEnergyFlowInstrument.tsx";
  const sunlitEntryKey = "components/sunlit/SunlitObservatory.tsx";
  const sunlitSceneEntryKey = "components/sunlit/SunlitScene.tsx";
  for (const key of [
    shellEntryKey,
    heroVisualEntryKey,
    rendererEntryKey,
    sceneEntryKey,
    scenarioComparisonEntryKey,
    batteryEnergyFlowEntryKey,
    sunlitEntryKey,
    sunlitSceneEntryKey,
  ]) {
    assert.ok(buildManifest[key], `missing production entry: ${key}`);
  }
  assert.deepEqual(
    new Set(buildManifest[heroVisualEntryKey].dynamicImports),
    new Set([
      rendererEntryKey,
      sceneEntryKey,
      scenarioComparisonEntryKey,
      batteryEnergyFlowEntryKey,
    ]),
  );

  const clientBundle = assets.find((name) => name.startsWith("SolarOperatingSystem-") && name.endsWith(".js"));
  const bundleStat = await stat(new URL(`../dist/client/assets/${clientBundle}`, import.meta.url));
  assert.ok(bundleStat.size < 250_000, `workspace client module unexpectedly large: ${bundleStat.size} bytes`);
  const shellClosure = manifestClosure(buildManifest, [shellEntryKey]);
  const sunlitClosure = manifestClosure(buildManifest, [sunlitEntryKey]);
  assert.ok(buildManifest[sunlitEntryKey].dynamicImports?.includes(sunlitSceneEntryKey), "the Sunlit scene must be loaded lazily");
  assert.equal(sunlitClosure.has(sunlitSceneEntryKey), false, "the Sunlit controls must render without the spatial scene");
  assert.equal(shellClosure.has(sunlitSceneEntryKey), false, "the analytical shell must not import the Sunlit scene");
  const sunlitStylesheets = buildManifest[sunlitEntryKey].css ?? [];
  assert.ok(sunlitStylesheets.length > 0, "the Sunlit entry must include its glass styling");
  const sunlitProductionCss = await Promise.all(sunlitStylesheets.map((path) =>
    readFile(new URL(`../dist/client/${path}`, import.meta.url), "utf8"),
  ));
  // The minifier previously retained only the prefixed property, leaving
  // Chromium's standard backdropFilter as none in the deployed glass panels.
  assert.match(
    sunlitProductionCss.join("\n"),
    /(?<!-)backdrop-filter\s*:\s*blur\(/,
    "production Sunlit CSS must retain the standard glass backdrop blur",
  );
  const shellSources = await Promise.all(
    [...shellClosure].map((key) =>
      readFile(
        new URL(`../dist/client/${buildManifest[key].file}`, import.meta.url),
        "utf8",
      ),
    ),
  );
  assert.doesNotMatch(
    shellSources.join("\n"),
    /WebGLRenderer|OrbitControls|HeliosHeroScene|plasmaFbm|EffectComposer/,
    "the analytical shell static closure must not contain spatial implementation",
  );
  assert.ok(
    assets.some((name) => /^HeliosCanvasRenderer-.*\.js$/.test(name)),
    "the lazy renderer must be emitted as a separate production asset",
  );
  assert.ok(
    assets.some((name) => /^HeliosHeroScene-.*\.js$/.test(name)),
    "the lazy Hero scene must be emitted as a separate production asset",
  );
  assert.ok(
    assets.some(
      (name) => /^ScenarioComparisonInstrument-.*\.js$/.test(name),
    ),
    "Instrument 05 must be emitted as a separate reach-triggered asset",
  );
  assert.ok(
    assets.some((name) => /^BatteryEnergyFlowInstrument-.*\.js$/.test(name)),
    "Instrument 06 must be emitted as a separate reach-triggered asset",
  );

  const frameworkKey = Object.keys(buildManifest).find(
    (key) => buildManifest[key].name === "framework",
  );
  const runtimeKey = Object.keys(buildManifest).find(
    (key) => buildManifest[key].name === "rolldown-runtime",
  );
  assert.ok(frameworkKey);
  assert.ok(runtimeKey);
  const initialSpatialClosure = manifestClosure(
    buildManifest,
    [rendererEntryKey, sceneEntryKey],
  );
  assert.equal(
    initialSpatialClosure.has(scenarioComparisonEntryKey),
    false,
    "Instrument 05 must remain outside the initial spatial closure",
  );
  assert.equal(
    initialSpatialClosure.has(batteryEnergyFlowEntryKey),
    false,
    "Instrument 06 must remain outside the initial spatial closure",
  );
  assert.equal(shellClosure.has(batteryEnergyFlowEntryKey), false);
  assert.equal(
    manifestClosure(buildManifest, [heroVisualEntryKey]).has(batteryEnergyFlowEntryKey),
    false,
    "the Hero static closure must not eagerly import Instrument 06",
  );
  const scenarioComparisonUniqueBytes = await closureSize(
    buildManifest,
    [scenarioComparisonEntryKey],
    initialSpatialClosure,
  );
  assert.ok(
    scenarioComparisonUniqueBytes <= 15_000,
    `Instrument 05 reach-triggered closure exceeds its ceiling: ${scenarioComparisonUniqueBytes} bytes`,
  );
  // A static six-route schematic plus its fail-closed frame/view validator
  // gets a separate 20 kB raw ceiling. No existing spatial ceiling is raised.
  const batteryEnergyFlowUniqueBytes = await closureSize(
    buildManifest,
    [batteryEnergyFlowEntryKey],
    initialSpatialClosure,
  );
  assert.ok(
    batteryEnergyFlowUniqueBytes <= 20_000,
    `Instrument 06 reach-triggered closure exceeds its ceiling: ${batteryEnergyFlowUniqueBytes} bytes`,
  );
  const lazyCompleteBytes = await closureSize(
    buildManifest,
    [rendererEntryKey, sceneEntryKey],
  );
  const lazyIncrementalBytes = await closureSize(
    buildManifest,
    [rendererEntryKey, sceneEntryKey],
    new Set([frameworkKey, runtimeKey]),
  );
  assert.ok(
    lazyIncrementalBytes <= 1_265_000,
    `lazy Helios incremental closure exceeds its 5% ceiling: ${lazyIncrementalBytes} bytes`,
  );
  assert.ok(
    lazyCompleteBytes <= 1_465_000,
    `lazy Helios complete closure exceeds its 5% ceiling: ${lazyCompleteBytes} bytes`,
  );
});

test("continuity and scientific documentation are deliverable artifacts", async () => {
  const required = [
    "README.md", "IMPLEMENTATION_PLAN.md", "PROJECT_STATUS.md", ".env.example",
    "GOVERNANCE.md", "CONTRIBUTING.md", "CHANGELOG.md",
    "governance/README.md", "governance/departments.json", "governance/WORKSPACE_OWNERSHIP.md",
    "docs/ARCHITECTURE.md", "docs/MISSION_INTELLIGENCE.md", "docs/SCIENTIFIC_METHODS.md", "docs/MODEL_VALIDATION.md",
    "docs/DATA_PROVIDERS.md", "docs/DATA_PROVENANCE.md", "docs/RESEARCH_SPINE.md", "docs/LIMITATIONS.md",
    "docs/HELIOS_ARCHITECTURE.md", "docs/adr/0002-helios-renderer-boundary.md", "docs/adr/0003-helios-hero-integration.md", "docs/adr/0004-observatory-framework.md", "docs/adr/0005-solar-digital-twin-instrument.md", "docs/adr/0006-atmospheric-observation-instrument.md", "docs/adr/0007-annual-energy-observatory-instrument.md", "docs/adr/0008-array-engineering-instrument.md", "docs/adr/0009-scenario-comparison-instrument.md",
    "docs/adr/0010-battery-energy-flow-instrument.md",
    "docs/DEPLOYMENT.md", "docs/BACKUP_RECOVERY.md", "docs/SECURITY.md", "docs/THREAT_MODEL.md",
    ".github/CODEOWNERS", ".github/SECURITY.md", ".github/workflows/ci.yml",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
});
