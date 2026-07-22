# Digital Twin, Geospatial and Visual Computing

## Mission

Build truthful, performant and explorable visual models of the solar site, atmosphere, energy system and regional context. The department turns authoritative scientific state into Canvas, WebGL and geospatial representations; it never invents terrain, physics or observations to make a scene look complete.

## Current truth

- Annual Chronology, Solar Production DNA, Solar Orbital Timeline and micro-traces are implemented with theme-aware 2D Canvas.
- Canvas rendering is resize-aware, redraws with theme/font changes, caps device-pixel ratio and is event-driven rather than continuously animated.
- The current Digital Twin is a linked CSS-perspective/DOM operational scene driven by sun, cloud, generation, battery and grid values.
- The Weather field and Regional globe are CSS/DOM visualisations. Regional comparison layers are explicitly unconnected and planned.
- The application has no Three.js/WebGL engine, terrain mesh, GIS runtime, surveyed horizon model, GPU shadow mapping or satellite cloud layer.
- The current scene can be called an implemented operational visualisation at its declared scope. A geometrically reconstructed or physically shaded digital twin remains planned.

## Ownership boundary

The department owns:

- `components/solar-os/instruments.tsx`;
- the visual-rendering portions of Digital Twin, Weather and Regional workspaces currently in `components/solar-os/workspaces.tsx`;
- Canvas, twin, atmosphere, globe and spatial-layer styles currently in `app/globals.css`;
- future `features/visual-computing/**`, renderer workers and visual-performance tests;
- scene contracts, coordinate systems, camera behavior, visual layers, WebGL fallbacks and accessible renderer summaries.

It does not own solar-position calculations, irradiance formulae, provider ingestion, lifecycle promotion, workspace workflow composition or design-system primitives. Terrain, horizon and array geometry must come from a versioned authoritative source or remain visibly simulated/planned.

## Interfaces

- Consume canonical solar, weather, energy-flow, quality and provenance contracts from Science and Data.
- Consume linked time, location and scenario through `OperatingUIStateV1`.
- Publish and version `SceneFrameV1` with UTC timestamp, ENU coordinate frame, site origin, array geometry, sun vector, irradiance components, cloud/weather state, energy vectors, quality and provenance references.
- Expose renderers through a stable boundary supporting lazy loading, context-loss recovery, reduced motion and a complete non-WebGL fallback.
- Emit typed selection events as `UiCommandV1` so spatial selection updates the global cursor instead of private renderer state.
- Provide Mission Intelligence with structured scene facts, stable selected-object identifiers and evidence paths, never screenshots as the sole source of truth.

## Decision authority

The department has final authority over rendering architecture, scene graph, coordinate conventions, camera controls, layer composition, visual-performance budgets and renderer fallback behavior.

Science owns the authoritative numeric input and tolerances. Experience owns shared visual tokens and accessibility presentation. Features owns which workflow exposes a renderer. Scientific Governance may block any layer whose source, status, unit or uncertainty is not visible.

## First deep-work programme

1. Freeze `SceneFrameV1`, ENU axes, units, origin rules and layer lifecycle metadata.
2. Move existing Canvas instruments into dedicated modules with parity tests and no visual behavior change.
3. Add a lazy-loaded WebGL renderer behind the current CSS scene so failure always falls back safely.
4. Implement real array geometry, authoritative sun direction and camera/navigation foundations.
5. Add terrain and horizon only from surveyed or versioned geographic inputs; label synthetic proving geometry explicitly.
6. Add direct, diffuse, reflected and uncertainty-aware irradiance layers driven by canonical scene data.
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
