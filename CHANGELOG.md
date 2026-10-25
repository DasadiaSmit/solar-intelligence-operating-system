# Changelog

## 2026-10-25 — Sunlit glass dashboards and full workspace navigation

- Carried the light cloud-blue glass and champagne controls through all internal dashboards, charts, timeline, context panels and dialogs; retained an optional night theme.
- Replaced sidebar abbreviations with all fourteen full workspace names. Compact screens use a full-name drawer with focus containment, Escape and focus restoration.
- Added shared gentle hover enlargement, lift, press feedback and keyboard focus across application controls, respecting reduced motion and touch input.
- Introduced a separate saved Sunlit dashboard theme preference so the old dark shell preference does not override the new daylight default.
- Preserved workspace identity, selected-hour continuity, scientific calculations, source access and bundle ceilings.

## 2026-10-25 — Sunlit interactive UI

- Implemented the accepted original Overview, Array and Battery design with premium glass controls, meaningful lens transitions and an illustrative cloud atmosphere.
- Connected real UTC date/hour selection, explicit playback, canonical Sun/array geometry, battery SOC and energy routes.
- Added a bounded canonical daily API with strict date validation and source identity; scientific formulas and the existing annual transport are unchanged.
- Preserved all six instrument handoffs, fourteen workspaces, saved screening branches and return-to-observatory selected-hour continuity.
- Extended the shared analytical shell with glass styling, responsive navigation, keyboard focus, reduced motion, low-power preferences and semantic graphics fallback.
- Retained the earlier guided six-instrument observatory as an additional view.

## 2026-10-25 — Instrument 06 completion

- Resumed the paused Battery & Energy-Flow increment from its 29 July checkpoint.
- Preserved canonical 8,760-hour demand/dispatch replay, conservation and
  efficiency-aware SOC checks, linked UTC-day routes, annual summaries,
  quality, provenance and eleven explicit unavailable layers.
- Integrated a static, reached-only logical routing schematic with one grid
  intertie, bounded SOC reservoir and a progress-derived camera sweep.
- Preserved Instruments 01–05, one canvas, one frame owner and fixed initial
  bundle ceilings. Six positions are mounted; position 07 remains a placeholder.
- Added exact-index `BE` activation with acknowledged focus, canonical base
  parity, explicit local screening branches, `kWh / 1h` labels and roving
  Arrow/Home/End interval navigation.
- Fixed a runtime exception in the Battery readout's UTC timestamp formatter
  caused by incompatible Intl date-format options.
- Fixed native-scroll phase boundaries and contained Observatory overflow so long
  readouts remain reachable. Updated the built Worker preview command.
- Patched the compatible dependency graph and removed the expired exception;
  the high/critical gate passes with no ignored advisories.
- Release test, dependency, bundle and deployment evidence is recorded in
  `PROJECT_STATUS.md`; earlier entries below describe their historical releases.

All notable programme releases are recorded here. Scientific, dataset, model and calculation versions remain separately traceable in their own manifests.

## Unreleased

### Security

- Patched Next.js, React Server Components, Vite and the Cloudflare Worker toolchain to releases that clear their known high-severity advisories.
- Added exact, parent-scoped PostCSS and Sharp overrides for dependencies still pinned by Next.js, plus native-load and production-build verification.
- Added a blocking whole-lockfile high/critical audit gate and a machine-checked, expiring exception registry for unreachable development-tool findings.

### Added

- Milestone 4 Instrument 05: a versioned fail-closed
  `ScenarioComparisonFrameV1` built from the full canonical operating
  snapshot. It preserves one configured baseline and the four existing
  deterministic annual stress summaries in fixed order, reconciles them by
  replaying the canonical optimisation calculation, and exposes exact
  generation, screened annual energy-value and local-supply results/deltas,
  assumptions, lifecycle, quality and provenance.
- Five normalized Scenario Comparison chambers at position 05 encode only
  annual-generation delta relative to the configured baseline. Exact labels,
  values, definitions, assumptions, evidence and unavailable layers remain in
  semantic HTML. The spatial module is loaded only when position 05 is reached.
- A typed Instrument 05 handoff opens the existing `SR` workspace at the exact
  linked index without replacing a restored device-local branch or presenting
  new controls as an authoritative recalculation.
- The immutable Observatory registry now contains five mounted instruments,
  two navigable placeholders and seven reserved positions. Instruments 01–04
  persist at reduced emphasis while Instrument 05 forms.
- Milestone 4 Instrument 04: a versioned fail-closed
  `ArrayEngineeringFrameV1` from the full canonical operating snapshot,
  preserving configured/resolved array orientation, authoritative linked-hour
  Sun and incidence geometry, irradiance, conversion, loss, annual-summary,
  quality and provenance evidence.
- A normalized Array Engineering orientation rig at position 04: one
  explicitly nonphysical collection aperture, authoritative Sun vector,
  aperture normal and angle-of-incidence relationship. It contains no module
  rows, capacity-as-area encoding, terrain, shadow map, texture, particle
  stream or local frame loop.
- A typed Instrument 04 handoff opens the existing `AE` workspace and its
  semantic Scenario controls at the exact linked index without replacing a
  restored device-local branch.
- The immutable Observatory registry now contains four mounted instruments,
  three navigable placeholders and seven reserved positions. Instruments
  01–03 persist at reduced emphasis while Instrument 04 forms.
- Milestone 4 Instrument 03: versioned fail-closed `AnnualEnergyFrameV1`, all 8,760 exact unrounded canonical hourly modelled-AC and quality values, contiguous no-leap calendar, reconciled monthly/hemisphere-aware-season/annual summaries, explicit provenance and unsupported layers, semantic HTML readout and typed `AF` workspace handoff.
- One exact-count `InstancedBufferGeometry` annual formation: chronology controls angle, hourly-energy/annual-peak ratio controls radius, meteorological season controls muted colour and quality only reduces luminance. Adaptive tiers retain every sample and the existing sole frame coordinator drives formation.
- The immutable Observatory registry now contains three mounted instruments, four navigable placeholders and seven reserved positions. Instruments 01 and 02 persist at reduced emphasis while Instrument 03 forms.
- Milestone 4 Instrument 02: versioned fail-closed `AtmosphericObservationFrameV1`, exact representative-hour weather/irradiance/modelled-AC evidence, static texture-free Atmospheric Observation transfer schematic, semantic quality/provenance/unavailable-layer disclosure and an Instrument 02-only `WA` workspace handoff at the linked index.
- The immutable Observatory registry now contains two mounted instruments, five navigable placeholders and seven reserved positions. Instrument 01 persists at reduced emphasis while Instrument 02 forms.
- Milestone 4 Instrument 01: immutable one-mounted/six-placeholder/seven-reserved registry, fail-closed `SolarDigitalTwinViewV1`, dial-driven formation, texture-free configured-orientation system topology, semantic linked facts/provenance/limitations and an Instrument 01-only `DT` workspace handoff.
- Focused Instrument 01 tests for scientific preservation, unavailable-layer honesty, deterministic presentation, single-frame ownership, accessible fallback semantics and activation eligibility.
- Milestone 3 continuous Observatory framework: one persistent Hero/Observatory canvas, immutable calibrated 14-position ring, seven navigable placeholders, seven reserved positions, passive native-scroll engine, paused camera controller, sole scene coordinator, controlled state manager, semantic HTML navigation/readout and reduced-motion direct navigation.
- Structural-only WebGL instrument manager with 14 empty named anchors and instanced fiducials; no instrument, Moon, module, terrain, horizon, workspace remapping or new scientific value.
- Eleven focused Observatory framework tests for registry integrity, camera continuity/framing, dial calibration, scope exclusions, passive input, semantic navigation and single-frame ownership.
- Milestone 2 Helios Hero: exact introductory copy and actions, semantic linked-frame status, native scroll choreography, six-ring Helios Core, texture-free procedural Sun/corona, schematic magnetic-field guides, cinematographic camera, responsive layout, reduced-motion path and complete CSS/HTML fallback.
- Lazy production scene isolation with tiered geometry, restrained bloom/AO/vignette, deterministic visual-model tests and manifest-closure budgets while preserving the existing analytical shell.
- Milestone 1 Helios visual-computing foundation: renderer-neutral `SceneFrameV1`, strict ENU conversion, lazy demand-rendered canvas boundary, declarative camera, reusable lighting/environment systems, deterministic semantic particles, adaptive quality policy, WebGL failure containment and a semantic HTML fallback. The foundation is intentionally unconnected until the Hero milestone.
- Thirteen-department operating model with machine-readable ownership.
- Department charters, workspace accountability and shared-interface governance.
- GitHub contribution, issue, review, dependency and CI foundations.
- Registry fitness tests and department-aware validation command.
- Fail-closed 2022–2025 annual research route for deterministic sample or configurable Open-Meteo reanalysis (ERA5 default).
- Canonical-provider-to-science weather adapter with exact source-grid/calendar eligibility, interval-end timestamp semantics, leap policy, midpoint support, closure-preserving Erbs decomposition, explicit snow/albedo derivation and provenance retention.
- Chronological annual model protocol: train 2022–2023, calibrate 2024, evaluate untouched 2025, plus expanding-origin stability folds.
- Interactive Annual Forecast research-evidence console and eleven dedicated research-spine tests, including the worker-independent HTTP contract.
- Adapted-science SHA-256 evidence, pre-simulation tamper checks, adapter/model-recipe provenance, and model feature/hyperparameter disclosure.
- Supplied GHI/DNI/DHI closure reconciliation with explicit flags, derivation counts, imputation state, and quality penalty.
- Mission Intelligence Core with fourteen deterministic domain specialists, object-aware routing, strict evidence gating, traceable workflow, multidimensional evidence support and scientific working memory.
- Native Mission/Scenario/Evidence/Memory console, semantic scientific-object targets across all workspaces, reproducible initial result identity and artifact-continuity warnings.
- Fifteen Mission Intelligence contract/integration tests and a complete scientific architecture and limitations record.

### Changed

- Instrument 05 is explicitly one deterministic `stress-summary` comparison,
  not five observed or same-time weather worlds. Parallel sunny/cloudy annual
  runs, dust-event chronology, serialized hourly stress trajectories,
  validated heatwave thresholds/attribution, observed storm meteorology,
  occurrence probabilities, structural risk, spatial microclimate/terrain/
  shadows, measured/live response and issued forecasts remain unavailable
  rather than synthesized.
- The single demand-rendered canvas and sole `ObservatorySceneManager` frame
  owner now coordinate five mounted instruments. Increment 05 passes strict
  TypeScript, lint, production build, 58/58 visual tests, 5/5 smoke tests and
  103/103 tests overall. Its initial 1,262,543-byte and complete
  1,453,044-byte raw spatial closures remain beneath the unchanged gates; the
  reach-triggered Instrument 05 closure adds 9,596 raw bytes beneath a
  separate 15,000-byte gate.
- Instrument 04 keeps the astronomical Sun path independent of array
  configuration. The existing DC-capacity, tilt, azimuth and aggregate-loss
  controls remain explicitly simulated screening inputs; module count, module
  efficiency, named inverter selection/curve, editable inverter efficiency,
  physical row/terrain/horizon/shadow geometry, measured output and
  authoritative client-side recalculation remain unavailable rather than
  invented.
- Instrument 04 now fails closed against the canonical POA and generation
  functions, reconciles annual output/peak/capacity factor/performance ratio/
  quality across exactly 8,760 hours, verifies the canonical ordered loss
  chain while permitting legitimate temperature gain, and requires exact
  weather-calendar and unavailable-layer schemas.
- Instrument 03 is built from the full canonical server-side `OperatingSnapshot` before browser projection. Its hourly series serializes only energy and quality; chronology and month are reconstructed from the versioned calendar, leaving the 14-value `sios-hour-tuple-v1` unchanged.
- Annual P10/P50/P90 is explicitly a four-source-year empirical spread (`n = 4`), not a calibrated probabilistic interval, issued future forecast or guarantee. Measured/live output, intra-hour variation, spatial generation and causal climate attribution remain unavailable.
- The single demand-rendered canvas and sole `ObservatorySceneManager` frame
  owner now coordinate all four mounted instruments. Increment 04 passes strict
  TypeScript, lint, production build, 52/52 visual tests and 5/5 smoke tests;
  its measured 1,262,174-byte incremental and 1,452,675-byte complete spatial
  closures remain below their unchanged raw ceilings.
- Instrument 02 is built from one bounded canonical server-side representative-hour frame before annual browser compaction. Provider weather bounds, a separate conservative 4,200 W/m² POA-output ceiling and one-hour AC-versus-capacity guard fail closed. The versioned 14-value `sios-hour-tuple-v1` and `SceneFrameV1` remain unchanged, and no cloud motion, wind direction, sub-hour response, live telemetry or instant causality is synthesized.
- The single demand-rendered canvas and sole `ObservatorySceneManager` frame owner now coordinate both mounted instruments; Instrument 02 adds no dependency, texture, particle stream or local frame loop.
- Low-capability devices now select the scientific visual-quality tier regardless of viewport width; Instrument 01 introduces no dependency, texture, particle stream, secondary canvas or independent frame loop.
- Demand rendering now sleeps when camera progress and fine-pointer response settle; scroll and pointer changes explicitly wake the scene without an idle GPU loop.
- The analytical shell remains mounted and unchanged but its global shortcuts now activate only inside the explicit application phase.
- Hardened the Helios renderer to require WebGL 2, use one sanitized R3F camera, retain fallback content until a successful frame, distinguish context loss from renderer failure and permit one explicit retry per incident.
- Scene adaptation now rejects negative irradiance/interval-energy values and placeholder result provenance before producing spatial state.
- Replaced the inconsistent day-resampling representative composite with Finkelstein–Schafer-inspired whole-month selection and corrected target day-of-year remapping.
- Reclassified annual uncertainty as four-year Q10/Q50/Q90 interannual spread rather than a calibrated annual prediction interval.
- Removed fabricated model-calibration plot points and hard-coded hybrid champion status.
- Reconciled scientific documentation with the executable scalar horizon and generic inverter methods.
- Separated provider quality from adapter-adjusted science quality and exposed derivation counts.
- Corrected post-leap-day astronomy to use actual UTC midpoints while retaining no-leap ordinals only for model alignment; snow state now evolves through excluded leap-day intervals.
- Linked the annual research console to active site, capacity, orientation, and aggregate-loss inputs with stale-result invalidation and truthful server-returned configuration.
- Replaced pseudo-calibration coordinates, symmetric annual-spread claims, and financial pseudo-quantile labels with evidence-supported displays.
- Retired the planned PET/Copilot/assistant direction in favour of a native, non-conversational Mission Intelligence operating subsystem.

## 1.0.0 — 2026-07-22

### Added

- Complete 8,760-hour credential-free proving application across 14 workspaces.
- Solar, energy, provider, representative-year, forecasting, optimisation and provenance modules.
- Versioned APIs, D1 migration, optional R2 snapshots and scheduled-ingestion hook.
- Premium observatory/daylight visual system and private Sites deployment.
- Ten scientific tests, five release smoke tests and complete research/operations documentation.
