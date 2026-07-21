# Solar Intelligence OS — continuity and handoff ledger

**Last updated:** 2026-07-21 (Europe/London)  
**Repository:** `/Users/alrey/Documents/smit final project 2`  
**Purpose:** this is the restart point if the active Codex session or usage allowance ends. It records what exists, what has been proven, what remains, and the exact next order of work.

## 1. Current outcome

The repository has been transformed from the supplied Sites starter into a working Solar Intelligence Operating System. It now contains:

- a strict-TypeScript Next/Vinext/React application;
- a deterministic, credential-free 8,760-hour scientific sample mode;
- solar geometry, irradiance, electrical-loss, battery/grid, representative-year, forecasting, uncertainty, and optimisation modules;
- provider adapters, fallback policy, validation, caching, retries, provenance, immutable snapshot support, scheduled ingestion, D1 schema, and migration;
- versioned APIs;
- one linked operating shell containing all 14 requested workspaces;
- scientific, architecture, provider, provenance, deployment, security, recovery, validation, and limitations documentation.

This is not presented as a commissioned plant prediction. Sample weather and production are visibly labelled simulated; estimates are explicitly not guaranteed.

## 2. Verified now

### Completed verification

- `tsc --noEmit`: **PASS**, zero diagnostics after removal of the disposable starter preview.
- `pnpm run lint`: **PASS**, zero errors and zero warnings after the final scenario-control edit.
- `pnpm run test:science`: **PASS**, 9/9 tests.
- `pnpm run test:smoke`: **PASS**, 5/5 tests. These now cover the full-year simulation API, invalid bounds, all 14 workspace registrations, scientific-status language, built assets, worker safeguards, hosting bindings, the migration, bundle budget, and documentation inventory.
- Scientific tests cover:
  - NOAA-style solar geometry and day/night behavior;
  - clear-sky irradiance;
  - POA transposition and explicit ASHRAE angle-of-incidence modifier;
  - Faiman temperature response;
  - deterministic 8,760-hour sample years;
  - representative-year day selection and source weights;
  - battery energy conservation and state limits;
  - regression, forecast metrics, and rolling-origin validation;
  - Pareto filtering and seeded Monte Carlo;
  - provider UTC/unit/fallback semantics;
  - the integrated annual operating snapshot.
- Provider/data focused checks completed during implementation:
  - deterministic manifest hashing;
  - live-provider failure to explicitly labelled simulation fallback with attempt lineage;
  - no-D1 scheduler no-op behavior;
  - no-R2 explicit snapshot-store status;
  - invalid simulation bounds rejected;
  - generated migration applied to SQLite with no foreign-key failures.
- `pnpm test`: **PASS after all final source edits**. It completed the 9-test science/provider suite, a fresh five-environment production build, and the 5-test API/artifact smoke suite in sequence.
- Final production build output: workspace client module **85,211 bytes uncompressed**; complete `dist` tree **2.5 MB**.
- Desktop browser inspection at 1280×720: **PASS after fixes** for the Annual Forecast Observatory. The shell rendered with the linked chronology, confidence galaxy, Production DNA, representative-year comparison, inspector and orbital timeline.
- All 14 workspace navigation buttons were clicked in sequence: **14/14 headings present and visible**.
- Desktop browser console was clean after the compact transport and a fresh server start; the earlier `Network connection lost` condition was traced to an oversized nested RSC payload plus stale hot-reload state, not a model failure.
- Top-level geometry after repair: the 1280×720 shell, header and orbital deck no longer overflow their fixed viewport.
- Typography-token fault found and fixed: `--font-mono`/`--font-sans` are now resolved on `body`, where the dynamically supplied Geist variables exist.
- Browser transport performance defect found and fixed: the canonical API still exposes the full nested 8,760-hour record, while the UI receives the versioned `sios-hour-tuple-v1` projection from `lib/client-snapshot.ts`. Development document responses dropped from tens of seconds/disconnections to roughly 2.5–3.2 seconds including the deterministic annual calculation.

### Still to be rerun by the primary integration pass

- a clean local-server restart, then browser verification that `Increase DC CAPACITY` changes annual output, displays `SIMULATED`, enables reset, and that reset restores the base state;
- inspector tabs, theme, command palette, replay, annotations, focus mode, offline event, night cursor and low-confidence state;
- mobile and tablet viewport inspection, keyboard traversal and final console log review;
- exactly one generated/inspected OG image and metadata wiring;
- Sites deployment and deployed-URL smoke check.

The clean server restart was attempted at the end of the 2026-07-21 session and was rejected because the Codex weekly allowance had been exhausted. The reported reset time was **2026-07-28 18:07 Europe/London**. No workaround was attempted.

## 3. Functional implementation map

### Scientific core — implemented

- `lib/solar/`: solar position, sunrise/sunset inputs, clear-sky irradiance, POA direct/diffuse/reflected/rear components, tracking approximation, AOI modifier, Faiman temperature, losses, degradation, inverter/clipping, annual simulation.
- `lib/energy/`: hourly demand, battery dispatch, tariff, grid import/export, curtailment, carbon, unit helpers.
- `lib/representative-year/`: whole-day multivariate selection from 2022–2025 with monthly construction records and source-year weights. It does not simply average the four years.
- `lib/forecasting/`: seasonal naive, moving average, exponential smoothing, ridge meteorological regression, physical and hybrid probabilistic ensemble, metrics, rolling-origin evaluation, registry/version status.
- `lib/optimisation/`: executable grid search, Pareto analysis, seeded Monte Carlo, sensitivity/stress scenario support.
- `lib/operating-snapshot.ts`: integrates the above into a typed 8,760-hour snapshot used by the application and `/api/v1/simulate`.

### Data platform — implemented

- `lib/providers/`: sample, Open-Meteo, and PVGIS adapters; query parsing; schema/unit/time normalization; validation; quality; caching; retries/backoff; fallback semantics; scheduled ingestion.
- `lib/provenance/`: canonical hashing, manifest creation, lineage, optional immutable R2 storage.
- `db/schema.ts` and `drizzle/0000_wealthy_johnny_storm.sql`: 12-table operational schema and migration.
- `.env.example`: safe environment configuration; no secrets or hard-coded keys.
- `.openai/hosting.json`: D1 `DB` and R2 `SNAPSHOTS` declarations.
- `worker/index.ts`: application worker, security headers, and scheduled-ingestion hook.

### Versioned APIs — implemented

- `GET /api/v1/health`
- `GET /api/v1/weather`
- `POST /api/v1/simulate`
- `GET /api/v1/provenance`
- `GET|POST /api/v1/scenarios`
- `GET|PUT|DELETE /api/v1/scenarios/:id`

Mutation routes use the repository's authentication/role helpers where applicable. Local sample mode remains usable without private credentials.

### Product workspaces — implemented shell and data-connected instruments

All workspaces live in one linked mission-control shell under `components/solar-os/`:

1. Solar Digital Twin Operations
2. Annual Energy Forecast Observatory (default)
3. Weather and Atmosphere Command Centre
4. Forecast Model Laboratory
5. Forecast Replay and Validation Centre
6. Solar Array Engineering Studio
7. Scenario and Resilience Simulator
8. Battery and Energy-Flow Optimisation Centre
9. Regional Solar Intelligence Map
10. Climate and Long-Horizon Analysis
11. Financial and Investment Observatory
12. Data Provenance and Scientific Audit Centre
13. Research Publication Studio
14. Executive Mission Control

The shell includes linked year/hour state, Canvas chronology and Production DNA, orbital timeline/replay, scenario recomputation, inspector tabs, loss waterfall, provenance, annotations, saved views, command palette, shortcuts, focus mode, daylight/observatory themes, responsive layouts, reduced-motion handling, confidence/sample markers, and explicit implementation-status labels.

## 4. Status boundaries

### Implemented and executable

- deterministic sample annual simulation;
- physics and energy-flow pipeline listed above;
- representative-year construction and four-year comparison;
- baseline/ridge/physical/hybrid model evaluation;
- interval output and validation metrics;
- grid/Pareto/Monte Carlo optimisation methods;
- Open-Meteo/PVGIS provider paths and controlled sample fallback;
- persistence schema, provenance manifests, APIs, scheduled job hook;
- all 14 navigable analytical workspaces and cross-linked state.

### Experimental

- representative year is built from deterministic proving data until measured/reanalysis snapshots are ingested;
- physical model uses generic coefficients and simplified site geometry;
- scenario recomputation in the browser is a transparent sensitivity surrogate, not a replacement for the server physics run;
- historical “observations” in sample mode are synthetic validation targets;
- probabilistic intervals are empirical proving intervals, not site-calibrated guarantees.

### Planned / intentionally not fabricated

- trained ARIMA/SARIMA, random forest, gradient boosting, TCN, LSTM, Transformer, and full physics-informed neural models;
- calibrated satellite cloud products and operational ECMWF ingestion beyond the documented adapter architecture;
- GIS terrain/horizon meshes, neighbouring-site regional ranking, and true 3D/WebGPU terrain;
- Bayesian optimiser service and full robust/scenario-tree solver;
- commissioned plant telemetry, site-specific soiling/snow calibration, IEC-grade electrical design, and bankable yield certification;
- external identity-provider configuration and production operations credentials.

These appear as `PLANNED` or `EXPERIMENTAL` in the interface and model registry rather than as fake metrics.

## 5. Documentation inventory

- `README.md` — product, quick start, workspaces, architecture, APIs, persistence, deployment.
- `IMPLEMENTATION_PLAN.md` — repository audit and vertical-slice plan written before implementation.
- `docs/ARCHITECTURE.md`
- `docs/SCIENTIFIC_METHODS.md`
- `docs/MODEL_VALIDATION.md`
- `docs/DATA_PROVIDERS.md`
- `docs/DATA_PROVENANCE.md`
- `docs/LIMITATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RECOVERY.md`
- `docs/SECURITY.md`
- `docs/RESEARCH_ROADMAP.md`
- `research/README.md`

## 6. Exact commands

Use the bundled runtime in this Codex workspace:

```bash
export PATH="/Users/alrey/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/alrey/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
pnpm install
pnpm run test:science
./node_modules/.bin/tsc --noEmit
pnpm run build
pnpm run test:smoke
pnpm run dev
```

The local application is then available at `http://localhost:3000`.

## 7. Remaining work — ordered, not optional for final handoff

1. Start a fresh development server. Do not reuse the stopped/hot-reloaded process from 2026-07-21.
2. Verify the final accessible scenario step controls:
   - click `Increase DC CAPACITY`;
   - confirm the displayed capacity and annual generation both change;
   - confirm `SIMULATED` and the disclosure appear;
   - confirm reset becomes enabled and restores the exact base values.
3. Finish browser QA:
   - inspector tabs, daylight theme, command palette, replay, focus, annotation and saved-view interactions;
   - offline event, night cursor, low-confidence and empty/error routes;
   - tablet and mobile breakpoints, keyboard order, focus visibility, reduced motion and overflow;
   - final error/warning console read.
4. Fix any observed interaction, accessibility, rendering, or overflow defect; rerun `pnpm test`, `pnpm run lint`, and `tsc --noEmit` after every code change.
5. Generate exactly one OG/social preview image, inspect it, store it at `public/og.png`, and wire host-derived absolute metadata.
6. Read and follow the Sites hosting skill, deploy, smoke-test the deployed URL, and record the URL in `README.md` and this ledger.

## 8. Known immediate risks to check

- The compact tuple transport is implemented, desktop-proven, and included in a passing final production build/test gate.
- The accessible `−`/`+` scenario step controls compile and lint clean, but were added immediately before the blocked clean restart and have not yet been browser-click verified.
- Direct automation of native range sliders did not emit React change events in the in-app test surface. This led to the accessible step-button addition; it is not evidence that manual range interaction is broken.
- Worker scheduling and R2 integration compiled and built before the final two UI/transport edits. Reconfirm in the next full build.
- No hosted URL or final social image exists yet.

## 9. Restart instruction

If work resumes in a new session, read this file, `IMPLEMENTATION_PLAN.md`, and `README.md` first. Start at section 7, item 1. Do not rebuild completed architecture or replace the implemented stack. Preserve the explicit scientific-status boundary: real calculations and adapters may be `IMPLEMENTED`; deterministic proving data are `SIMULATED`; untrained/deferred research models remain `PLANNED`.
