# Solar Intelligence OS — completion, evidence, and continuity ledger

**Last updated:** 2026-07-22 11:46 BST (Europe/London)
**Workspace:** `/Users/alrey/Documents/smit final project 2`
**Private production URL:** https://solar-intelligence-os.vaikartana-revanta.chatgpt.site
**Private GitHub source:** https://github.com/DasadiaSmit/solar-intelligence-operating-system
**Recoverable baseline branch:** `main`
**Active release branch:** `agent/research-spine-v1`
**Purpose:** authoritative restart and handoff record. If a future task resumes this project, read this file before changing code.

## 1. Current outcome

Solar Intelligence Operating System is implemented as a working research and decision-support application, not a static mock-up. It provides:

- a strict-TypeScript Next 16 / React 19 / Vinext application targeting a Cloudflare Worker;
- a deterministic, credential-free, offline-capable 8,760-hour annual proving dataset;
- tested solar geometry, irradiance, module-temperature, DC/AC, loss-chain, battery, grid, tariff, carbon, representative-year, forecasting, uncertainty, and optimisation calculations;
- versioned APIs, provider adapters, data-quality/provenance contracts, D1 persistence, migrations, optional immutable R2 snapshots, and a scheduled-ingestion handler;
- one linked mission-control shell containing all 14 requested workspaces;
- a premium obsidian/champagne/mineral visual system using Instrument Sans for editorial interface text and Intel One Mono for scientific telemetry;
- responsive observatory/daylight visual states, theme-aware scientific canvases, shared timeline/replay, scenario branching, keyboard commands, annotations, saved views, status boundaries, and scientific provenance;
- research, architecture, provider, provenance, validation, security, deployment, recovery, performance, and limitation documentation;
- a machine-checked 13-department operating model with charters, owned boundaries, workspace accountability, shared contracts, decision records, GitHub issue forms, review template, CI and dependency monitoring;
- a private production deployment and a credential-free sample mode.

The application never describes simulated sample production as measured truth or guaranteed output.

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
- `main` is the recoverable production baseline; the department operating model was merged through PR #1, and the research-spine upgrade is isolated on `agent/research-spine-v1` pending its own review.
- Thirteen departments have stable IDs, charters, exclusive primary-path accountability, shared review paths, first deep-work programmes and evidence gates.
- Every one of the 14 application workspaces has exactly one accountable domain department and named contributors.
- PET means **Photovoltaic Evidence & Triage**. The assistant remains explicitly planned; no model, chat API, conversation store or fabricated assistant behavior has been added.
- GitHub governance now includes CODEOWNERS, private vulnerability reporting, structured issue forms, a pull-request evidence template, Dependabot configuration and four CI gates.
- GitHub is the source of record, not the only backup; D1, R2, provider snapshots and model artifacts still require the documented recovery process.

## 3. Final automated evidence

All of the following passed after the last functional and metadata changes:

- `pnpm run test:departments`: PASS, 3/3 registry/governance fitness tests.
- `pnpm exec tsc --noEmit`: PASS, zero diagnostics.
- `pnpm run lint`: PASS, zero warnings/errors.
- `pnpm run test:science`: PASS, 10/10.
- `pnpm run test:research`: PASS, 11/11.
- `pnpm run test:smoke`: PASS, 5/5.
- `pnpm test`: PASS, 29/29 tests across governance, science, research, and release smoke suites, including a fresh five-environment Vinext production build.
- Final build includes all eight application/API routes and the Worker entry point.

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

API/artifact coverage includes:

- complete, labelled, reproducible simulation output;
- rejection of invalid engineering bounds;
- all 14 workspace registrations and honest lifecycle/status language;
- deployable Worker output, hosting bindings, migration, and safeguards;
- required scientific and continuity documentation.
- 13 unique department records and charters, 14 accountable workspace mappings, resolvable ownership paths, valid cross-department references, GitHub evidence templates and private security routing.

## 4. Interaction and visual evidence

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
- PET Assistant model orchestration, conversation persistence and confirmable tools; the department and safety boundary exist, but no assistant behavior is fabricated;
- commissioned plant telemetry, IEC-grade electrical design, and bankable certification.

## 7. Remaining work

No known source-code, test, build, packaging, or deployment blocker remains.

Department-led engineering should proceed in this order:

1. `DATA + RESEARCH + FORECAST + QA`: add a versioned production-meter/inverter adapter, align availability/outage evidence, and run external validation against the physics-derived and statistical targets.
2. `DATA + ARCH + SECOPS`: persist immutable annual snapshots, configure scheduled ingestion, and verify recovery plus provider-capacity behavior.
3. `FORECAST + RESEARCH + QA`: add archived issue-time weather forecasts and run genuine forecast backtests before promoting any model to champion.
4. `ARCH + EXPERIENCE + FEATURES + TWIN`: split the four UI merge hotspots behind typed state/workspace/scene contracts without changing behavior.
5. `PET + ARCH + QA + SECOPS`: build deterministic evidence tools and adversarial evaluations before any remote model integration.

Each department's detailed backlog, boundaries, measures and escalation rules live in `governance/departments/`.

Required before treating results as production/financial truth:

1. Complete the short manual visual checklist in section 4.
2. Configure and observe the hosting-control-plane ingestion schedule if live refresh is required.
3. Attach calibrated measured production, meter, and availability data.
4. Run an archived issue-time forecast backtest against observations.
5. Complete provider licence/capacity review, tenant/security review, restore exercise, load/failover testing, and site/electrical engineering validation.
6. Train/version the planned statistical and deep-learning challengers only when genuine datasets and reproducible evaluation artifacts exist.

## 8. Restart commands

```bash
export PATH="/Users/alrey/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/alrey/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
pnpm install
pnpm run test:departments
pnpm run test:science
pnpm run test:research
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
- `governance/WORKSPACE_OWNERSHIP.md`
- `governance/INTERFACE_CONTRACTS.md`
- `governance/DECISION_PROCESS.md`
- `governance/departments/*.md` (13 department charters)
- `docs/ARCHITECTURE.md`
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
- `docs/scientific-decisions/README.md`
- `docs/RESEARCH_ROADMAP.md`
- `docs/RESEARCH_SPINE.md`
- `docs/PERFORMANCE.md`
- `research/README.md`

This file is the canonical continuity ledger. Update it after any future model, provider, schema, deployment, validation, or scientific-status change.
