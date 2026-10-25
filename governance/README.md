# Department operating system

This directory is the authoritative collaboration layer for Solar Intelligence OS. It divides the programme into accountable departments while keeping one integrated product, one scientific truth model and one releasable application.

The department model is organisational, not a claim that every planned capability exists. Runtime lifecycle remains separate:

- **Implemented** — executable and tested.
- **Experimental** — executable research method with documented limits.
- **Simulated** — generated or scenario data, never an observation.
- **Planned** — a reserved interface or roadmap item without fabricated output.

Scientific maturity uses an additional evidence scale:

| Level | Meaning |
| --- | --- |
| M0 | Planned only |
| M1 | Executable prototype |
| M2 | Deterministic and tested |
| M3 | Independently validated |
| M4 | Operationally monitored |
| M5 | Bankable or externally certified |

## Departments

| ID | Department | Operating state | Primary concern |
| --- | --- | --- | --- |
| [ARCH](departments/ARCH.md) | Product Architecture & Systems Integration | Active | Contracts, decisions and integration |
| [EXPERIENCE](departments/EXPERIENCE.md) | UI/UX & Design Systems | Active | Visual language, accessibility and interaction |
| [FEATURES](departments/FEATURES.md) | Workspaces & Product Features | Active | Linked product workflows and state |
| [SOLAR](departments/SOLAR.md) | Solar Physics & STAR Engine | Active | PV physics and array engineering |
| [ENERGY](departments/ENERGY.md) | Energy Systems & Optimisation | Active | Battery, grid, economics and optimisation |
| [DATA](departments/DATA.md) | Weather, Data & Provenance | Active | Providers, quality, snapshots and lineage |
| [FORECAST](departments/FORECAST.md) | Forecasting, ML & Representative Year | Active | Models, backtesting, calibration and typical-year science |
| [TWIN](departments/TWIN.md) | Digital Twin, Maps & Visual Computing | Active | Canvas, 3D, spatial and geospatial rendering |
| [MI](departments/MI.md) | Mission Intelligence Core | Active | Evidence-gated specialist orchestration and scientific continuity |
| [PLATFORM](departments/PLATFORM.md) | Platform, API & Persistence | Active | APIs, D1/R2, jobs and Worker runtime |
| [QA](departments/QA.md) | Quality Engineering & Scientific Assurance | Active | Independent verification and release evidence |
| [SECOPS](departments/SECOPS.md) | Security, Reliability & Release | Active | Threats, dependencies, deployment and recovery |
| [RESEARCH](departments/RESEARCH.md) | Research & Scientific Communication | Active | Experiments, publications and limitations |

The machine-readable source is [`departments.json`](departments.json), validated against [`schemas/departments.schema.json`](schemas/departments.schema.json) and repository fitness tests.

## How work flows

1. Select one primary department and open a department work item.
2. State the user or research outcome, current lifecycle, evidence needs and acceptance criteria.
3. Identify every shared contract and contributing department before implementation.
4. Use a `dept/<department>/<issue>-<short-name>` branch for normal work.
5. Keep the change vertically complete: code, tests, documentation, provenance and failure behavior.
6. Open a pull request using the repository template. Cross-department contract changes list every affected department.
7. Merge only after required checks pass and lifecycle claims match executable evidence.

No department may bypass the shared contracts, silently reinterpret units, relabel simulated data as observed, or promote a planned capability through interface polish alone.

## Core records

- [Workspace ownership](WORKSPACE_OWNERSHIP.md)
- [Shared interface contracts](INTERFACE_CONTRACTS.md)
- [Decision process](DECISION_PROCESS.md)
- [Department charter template](templates/department-charter.md)
- [Repository contribution rules](../CONTRIBUTING.md)
- [Programme governance](../GOVERNANCE.md)

## First programme gates

1. **Live Weather to Auditable Annual Simulation v1** — connect canonical provider snapshots to the scientific annual path without semantic substitution.
2. **Modular Operating Shell v1** — split the four current UI merge hotspots without changing behaviour or pixels.
3. **Scientific conformance v1** — resolve verified formula/documentation drift before making new model claims.
4. **Mission Intelligence Core v1** — connect typed workspace and object context to deterministic evidence tools, specialist routing and scientific working memory without chat or language-model inference.
