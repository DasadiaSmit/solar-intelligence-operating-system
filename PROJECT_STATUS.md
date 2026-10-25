# Current assessment package — 25 October 2026

The current package contains the verified private version 20 application, frozen Studies 01–03, and portable evidence-replay instructions. Read [RUN_ME.md](RUN_ME.md) and [assessment package](docs/research/ASSESSMENT_PACKAGE.md) first. Source `869cb1310894ba6d1827b2e6ff4a557f5c5a800f` identifies the published application; GitHub package commits additionally contain documentation, data and replay helpers. Earlier entries below are retained development history. No measured-plant accuracy or human decision improvement is established.

# Solar Intelligence OS — completion, evidence, and continuity ledger

**Last updated:** 2026-10-25 (Europe/London)
**Workspace:** `/Users/alrey/Documents/smit final project 2`
**Private production URL:** https://solar-intelligence-os.vaikartana-revanta.chatgpt.site
**Private GitHub source:** https://github.com/DasadiaSmit/solar-intelligence-operating-system
**Recoverable baseline branch:** `main`
**Active release branch:** `agent/mission-intelligence-core`
**Parent research review:** https://github.com/DasadiaSmit/solar-intelligence-operating-system/pull/15
**Mission Intelligence release:** source validated and frozen on `agent/mission-intelligence-core`; the private Sites version records the exact deployed source SHA and is the authoritative release record
**Purpose:** authoritative restart and handoff record. If a future task resumes this project, read this file before changing code.

## Instrument 06 completion — 2026-10-25

The 29 July pause is resumed and completed for Instrument 06 only. The original
checkpoint is preserved in `docs/INSTRUMENT_06_PAUSE_CHECKPOINT.md`. Sites access
was verified as owner-only. The native Sites version record matching this source
commit is authoritative for deployment status and identity; the deployment
receipt is retained with the local release evidence under `work/`.

- Strict TypeScript and ESLint: pass without diagnostics.
- Governance 4/4, scientific core 11/11, research 11/11, Mission Intelligence
  15/15, visual/Observatory 88/88, release smoke 6/6: **135/135 passing**.
- Fresh five-environment production build and production-manifest gates: pass.
- Whole-lockfile security gate: pass; zero high/critical findings, three moderate
  tooling findings, no ignored advisory and no exception. The expired exception
  was removed after compatible dependency updates.
- Initial spatial closures: 1,263,187 raw bytes incremental and 1,453,688
  complete, beneath unchanged ceilings of 1,265,000 and 1,465,000. I06 is outside
  the initial closure and adds 15,823 raw bytes only when reached, beneath its
  separate 20,000-byte gate. Full gzip measurements are in `docs/PERFORMANCE.md`.
- Fixed the Battery readout's invalid Intl timestamp options, integer native
  scroll destinations and phase-boundary suppression. Browser-discovered
  overflow is contained within the viewport and observatory layer.
- Keyboard browser verification confirms the exact-index Battery handoff,
  selected-interval focus and Arrow/Home/End navigation with one roving tab stop.
  Pointer handoff also passes at 1280×902 and 390×844; the compact page has no
  horizontal overflow, and browser error logs are empty.
  Runtime React rendering verifies all six canonical routes and eleven
  unavailable layers without WebGL. Manual screen-reader and reference-device
  GPU/FPS acceptance remain unmeasured.
- `pnpm start` now previews the built Cloudflare Worker with Wrangler; the
  generic Node server cannot load Worker-specific modules.

That release did not start Instrument 07. The subsequent user-authorized UI layer is recorded below.

## Sunlit interactive UI — 2026-10-25

The user accepted the original-layout Overview / Array / Battery storyboard and
explicitly requested its dynamic implementation and private deployment. The
premium blue-silver glass and amber control family is now implemented across
the new entry and shared analytical shell. The six existing spatial instruments
remain available through the guided observatory, and all fourteen workspaces
remain connected. This UI layer does not start Instrument 07 or introduce new
science.

- Three smoothly changing lens scenes: canonical Sun position, resolved array
  orientation and solar direction, and bounded battery SOC with exact positive
  energy routes and one grid connection.
- Date selection and a 24-hour UTC timeline load unrounded canonical daily
  evidence through `/api/v1/observatory`; explicit playback stops when hidden.
- Every instrument handoff carries the selected hour; returning preserves the
  workspace's changed hour. Saved analytical scenarios stay mounted. The entry
  explicitly presents the canonical baseline, not a saved screening branch.
- Source, site, scenario and presentation dialogs have real actions, keyboard
  focus/escape support, reduced-motion and low-power device preferences.
- Phone navigation is rearranged at 390px and 320px; graphics never capture
  touch scrolling. WebGL failure has a semantic SVG fallback and HTML facts.
- The generated 197 kB atmospheric artwork is illustrative. The Sun is rendered
  from the canonical record and hidden below the geometric horizon; daylight
  classification retains the canonical apparent-horizon flag.
- Release verification: **144/144 tests pass** (4 governance, 11 scientific,
  11 research, 15 Mission Intelligence, 96 visual/data/API, 7 release smoke).
  TypeScript, ESLint, production build, unchanged earlier bundle gates and
  high/critical dependency audit pass. Three moderate tooling advisories remain.
- Browser checks cover desktop and 390px/320px phone layouts, all fourteen
  workspaces, Array scenario focus, exact-hour Battery return, date changes,
  keyboard navigation, dialogs and reduced-motion/low-power controls.
- Fixed camera-matrix synchronization on resize so HTML scene labels and
  their 3D objects use the same settled camera transform.
- Fixed a packaging-only prefixed-filter collision so the production glass
  retains standard backdrop blur, now checked in emitted assets.
- Release checks, browser evidence and native private deployment receipt are
  retained under `work/sunlit-ui-release/`. The Sites version record matching
  the pushed source is authoritative for publication status and identity.

## Sunlit internal glass layer — 2026-10-25

The user requested the outer Sunlit material inside the dashboards, full sidebar
names, and consistent expanding hover feedback. The shared dashboard now defaults
to readable cloud-blue daylight with champagne glass controls. Charts, scientific
scenes, context panels, forms, timeline and dialogs adapt to daylight or the
optional night theme. The separate `sios.sunlit-dashboard-theme` preference avoids
restoring the previous shell's dark appearance over this new default.

All fourteen full workspace names appear in the expanded desktop sidebar. Below
900px, the current full name opens a scrollable full-name drawer with a focus trap,
inert background, Escape, and focus restoration. Context panels overlay below
1440px to leave sufficient chart space. Existing workspace IDs and linked hours
are preserved. Shared CSS feedback enlarges fine-pointer controls by 3.5%, lifts
them by one pixel and gives press/focus feedback. Chart geometry and sliders stay
stationary; system and saved app reduced-motion preferences disable that movement.

Verification: TypeScript and ESLint pass; fresh production build passes; 96 visual
and instrument tests plus 8 rendering/release smoke tests pass with unchanged
bundle ceilings. Browser checks cover every workspace, one selected destination,
preserved linked index 4116, both themes, emitted standard backdrop blur, reduced
motion and the compact dialog keyboard loop. Layouts at 1440, 1280, 1025, 720, 390
and 320px remain within the viewport. Browser error logs are empty. Native Sites
version/deployment records are authoritative; local evidence is retained under
`work/inner-glass-release/`. No dependency or scientific formula changed.

## 1. Current outcome

Solar Intelligence Operating System is implemented as a working research and decision-support application, not a static mock-up. It provides:

- a strict-TypeScript Next 16 / React 19 / Vinext application targeting a Cloudflare Worker;
- a deterministic, credential-free, offline-capable 8,760-hour annual proving dataset;
- tested solar geometry, irradiance, module-temperature, DC/AC, loss-chain, battery, grid, tariff, carbon, representative-year, forecasting, uncertainty, and optimisation calculations;
- versioned APIs, provider adapters, data-quality/provenance contracts, D1 persistence, migrations, optional immutable R2 snapshots, and a scheduled-ingestion handler;
- one linked mission-control shell containing all 14 requested workspaces;
- a premium Sunlit blue-silver glass and amber visual system using Instrument Sans for interface text and Intel One Mono for scientific telemetry;
- responsive observatory/daylight visual states, theme-aware scientific canvases, shared timeline/replay, scenario branching, keyboard commands, annotations, saved views, status boundaries, and scientific provenance;
- a Milestone 4 Increment 06 source state over the unchanged analytical shell: the versioned renderer-neutral scene contracts, six-ring Core and procedural Sun persist through one lazy canvas into a calibrated 14-position framework with mounted Solar Digital Twin, Atmospheric Observation, Annual Energy Observatory, Solar Array Engineering, Scenario Comparison and Battery & Energy-Flow instruments, one navigable placeholder, seven reserved positions, native scroll, cinematographic camera, semantic HTML facts, typed exact-index `DT`/`WA`/`AF`/`AE`/`SR`/`BE` handoffs, reduced motion and complete fallback/recovery behavior;
- research, architecture, provider, provenance, validation, security, deployment, recovery, performance, and limitation documentation;
- a machine-checked 13-department operating model with charters, owned boundaries, workspace accountability, shared contracts, decision records, GitHub issue forms, review template, CI and dependency monitoring;
- a private production deployment and a credential-free sample mode.

The application never describes simulated sample production as measured truth or guaranteed output.

### Helios experience programme — Milestone 4, Increment 06

Prompt 3 controls this instrument increment while the accepted programme
sequence prohibits merging milestones. Milestone 3 remains the continuous
Observatory foundation, and Increments 01–04 remain intact at positions 01–04.
Milestone 4 Increment 06 is implemented at position 06; its release status is recorded above. The analytical
shell remains mounted
but inert until the Observatory hands focus to `#primary-stage`; no workspace
calculation, API, forecast, evidence reference, workspace registry or
scientific interaction was rewritten.

`SceneFrameV1` preserves the authoritative linked timestamp, ENU sun direction,
one-hour energy units, quality, lifecycle and provenance. Direct, diffuse and
reflected radiation, physical module geometry, terrain and surveyed horizon
remain explicit unavailable values rather than invented scene data.

`AtmosphericObservationFrameV1` is built server-side from the full canonical
`OperatingSnapshot` before annual browser compaction at the same result ID and
representative-hour index. It preserves the exact 3,600-second timestamp,
cloud cover, relative humidity, wind speed, ambient temperature, GHI, DNI,
DHI, effective POA, modelled AC energy, configured capacity, quality,
completeness, imputation state, flags, units and provenance. The current sample
frame is `SIMULATED`; its weather, irradiance and AC values are coincident
one-hour facts with `causalityClaim: false`, not evidence of an instant
cloud-to-power response. Wind direction, cloud altitude, type, geometry and
motion, sub-hour response and measured/live plant output remain explicit
unavailable layers. `SceneFrameV1` and the compact 14-value
`sios-hour-tuple-v1` are unchanged.

`AnnualEnergyFrameV1` is likewise built server-side from the full canonical
`OperatingSnapshot`, before the compact browser projection. It preserves all
8,760 unrounded modelled-AC values and quality scores on one contiguous
3,600-second no-leap UTC calendar, reconciles hourly, monthly, seasonal and
annual energy, and carries exact capacity, peak, specific-yield, quality,
representative-year and provenance facts. Its P10/P50/P90 values are explicitly
an empirical four-source-year spread, not a calibrated probabilistic interval,
issued future forecast, production guarantee or measured-plant validation.
Measured/live output, issued forecast, intra-hour variation, spatial generation
and causal climate attribution remain explicit unavailable layers.

`ArrayEngineeringFrameV1` is built server-side from the same full canonical
snapshot at the exact linked index. It preserves configured and resolved array
orientation, authoritative Sun geometry and ENU direction, angle of incidence,
IAM, irradiance, modelled DC/AC conversion, loss factors, annual summary,
loss-chain, quality and provenance. Its linked UTC day path contains 24
attributed canonical solar samples; array configuration is explicitly unable
to mutate the astronomical Sun path. Existing HTML controls remain
`SIMULATED`, non-bankable screening controls that require authoritative server
recalculation. Module count/rating, physical module/row geometry, named
inverter equipment/curves, module efficiency, editable inverter efficiency,
terrain/horizon/obstruction geometry, physical shadows, candidate hourly
production and measured/live output remain explicit unavailable layers.

`ScenarioComparisonFrameV1` is built server-side from that full canonical
snapshot as one homogeneous deterministic `stress-summary` comparison. A
narrow replay reuses the existing optimisation calculation and fails closed
unless the configured baseline and four canonical annual stress summaries
reconcile in exact catalog order. The frame preserves annual generation,
screened net energy value, local supply, percentage/percentage-point deltas,
assumptions, quality, lifecycle and provenance. Parallel presentation is not a
same-timestamp weather comparison, five independently forecast worlds or a
probability model. Sunny/cloudy parallel runs, dust-event chronology, hourly
stress trajectories, validated heatwave threshold/attribution, observed storm
meteorology, probabilities, spatial microclimate/terrain/shadows, structural
risk, measured/live response and issued forecasts remain unavailable.

`BatteryEnergyFlowFrameV1` is built server-side from the full canonical
snapshot. A complete 8,760-record demand/dispatch replay validates stored flows,
PV and demand conservation, efficiency-aware SOC, reserve deliverability,
configured bounds, direction exclusivity, cycle throughput, annual summaries
and provenance. Only the exact linked record, its 24-record UTC day and annual
ledger are presented. Eleven unavailable layers exclude live/BMS telemetry,
physical wiring, degradation, autonomous control and other unsupported claims.
The static schematic uses one logical grid intertie and bounded SOC reservoir;
its camera sweep follows source/bus, battery/load and grid context through pure
scroll progress. Reduced motion uses stable positions. Exact values remain
semantic HTML, with one-hour energy units and accessible interval controls.

The immutable registry now defines exactly six mounted instruments, one
placeholder and seven reserved positions. Instruments 01–04 persist at
reduced emphasis as Instrument 05 forms. Instrument 02 remains a static,
texture-free atmospheric transfer schematic. Instrument 03 renders exactly
8,760 annual samples in one instanced draw path: clockwise position expresses
chronology, radial displacement expresses hourly modelled AC relative to the
annual peak, muted colour expresses meteorological season and quality only
reduces luminance. Instrument 04 renders one normalized, nonphysical aperture,
its resolved normal, the authoritative linked Sun vector and their canonical
incidence relationship without module rows, capacity-as-area, terrain or
physical shadows. Instrument 05 renders five normalized chambers; shared and
instanced primitives encode only signed annual-generation response relative to
the baseline. It contains no weather, probability, damage or physical-equipment
geometry. Exact values, quality, lifecycle, provider/version evidence,
limitations and all unavailable layers remain semantic HTML with forced-colour
and non-WebGL equivalence.

One `ObservatorySceneManager` owns the only spatial frame loop. It coordinates
the persistent Core/Sun context, structural ring, all six instrument
formations and paused `ObservatoryCameraController`; the position-02 camera
rises to frame the atmospheric layer without implying measured altitude, and
the position-03 camera moves outward to explain the annual orbit without
disorienting the user. Passive native scroll is never intercepted or snapped.
Demand rendering wakes for scroll/pointer transitions and sleeps when settled.
No instrument owns a frame loop, invalidation path, random particle source,
new runtime dependency or texture. Instrument 05 is loaded only when its
position is reached. Reduced motion selects stable positions directly.
WebGL 2 remains lazy, presentation-only and optional.

Renderer-neutral activation requests map Instrument 01 to the existing `DT`
workspace, Instrument 02 to the existing `WA` workspace at the exact linked
representative-hour index, and Instrument 03 to the existing `AF` workspace
without changing the linked index. Instrument 04 opens the existing `AE`
workspace and Scenario controls at the same index, waits for application state
acknowledgement, then focuses the existing DC-capacity control without
resetting the restored device-local branch. Instrument 05 opens the existing
`SR` workspace at the same linked index without resetting the restored
device-local branch or opening scenario controls. Instrument 06 opens `BE` at
that same linked index, waits for acknowledgement and focuses
`battery-linked-interval`. The unmodified application uses the canonical base
without a screening recalculation; modified device-local branches retain their
explicit screening disclosure. Position 07 remains an unmounted placeholder;
08–14 remain reserved. Instrument 07 requires a separate future increment. The Moon remains prohibited until the Milestone 5
operational-frequency shift.

### Mission Intelligence Core — current branch

The planned PET/Copilot boundary has been retired. This branch implements Mission Intelligence as a native deterministic operating subsystem, not an AI assistant, chatbot, avatar, prompt surface or language-model integration.

Implemented in this branch:

- a pure `lib/mission-intelligence/` core with strict contracts, evidence validation, specialist routing, orchestration, confidence assessment, continuity detection and scientific-memory functions;
- exactly fourteen bounded specialists covering meteorology, solar physics, PV engineering, forecasting, machine learning, batteries, grid, finance, climate, provenance, methodology, visualisation, publication and validation;
- automatic object-over-workspace specialist routing with no user-facing specialist picker;
- semantic object targets in every workspace, including linked weather, annual uncertainty, representative-year construction, model rows, replay validation, array configuration, scenario branches, battery intervals, regional site, climate series, financial values, provenance nodes, publication figures and mission outcomes;
- a registered operating-state adapter that binds unit-bearing facts to an immutable result ID, exact locator, provider/model/version, timestamp/range, data class, quality and provenance;
- a native Mission Intelligence console with Mission, Scenario, Evidence and Memory modes; no messages, bubbles, greeting, typing indicator or unrestricted prompt field;
- a seven-step legitimate evidence pipeline with explicit completed/blocked/skipped status and no artificial thinking delay or hidden reasoning exposure;
- fail-closed grounding for missing, stale, conflicted, planned, duplicated, unresolvable, non-finite or unitless evidence, using the exact boundary `No supporting evidence currently exists.`;
- a measured evidence-support index separated from data quality, calibration and uncertainty; it is never presented as AI certainty or guaranteed correctness;
- schema-versioned device-local scientific working memory for scenario revisions, selected datasets/models, artifacts, investigations and continuity events—not conversation history;
- base-result and annual-study artifact registration plus dependency-fingerprint warnings after relevant configuration changes;
- reproducible initial-page result identity using the same construction as `/api/v1/simulate`;
- updated governance, threat model, department ownership and scientific documentation that replace PET/Copilot with active Mission Intelligence Core;
- focused Mission Intelligence tests plus a real operating-snapshot adapter integration test.

Important boundaries:

- findings are deterministic renderings of supplied evidence, not generated prose;
- sample-mode weather, production, storage, grid, finance and carbon remain simulated;
- the current four-year record does not establish climate trend;
- the current financial engine is tariff-screened energy value, not NPV/IRR/bankability;
- scientific memory is local to one browser profile until authenticated project-scoped persistence is implemented;
- client scenario screening remains `SIMULATED` and requires authoritative server recalculation before engineering or financial reliance;
- no measured-plant performance or equipment diagnosis is available without measured telemetry.

### Original-research critical path — current branch

The department foundation was merged through GitHub PR #1. Work is now isolated on `agent/research-spine-v1` and explicitly re-centred on the original full-year research objective.

Implemented in this branch:

- one canonical provider-to-science boundary for both sample and Open-Meteo ERA5 data;
- separate 2022, 2023, 2024 and 2025 acquisition with expected source counts `8760 / 8760 / 8784 / 8760`;
- fail-closed live mode with no simulated substitution;
- explicit 2024 leap-day removal only at the no-leap research boundary;
- preceding-hour radiation uses provider interval-end timestamps and geometry 30 minutes earlier at the midpoint;
- astronomical geometry follows the actual midpoint timestamp after leap-day removal, while the no-leap ordinal is retained only for aligned time-series features;
- Erbs beam/diffuse decomposition when components are absent;
- supplied irradiance components are closure-checked, transparently corrected when outside tolerance, flagged, counted and quality-penalised;
- field-specific missing-data policy: precipitation and snow are never linearly interpolated, while missing snow depth uses a flagged balance proxy;
- snow-proxy state advances through every validated leap-day interval before the 2024 no-leap research view is formed;
- Finkelstein–Schafer-inspired whole-month representative-year selection;
- corrected target timestamp/day-of-year chronology;
- training on 2022–2023, ensemble calibration on 2024, untouched evaluation on 2025, and expanding annual stability folds;
- versioned model recipes expose exact feature schemas and hyperparameters;
- ordered adapted-weather SHA-256 hashes and the adapter version are verified before simulation and bound into representative/study identity;
- an interactive Annual Forecast control for offline verification or live Open-Meteo reanalysis study;
- a compact `GET /api/v1/studies/annual?mode=sample|live` evidence route;
- documentation that distinguishes reanalysis hindcasting, physics-derived production and measured-plant validation.

A fresh live ERA5 provider run completed successfully for the Sheffield reference site after the interval-end, leap-geometry, supplied-component-closure and adapted-content-identity corrections. It returned source counts `8760 / 8760 / 8784 / 8760`, built an 8,760-hour representative year, evaluated untouched 2025, and produced a 49,249 kWh annual central estimate for the configured 48 kWp system. Annual source-year Q10/Q50/Q90 were 46,831 / 50,866 / 52,928 kWh. Provider quality was 0.900 and adapter-adjusted science quality 0.875 because all snow-depth hours used the disclosed proxy. The verified representative-year ID is `representative-2026-972fefef`; the reproducible study ID is `study_22b6b34d1cf9f34dbfbc68ee`. This is reanalysis-conditioned research evidence, not measured-plant accuracy or guaranteed production.

## 2. Release state

### Published

- Owner-only production release: https://solar-intelligence-os.vaikartana-revanta.chatgpt.site
- The research-spine branch has been saved and deployed privately after the full validation gate; Sites retains the exact source commit on every saved version.
- Each Sites release records its exact pushed source SHA; `main` remains the recoverable baseline until the reviewed research branch is merged.
- Sites project identity is persisted in `.openai/hosting.json`.
- Logical bindings: D1 `DB` and R2 `SNAPSHOTS`.
- The deployed archive contains `dist/server/index.js`, hosting metadata, and the complete Drizzle migration tree.
- `public/og.png` is an inspected 1200×630 social card aligned with the premium observatory palette; metadata derives its absolute image URL from the incoming request host.
- The favicon, manifest, browser theme colours, and social preview use the same SI·OS obsidian/champagne/mineral visual language; unused starter artwork and example routes were removed.

### Access and runtime mode

- Deployment is private/owner-only.
- No private provider credential is embedded in source or deployment metadata.
- Hosted and local operation default to deterministic `SIMULATED` sample mode.
- The no-key Open-Meteo annual reanalysis path activates only through an explicit `mode=live` request; provider/model policy overrides and other hosted integrations remain environment-configured.
- R2 snapshot writes occur only when the `SNAPSHOTS` binding exists.
- The Worker scheduled-ingestion hook is implemented, but no production cron trigger is packaged. It remains dormant until a schedule is configured and verified in the Sites/Cloudflare control plane.

### Private source security and department model

- The complete production baseline is backed up in the private GitHub repository `DasadiaSmit/solar-intelligence-operating-system`.
- `main` is the recoverable production baseline; the department operating model was merged through PR #1, and the research-spine upgrade is isolated on `agent/research-spine-v1` in labelled draft PR #15 pending review.
- Thirteen departments have stable IDs, charters, exclusive primary-path accountability, shared review paths, first deep-work programmes and evidence gates.
- Every one of the 14 application workspaces has exactly one accountable domain department and named contributors.
- Mission Intelligence Core is the active cognitive department. It is deterministic and evidence-gated; no chat API, language-model provider or conversation store exists.
- GitHub governance now includes CODEOWNERS, private vulnerability reporting, structured issue forms, a pull-request evidence template, Dependabot configuration and five CI gates, including an independent network-backed dependency-security gate.
- The 2026-07-22 branch push reported 17 Dependabot alerts on the then-current default branch (7 high, 7 moderate, 3 low). That count is historical and must be reconciled with GitHub after these lockfile changes rather than presented as current.
- On 2026-07-29, compatible owner packages were upgraded, vulnerable Next.js transitives were replaced with exact parent-scoped overrides, and the resolved production graph passed `pnpm audit --prod` with no known vulnerabilities.
- The 25 October whole-lockfile high/critical gate passes without exceptions or ignored advisories. Three moderate tooling findings remain documented in `docs/SECURITY.md`.
- GitHub is the source of record, not the only backup; D1, R2, provider snapshots and model artifacts still require the documented recovery process.

## 3. Final automated evidence

The functional command counts and production-manifest measurements below are
historical Milestone 4 Increment 05 evidence. Current I06 evidence is recorded at the top of this ledger. All bullets in this section describe that historical release. Current October dependency and test evidence supersedes them at the top of this ledger and in `docs/SECURITY.md`.

- `pnpm install --frozen-lockfile --store-dir .pnpm-store`: PASS, lockfile reproducibility confirmed.
- `pnpm run security:audit`: PASS at the high/critical threshold; one moderate development-tool finding and one exact ignored high advisory reported.
- `pnpm audit --prod --store-dir .pnpm-store`: PASS, no known production vulnerabilities.
- `pnpm peers check`: PASS, no peer-dependency issues.
- Next-scoped Sharp `0.35.3` native load with libvips `8.18.3` and PostCSS `8.5.20` resolution: PASS.
- `pnpm run test:departments`: PASS, 4/4 registry/governance/security-policy fitness tests.
- `pnpm exec tsc --noEmit`: PASS, zero diagnostics.
- `pnpm run lint`: PASS, zero warnings/errors.
- `pnpm run test:science`: PASS, 10/10.
- `pnpm run test:research`: PASS, 11/11.
- `pnpm run test:mission`: PASS, 15/15 specialist, grounding, confidence, continuity, memory, and real-snapshot integration tests.
- `pnpm run test:visual`: PASS, 58/58 ENU/scientific-preservation, renderer, Hero, Observatory, Instruments 01–05 registry/view/presentation, exact annual chronology, canonical array-engineering physics/annual/loss-chain reconciliation, deterministic stress replay/comparison arithmetic and unavailable-layer boundaries, provider/model-output bounds, calibrated dial, camera continuity/framing, single-frame ownership, typed handoffs, semantic-navigation and fallback tests.
- `pnpm run test:smoke`: PASS, 5/5.
- `pnpm test`: PASS, 103/103 tests across governance, science, research, Mission Intelligence, visual computing, Observatory/Instruments 01–05 and release smoke suites, including a fresh five-environment Vinext production build.
- Final build includes all eight application/API routes and the Worker entry point.
- Built client scan contains no `sharp`, `libvips`, or `postcss` code.
- The `SolarOperatingSystem` asset remains isolated at 154,572 bytes (41,446 bytes gzip); its static closure contains no Three.js, Core, shader, postprocessing or OrbitControls implementation.
- The continuous Observatory scene before the reach-triggered Instrument 05 module is 350,016 bytes uncompressed (140,503 bytes gzip).
- The initial lazy spatial closure is 1,262,543 bytes uncompressed (382,126 bytes gzip), beneath its unchanged 1,265,000-byte ceiling. The complete initial closure is 1,453,044 bytes (441,466 bytes gzip), beneath its unchanged 1,465,000-byte ceiling.
- Instrument 05 remains outside that initial closure and adds 9,596 bytes uncompressed (3,799 bytes gzip) only when position 05 is reached, beneath its separate 15,000-byte raw ceiling.

Scientific/data coverage includes:

1. NOAA-style solar geometry and night/day behavior.
2. Plane-of-array irradiance and optical angle-of-incidence loss.
3. Faiman module-temperature response.
4. Deterministic 8,760-hour multi-year proving data and representative-year construction.
5. Battery energy conservation and state limits.
6. Arbitrary-base scenario invariance for tilt/azimuth normalization.
7. Numerical forecast metrics, ridge fit, and rolling-origin evaluation.
8. Pareto filtering and seeded Monte Carlo reproducibility.
9. Provider units, UTC validation, and explicit fallback semantics.
10. Integrated auditable annual operating snapshot.
11. Erbs GHI decomposition and irradiance-component closure, including the DNI-capped near-horizon edge case.
12. Exact 2022–2025 source grids, interval-end timestamp semantics, leap-day completeness, and one 8,760-hour scientific calendar per year.
13. Whole-month representative-year selection with internally consistent target chronology.
14. Separated 2022–2023 training, 2024 calibration, and untouched 2025 evaluation evidence.
15. Fail-closed rejection of unresolved required meteorological fields.
16. Explicit, quality-penalised snow-depth proxy handling when the optional ERA5 field is unavailable.
17. Ordered archive evidence, canonical/adapted dataset identity, counts, data-class correspondence, and reproducible study identity independent of generation time.
18. Separate provider/science quality plus explicit Erbs, supplied-component closure, snow-proxy, and snow-albedo derivation evidence.
19. Actual-timestamp leap-year astronomy with no-leap ordinals retained only for model-feature alignment.
20. Leap-day snow-state evolution before the aligned research view is formed.
21. Adapted-weather tamper rejection plus changed representative/study identity when revised adapted evidence is deliberately re-hashed.
22. Versioned model feature schemas and hyperparameters bound into study identity.
23. Compact annual-study HTTP response metadata, linked aggregate-loss control, custom-location UTC metadata, and structured invalid-mode rejection.
24. Exactly fourteen deterministic specialist definitions and all fourteen workspace-default routes.
25. Object expertise deterministically overriding workspace defaults without a specialist picker.
26. Resolvable unit-bearing numerical findings and fail-closed missing/stale/planned/unitless/duplicate evidence behavior.
27. Evidence-support dimensions explicitly separated from probability, model confidence and production guarantee.
28. Artifact dependency drift, scientific-memory serialization and absence of conversation/message state.
29. Real annual operating-snapshot adaptation into a supported Forecast Scientist dossier tied to one reproducible result ID.
30. One configured baseline and four catalogued deterministic annual stress
    summaries preserved in fixed order under an explicit homogeneous
    `stress-summary` boundary.
31. Canonical 8,760-hour configured-stress replay, plausible-corruption
    rejection, baseline-relative arithmetic reconciliation and truthful
    local-supply percentage-point semantics.
32. Explicit rejection of same-time alternate weather, dust dynamics, hourly
    stress paths, event probability, validated heatwave/storm/spatial/
    structural evidence, measured/live response and issued-forecast claims.

API/artifact coverage includes:

- complete, labelled, reproducible simulation output;
- rejection of invalid engineering bounds;
- all 14 workspace registrations and honest lifecycle/status language;
- deployable Worker output, hosting bindings, migration, and safeguards;
- required scientific and continuity documentation.
- 13 unique department records and charters, 14 accountable workspace mappings, resolvable ownership paths, valid cross-department references, GitHub evidence templates and private security routing.

## 4. Interaction and visual evidence

### Scenario Comparison Increment 05 — 2026-07-29

- Added one fail-closed `ScenarioComparisonFrameV1` from the full canonical
  operating snapshot without changing an API, prior frame or the compact
  14-value browser tuple.
- Centralized the four canonical deterministic stress definitions and exposed
  a narrow configured-stress replay that reuses the existing optimisation
  functions. The adapter rejects invalid chronology, catalog/order,
  assumptions, status, provenance and plausible in-range baseline/stress
  contradictions.
- Preserved one configured baseline plus extended summer heatwave, Atlantic
  storm week, persistent snow cover and seven-day inverter outage annual
  summaries. Exact generation, screened annual energy value, local supply,
  deltas, assumptions and evidence remain semantic HTML.
- Fixed the scientific identity to one homogeneous `stress-summary` mode.
  Parallel presentation does not claim same-time weather, alternate
  authoritative weather worlds, hourly event results, probabilities, an
  issued forecast, measured response or bankability.
- Added five normalized comparison chambers at position 05. One common
  geometry basis and bounded response column encode only signed annual
  generation delta; there is no text, chart, weather effect, physical
  equipment, probability, damage, texture, shadow or local animation in
  WebGL.
- Kept Instruments 01–04 formed at reduced emphasis, the sole scene/frame/
  camera owner unchanged, and positions 06–07 as honest placeholders. The
  typed action opens `SR` at the exact linked index without resetting the
  device-local branch.
- Moved the I05 dynamic import to the existing outer client boundary after the
  first emitted split pulled the browser entry into the initial scene closure.
  A local suspense boundary and `presence !== "absent"` gate load I05 only
  when reached. Automated manifest tests prove it remains outside the initial
  closure and below its 15,000-byte unique raw ceiling.
- Fresh Increment 05 automated validation passes 103/103 overall and 58/58 in
  the visual suite, plus strict TypeScript, lint, fresh production build and
  5/5 smoke checks. No manual browser, assistive-technology or
  reference-device performance claim is made.

### Solar Array Engineering Increment 04 — 2026-07-29

- Added one fail-closed `ArrayEngineeringFrameV1` from the full canonical
  operating snapshot at the exact linked index without changing any prior
  frame, API, scientific calculation or the 14-value browser tuple.
- Preserved configured/resolved orientation, authoritative Sun/ENU direction,
  canonical 24-sample UTC day path, AOI/IAM, irradiance, DC/AC conversion,
  hourly loss factors, annual summary, ordered annual loss chain, quality,
  lifecycle and provenance.
- Strengthened the evidence gate after independent review: linked POA and
  generation must match the existing canonical functions; annual output, peak,
  capacity factor, performance ratio and mean quality reconcile across exactly
  8,760 hours; the loss chain must match the canonical builder, exact order and
  continuity while permitting its legitimate temperature gain.
- Declared that array configuration cannot alter astronomical Sun geometry.
  The existing DC-capacity, tilt, azimuth and aggregate-loss controls remain
  `SIMULATED`, non-bankable HTML screening controls requiring authoritative
  server recalculation.
- Kept module count/rating, physical module/row geometry, named inverter
  equipment/curve, module efficiency, editable inverter efficiency,
  terrain/horizon/obstruction geometry, physical moving shadows, candidate
  hourly production and measured/live output explicitly unavailable.
- Mounted one normalized nonphysical aperture, resolved normal, authoritative
  linked Sun vector and canonical incidence relationship at position 04.
  Capacity does not change visual area; no module rows, ground, shadows,
  textures, particles, timer, local frame loop or independent invalidation were
  introduced.
- Preserved Instruments 01–03 in subdued formed states. The registry contains
  four mounted instruments, three placeholders and seven reserved positions.
- Added semantic exact configuration, incidence, irradiance, conversion,
  annual, configured-loss, canonical-loss-chain, quality, provenance and
  unavailable-layer evidence outside WebGL.
- Added a typed exact-index `AE` handoff that applies restored device-local
  preferences first, opens the existing Scenario controls, waits for
  application acknowledgement and focuses `scenario-dc-capacity` without
  resetting the saved branch.
- Fresh Increment 04 automated validation passes 97/97 overall and 52/52 in
  the visual suite. Strict TypeScript, lint, production build, 5/5 smoke tests
  and `git diff --check` pass.
- The measured analytical shell, scene, incremental closure and complete
  closure are 154,572 / 349,669 / 1,262,174 / 1,452,675 raw bytes. Both spatial
  closures remain under their unchanged hard ceilings. Browser/assistive-
  technology acceptance and reference-device FPS remain pending and are not
  claimed.

### Annual Energy Observatory Increment 03 — 2026-07-29

- Added one fail-closed `AnnualEnergyFrameV1` from the full canonical operating
  snapshot before browser compaction, without changing `SceneFrameV1`,
  `AtmosphericObservationFrameV1` or `sios-hour-tuple-v1`.
- Preserved exactly 8,760 unrounded hourly modelled-AC values and quality
  scores on a contiguous no-leap UTC calendar, with reconciled monthly,
  hemisphere-aware meteorological-season and annual energy totals.
- Added exact capacity, annual generation, peak hour, specific yield, quality,
  representative-year identity, provider/dataset/calculation provenance and
  evidence references in semantic HTML.
- Labelled P10/P50/P90 as an empirical spread across four source-year annual
  totals only. The readout explicitly rejects calibrated-probabilistic,
  future-forecast, guarantee and measured-plant interpretations.
- Added explicit unavailable disclosures for measured/live plant output,
  issued future forecast, intra-hour variation, a spatial generation field and
  causal climate attribution.
- Added one instanced annual orbit at position 03 with exactly 8,760 samples in
  one draw path. Clockwise angle encodes chronology, radial displacement
  encodes modelled hourly AC relative to annual peak, muted colour encodes
  meteorological season and quality only reduces luminance.
- Preserved Instruments 01 and 02 in subdued formed states while Instrument 03
  forms. The registry now contains three mounted instruments, four
  placeholders and seven reserved positions.
- Reused the persistent canvas, sole scene coordinator, demand-idle renderer,
  adaptive DPR, reduced-motion behavior and renderer-local fallback. The
  camera zooms outward for the annual scale without using orbit controls.
- Added an Instrument 03-only typed `AF` request while preserving the exact
  linked representative-hour index and the existing `DT` and `WA` handoffs.
- Fresh Increment 03 automated validation passes 90/90 overall and 45/45 in
  the visual suite, with TypeScript, lint, production build, smoke tests and
  production-manifest ceilings green. Browser/assistive-technology acceptance
  and reference-device performance measurements remain pending; no FPS,
  manual-device or assistive-technology claim is made here.

### Atmospheric Observation Increment 02 — 2026-07-29

- Added one exact representative-hour `AtmosphericObservationFrameV1` from the
  canonical operating snapshot before compaction, without changing
  `SceneFrameV1` or the 14-value annual browser tuple.
- Added `SIMULATED` weather, GHI/DNI/DHI/effective-POA, modelled-AC, configured
  capacity, quality, completeness, imputation, flag, unit and provenance facts
  in semantic HTML. Coincident one-hour values are explicitly not presented as
  instant cloud-to-power causality.
- Added explicit unavailable disclosures for wind direction; cloud altitude,
  type, geometry and motion; sub-hour response; and measured/live plant output.
- Added a static, texture-free Atmospheric Observation transfer schematic at
  position 02. It has no cloud drift, advection particle stream, instrument
  timer, local frame loop or invalidation path.
- Preserved Instrument 01 in a subdued formed state while Instrument 02 forms.
  The registry now contains two mounted instruments, five placeholders and
  seven reserved positions.
- Reused the persistent canvas, sole scene coordinator, demand-idle renderer,
  adaptive DPR, reduced-motion behavior and renderer-local fallback. The
  camera rises to reframe the atmospheric layer without claiming measured
  altitude.
- Added an Instrument 02-only typed `WA` request at the exact linked index;
  Instrument 01 retains its `DT` request and both defer focus until application
  state acknowledges the target.
- Fresh Increment 02 automated validation passes 82/82 overall and 37/37 in
  the visual suite, with TypeScript, lint, production build, smoke tests and
  production-manifest ceilings green. Browser/assistive-technology acceptance
  and reference-device performance measurements remain pending; no FPS,
  manual-device or assistive-technology claim is made here.

### Helios Observatory and Instrument 01 release — 2026-07-29

- Added the exact Hero title, explanatory copy, `Begin Observation` and
  `Project Overview` actions without changing the existing workspaces.
- Added truthful linked timestamp, lifecycle, plane-of-array irradiance,
  quality, provider, dataset and calculation facts in semantic HTML.
- Added a six-ring Core, procedural shader Sun/corona, schematic magnetic-field
  guides, paused GSAP camera controller and restrained tier-gated
  bloom/AO/vignette.
- Added one immutable 14-position calibrated ring and instrument registry:
  Instrument 01 is mounted at position 01, 02–07 remain structural
  placeholders and 08–14 are reserved.
- Kept native wheel, touch and keyboard scrolling; scroll progress changes only
  presentation/camera framing. The HTML dial provides click, arrow, Home, End,
  Enter and Space behavior and the WebGL layer remains pointer-inert.
- Added one persistent Hero/Observatory canvas, one scene coordinator/frame
  owner, one configured-orientation Digital Twin topology, thirteen empty
  WebGL anchors, a passive scroll engine, controlled presentation state and
  explicit Hero/Observatory/application focus phases.
- Added semantic linked-hour facts, provider/version evidence, unavailable
  physical-layer disclosure and an Instrument 01-only `DT` activation request
  that is applied before focus moves into the analytical shell.
- Demand rendering now wakes only for scroll/fine-pointer transitions and
  sleeps when settled. Every calibrated marker fits its camera frustum.
- Added desktop, tablet and mobile composition, 44-pixel action targets,
  reduced-motion direct position selection, forced-colour fallback, WebGL 2
  failure isolation and one explicit retry per render incident.
- Automated source, TypeScript, lint, scientific-contract, manifest-closure and
  production-build evidence is complete. No automated browser screenshot,
  performance benchmark or assistive-technology session is claimed.

Manual acceptance additions:

1. Confirm Hero/Core and Observatory dial/readout composition at desktop,
   tablet and mobile widths.
2. Confirm native scroll carries the same Core into the framework, positions
   each active mount at the top datum and hands focus to the primary analytical
   stage without changing the linked hour.
3. Confirm click and keyboard navigation operate only positions 01–07 and that
   08–14 remain visible, dim and unavailable.
4. Confirm reduced motion selects stable positions directly and leaves
   Sun/Core/pointer time static.
5. Confirm the CSS/HTML fallback remains complete with WebGL disabled and in
   forced colours.
6. Profile the stated desktop/laptop/tablet/mobile FPS targets on representative
   physical devices before presenting them as measured performance.

### Mission Intelligence release — 2026-07-22

- Converted the former scientific inspector into one continuous Mission Intelligence ledger with Mission, Scenario, Evidence and Memory modes.
- Added a persistent active-specialist signal, selected-object/objective context, legitimate workflow status, grounded findings, evidence registry, evidence-support dimensions, assumptions/uncertainty/limitations and typed next operations.
- Added semantic pointer and keyboard targets across all fourteen workspaces. Hover/focus previews context; click/Enter/Space commits it; preview does not reroute or recompute the active mission.
- Added responsive desktop rail, tablet sheet and mobile bottom-sheet behavior, minimum touch targets for Mission controls, reduced-motion compliance and a compact focus-mode status ribbon.
- The rebuilt application started through `pnpm dev` and returned HTTP 200 with a 759,010-byte server response containing `MISSION INTELLIGENCE` and `Forecast Scientist`; the server logged a clean 200 request.
- Browser screenshot/DOM automation was not performed because the Sites workflow requires an explicit browser-testing request. Source, TypeScript, lint, SSR smoke, live HTTP and production-build evidence are complete; manual visual acceptance remains listed below.

Mission Intelligence manual acceptance additions:

1. Open each workspace and confirm the specialist changes automatically without a specialist picker.
2. Select a cloud interval, forecast model, array, battery interval, financial value and provenance node; confirm the object label, specialist and evidence references change together.
3. Change panel tilt; confirm Scientific Continuity identifies the earlier base or annual-study artifact and offers a recomputation operation rather than using it silently.
4. Open Memory; confirm it describes device-local scientific working memory and contains scenario/artifact/investigation events rather than messages.
5. At tablet and phone widths, confirm `MISSION / CONTEXT` opens the side/bottom sheet and all four console modes remain keyboard and touch accessible.
6. Confirm the interface contains no chat bubbles, assistant avatar, greeting, typing indicator or unrestricted prompt field.

### Premium visual-system release — 2026-07-22

- Replaced the high-saturation cyan-heavy scheme with warm obsidian, smoked mineral green, champagne-gold, mineral teal, soft ivory, muted sapphire, sage, coral, and aubergine semantic tokens.
- Rebuilt the daylight theme as a warm parchment/mineral system with stronger text and accent contrast.
- Replaced Geist with locally bundled, self-hosted Next font assets: Instrument Sans for brand, headings, and explanatory prose; Intel One Mono for units, timestamps, controls, tables, and numeric telemetry.
- Added refined layered instrument surfaces, restrained ambient illumination, stronger focus rings, clearer disabled states, tabular numerals, and small-text floors without changing workspace geometry.
- Made annual chronology, Production DNA, Solar Orbital Timeline, and micro-trace canvases read live theme tokens, use the telemetry font, and redraw after theme or font changes.
- Kept the Digital Twin, atmosphere field, and regional globe as deliberately dark analytical insets in both themes so their labels remain legible.
- Recoloured the favicon and manifest and replaced the social preview with one inspected 1200×630 brand asset using the finished palette and typography direction.

Post-change validation passed: strict TypeScript, lint, 10/10 scientific tests, a fresh production build, 5/5 release smoke tests, whitespace/error checks, and a legacy-palette source scan. No scientific model, dataset, provider, API, schema, or lifecycle classification changed in this visual release.

Automated browser inspection was not repeated for this release because the Sites workflow reserves browser automation for an explicit browser-testing request, and the prior browser-control surface was already blocked by its safety policy. The generated social card itself was inspected at full resolution. The manual acceptance checklist below remains the visual sign-off path.

The in-app browser successfully verified the desktop application at 1280×720 before publication:

- all 14 workspace navigation controls produced the correct visible heading;
- the DC-capacity step control changed 48.0 to 48.1 kWp, changed linked hourly/annual production, displayed `SIMULATED`, exposed the screening limitation, and enabled reset;
- reset restored the scientific base configuration;
- inspector `inspect`, `compare`, `losses`, and `provenance` views activated the correct content;
- observatory/daylight theme switching worked;
- command palette opened and closed with accessible controls;
- annual replay changed to pause state and advanced the linked cursor;
- day stepping updated the inspector and orbital timeline together;
- focus mode entered and exited correctly;
- moving the annual chronology to 02 Jan 07:30 produced `data-solar-phase="night"` and the night analytical atmosphere;
- the browser console was clean after the compact annual transport replaced the oversized nested RSC payload.

The final accessibility/responsive audit then found and fixed these additional issues:

- global Space no longer steals keyboard activation from buttons or sliders;
- mobile SSR starts with the inspector closed; desktop opens it only after viewport detection;
- mobile focus mode keeps the primary workspace in column 1;
- saved workspaces now restore validated workspace, bounded scenario, selected hour, and inspector tab;
- weather and battery hourly fields now update the shared cursor;
- hidden rail/inspector controls are conditionally unmounted instead of remaining focusable;
- inspector tabs now use roving tab stops, linked tabpanels, arrow/Home/End navigation;
- dialogs trap and restore focus and expose labelled close controls;
- annotation creation is available from the command palette at compact widths;
- coordinates use correct N/S/E/W notation;
- scenario orientation response is normalized relative to the imported base configuration;
- Digital Twin battery flow uses the scenario battery capacity;
- scenario controls use larger desktop and touch targets;
- mobile retains compact lifecycle, quality/network, and non-guarantee status;
- sample replay is explicitly a modelled scenario-to-base delta, not a fabricated observed forecast error.

TypeScript, lint, all tests, and the production build passed after those fixes.

### Browser-policy limitation

After the final code changes, the browser-control surface rejected both local reload and the deployed URL under its safety policy. No workaround was attempted. Therefore the final corrected mobile/tablet pixels and production console were not re-inspected through automation. This is the only outstanding release-acceptance check; it is not a failed build or deployment.

Manual acceptance checklist:

1. Open the private production URL while signed into the owner workspace; confirm the observatory theme uses warm obsidian/ivory/champagne/mineral colours and the daylight theme uses warm parchment with legible accents.
2. At phone width, confirm the inspector is closed initially, `SCENARIO / INSPECT` opens it, Close returns to the workspace, and the bottom lifecycle strip remains legible.
3. At tablet width, confirm the inspector behaves as a drawer and the primary stage/orbital deck do not overflow.
4. Focus `Increase DC CAPACITY`, press Space, and confirm it increments without starting replay.
5. Enter/exit Focus on phone and confirm the main workspace remains visible.
6. Open the command palette, choose `Annotate linked hour`, attach a note, save the workspace, refresh, and confirm restoration.
7. Open Weather and Battery workspaces and confirm an hourly cell changes the shared linked time.
8. Review the browser console for errors/warnings.

## 5. Implementation map

### Scientific core

- `lib/solar/`: solar position; clear-sky irradiance; POA direct/diffuse/reflected/rear components; tracking and bifacial approximations; AOI; Faiman temperature; explicit losses; degradation; inverter/clipping; annual simulation.
- `lib/energy/`: demand, battery dispatch, self-consumption, grid import/export, curtailment, tariffs, carbon, reliability, unit helpers.
- `lib/representative-year/`: Finkelstein–Schafer-inspired whole-month 2022–2025 selection with empirical-CDF, persistence, continuity, source-year weights and corrected target chronology. It does not average four annual totals and call the result typical.
- `lib/forecasting/`: seasonal naive, moving average, exponential smoothing, ridge meteorological regression, physical/hybrid probabilistic ensemble, metrics, interval calibration, rolling-origin evaluation, registry/version status.
- `lib/optimisation/`: executable grid search, Pareto filtering, seeded Monte Carlo, sensitivity and stress methods.
- `lib/operating-snapshot.ts`: typed integration boundary used by the UI and `/api/v1/simulate`.

### Data platform

- `lib/providers/`: deterministic sample, Open-Meteo, and PVGIS adapters; validation; UTC/unit normalization; missing/outlier handling; quality; bounded retry/backoff; cache; semantic fallback; scheduled ingestion.
- `lib/research/`: strict 2022–2025 archive eligibility, provider-to-science conversion, representative-year study orchestration, chronological model evidence, annual uncertainty and reproducible study identity.
- `lib/provenance/`: canonical hashes, manifests, lineage, content-addressed optional R2 storage.
- `db/schema.ts` plus `drizzle/`: 12-table D1 operational schema and generated migration.
- `.env.example`: safe optional provider/runtime settings; no secrets.
- `worker/index.ts`: app Worker, image optimisation, security headers, and failure-signalling scheduled hook.

### Versioned APIs

- `GET /api/v1/health`
- `GET /api/v1/weather`
- `POST /api/v1/simulate`
- `GET /api/v1/provenance`
- `GET /api/v1/studies/annual?mode=sample|live`
- `GET|POST /api/v1/scenarios`
- `GET|PUT|DELETE /api/v1/scenarios/:id`

### Workspaces

1. Solar Digital Twin Operations
2. Annual Energy Forecast Observatory
3. Weather and Atmosphere Command Centre
4. Forecast Model Laboratory
5. Forecast Replay and Validation Centre — `SIMULATED` scenario-delta replay in sample mode
6. Solar Array Engineering Studio
7. Scenario and Resilience Simulator
8. Battery and Energy-Flow Optimisation Centre
9. Regional Solar Intelligence Map
10. Climate and Long-Horizon Analysis
11. Financial and Investment Observatory
12. Data Provenance and Scientific Audit Centre
13. Research Publication Studio
14. Executive Mission Control

All share location, annual dataset, selected hour, configuration, scenario, uncertainty, and provenance state.

## 6. Scientific status boundary

### Implemented and executable

- deterministic annual sample simulation;
- on-demand four-year Open-Meteo reanalysis acquisition through the same annual-study boundary, without simulated fallback;
- physics, loss-chain, battery/grid, revenue and carbon calculations;
- representative-year construction and four-year comparison;
- baseline/ridge/physical/hybrid evaluation and intervals;
- grid/Pareto/Monte Carlo optimisation methods;
- provider adapters, fallback, quality, provenance, APIs, schema/migration, and job hook;
- all 14 linked workspaces and global interaction state.

### Experimental or simulated

- reanalysis-conditioned and sample-mode production remain physics-derived estimates until measured plant data are attached;
- generic electrical and loss coefficients;
- client-side scenario screening surrogate;
- empirical proving intervals;
- sample replay as scenario delta rather than measured residual.

### Planned and intentionally not fabricated

- trained ARIMA/SARIMA, random forest, gradient boosting, TCN, LSTM, Transformer, and physics-informed neural models with real tracked artifacts;
- operational Copernicus/ERA5 and ECMWF bulk ingestion;
- calibrated satellite-cloud product and archived issue-time forecast replay;
- GIS terrain/horizon meshes and true regional ranking;
- production Bayesian/robust/scenario-tree solver services;
- authenticated project-scoped Mission Intelligence memory, immutable finding persistence and authoritative recalculation registration; current memory is explicitly device-local;
- commissioned plant telemetry, IEC-grade electrical design, and bankable certification.

## 7. Remaining work

Instrument 06 code, tests and build gates are complete. The native Sites record supplies exact-source deployment evidence. GitHub alert reconciliation and the remaining manual device/assistive-technology acceptance work remain explicit follow-up items; the expired security exception has been removed.

Department-led engineering should proceed in this order:

1. `TWIN + EXPERIENCE + ARCH + QA`: after Instrument 06 release acceptance, await the user’s next layer of work. Any Instrument 07 increment must preserve Instruments 01–06, renderer-neutral frame contracts, navigation/state, one-frame ownership, typed handoffs, HTML authority and explicit unavailable-layer policy.
2. `DATA + RESEARCH + FORECAST + QA`: add a versioned production-meter/inverter adapter, align availability/outage evidence, and run external validation against the physics-derived and statistical targets.
3. `DATA + ARCH + SECOPS`: persist immutable annual snapshots, configure scheduled ingestion, and verify recovery plus provider-capacity behavior.
4. `FORECAST + RESEARCH + QA`: add archived issue-time weather forecasts and run genuine forecast backtests before promoting any model to champion.
5. `ARCH + EXPERIENCE + FEATURES + TWIN`: split the four UI merge hotspots behind typed state/workspace/scene contracts without changing behavior.
6. `MI + ARCH + QA + SECOPS`: persist project-scoped scientific memory and expand adversarial evidence/staleness tests without introducing chat or bypassing deterministic grounding.

Each department's detailed backlog, boundaries, measures and escalation rules live in `governance/departments/`.

Required before treating results as production/financial truth:

1. Complete the short manual visual checklist in section 4.
2. Configure and observe the hosting-control-plane ingestion schedule if live refresh is required.
3. Attach calibrated measured production, meter, and availability data.
4. Run an archived issue-time forecast backtest against observations.
5. Complete provider licence/capacity review, tenant/security review, restore exercise, load/failover testing, and site/electrical engineering validation.
6. Train/version the planned statistical and deep-learning challengers only when genuine datasets and reproducible evaluation artifacts exist.
7. Reconcile GitHub's current Dependabot state after the October lockfile update and review the three remaining moderate tooling advisories as owner packages become compatible.

## 8. Restart commands

```bash
export PATH="/Users/alrey/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/alrey/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
pnpm install --frozen-lockfile
pnpm run security:audit
pnpm run test:departments
pnpm run test:science
pnpm run test:research
pnpm run test:mission
pnpm run test:visual
pnpm exec tsc --noEmit
pnpm run lint
pnpm test
pnpm run dev
```

The local URL is `http://localhost:3000`. Do not add private keys to source. Preserve the lifecycle boundary: executable tested code may be `IMPLEMENTED`; proving/scenario output is `SIMULATED`; unresolved research methods are `EXPERIMENTAL`; untrained/deferred methods stay `PLANNED`.

## 9. Documentation inventory

- `README.md`
- `IMPLEMENTATION_PLAN.md`
- `GOVERNANCE.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `governance/README.md`
- `governance/departments.json`
- `governance/security-exceptions.json`
- `governance/WORKSPACE_OWNERSHIP.md`
- `governance/INTERFACE_CONTRACTS.md`
- `governance/DECISION_PROCESS.md`
- `governance/departments/*.md` (13 department charters)
- `docs/ARCHITECTURE.md`
- `docs/HELIOS_ARCHITECTURE.md`
- `docs/MISSION_INTELLIGENCE.md`
- `docs/SCIENTIFIC_METHODS.md`
- `docs/MODEL_VALIDATION.md`
- `docs/DATA_PROVIDERS.md`
- `docs/DATA_PROVENANCE.md`
- `docs/LIMITATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RECOVERY.md`
- `docs/SECURITY.md`
- `docs/THREAT_MODEL.md`
- `docs/adr/README.md`
- `docs/adr/0001-dependency-security-release-gate.md`
- `docs/adr/0002-helios-renderer-boundary.md`
- `docs/scientific-decisions/README.md`
- `docs/RESEARCH_ROADMAP.md`
- `docs/RESEARCH_SPINE.md`
- `docs/PERFORMANCE.md`
- `research/README.md`

This file is the canonical continuity ledger. Update it after any future model, provider, schema, deployment, validation, or scientific-status change.
