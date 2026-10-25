# Solar Intelligence Operating System — implementation plan

## 1. Repository audit and preserved foundation

The workspace contained no prior solar application or drone-interface asset. It was an empty project surface, so the official Sites Vinext starter was initialized and audited before product implementation.

The platform will preserve and extend:

- React 19, Next App Router 16, Vinext, Vite, strict TypeScript, and ESM.
- Cloudflare Worker deployment with the existing image-optimization path.
- The Sites hosting contract in `.openai/hosting.json`.
- Drizzle ORM and Cloudflare D1 for structured, durable records.
- The existing workspace/ChatGPT identity helper for optional authenticated user context.
- Node's built-in test runner for portable scientific and server-rendering tests.

The disposable starter loading page, starter metadata, starter-only dependency, and starter-only test will be replaced together. Heavy research-model training does not belong inside a request-time Worker; offline training artifacts and experiment metadata will be separated from deployable inference and simulation code.

## 2. Product strategy

The first delivery will be a complete, reproducible vertical slice rather than disconnected screens:

`location + array configuration → weather/provider record → solar physics → hourly annual simulation → representative year → baseline forecasts and validation → uncertainty/provenance → scenario optimisation → linked operational interface`

All 14 requested workspaces will exist inside one shared operating-system shell. They will share location, time cursor, scenario, model, uncertainty, and provenance state. The Annual Energy Forecast Observatory will be the deepest initial workspace because it directly addresses the research objective; the other workspaces will expose real derived views from the same calculation state and will state their implementation maturity explicitly.

## 3. Architecture

### Domain and scientific core

- `lib/contracts`: typed provider, weather, simulation, provenance, quality, model, validation, and scenario contracts.
- `lib/solar`: pure solar-position, irradiance transposition, temperature, DC/AC, loss-chain, degradation, tracker, and annual simulation functions.
- `lib/energy`: battery dispatch, demand balance, grid import/export, tariff, revenue, carbon, and reliability calculations.
- `lib/forecasting`: seasonal-naive, moving-average, exponential smoothing, regression/hybrid ensemble, uncertainty, calibration, rolling-origin evaluation, and metrics.
- `lib/representative-year`: transparent weighted-regime/percentile-matched representative-year construction and year-by-year comparison.
- `lib/optimisation`: grid search, Pareto filtering, Monte Carlo sensitivity, and stress scenarios.
- `lib/providers`: provider interface, Open-Meteo and PVGIS adapters, deterministic sample provider, fallback registry, retry/backoff, validation, conversion, quality, and provenance.
- `lib/mission-intelligence`: pure evidence contracts, fourteen-specialist routing, deterministic orchestration, confidence policy, artifact-continuity checks, and scientific working memory.
- `features/mission-intelligence`: registered operating-state evidence adapter and native Mission Intelligence console.

All scientific modules remain UI-independent and testable with deterministic fixtures.

### Application and APIs

- `app/api/v1/health`: versioned health and capability report.
- `app/api/v1/weather`: validated provider request with cache/fallback/sample behavior.
- `app/api/v1/simulate`: versioned simulation endpoint returning a full result envelope.
- `app/api/v1/scenarios`: authenticated/persistent scenario surface where a D1 binding is available.
- `app/api/v1/provenance`: lineage and calculation metadata.
- `app/workspace/[id]`: shared shell and workspace selection.

Every scientific API result will carry provider, model, issue time, data timestamp, temporal resolution, units, data-quality score, calculation version, assumptions, uncertainty, and lifecycle status.

### Persistence

D1 will store compact relational state: sites, arrays, scenarios, saved workspaces, annotations, dataset snapshots, provider runs, model versions, experiments, validation metrics, audit events, and background-job state. Large hourly snapshots/model artifacts are designed for R2 in a later hosted-data slice; the initial build retains deterministic sample snapshots in source so it works offline and without private credentials.

### UI/state

- React context + reducer for linked scientific state.
- Canvas for the dense annual chronology, Production DNA heatmap, orbital timeline, and scientific fields.
- CSS perspective/Canvas for the digital-twin scene without introducing a heavy generic chart library.
- D1 for durable saved records; browser storage only for device-local theme and layout preferences.
- A typed workspace registry for all 14 workspaces and honest lifecycle status.

## 4. Scientific methods in the first functional release

### Physics

The engine will implement:

- NOAA-style fractional-year solar declination/equation-of-time solar position.
- Extraterrestrial and clear-sky irradiance envelope.
- Direct/diffuse/reflected plane-of-array transposition with angle-of-incidence handling.
- NOCT-style cell temperature and module temperature coefficient.
- DC array power, inverter clipping/efficiency, performance ratio, and explicit multiplicative losses.
- Tilt, azimuth, fixed/single-axis tracking approximation, bifacial gain, shading/horizon, soiling, snow, dust, mismatch, wiring/string, availability, and annual degradation factors.
- Battery state-of-charge dispatch, charge/discharge efficiency and limits, self-consumption, grid import/export, curtailment, tariffs, carbon intensity, and cycle-throughput accounting.

Each formula, constant, input/output unit, approximation, and limitation will be documented in `docs/SCIENTIFIC_METHODS.md`.

### Representative year

The platform will not average annual totals. It will construct a representative year from 2022–2025 synthetic/sample or live normalised records by month, selecting/weighting days against irradiance, temperature, and cloud-distribution targets, with continuity penalties at joins. It will expose source-year weights, percentile deviation, regime labels, and comparison against each source year.

### Forecasting and validation

Implemented request-time models:

- Seasonal-naive baseline.
- Moving-average baseline.
- Exponential smoothing.
- Meteorological regression.
- Physics-informed residual correction and weighted probabilistic ensemble.

The validation layer will implement rolling-origin evaluation and calculate MAE, RMSE, guarded MAPE, normalised MAE, bias, R², seasonal error, annual-generation error, peak error, prediction-interval coverage, and calibration deviation.

ARIMA/SARIMA, random forest, gradient boosting, TCN, LSTM, and transformer models will have research-pipeline interfaces and honest status in the Model Laboratory. They will not display fabricated trained metrics. Only models with actual stored runs can become champion/challenger candidates.

### Optimisation

The first release will implement deterministic grid search over tilt, azimuth, DC/AC ratio, battery size, and export strategy; Pareto filtering across yield, self-consumption, revenue, and carbon; seeded Monte Carlo weather/loss sensitivity; and named stress scenarios. Bayesian and robust optimisation are exposed as research-extension interfaces until a real optimiser artifact is connected.

## 5. Visual system and workspaces

The interface will use a continuous observatory instrument field rather than repeated rounded dashboard cards:

- Mission header, workspace rail, linked scientific stage, Mission Intelligence console, orbital timeline, and system ledger.
- Observatory and daylight themes, reduced-motion handling, and sun/cloud/extreme-weather atmosphere states.
- Two-letter framed workspace glyphs, coordinate ticks, scientific legends, crosshairs, quality textures, and confidence bands.
- Command palette, shortcut map, replay controls, timeline scrubber, annotations, Mission/Scenario/Evidence/Memory modes, fullscreen/focus mode, and responsive field mode.

Signature connected instruments:

- Solar Orbital Timeline.
- Atmospheric Forecast Ribbon.
- Annual Chronology Field.
- Solar Production DNA.
- Forecast Confidence Galaxy.
- Energy-Loss Waterfall.
- Tilt/Azimuth Optimisation Terrain.
- Weather-to-Energy Causality Graph.
- Battery State-of-Charge Flow.
- Carbon-Avoidance Stream.
- Regional Solar Potential Field.
- Forecast Error Replay.
- Data Provenance Explorer.

All workspaces will be reachable from the shell. The Annual Forecast, Digital Twin, Array Engineering, Battery, Scenario, Model Laboratory, Provenance, and Executive surfaces will be functional views over shared calculated data. Research-heavy future capabilities will be clearly marked experimental or planned inside the relevant workspace rather than simulated with invented results.

## 6. Data-provider behavior

- No API keys in source.
- `.env.example` documents optional provider credentials and runtime controls.
- Open-Meteo is the no-key operational fallback.
- PVGIS/JRC is supported for solar-resource/TMY comparison.
- Copernicus/ECMWF adapters are configuration-driven and inactive until valid credentials/endpoints are provided.
- A deterministic sample provider guarantees offline operation.
- Requests use timeouts, bounded exponential backoff, rate-limit awareness, schema guards, SI unit conversion, UTC storage/local display, missing-value imputation flags, robust outlier checks, quality scoring, cache metadata, and provenance.
- Dataset snapshot identifiers hash provider, query, time range, transformation version, and calculation version for reproducibility.

## 7. Vertical slices and verification gates

### Slice A — operational scientific spine

1. Typed contracts and deterministic sample data.
2. Physics, annual simulation, energy flow, uncertainty, and provenance.
3. Unit tests for solar position, irradiance bounds, energy conservation, conversions, and edge states.
4. Build and server-render smoke test.

### Slice B — observatory shell and annual forecast

1. Replace the starter with the responsive OS shell.
2. Build the linked chronology, Production DNA, inspector, scenario controls, and orbital replay.
3. Validate loading, sample/offline, night, low-confidence, and extreme-weather states.
4. Inspect desktop and mobile layouts in the live application.

### Slice C — modelling, representative year, and optimisation

1. Baselines, hybrid ensemble, rolling-origin metrics, and calibration.
2. Representative-year construction and 2022–2025 comparison.
3. Grid/Pareto/Monte Carlo optimisation.
4. Connect Model Laboratory, Replay, Array Engineering, Scenario, Battery, Financial, and Provenance workspaces.

### Slice D — persistence, operations, and documentation

1. D1 schema and migration for domain metadata and saved state.
2. Versioned API routes, health, rate limiting, audit helpers, error envelopes, and optional auth attribution.
3. README, architecture, provider, provenance, deployment, backup/recovery, validation, limitations, and research-roadmap documentation.
4. Final build, automated test suite, console review, interaction checks, responsive visual review, and defect fixes.

### Slice E — Mission Intelligence Core

1. Give the initial operating snapshot a reproducible result identity and register exact, unit-bearing evidence references.
2. Implement fourteen automatically routed domain specialists with object expertise overriding workspace defaults.
3. Compile evidence-gated scientific dossiers through legitimate context, validation, measurement, support, continuity and assembly operations.
4. Replace the scientific inspector with native Mission, Scenario, Evidence and Memory console modes; add semantic object selection to every workspace.
5. Persist schema-versioned device-local scientific state, register base/annual-study artifacts and flag dependency drift without storing conversation history.
6. Validate routing, units, evidence resolution, unsupported/stale/planned/duplicate behavior, confidence policy, memory round-trip and real snapshot integration.

This slice is implemented on `agent/mission-intelligence-core`. It contains no chat UI, language-model provider, generated free-form answer or assistant persona.

## 8. Delivery status convention

- **Implemented** — executable and covered by validation/tests.
- **Experimental** — executable research method with known limits and no production claim.
- **Simulated** — deterministic scenario/sample output, never presented as observed truth.
- **Planned** — interface/schema reserved, no fabricated output or performance claim.

No estimate is presented as guaranteed production. Confidence intervals represent model/input uncertainty under documented assumptions, not contractual performance bounds.

## 9. Helios experience milestones

The supplied Helios redesign sequence is an additive presentation programme
over the completed scientific and operational slices above. It does not reopen
or replace them.

1. **Milestone 1 — visual foundation: implemented 2026-07-29.** Exact-pinned
   dependencies, `SceneFrameV1`, lazy `HeliosCanvas`, declarative
   `HeliosCamera`, reusable `LightingSystem` and `EnvironmentSystem`,
   deterministic `ParticleSystem`, adaptive demand-render policy, context-loss
   containment and semantic HTML fallback.
2. **Milestone 2 — Hero and Helios Core: implemented 2026-07-29.** One
   accessible Hero composes the six-ring Core, procedural Sun, guided camera,
   native scroll progress and responsive HTML over the unchanged analytical
   shell. Three.js remains lazy; scientific status and fallback meaning remain
   HTML.
3. **Milestone 3 — Observatory framework: implemented 2026-07-29.** One
   persistent Hero-to-Observatory canvas now contains the calibrated
   fourteen-position structural ring, passive native-scroll engine, camera and
   scene managers, controlled presentation state, semantic navigation and
   reduced-motion path. Positions 01–07 are navigable placeholders; positions
   08–14 are reserved. No instrument is formed and no analytical workspace is
   remapped.
4. **Milestone 4 — Instrument integration: Increments 01–05 accepted
   2026-07-29; Increment 06 implemented and validated 2026-10-25.** Position 01 forms the configured-orientation Solar Digital
   Twin system schematic from a fail-closed view of the linked
   `SceneFrameV1`; its typed action opens `DT` at the representative hour.
   Position 02 forms a static Atmospheric Observation transfer schematic from
   a bounded, server-built `AtmosphericObservationFrameV1` for that exact
   canonical hour; its typed action opens `WA` at the same index. The
   atmospheric frame preserves weather, GHI/DNI/DHI/effective POA, modelled AC
   energy, quality, units and provenance; provider bounds, a separate
   conservative 4,200 W/m² POA-output ceiling and one-hour
   AC-versus-capacity guard fail closed. It explicitly rejects an instant
   causality claim and leaves wind direction, cloud altitude/type/geometry/
   motion, sub-hour response and measured/live plant output unavailable.
   Position 03 forms Annual Energy Observatory from a fail-closed
   `AnnualEnergyFrameV1` built from the full canonical `OperatingSnapshot`.
   It preserves exactly 8,760 unrounded hourly AC and quality values under one
   contiguous no-leap calendar and reconciles monthly, hemisphere-aware
   meteorological-season and annual totals. Its four-source-year P10/P50/P90 is
   an empirical spread (`n = 4`), not a calibrated interval, issued forecast or
   guarantee; measured/live output, issued forecast, intra-hour variation,
   spatial generation and causal climate attribution remain unavailable. One
   `InstancedBufferGeometry` draw path retains all samples while the typed
   action opens `AF`. Instruments 01 and 02 remain visible at lower emphasis.
   Position 04 then forms Solar Array Engineering from a fail-closed
   `ArrayEngineeringFrameV1` built from the same full canonical snapshot. It
   preserves configured/resolved orientation, authoritative Sun and incidence
   geometry, linked irradiance/conversion/loss evidence, annual base output,
   quality and provenance. Its normalized aperture is explicitly not module
   or site geometry. Array changes cannot alter the astronomical Sun path, and
   module count, module efficiency, named inverter selection/curve and physical
   moving shadows remain unavailable until their required equipment and
   surveyed geometry contracts exist. The typed action opens the existing
   `AE` HTML screening controls without resetting a restored branch.
   Instruments 01–03 remain visible at lower emphasis. The compact annual
   tuple, one-canvas/one-frame-owner boundary and existing analytical
   workspaces remain unchanged. Position 05 then forms Scenario Comparison
   from a fail-closed `ScenarioComparisonFrameV1` built from the full canonical
   snapshot. It is one homogeneous deterministic `stress-summary` mode: the
   configured baseline plus the four existing canonical annual stress results
   in fixed order. A narrow canonical replay must reconcile every stored
   result before release. Exact generation, screened annual energy value,
   local supply, deltas, assumptions, quality and provenance remain semantic
   HTML; five normalized spatial chambers encode only relative annual
   generation response. The typed action opens `SR` at the same index without
   replacing the active branch. Same-time alternate weather, dust-event
   dynamics, hourly stress paths, occurrence probabilities, validated
   heatwave/storm evidence, spatial microclimate/terrain/shadows, structural
   risk, measured/live response and issued forecasts remain explicitly
   unavailable. Instruments 01–04 remain visible at lower emphasis. The
   compact tuple, one-canvas/one-frame-owner boundary and existing analytical
   workspaces remain unchanged. Position 06 adds Battery & Energy-Flow from
   `BatteryEnergyFlowFrameV1`, with a complete canonical dispatch replay,
   exact linked record and UTC day, reconciled annual ledgers, explicit
   simulated boundaries and eleven unavailable layers. Its static logical
   routing schematic loads only when reached. The typed `BE` action preserves
   the canonical linked index and restored branch, acknowledges activation,
   then focuses the selected interval. Battery interval labels use `kWh / 1h`
   and keyboard controls use a single roving tab stop. Six instruments are
   mounted; position 07 remains a placeholder and 08–14 reserved. Instrument
   07 is a separate future increment after I06 release acceptance and further
   user instruction.
5. **Milestones 5–7:** integrate the remaining supplied sequence, implement
   the operational-frequency shift and Moon only at Milestone 5, and reconnect
   the complete system in Mission Control.
6. **Milestone 8:** harden measured performance, accessibility, responsive
   behavior, browser coverage and visual regression. Baseline accessibility and
   performance remain mandatory during every preceding milestone.

Milestones are never merged. Every milestone must leave the current routes,
scientific calculations, APIs, validation, forecasting and provenance green.
