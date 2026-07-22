# Product Workspaces and Feature Engineering

## Mission

Turn the scientific and data capabilities of Solar Intelligence OS into complete, linked operational workflows. The department owns the 14 workspaces, shared interaction state and user-facing feature behavior while preserving a strict boundary between executable evidence, experimental research, simulation and planned capability.

## Current truth

- All 14 requested workspaces are reachable through one linked shell and share location, annual data, selected hour, scenario, uncertainty and provenance.
- Annual Forecast, Digital Twin, Weather, Provenance, Publication and Mission Control are declared implemented at their present scope.
- Model Laboratory, Scenario/Resilience and Climate are experimental.
- Replay, Array Engineering, Battery and Financial are explicitly simulated.
- Regional Map is planned and shows only the verified current-site anchor; it does not invent regional comparisons.
- Replay is scenario-versus-base in sample mode, not forecast-versus-observation validation. Array Engineering uses a bounded orientation screening proxy, not a bankable engineering model. Financial covers tariff-derived energy value, not CAPEX, NPV or IRR.
- Shared state currently lives as local React state inside `SolarOperatingSystem.tsx`; the documented context/reducer and `/workspace/[id]` route are not implemented.
- Device-local saved views and annotations work, while durable scenario APIs and D1 records are not yet connected to the shell for these workflows.

## Ownership boundary

The department owns:

- feature behavior in `components/solar-os/SolarOperatingSystem.tsx`;
- all workspace composition currently in `components/solar-os/workspaces.tsx`;
- UI normalization, selectors and formatting currently in `components/solar-os/model.ts`;
- `app/page.tsx` and future `app/workspace/[workspaceId]/**` routes;
- future `features/operating-state/**`, `features/workspaces/**` and `tests/workspaces/**` paths;
- workspace registry, linked state, command registration, feature permissions, lifecycle display and durable workflow integration.

The department does not own provider adapters, canonical contracts, scientific calculations, forecasting algorithms, database infrastructure, WebGL internals or assistant inference policy. `deriveScenario` and `orientationScreeningScore` are presently in the UI model but are scientific behavior and must move behind a Solar Engine-owned contract during extraction.

## Interfaces

- Consume `ScientificResult<T>` and the canonical `OperatingSnapshot`; the compact `sios-hour-tuple-v1` transport is a versioned Platform contract.
- Publish `OperatingUIStateV1` containing workspace ID, result ID, selected UTC timestamp/index, scenario branch/hash, model version, dataset/calculation versions, provenance IDs, quality state and layout version.
- Publish `WorkspaceDefinitionV2` with typed ID, route slug, lifecycle, capability requirements, data dependencies, component loader and registered commands.
- Dispatch `UiCommandV1`; state changes must be validated through one reducer rather than component-local mutations.
- Request authoritative recalculation from Solar Engine APIs; local UI projections must remain clearly labelled screening approximations until removed.
- Supply `SceneFrameV1` inputs to Digital Twin and `CopilotContextV1` to PET without leaking secrets or provider-specific raw payloads.

## Decision authority

The department has final authority over workspace information architecture, workflow sequencing, linked-state behavior, navigation, feature acceptance and product prioritisation.

It may not declare a method implemented, redefine a unit, publish a validation claim, change an uncertainty method or suppress a limitation without Scientific Governance approval. Durable-state schemas and authorization behavior require Platform and Security approval. Visual-system changes require Experience review; spatial rendering changes require Digital Twin review.

## First deep-work programme

1. Introduce typed workspace IDs, `WorkspaceDefinitionV2`, a reducer, selectors and a command registry without changing rendered behavior.
2. Split each workspace into an independently testable package and lazy-load only the active workspace.
3. Separate UI normalization from scientific scenario calculation; replace the client orientation proxy with an authoritative recalculation path.
4. Add stable deep links for workspace, linked time and scenario branch with strict validation and safe fallback.
5. Connect authenticated saved workspaces and annotations to the existing APIs and D1 records, while retaining explicit device-local/offline mode.
6. Deepen Annual Forecast with source-day, representative-month and uncertainty-construction inspection.
7. Convert Replay into archived issue-time forecast-versus-observation validation once measured evidence exists; preserve the current simulated delta view as a separate mode.
8. Add constraint-aware engineering and battery workflows that expose objectives, limits, assumptions and solver status.
9. Activate Regional, advanced Financial and future Climate capabilities only when provenance-carrying inputs and validated methods are present.
10. Give every workspace independent loading, unavailable, stale, permission-denied, low-quality and provider-failure behavior.

## Definition of done

- Every workspace declares its required inputs, lifecycle, capability dependencies and failure states.
- Every numerical output traces to a canonical result ID and provenance record.
- No `IMPLEMENTED` label appears without executable behavior, tests, documented limitations and production-path failure handling.
- Linked time, location, scenario and model state remain consistent across navigation, reload and supported deep links.
- State-changing commands pass through validated typed actions and are auditable when persisted.
- Each workspace covers base, modified-scenario, empty, offline, stale and low-quality states in tests.
- Provider-specific data never reaches a workspace component.
- Scientific formulae are not duplicated in view code.
- Only the active workspace mounts, and lazy loading does not break linked replay or accessibility.

## Measures

- Fourteen of fourteen workspaces registered through the typed registry with contract tests.
- One hundred percent of displayed scientific results carry lifecycle and provenance access.
- Zero cross-workspace divergence in selected timestamp or scenario hash.
- Release tests for every workspace's success and failure states.
- Reduced client bundle and merge-conflict rate after monolith extraction.
- Time from a scientific capability becoming available to a complete, tested workspace integration.

## Risks and escalation

- Broad workspace claims can outrun underlying evidence. Escalate any request to make planned or simulated functionality appear implemented.
- Moving scenario logic can change numerical behavior. Require parity fixtures and Science review before removing the client surrogate.
- Deep links and persisted layouts may contain stale or malicious values. Escalate validation and migration decisions to Platform/Security.
- Durable workflows introduce tenant and authorization risk. Do not connect writes until server-side ownership checks are verified.
- Parallel workspace work will conflict while files remain monolithic. Complete the behavior-preserving split before major deepening efforts.
