# Digital Twin, Geospatial and Visual Computing

## Mission

Build truthful, performant and explorable visual models of the solar site, atmosphere, energy system and regional context. The department turns authoritative scientific state into Canvas, WebGL and geospatial representations; it never invents terrain, physics or observations to make a scene look complete.

## Current truth

- Annual Chronology, Solar Production DNA, Solar Orbital Timeline and micro-traces are implemented with theme-aware 2D Canvas.
- Canvas rendering is resize-aware, redraws with theme/font changes, caps device-pixel ratio and is event-driven rather than continuously animated.
- The current Digital Twin is a linked CSS-perspective/DOM operational scene driven by sun, cloud, generation, battery and grid values.
- The Weather field and Regional globe are CSS/DOM visualisations. Regional comparison layers are explicitly unconnected and planned.
- The lazy React Three Fiber boundary now carries the continuous Hero,
  Observatory and Instruments 01–06 through one demand-rendered canvas with
  camera, lighting, environment, adaptive DPR, context-loss containment and a
  complete HTML fallback.
- `SceneFrameV1` now preserves the linked timestamp, ENU sun direction, interval units, quality, lifecycle and provenance while keeping terrain, surveyed horizon, physical array geometry and missing radiation layers explicitly unavailable.
- The bounded `AtmosphericObservationFrameV1` preserves exact canonical
  cloud cover, humidity, wind speed, temperature, GHI, DNI, DHI, effective
  POA, modelled AC energy, quality and provenance for the same representative
  one-hour index. It is `SIMULATED` in sample mode and declares coincident
  evidence without a causal claim.
- The fail-closed `AnnualEnergyFrameV1` preserves all 8,760 unrounded canonical
  hourly modelled-AC values and quality scores, a contiguous no-leap calendar,
  reconciled monthly/seasonal/annual totals, an explicitly empirical
  four-source-year spread, provenance and unavailable-layer disclosures.
- The fail-closed `ArrayEngineeringFrameV1` preserves exact configured/resolved
  array facts, authoritative linked-hour Sun/incidence/irradiance/energy state,
  canonical loss-chain and annual summaries, provenance, the existing bounded
  screening-control boundary and explicit unavailable engineering layers.
- The fail-closed `ScenarioComparisonFrameV1` preserves one configured baseline
  and four canonical deterministic stress results, exact annual metrics and
  deltas, chronology, lifecycle, quality, provenance and ten unavailable
  layers. Its view drives the semantic HTML table and five normalized,
  nonphysical spatial chambers without assigning probability, weather
  geometry, physical dimensions or exact numerical authority to WebGL.
- The fail-closed `BatteryEnergyFlowFrameV1` replays all 8,760 canonical
  demand/dispatch records and preserves the linked record, its 24-record UTC
  day, annual ledger, constraints, residuals, quality, provenance and eleven
  unavailable layers. Its immutable view supplies bounded linked-day route
  ratios and operating-band SOC fill without changing scientific values.
- The six-ring Helios Core, procedural Sun and configured-orientation Solar
  Digital Twin topology are visible. A static, texture-free atmospheric
  transfer schematic is mounted at position 02 while Instrument 01 persists at
  reduced emphasis. An 8,760-instance annual data formation is mounted at
  position 03 while Instruments 01 and 02 persist at reduced emphasis. A
  normalized, nonphysical orientation/incidence aperture is mounted at position
  04 while Instruments 01–03 persist at reduced emphasis. Five normalized,
  nonphysical deterministic-comparison chambers are reach-triggered at position
  05 while Instruments 01–04 persist at reduced emphasis. A reached-only
  static allocation schematic with one grid intertie and bounded SOC
  reservoir is mounted at 06 while Instruments 01–05 persist. The registry
  contains six mounted entries, one placeholder at 07 and seven reserved
  positions. Source integration and release acceptance remain separate; see
  `PROJECT_STATUS.md` for current validation and deployment evidence. The application
  still has no Moon, physical WebGL site replica, module/row field, terrain
  mesh, GIS runtime, surveyed horizon model, GPU shadow mapping or satellite
  cloud layer.
- Instrument 01 is an implemented logical system visualisation at its declared
  scope. A geometrically reconstructed or physically shaded digital twin
  remains planned pending authoritative geometry.
- Instrument 02 is implemented only at its declared scalar, representative-hour
  scope. Wind direction, cloud altitude/type/geometry/motion, sub-hour response
  and measured/live plant output remain unavailable; no renderer may infer
  them from the available fields.
- Instrument 03 is implemented only as a normalized annual data formation, not
  a physical orbit, spatial generation field, measured-plant record, issued
  forecast or calibrated probabilistic interval.
- Instrument 04 is implemented only as a normalized coordinate relationship,
  not a surveyed array, module layout, named equipment model, physical shadow
  study, candidate simulation or astronomical Sun-path mutation.
- Instrument 05 is implemented only as normalized baseline-versus-stress
  comparison chambers, not parallel physical weather systems, occurrence
  probabilities, hourly stress trajectories, storm-damage modelling, measured
  plant response or an issued forecast.
- Instrument 06 is implemented only as deterministic one-hour energy
  accounting. Physical wiring, live power/telemetry, BMS state, degradation,
  autonomous or optimised control and outage/islanding response remain
  unavailable. The I05-to-I06 camera sweep is a pure progress-derived
  explanation and is omitted under reduced motion.

## Ownership boundary

The department owns:

- `components/solar-os/instruments.tsx`;
- the visual-rendering portions of Digital Twin, Weather and Regional workspaces currently in `components/solar-os/workspaces.tsx`;
- Canvas, twin, atmosphere, globe and spatial-layer styles currently in `app/globals.css`;
- `components/3d/**`, `features/visual-computing/**`, visual-performance tests and future renderer workers;
- scene contracts, coordinate systems, camera behavior, visual layers, WebGL fallbacks and accessible renderer summaries.

It does not own solar-position calculations, irradiance formulae, provider ingestion, lifecycle promotion, workspace workflow composition or design-system primitives. Terrain, horizon and array geometry must come from a versioned authoritative source or remain visibly simulated/planned.

## Interfaces

- Consume canonical solar, weather, energy-flow, quality and provenance contracts from Science and Data.
- Consume linked time, location and scenario through `OperatingUIStateV1`.
- Publish and version `SceneFrameV1` for the Helios/Solar Digital Twin context
  and bounded instrument-specific evidence contracts such as
  `AtmosphericObservationFrameV1`, `AnnualEnergyFrameV1`,
  `ArrayEngineeringFrameV1`, `ScenarioComparisonFrameV1` and
  `BatteryEnergyFlowFrameV1`. Every contract
  must preserve exact UTC
  interval semantics, lifecycle, units, quality, provenance and explicit layer
  availability without expanding shared browser transports by implication.
- Expose renderers through a stable boundary supporting lazy loading, context-loss recovery, reduced motion and a complete non-WebGL fallback.
- Emit typed selection events as `UiCommandV1` so spatial selection updates the global cursor instead of private renderer state.
- Provide Mission Intelligence with structured scene facts, stable selected-object identifiers and evidence paths, never screenshots as the sole source of truth.

## Decision authority

The department has final authority over rendering architecture, scene graph, coordinate conventions, camera controls, layer composition, visual-performance budgets and renderer fallback behavior.

Science owns the authoritative numeric input and tolerances. Experience owns shared visual tokens and accessibility presentation. Features owns which workflow exposes a renderer. Scientific Governance may block any layer whose source, status, unit or uncertainty is not visible.

## First deep-work programme

1. Preserve and extend the implemented `SceneFrameV1`, ENU axes, units, origin rules and explicit layer availability metadata.
2. Move existing Canvas instruments into dedicated modules with parity tests and no visual behavior change.
3. Preserve the implemented Hero/Observatory/Instruments 01–06 lazy renderer,
   typed exact-index `DT`/`WA`/`AF`/`AE`/`SR`/`BE` handoffs and complete HTML
   fallback. The Battery action waits for acknowledgement before focusing its
   linked interval. Complete I06 release gates before forming Instrument 07
   as a separate increment; retain fixed initial spatial ceilings.
4. Add real array geometry only after authoritative dimensions and placement
   enter a versioned scene contract; authoritative sun direction and
   camera/navigation foundations are already implemented.
5. Add terrain and horizon only from surveyed or versioned geographic inputs; label synthetic proving geometry explicitly.
6. Preserve the bounded canonical DNI/DHI values now available to Instrument
   02; add reflected and uncertainty-aware irradiance layers only when their
   own authoritative contracts exist.
7. Link replay, annotations and object selection bidirectionally with shared operating state.
8. Build a bounded regional map layer registry with provider attribution, timestamp, resolution, quality and caching status.
9. Add performance governance, GPU-context recovery, reduced-motion behavior and structured accessible equivalents.

## Definition of done

- Rendered sun elevation and azimuth agree with Solar Engine outputs within 0.25 degrees.
- No terrain, obstruction, array dimension or regional value is presented as measured unless provenance proves it.
- Every layer exposes units, provider/source, timestamp, quality, uncertainty and lifecycle.
- WebGL-disabled and context-loss states preserve all analytical functionality through a structured 2D/DOM fallback.
- The render loop sleeps when state is unchanged and stops under reduced-motion requirements where animation is nonessential.
- The renderer is dynamically imported and does not inflate the base shell beyond its budget.
- Keyboard and screen-reader users receive equivalent selections and data descriptions.
- Scene snapshots are deterministic for a versioned `SceneFrameV1` fixture.
- Cross-layer selections update the shared timestamp/location without drift.

## Measures

- Sun-vector parity error and scene-coordinate conformance across reference fixtures.
- At least 55 frames per second on the reference desktop and 30 on the reference mobile device during interaction.
- Stable memory after repeated workspace switching, replay and context restoration.
- Idle renderer CPU/GPU activity at or near zero when no visual state changes.
- Visual-layer provenance coverage of one hundred percent.
- WebGL fallback and accessibility tests passing for every renderer release.
- Initial JS cost excluded from the base shell and tracked per visual workspace.

## Risks and escalation

- Visual realism can be mistaken for scientific accuracy. Escalate when geometry or weather texture lacks measured provenance or a visible simulation label.
- WebGL and GIS dependencies can overwhelm the Worker-oriented client budget. Require an architecture/performance review before adding major libraries.
- Coordinate-system mistakes can create convincing but false shading. Block release on parity or reference-frame failures.
- Terrain, satellite and map products may carry licence, privacy or capacity restrictions. Escalate provider use to Data, Security and Legal review.
- GPU features can exclude lower-power and assistive users. A complete fallback is a release requirement, not a later enhancement.
