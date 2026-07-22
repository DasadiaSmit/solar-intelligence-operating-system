# Architecture

## System context

Solar Intelligence Operating System is a strict-TypeScript React application compiled by Vinext/Vite for a Cloudflare Worker. The Worker is the interactive control plane: it serves the operating-system interface, runs deterministic physics and lightweight forecasting, exposes versioned APIs, records metadata in D1, and brokers external data providers.

Request-time Workers are deliberately not used to train deep-learning models or decode large GRIB/NetCDF archives. Those jobs belong in a reproducible offline research pipeline. Deployable artifacts are registered in D1 and can be stored content-addressably in R2 when the optional `SNAPSHOTS` binding is present, while the Worker performs bounded inference and visualisation.

```text
Browser / field device
        │
        ▼
Vinext React operating-system shell
        │ linked location · cursor · scenario · model · provenance
        ▼
Versioned application services (/api/v1)
   ┌───────────────┬─────────────────┬──────────────────┐
   ▼               ▼                 ▼                  ▼
Providers       Physics +        Annual research    Persistence
and quality     energy balance   study + hindcasts  and audit
   │               │                 │                  │
   ▼               └────────────┬────┘                  ▼
Open-Meteo · PVGIS · sample     ScientificResult      D1 metadata
                                + immutable IDs         + optional R2 objects
```

## Dependency rules

1. Pure scientific kernels (`solar`, `energy`, `forecasting`, and `representative-year`) contain no React, database, or network imports. `lib/research` is an application-service boundary and may call providers before invoking those kernels.
2. Providers translate external payloads into canonical weather records before the science layer sees them.
3. UI components consume typed operating snapshots, never provider-specific payloads.
4. Persistence stores metadata and lineage; it is not required for anonymous sample mode.
5. A provider fallback must preserve semantic data class. Reanalysis cannot silently replace an issued forecast.
6. Every user-visible result carries calculation status and provenance.

## Runtime surfaces

| Surface | Responsibility |
| --- | --- |
| `app/` | App Router pages, layouts, loading/error states, and versioned routes |
| `components/` | Mission-control shell and linked scientific instruments |
| `lib/contracts/` | Canonical types, units, quality, status, and result envelope |
| `lib/solar/` | Solar geometry, irradiance, temperature, DC/AC, and loss chain |
| `lib/energy/` | Battery dispatch, demand/grid balance, tariffs, carbon, reliability |
| `lib/forecasting/` | Baselines, hybrid models, uncertainty, evaluation, calibration |
| `lib/representative-year/` | Short-record whole-month representative composite and construction record |
| `lib/research/` | Bounded 2022–2025 acquisition, weather-to-physics adapter, annual study orchestration, and audit IDs |
| `lib/optimisation/` | Grid search, Pareto filtering, Monte Carlo, sensitivity |
| `lib/providers/` | Sample, Open-Meteo, PVGIS, fallback, retry, cache, normalization |
| `db/` + `drizzle/` | D1 schema and deployable migrations |
| `worker/` | Cloudflare/Vinext entry and image optimisation |
| `tests/` | Scientific, data-quality, API, SSR, accessibility-contract tests |
| `research/` | Reserved boundary for reproducible offline training pipelines |

## Scientific result envelope

Every calculation and API response follows this conceptual evidence contract. Transport shapes may be compact—for example, the annual route embeds ordered dataset lineage inside `data`—but must preserve the same information classes:

```ts
type ScientificResult<T> = {
  data: T;
  status: "implemented" | "experimental" | "simulated" | "planned";
  meta: {
    resultId: string;
    provider: { id: string; product: string; version: string };
    dataClass: "observation" | "reanalysis" | "issued_forecast" |
      "climate_scenario" | "simulation";
    model: { name: string; version: string };
    issueTimeUtc: string | null;
    validRangeUtc: [string, string];
    intervalSeconds: number;
    units: Record<string, string>;
    quality: { score: number; coverage: number; flags: string[] };
    calculationVersion: string;
    assumptions: string[];
    uncertainty: { method: string; level: number; bounds?: [number, number] };
    snapshotIds: string[];
    warnings: string[];
  };
};
```

## Data model

D1 is used for compact relational metadata and user-owned records:

- sites and array configurations;
- scenarios, saved workspaces, and annotations;
- provider runs and dataset snapshot manifests;
- model versions, experiments, forecast runs, and validation metrics;
- optimisation runs and background-job state;
- append-only audit events.

Large hourly datasets and model artifacts are intentionally stored as content-addressed R2 objects rather than placed in D1 when the `SNAPSHOTS` binding is available. Their manifests and lineage remain in D1. Sample mode uses immutable checked-in deterministic data so the entire scientific path remains executable without credentials or persistence. The Worker exposes a scheduled-ingestion hook, but production cadence remains a hosting-control-plane concern and is dormant until a trigger is configured.

## Annual research spine

`GET /api/v1/studies/annual` is the executable research boundary for the original full-year objective. It requests each source year independently, normalises records into the canonical weather schema, converts interval semantics at the adapter boundary, runs the same physics engine for each historical year, constructs a whole-month representative composite, and evaluates lightweight forecasting candidates with explicit train, calibration and evaluation windows.

```text
2022 · 2023 · 2024 · 2025 canonical weather datasets
                   │ canonical units, UTC, quality, content hashes
                   ▼
      weather-to-solar research adapter
                   │ irradiance closure + explicit derived fields
                   ▼
        hourly physics simulations by year
             ┌─────┴──────────┐
             ▼                ▼
 whole-month representative   2022–2025 hindcast study
 year (8,760 hours)            train 2022–23 · calibrate 2024
             │                 evaluate untouched 2025
             └─────┬──────────┘
                   ▼
    compact versioned result + lineage + limitations
```

The live mode is a reanalysis-conditioned hindcast, not an issued forecast and not measured plant production. It pins Open-Meteo's configured archive product and fails closed after the permitted field-specific short-gap policy if required meteorological fields or complete source-hour coverage are unavailable; it does not silently substitute simulated weather. When source snow depth is unavailable, the adapter derives an explicitly flagged and quality-penalised temperature/precipitation balance proxy. Sample and live modes cross the same typed service boundary, which keeps demonstrations reproducible without allowing sample provenance to masquerade as observation.

The present model target is physics-derived AC generation. Accordingly, metrics measure approximation of that target, not real-site predictive accuracy. Live annual results are labelled experimental and offline sample results simulated. Attaching versioned meter or inverter production through a separate canonical production adapter is the next critical validation boundary.

The provider service assigns content-derived snapshot IDs at request time, but annual datasets are not yet promoted into immutable D1/R2 research bundles. Durable bundle persistence and replay remain an explicit extension before production audit claims.

## Security and authorization

- Secrets are read only from runtime environment variables.
- Anonymous users can run the deterministic sample workflow.
- Workspace/ChatGPT identity headers can attribute saved records when hosted.
- Authentication identifies a user; it does not by itself prove workspace membership.
- All write endpoints must repeat authorization checks server-side.
- Return paths are validated by the retained starter auth helper.
- Provider URLs are constructed from bounded, validated parameters rather than accepting arbitrary upstream URLs.

## Observability

The health endpoint reports build version, calculation version, active provider configuration, sample-mode availability, D1 binding state, and capability status without exposing secrets. API error responses include a request ID and stable error code. Provider runs record attempts, elapsed time, cache state, rate-limit response, quality score, and fallback lineage.

## Performance strategy

- Pure functions operate on compact numeric records and avoid allocations in inner hourly loops where practical.
- Dense Canvas instruments retain 8,760 source values but draw downsampled envelopes where pixel density makes individual points invisible.
- Rendering is event-driven; animation loops run only during replay or direct interaction.
- Device pixel ratio is capped for large heatmaps.
- Snapshot/configuration hashes are memoisation keys.
- External calls use bounded timeouts and never block sample-mode rendering.

## Extension points

- Provider adapters implement one canonical port and declare exact capabilities.
- New model artifacts implement the forecast-model registry contract and must bring a real versioned validation run.
- New workspaces register through a typed workspace definition and inherit global linked state.
- Offline research outputs can be uploaded as immutable artifacts with hashes, training windows, feature schema, and calibration metadata.

## Department boundaries

The runtime dependency rules above remain authoritative. The department model adds accountable ownership without changing imports, deployment topology or scientific meaning.

- [`governance/departments.json`](../governance/departments.json) is the machine-readable ownership registry.
- [`governance/INTERFACE_CONTRACTS.md`](../governance/INTERFACE_CONTRACTS.md) identifies shared contracts that must be frozen before deep refactors.
- [`governance/WORKSPACE_OWNERSHIP.md`](../governance/WORKSPACE_OWNERSHIP.md) assigns one accountable domain department to every workspace.
- Architecture decisions use ADRs; formula, data, model and uncertainty decisions use Scientific Decision Records.

The first modularisation must be behavior-preserving. `SolarOperatingSystem.tsx`, `workspaces.tsx`, `instruments.tsx` and `globals.css` are current collaboration hotspots; they will be split behind typed contracts before departments independently deepen their features. Moving code is not permission to change lifecycle status or scientific claims.
