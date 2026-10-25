# Architecture

## System context

Solar Intelligence Operating System is a strict-TypeScript React application compiled by Vinext/Vite for a Cloudflare Worker. The Worker is the interactive control plane: it serves the operating-system interface, runs deterministic physics and lightweight forecasting, exposes versioned APIs, records metadata in D1, and brokers external data providers.

Request-time Workers are deliberately not used to train deep-learning models or decode large GRIB/NetCDF archives. Those jobs belong in a reproducible offline research pipeline. Deployable artifacts are registered in D1 and can be stored content-addressably in R2 when the optional `SNAPSHOTS` binding is present, while the Worker performs bounded inference and visualisation.

```text
Browser / field device
        │
        ▼
Vinext React operating-system shell
        │ linked location · cursor · object · scenario · model · provenance
        ▼
Mission Intelligence Core
        │ specialist routing · evidence gate · continuity · working memory
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
7. Mission Intelligence consumes registered evidence references, never provider payloads or free-form instructions. It may explain and route but cannot manufacture or override scientific results.

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
| `lib/mission-intelligence/` | Pure specialist routing, evidence validation, orchestration, confidence and scientific-memory rules |
| `features/mission-intelligence/` | Operating-state evidence adapter and native Mission Intelligence console |
| `features/visual-computing/` | Renderer-neutral `SceneFrameV1`, bounded `AtmosphericObservationFrameV1`, exact annual `AnnualEnergyFrameV1`, preservation-only `ArrayEngineeringFrameV1`, deterministic stress-summary `ScenarioComparisonFrameV1` and reconciled `BatteryEnergyFlowFrameV1`, ENU conversion, provenance adapters, adaptive quality policy, immutable Observatory/instrument registries, fail-closed instrument views and camera motion |
| `components/hero/` | Continuous Hero/Observatory composition, native-scroll journey, versioned-frame plumbing, fallback and inert/focus handoff |
| `components/observatory/` | Controlled Observatory state, semantic 14-position navigation/readouts for mounted Instruments 01–06, explicit placeholder disclosure and passive scroll engine |
| `components/3d/` | Lazy WebGL 2 renderer, sole scene coordinator, cinematographic camera controller, Core, procedural Sun, structural ring, modular Solar Digital Twin, static Atmospheric Observation, instanced Annual Energy, normalized Array Engineering and reach-triggered Scenario Comparison and Battery Energy-Flow formations, lighting, environment, schematic field and tiered postprocessing |
| `components/ui/` | Reusable semantic HTML renderer fallback; no scientific calculations |
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

## Mission Intelligence boundary

Mission Intelligence is a deterministic operating subsystem, not a language-model or chat boundary. The initial browser transport carries the reproducible simulation result ID. The registered adapter maps exact snapshot facts into unit-bearing `EvidenceRefV1` records. Object selection overrides workspace routing, after which the pure orchestrator verifies eligibility, extracts referenced measurements, calculates measurable evidence-support dimensions, checks artifact dependency fingerprints and returns a `MissionDossierV1`.

The scientific-memory v1 browser store persists scenario revisions, selected datasets/models, artifacts, investigations and events. It stores no dialogue. It is device-local and fail-closed; authenticated project-scoped D1 persistence is future work. See [`docs/MISSION_INTELLIGENCE.md`](MISSION_INTELLIGENCE.md) for contracts, status and limitations.

## Helios instrument evidence boundary

The persistent Hero/Observatory canvas is an optional presentation consumer of
versioned renderer-neutral evidence. Instrument 01 consumes the compact
`SceneFrameV1` used by the Hero. Instrument 02 consumes one bounded
`AtmosphericObservationFrameV1` built on the server from the full canonical
`OperatingSnapshot` at the exact same representative-hour index and result ID,
before the annual snapshot is compacted for the browser. This preserves
canonical humidity, wind speed, DNI and DHI without expanding or revising the
8,760-row, 14-value `sios-hour-tuple-v1`.

`AtmosphericObservationFrameV1` carries a 3,600-second timestamped interval,
cloud cover, relative humidity, wind speed, ambient temperature, GHI, DNI,
DHI, effective POA, modelled AC energy, configured DC capacity, lifecycle,
quality, units and provenance. In the credential-free sample application its
lifecycle is `SIMULATED`. The frame declares only a coincident one-hour
relationship and sets `causalityClaim` to false. Wind direction, cloud
altitude/type/geometry/motion, sub-hour response and measured/live plant output
are typed unavailable layers rather than renderer inference points. The
builder and view share canonical provider weather bounds, enforce a separate
conservative 4,200 W/m² effective-POA output ceiling, and reject one-hour
modelled AC energy above configured DC capacity.

Instrument 03 consumes a separate `AnnualEnergyFrameV1` built from the full
canonical `OperatingSnapshot` before compact browser projection. Its calendar
fails closed unless it is one contiguous non-leap UTC year of exactly 8,760
3,600-second records. The frame preserves every unrounded hourly modelled-AC
value and quality score, then requires exact reconciliation with its twelve
monthly totals, northern/southern meteorological seasons and annual summary.

Only hourly energy and quality are serialized as full-length series columns.
Canonical index and month are reconstructed from the versioned start timestamp
and interval, avoiding redundant 8,760-row chronology fields. The frame also
preserves configured capacity, peak, specific yield, mean quality,
representative-year identity and provenance. Its four-source-year P10/P50/P90
values are explicitly an empirical annual spread (`n = 4`), not a calibrated
probabilistic interval, issued forecast, guarantee or measured-plant
validation. Measured/live output, issued future forecast, intra-hour variation,
spatial generation field and causal climate attribution remain typed
unavailable.

Instrument 04 consumes `ArrayEngineeringFrameV1`, another server-built
preservation contract from the full canonical snapshot at the exact linked
index. It keeps configured and resolved orientation separate; carries the
authoritative Sun vector, solar angles, incidence, IAM, irradiance, modelled
energy, quality, losses, annual summary and provenance; and does not execute a
candidate scenario. The adapter verifies linked POA/generation against the
existing canonical functions, reconciles annual metrics across exactly 8,760
hours and compares the ordered annual loss chain to the canonical builder
before releasing the frame. Configuration is explicitly unable to alter
astronomical Sun state.

The only existing editable engineering fields exposed by this increment are
the HTML workspace's DC capacity, tilt, azimuth and aggregate system-loss
screening controls. They remain `SIMULATED`, non-bankable and subject to an
authoritative server recalculation. Module count/rating and dimensions,
physical rows/placement, named inverter equipment/curves, module efficiency,
editable inverter efficiency, terrain/horizon/obstruction geometry, physical
shadows, candidate hourly production and measured/live output remain typed
unavailable. The Observatory handoff does not patch or replace a restored
device-local scenario.

Instrument 05 consumes `ScenarioComparisonFrameV1`, a server-built homogeneous
`stress-summary` contract from the full canonical snapshot. A narrow replay
reuses the existing configured baseline and deterministic stress calculation,
then fails closed unless the stored baseline and all four canonical annual
stress results reconcile. The frame preserves exact annual generation,
screened net energy value, local supply, their deltas, fixed assumptions,
quality, lifecycle and provenance. It explicitly rejects same-timestamp
weather comparison, alternate parallel weather worlds, hourly stress paths,
probability, forecast, measured/live, structural and spatial evidence claims.
The legacy `reliabilityDeltaPct` field is represented as a local-supply
percentage-point delta because that is the implemented calculation.

Instrument 06 consumes `BatteryEnergyFlowFrameV1`, built server-side from the
full canonical snapshot before browser compaction. The builder replays the
existing demand profile and greedy self-consumption dispatch over all 8,760
records, then reconciles stored flows and annual summaries. It retains the
exact linked record, its 24-record UTC day, battery limits, conservation/SOC
residuals, input quality and provenance. The immutable view preserves those
facts and derives bounded display ratios for six logical allocation routes
and the operating SOC band. Eleven unsupported telemetry, physical-topology,
control, degradation and timing layers remain explicitly unavailable.

The Battery handoff opens `BE` at the exact linked index, waits for application
state acknowledgement and focuses `battery-linked-interval`. It preserves any
restored local scenario. An unchanged scenario now uses the transported
canonical base directly; modified branches retain the existing, disclosed
client screening approximation. Battery import/export values are labelled
`kWh / 1h`, and the linked-day selector uses one roving tab stop with
Arrow/Home/End navigation and `aria-current="time"`.

The immutable mount registry assigns Instruments 01–06 to positions 01–06.
Position 07 is a navigable placeholder and 08–14 are reserved: six mounted,
one placeholder and seven reserved entries. All six instruments remain
in the same lazy WebGL canvas and under the same scene coordinator; exact facts,
limitations, actions and all non-WebGL equivalence remain semantic HTML. Typed
handoffs open the existing `DT`, `WA`, `AF`, `AE`, `SR` and `BE` analytical workspaces
without moving scientific calculation or state ownership into Three.js.

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
- The Annual Energy spatial instrument retains exactly 8,760 instances in one
  `InstancedBufferGeometry` draw path; adaptive tiers alter glyph geometry and
  point size without dropping samples. Other dense analytical Canvas
  instruments may draw documented envelopes where pixel density makes
  individual points invisible.
- Rendering is event-driven; animation loops run only during replay or direct interaction.
- Device pixel ratio is capped for large heatmaps.
- The Helios programme keeps the complete spatial dependency graph behind dynamic
  renderer/scene boundaries. The analytical shell static closure contains no
  Three.js implementation.
- The persistent Hero/Observatory canvas is demand-rendered,
  page-visibility aware and capped at 1.5 DPR by its current quality tiers.
  It wakes for scroll/pointer transitions and sleeps when settled; reduced
  motion freezes ambient scene time and bypasses inertia. Low-capability
  devices receive the scientific quality tier regardless of viewport width.
- One `ObservatorySceneManager` remains the only spatial frame owner for the
  Core, Sun, camera and all six mounted instruments. The Atmospheric
  Observation schematic is static. Annual Energy formation is driven through
  the existing frame owner's shader uniform. Array Engineering is a static
  normalized aperture/vector relationship without physical shadows or
  capacity-as-area encoding. Scenario Comparison is a static, normalized
  annual-delta formation loaded only when reached; it contains no weather
  effects or probability geometry. Battery Energy-Flow is a reached-only
  static allocation schematic with one grid intertie and a bounded SOC
  reservoir; its explanatory camera sweep is derived from scroll progress
  and is omitted for reduced motion. None adds cloud drift, a random particle
  source, timer, local invalidation path, texture or new runtime dependency.
- WebGL context loss, forced colours and unavailable GPU capability retain the required semantic HTML fallback.
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
