# Solar Intelligence Operating System

Solar Intelligence Operating System is a research-grade environment for explaining, simulating, validating, and optimising photovoltaic generation across a full representative year.

It is not a short-form solar calculator. The application runs an explainable 8,760-hour physics and energy-flow model, constructs a transparent 2022–2025 short-record representative composite, compares reproducible forecast baselines, quantifies uncertainty, exposes provenance, and links every result across 14 operational workspaces.

## What works

- Full-year hourly solar position, irradiance, module temperature, DC/AC conversion, inverter clipping, and explicit loss chain.
- Battery dispatch, self-consumption, import/export, curtailment, tariffs, carbon, and reliability accounting.
- Deterministic 2022–2025 sample weather and production scenarios that work offline without credentials.
- Open-Meteo and PVGIS/JRC provider adapters with validation, retries, safe fallback, quality scoring, and provenance.
- Short-record representative-year construction without averaging four years into a false “typical” year.
- Seasonal-naive, moving-average, exponential, regression, hybrid, and probabilistic ensemble methods.
- Rolling-origin metrics, calibration/coverage, and clear separation of simulated reference agreement from measured validation.
- Grid search, Pareto filtering, seeded Monte Carlo, sensitivity, and stress scenarios.
- A responsive observatory interface with linked timeline, Solar Production DNA, confidence bands, replay, scenarios, engineering, battery, model, provenance, financial, regional, publication, and mission-control views.
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

Create `.env.local` only when enabling optional live-provider or hosted features. Start from `.env.example`; never commit credentials.

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

See [Architecture](docs/ARCHITECTURE.md) and the original [Implementation plan](IMPLEMENTATION_PLAN.md).

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
- PET Assistant & Solar Copilot — **Photovoltaic Evidence & Triage**, currently planned
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

The final release gate passed 10 scientific/data tests, 5 API/artifact smoke tests, strict TypeScript, lint, and a fresh production build. The precise evidence and remaining operational acceptance items are recorded in [PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Research objective

The platform directly supports the original objective: develop a time-series-based model that estimates photovoltaic electricity generation for a complete representative year, using 2022–2025 weather, radiation, and production context with European reanalysis/forecast products, while making the construction method, uncertainty, validation, provenance, and limitations visible.
