# Solar Intelligence Operating System

Solar Intelligence Operating System is a research application for modelling a complete photovoltaic year and inspecting the assumptions behind energy estimates and array decisions.

It is not a short-form solar calculator. The application runs an explainable 8,760-hour physics and energy-flow model, constructs a transparent 2022–2025 short-record representative composite, compares reproducible forecast baselines, quantifies uncertainty, exposes provenance, and links every result across 14 operational workspaces.

The original research objective remains the critical path: a complete-year, time-series-based photovoltaic estimate using 2022–2025 weather and radiation evidence. The implemented annual-study route now acquires each source year through the canonical provider boundary, builds four historical simulations and a representative year, and evaluates models with 2022–2023 training, 2024 calibration and retrospective 2025 evaluation (now previously inspected). Field validation remains pending until measured plant production is attached. See the [full research-spine specification](docs/RESEARCH_SPINE.md).

## Verified assessment release

This repository includes the application published privately as **Sites version 20** on 25 October 2026, based on source `869cb1310894ba6d1827b2e6ff4a557f5c5a800f`. The package retains that application behaviour and adds portable research evidence and reproduction instructions.

- Annual Energy shows the fixed Sheffield 48 kWp source-year sensitivity: **49,248.56 kWh** baseline, **47,150.23–51,936.45 kWh** omission range.
- Array Engineering compares selected designs across all four historical years. Within the nine-option grid, the 42° south-facing option wins all four years; the robust rule adds **zero regret reduction**.
- Research Publication exports the selected evidence as readable HTML, Markdown, JSON and CSV, with source identity and limitations.
- The 231 application checks, typecheck, lint and production build are documented in [release evidence](docs/research/ASSESSMENT_PACKAGE.md). The original three studies remain frozen.

Start with [RUN_ME.md](RUN_ME.md) for installation, the live demonstration route and offline report reproduction. The [research evidence guide](research-evidence/README.md) distinguishes physical-model agreement, source sensitivity and report information. The main academic report and personal course records are outside this repository and outside the artefact ZIP.

## What works

- Full-year hourly solar position, irradiance, module temperature, DC/AC conversion, inverter clipping, and explicit loss chain.
- Battery dispatch, self-consumption, import/export, curtailment, tariffs, carbon, and reliability accounting.
- Deterministic 2022–2025 sample weather and production scenarios that work offline without credentials.
- Open-Meteo and PVGIS/JRC provider adapters with validation, retries, safe fallback, quality scoring, and provenance.
- A fail-closed Open-Meteo 2022–2025 reanalysis route (ERA5 by default) using the same canonical-to-science boundary as offline sample mode.
- Short-record representative-year construction without averaging four years into a false “typical” year.
- Seasonal-naive, moving-average, exponential, regression, hybrid, and probabilistic ensemble methods.
- Rolling-origin metrics, calibration/coverage, and clear separation of simulated reference agreement from measured validation.
- Grid search, Pareto filtering, seeded Monte Carlo, sensitivity, and stress scenarios.
- A responsive observatory interface with linked timeline, Solar Production DNA, explicitly labelled model bands, replay, scenarios, engineering, battery, model, provenance, financial, regional, publication, and mission-control views.
- Mission Intelligence Core: a deterministic, evidence-gated cognitive layer with fourteen automatically routed domain specialists, object-aware scientific context, traceable workflow, structured working memory, and no chat or language-model dependency.
- Milestone 4 Instruments 01–06 inside the same persistent, lazy Hero/Observatory canvas. Position 01 preserves the fail-closed Solar Digital Twin schematic and its exact-hour `DT` handoff. Position 02 adds a static Atmospheric Observation transfer schematic from an exact canonical representative-hour `AtmosphericObservationFrameV1`, with `SIMULATED` lifecycle, unit-bearing weather/irradiance/AC facts, quality, provenance and a typed `WA` handoff at the same hour.
- Position 03 adds Annual Energy Observatory from an exact, fail-closed `AnnualEnergyFrameV1`: all 8,760 unrounded canonical hourly AC values and quality scores, a contiguous no-leap calendar, reconciled monthly/northern-or-southern-season/annual totals, explicit provenance and a typed `AF` handoff. Only energy and quality are serialized as hourly columns; chronology and month are reconstructed from the versioned calendar.
- Position 04 adds Solar Array Engineering from a fail-closed `ArrayEngineeringFrameV1`: exact configured/resolved orientation, authoritative Sun and incidence geometry, linked irradiance/conversion/loss evidence, annual base output, quality and provenance, followed by a typed `AE` handoff to the existing HTML screening controls.
- Position 05 adds Scenario Comparison from a fail-closed `ScenarioComparisonFrameV1`: one configured baseline plus the four existing canonical deterministic annual stress summaries, exact generation/value/local-supply deltas, assumptions, provenance and unavailable-layer records, followed by a typed same-index `SR` handoff. Its five normalized chambers are a comparison scale, not five observed or same-time weather systems.
- Position 06 adds Battery & Energy-Flow from `BatteryEnergyFlowFrameV1`, built from the full canonical snapshot. It replays all 8,760 dispatch records, reconciles PV, demand, SOC and annual ledgers, and presents the exact linked record and UTC day with eleven explicit unavailable layers. Its static logical routing schematic stays behind a reached-only import. The typed `BE` handoff preserves the linked index and scenario branch, then focuses the selected interval.
- The atmospheric frame treats weather, irradiance and modelled AC energy as coincident one-hour evidence, not proof of instant cloud-to-power causality. The annual P10/P50/P90 values are an empirical four-source-year spread (`n = 4`), not a calibrated probabilistic interval, issued forecast or guarantee. Array settings do not alter astronomical Sun geometry; module count, module efficiency, named inverter selection and physical moving shadows remain unavailable because the required equipment and surveyed geometry do not exist. Scenario Comparison is one homogeneous `stress-summary` mode, not authoritative Sunny/Cloudy/Dust/Extreme Heat/Storm counterfactuals: same-time alternate weather, dust chronology, validated heatwave/storm definitions, hourly stress paths, probabilities, spatial microclimate, structural risk, measured/live response and issued forecasts remain unavailable. Instruments 01–05 persist at subdued emphasis while Instrument 06 forms; position 07 remains a placeholder and 08–14 remain reserved.
- Versioned APIs, D1 schema/migration, health reporting, optional workspace identity, audit-ready records, and deterministic sample mode.

Advanced deep-learning and large meteorological ingestion pipelines are represented honestly as research extension points; the application does not invent training runs or performance metrics.

## Quick start

Requirements: Node.js 22.13+ and pnpm 11+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. No API keys or database are required for sample mode.

## Private production deployment

The validated owner-only production release is available at [solar-intelligence-os.vaikartana-revanta.chatgpt.site](https://solar-intelligence-os.vaikartana-revanta.chatgpt.site). The hosted application starts in the same explicitly simulated, credential-free sample mode as the local build; live providers remain optional and no API key is embedded in the release.

Run validation:

```bash
pnpm test
```

The private source of record is [DasadiaSmit/solar-intelligence-operating-system](https://github.com/DasadiaSmit/solar-intelligence-operating-system). Normal development happens through department-labelled issues and checked pull requests rather than directly on `main`.

The no-key Open-Meteo reanalysis study works without `.env.local`. Create one only for documented provider-policy/model/endpoint overrides or optional hosted features. Start from `.env.example`; never commit credentials.

## Workspaces

1. Solar Digital Twin Operations
2. Annual Energy Forecast Observatory
3. Weather and Atmosphere Command Centre
4. Forecast Model Laboratory
5. Forecast Replay and Validation Centre (sample mode uses an explicitly simulated scenario-delta replay; measured validation requires an attached observed dataset)
6. Solar Array Engineering Studio
7. Scenario and Resilience Simulator
8. Battery and Energy-Flow Optimisation Centre
9. Regional Solar Intelligence Map
10. Climate and Long-Horizon Analysis
11. Financial and Investment Observatory
12. Data Provenance and Scientific Audit Centre
13. Research Publication Studio
14. Executive Mission Control

All workspaces share one location, annual dataset, selected time, system configuration, scenario, model, uncertainty, and provenance state.

## Architecture

The application preserves the Sites Vinext foundation:

- React 19 + Next App Router + strict TypeScript.
- Vinext/Vite Cloudflare Worker output.
- Pure UI-independent scientific modules.
- Versioned `/api/v1` routes.
- Cloudflare D1 + Drizzle for durable structured records, with optional content-addressed R2 snapshots.
- Deterministic source-controlled sample data for offline reproducibility.

See [Architecture](docs/ARCHITECTURE.md), [Helios architecture](docs/HELIOS_ARCHITECTURE.md), and the original [Implementation plan](IMPLEMENTATION_PLAN.md).

## Department operating model

The programme is divided into 13 accountable departments so each domain can advance deeply without fragmenting the application or its scientific truth:

- Product Architecture & Systems Integration
- UI/UX & Design Systems
- Workspaces & Product Features
- Solar Physics & STAR Engine
- Energy Systems & Optimisation
- Weather, Data & Provenance
- Forecasting, ML & Representative Year
- Digital Twin, Maps & Visual Computing
- Mission Intelligence Core — active deterministic specialist federation, grounding, orchestration, and scientific continuity
- Platform, API & Persistence
- Quality Engineering & Scientific Assurance
- Security, Reliability & Release
- Research & Scientific Communication

Start at the [department operating system](governance/README.md). The [machine-readable registry](governance/departments.json), [workspace ownership matrix](governance/WORKSPACE_OWNERSHIP.md), [shared contracts](governance/INTERFACE_CONTRACTS.md), [contribution guide](CONTRIBUTING.md), issue forms and pull-request gates make ownership executable rather than decorative.

## Scientific integrity

Every result identifies its status:

- **Implemented** — executable and tested.
- **Experimental** — executable research method with documented validation limits.
- **Simulated** — generated/sample/scenario data, not an observation.
- **Planned** — interface or research path only; no fabricated output.

Predictions are not guarantees. Read each result with its provider, data class, model, issue/valid time, resolution, units, quality, calculation version, assumptions, and uncertainty.

Key documentation:

- [Scientific methods and formulae](docs/SCIENTIFIC_METHODS.md)
- [Full-year research spine](docs/RESEARCH_SPINE.md)
- [Mission Intelligence Core](docs/MISSION_INTELLIGENCE.md)
- [Model validation report](docs/MODEL_VALIDATION.md)
- [Data providers](docs/DATA_PROVIDERS.md)
- [Data provenance](docs/DATA_PROVENANCE.md)
- [Limitations and assumptions](docs/LIMITATIONS.md)
- [Research roadmap](docs/RESEARCH_ROADMAP.md)

## API

The versioned surface includes:

- `GET /api/v1/health`
- `GET /api/v1/weather`
- `POST /api/v1/simulate`
- `GET /api/v1/provenance`
- `GET /api/v1/studies/annual?mode=sample|live`
- `GET /api/v1/studies/assessment` — fixed, hash-checked Sheffield evidence
- scenario/saved-state routes when D1 and authenticated identity are available

Invalid inputs return structured errors. Provider failure falls back only to a semantically equivalent source; sample mode is explicitly labelled rather than impersonating live data.

## Persistence and migrations

`.openai/hosting.json` declares the logical D1 and R2 bindings. Generate a new migration after changing `db/schema.ts`:

```bash
pnpm db:generate
```

Inspect generated SQL before deployment. The build packages hosting metadata and migrations into `dist/.openai/`.

## Deployment and recovery

Current implementation, verification evidence, precise remaining work, and restart commands are maintained in [PROJECT_STATUS.md](./PROJECT_STATUS.md). Performance findings and the compact annual browser transport are documented in [docs/PERFORMANCE.md](./docs/PERFORMANCE.md).

- [Deployment and operations](docs/DEPLOYMENT.md)
- [Backup and recovery](docs/BACKUP_RECOVERY.md)

Production deployment requires provider licence/capacity review, measured-plant validation, authorization/access-policy review, restore testing, and site/electrical engineering validation.

Instrument 06 release checks and measured bundle sizes are recorded in
[PROJECT_STATUS.md](./PROJECT_STATUS.md) and [docs/PERFORMANCE.md](./docs/PERFORMANCE.md).
The initial spatial ceilings remain 1,265,000 incremental and 1,465,000
complete raw bytes; Instruments 05 and 06 must remain outside that initial
closure and pass their separate reached-only gates.

## Research objective

The platform directly supports the original objective: develop a time-series-based model that estimates photovoltaic electricity generation for a complete representative year, using 2022–2025 weather, radiation, and production context with European reanalysis/forecast products, while making the construction method, uncertainty, validation, provenance, and limitations visible.
