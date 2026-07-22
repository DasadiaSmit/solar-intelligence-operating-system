# Shared interface contracts

Departments deepen independently only when their hand-off contracts remain stable. The following contracts are the first architecture freeze targets; names ending in `V1` are proposed boundaries until implemented and versioned in code.

| Contract | Accountable department | Producers | Consumers | Minimum content |
| --- | --- | --- | --- | --- |
| `ScientificResult<T>` | ARCH | Scientific and data departments | APIs, UI, exports, PET | Data, lifecycle, provider, data class, issue/valid time, units, quality, versions, assumptions, uncertainty, warnings and snapshot IDs |
| `CanonicalWeatherHourV1` | DATA | Provider adapters | SOLAR, FORECAST | UTC timestamp, source timestamp, SI units, radiation components, weather fields, quality and provenance |
| `SolarSimulationRequestV1` | SOLAR | PLATFORM, FEATURES | STAR Engine | Location, array, losses, weather snapshot reference, interval, calculation version and assumptions |
| `SolarSimulationResultV1` | SOLAR | STAR Engine | ENERGY, FORECAST, FEATURES, TWIN | Hourly position, irradiance, thermal, DC/AC, losses, quality and calculation provenance |
| `EnergyDispatchRequestV1` | ENERGY | FEATURES, PLATFORM | Energy engine | Explicit interval duration, generation, demand, battery, tariff, carbon, limits and objective |
| `ForecastArtifactV1` | FORECAST | Offline research pipeline | Bounded inference, Model Lab, PET | Model/version, artifact hash, feature/unit schema, training window, split, metrics, calibration and lifecycle |
| `OperatingUIStateV1` | FEATURES | Operating shell | Workspaces, TWIN, PET | Workspace, result ID, selected UTC time, scenario branch/hash, model/dataset/calculation versions, quality and layout version |
| `WorkspaceDefinitionV2` | FEATURES | Workspace packages | Rail, command system, deep links | ID, route, lifecycle, required capabilities, data dependencies, commands and lazy component loader |
| `SceneFrameV1` | TWIN | SOLAR, DATA, ENERGY | Canvas/WebGL renderers | UTC/ENU frame, site and array geometry, sun, irradiance, weather, energy flows, units, quality, lifecycle and provenance |
| `CopilotContextV1` | PET | Approved read-only context builder | PET tools and UI | Evidence references, current linked state, permissible tools, data boundaries, model/provider/version and warnings |
| `AuditEventV1` | PLATFORM | APIs, jobs, PET confirmations | D1 audit log, SECOPS | Actor, action, target, request/result IDs, before/after hashes, timestamp, outcome and redacted metadata |

## Change policy

- Additive compatible changes increment the contract revision and include fixtures.
- Breaking public API changes require a new API version; applied migrations are never rewritten.
- Scientific changes require formula, units, assumptions, uncertainty, version impact and validation evidence.
- Dataset schema changes require canonical fixtures, migration/adapter behavior and lineage preservation.
- UI transport changes require backward-compatible saved-state handling or an explicit migration.
- Every consumer must retain warnings and lifecycle metadata; stripping them is a contract violation.
- No contract may contain private credentials, unrestricted upstream payloads or unbounded assistant instructions.

## Current seams to resolve

1. Live canonical weather records exist beside, rather than inside, `buildOperatingSnapshot`; annual simulation currently regenerates sample weather.
2. `deriveScenario` and `orientationScreeningScore` live in UI code and must move behind a scientific result contract.
3. The documented React context/reducer and `/workspace/[id]` route do not yet exist.
4. PET has no executable code, model provider, retrieval layer or persistence; its contracts remain planned.

