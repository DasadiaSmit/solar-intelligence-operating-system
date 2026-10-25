# Shared interface contracts

Departments deepen independently only when their hand-off contracts remain stable. The following contracts are the first architecture freeze targets; names ending in `V1` are proposed boundaries until implemented and versioned in code. `SceneFrameV1`, `SolarDigitalTwinViewV1`, `AtmosphericObservationFrameV1`, `AtmosphericObservationViewV1`, `AnnualEnergyFrameV1`, `AnnualEnergyViewV1`, `ArrayEngineeringFrameV1`, `ArrayEngineeringViewV1`, `ScenarioComparisonFrameV1`, `ScenarioComparisonViewV1`, `BatteryEnergyFlowFrameV1`, `BatteryEnergyFlowViewV1` and `ApplicationActivationRequest` are implemented in source; release acceptance is recorded separately in `PROJECT_STATUS.md`. Other proposed boundaries retain their documented status.

| Contract | Accountable department | Producers | Consumers | Minimum content |
| --- | --- | --- | --- | --- |
| `ScientificResult<T>` | ARCH | Scientific and data departments | APIs, UI, exports, MI | Data, lifecycle, provider, data class, issue/valid time, units, quality, versions, assumptions, uncertainty, warnings and snapshot IDs |
| `CanonicalWeatherHourV1` | DATA | Provider adapters | SOLAR, FORECAST | UTC timestamp, source timestamp, SI units, radiation components, weather fields, quality and provenance |
| `SolarSimulationRequestV1` | SOLAR | PLATFORM, FEATURES | STAR Engine | Location, array, losses, weather snapshot reference, interval, calculation version and assumptions |
| `SolarSimulationResultV1` | SOLAR | STAR Engine | ENERGY, FORECAST, FEATURES, TWIN | Hourly position, irradiance, thermal, DC/AC, losses, quality and calculation provenance |
| `EnergyDispatchRequestV1` | ENERGY | FEATURES, PLATFORM | Energy engine | Explicit interval duration, generation, demand, battery, tariff, carbon, limits and objective |
| `ForecastArtifactV1` | FORECAST | Offline research pipeline | Bounded inference, Model Lab, MI | Model/version, artifact hash, feature/unit schema, training window, split, metrics, calibration and lifecycle |
| `OperatingUIStateV1` | FEATURES | Operating shell | Workspaces, TWIN, MI | Workspace, result ID, selected UTC time, selected object/range, objective, scenario branch/hash, model/dataset/calculation versions, quality and layout version |
| `WorkspaceDefinitionV2` | FEATURES | Workspace packages | Rail, command system, deep links | ID, route, lifecycle, required capabilities, data dependencies, commands and lazy component loader |
| `SceneFrameV1` | TWIN | SOLAR, DATA, ENERGY | Canvas/WebGL renderers | UTC/ENU frame, site and array geometry, sun, irradiance, weather, energy flows, units, quality, lifecycle and provenance |
| `SolarDigitalTwinViewV1` | TWIN | Versioned `SceneFrameV1` adapter | Instrument 01 HTML and WebGL presentation | Exact supported frame facts plus explicit unavailable geometry, terrain, horizon and radiation layers; no recalculation |
| `AtmosphericObservationFrameV1` | TWIN | Full canonical `OperatingSnapshot` adapter | Instrument 02 view adapter | One exact 3,600-second weather/irradiance/modelled-AC interval, lifecycle, quality, provenance, causal boundary and seven unavailable layers |
| `AtmosphericObservationViewV1` | TWIN | Versioned atmospheric-frame adapter | Instrument 02 HTML and WebGL presentation | Deeply validated preservation of the bounded frame; no cloud reconstruction, live telemetry or recalculation |
| `AnnualEnergyFrameV1` | TWIN | Full canonical `OperatingSnapshot` adapter | Instrument 03 view adapter | Exact unrounded 8,760-hour AC and quality series, contiguous no-leap calendar, reconciled monthly/seasonal/annual summaries, empirical `n = 4` spread, provenance and five unavailable layers |
| `AnnualEnergyViewV1` | TWIN | Versioned annual-frame adapter | Instrument 03 HTML and one-draw WebGL presentation | Deeply validated preservation of the annual frame; chronology/month derived from calendar, no downsampling, forecast promotion or recalculation |
| `ArrayEngineeringFrameV1` | TWIN + SOLAR | Full canonical `OperatingSnapshot` adapter | Instrument 04 view adapter | Exact configured/resolved orientation, linked Sun/incidence/irradiance/conversion/loss evidence, annual base summary, screening boundary, provenance and explicit unavailable equipment/geometry layers |
| `ArrayEngineeringViewV1` | TWIN + SOLAR | Versioned engineering-frame adapter | Instrument 04 HTML and normalized WebGL orientation rig | Deeply validated preservation of the engineering frame; no Sun mutation, module inference, shadow synthesis or recalculation |
| `ScenarioComparisonFrameV1` | TWIN + ENERGY | Full canonical `OperatingSnapshot` adapter | Instrument 05 view adapter | One configured baseline plus four canonical deterministic stress results, exact annual generation/value/local-supply metrics and deltas, chronology, optimisation lifecycle, quality, provenance and ten unavailable layers |
| `ScenarioComparisonViewV1` | TWIN + ENERGY | Versioned scenario-comparison adapter | Instrument 05 semantic HTML table and normalized WebGL chambers | Fail-closed preservation of the comparison frame; exact values, provenance and unavailable-layer disclosures stay in HTML while spatial chambers remain nonphysical, deterministic and probability-free |
| `BatteryEnergyFlowFrameV1` | ENERGY + TWIN | Full canonical `OperatingSnapshot` adapter with 8,760-record demand/dispatch replay | Instrument 06 view adapter | Exact linked one-hour record, 24-record UTC day, annual energy ledger, conservation/SOC residuals, reserve and power constraints, explicit units, quality, provenance and eleven unavailable layers |
| `BatteryEnergyFlowViewV1` | ENERGY + TWIN | Versioned battery-frame adapter | Instrument 06 semantic HTML ledger and static WebGL routing schematic | Immutable validated frame; six bounded linked-day route ratios and operating-band SOC fill; one logical grid intertie, no physical topology, live flow, control or degradation claims |
| `ApplicationActivationRequest` | EXPERIENCE | Eligible Observatory instrument action | Existing analytical shell | Source instrument, focus intent, typed workspace ID and linked selected index; optional bounded control-focus intent; acknowledgement precedes focus transfer |
| `MissionContextV1` | MI | Approved context builder | Specialist router, deterministic tools and Mission Intelligence console | Workspace, selected object/range, objective, result/scenario hashes, active datasets/model/experiment, evidence references, permissible tools, scientific-memory revision and warnings |
| `ObjectSelectionV1` | FEATURES | Workspaces, charts, maps, timeline and digital twin | MI and linked views | Stable object kind/ID, result ID, evidence path, UTC point/range, spatial reference, originating workspace/instrument and lifecycle |
| `EvidenceRefV1` | MI | Evidence resolver over approved scientific results | Specialist tools, findings, publications and audit | Result/study/snapshot/model IDs, exact value path and hash, units, data class, lifecycle, issue/valid time, quality and provenance integrity |
| `MissionFindingV1` | MI | Evidence-gated specialist orchestration | Mission Intelligence console, workspaces, reports and audit | Support state, structured claims, evidence references, confidence dimensions, assumptions, uncertainty, models, sources, limitations and next investigations |
| `ScientificMemoryEventV1` | MI | Linked state, confirmed actions and completed investigations | Scientific-memory reducer and stale-result detector | Project scope, event kind, before/after hashes, dependency IDs, actor, UTC time, schema version and recomputation obligations; never conversation messages |
| `AuditEventV1` | PLATFORM | APIs, jobs, MI confirmations | D1 audit log, SECOPS | Actor, action, target, request/result IDs, before/after hashes, timestamp, outcome and redacted metadata |

## Change policy

- Instrument 06 requests `BE` at the canonical linked index with the bounded
  `focus-linked-battery-interval` intent. Application acknowledgement precedes
  focus on `battery-linked-interval`; restored device-local scenarios are
  preserved. The unchanged scenario uses canonical transported values while
  modified scenarios remain disclosed client screening calculations.
- The current instrument registry has six mounted entries, one navigable
  placeholder and seven reserved positions. Instrument 07 follows accepted
  Instrument 06 as a separate increment and must preserve these contracts.
- Additive compatible changes increment the contract revision and include fixtures.
- Breaking public API changes require a new API version; applied migrations are never rewritten.
- Scientific changes require formula, units, assumptions, uncertainty, version impact and validation evidence.
- Dataset schema changes require canonical fixtures, migration/adapter behavior and lineage preservation.
- UI transport changes require backward-compatible saved-state handling or an explicit migration.
- Every consumer must retain warnings and lifecycle metadata; stripping them is a contract violation.
- No contract may contain private credentials, unrestricted upstream payloads, free-form executable instructions or unreferenced scientific claims.

## Current seams to resolve

1. Live canonical weather records exist beside, rather than inside, `buildOperatingSnapshot`; annual simulation currently regenerates sample weather.
2. `deriveScenario` and `orientationScreeningScore` live in UI code and must move behind a scientific result contract.
3. The documented React context/reducer and `/workspace/[id]` route do not yet exist.
4. Mission Intelligence contracts, deterministic specialist tools and scientific-memory persistence are being established; no chat surface, language-model inference or fabricated finding is authorised.
