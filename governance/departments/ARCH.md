# Product Architecture & Systems Integration (`ARCH`)

## Mission

Keep Solar Intelligence OS coherent as its scientific, product, data and operational surfaces deepen. ARCH defines system boundaries, shared contracts, compatibility policy and the decision process that lets departments evolve independently without creating contradictory results or hidden coupling.

## Current truth

- The application has a documented React/Next/Vinext/Cloudflare architecture, a strict TypeScript configuration and a versioned `/api/v1` surface.
- Scientific modules are separated into solar, energy, forecasting, representative-year, optimisation, provider and provenance packages. The operating snapshot is the current integration point.
- Fourteen workspaces share one linked operating state, but their registry and much of their rendering remain concentrated in the solar-OS component layer.
- Canonical domain types and calculation, dataset and model version constants exist in `lib/contracts`.
- Architecture and implementation-plan documents exist, and ADR/Scientific Decision Record processes are now defined; no numbered decision has yet been accepted.
- Department/workspace ownership and registry reference integrity now have automated fitness tests. Import-direction and contract-compatibility gates remain planned.
- There is no claim that the present structure is the final target architecture; several research and operational capabilities remain explicit extension points.

## Ownership boundary

ARCH is primary steward for:

- `lib/contracts/**` and the shape of the scientific result envelope.
- `lib/operating-snapshot.ts` and `lib/client-snapshot.ts` as cross-domain composition boundaries.
- `docs/ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md` and architectural decision records.
- The department registry, workspace accountability model and cross-department interface catalogue.
- API, dataset, model and calculation compatibility policy, jointly with the affected domain owner.

ARCH does not unilaterally choose scientific formulae, visual direction, provider policy, model promotion, security acceptance or release readiness. Those decisions remain with the accountable departments and require ARCH review only when they change shared boundaries.

## Interfaces

- **All scientific departments:** typed inputs and outputs, units, lifecycle status, provenance and uncertainty contracts.
- **FEATURES and EXPERIENCE:** client snapshot, linked workspace state and workspace registration contract.
- **PLATFORM:** API envelopes, persistence boundaries, job interfaces and versioning rules.
- **DATA and RESEARCH:** dataset/model manifests, lineage identifiers and reproducibility requirements.
- **QA:** architecture fitness tests and compatibility evidence.
- **SECOPS:** trust boundaries, deployment topology and operational failure behavior.

## Decision authority

ARCH may approve or reject changes to shared contracts, dependency direction, public API version boundaries and cross-department composition. A domain owner must co-approve any decision that changes scientific meaning, user-facing status, retained data or operational risk. Irreversible or high-risk changes require a written ADR before implementation. In a disagreement, preserve the existing public contract and lifecycle truth until the accountable owners record a joint decision.

## First deep-work programme

1. Establish numbered ADRs and scientific decision records with status, context, alternatives, consequences and supersession links.
2. Publish a machine-readable department/workspace registry and validate reference integrity in tests.
3. Extract the workspace registry and shared workspace metadata from monolithic rendering code into a typed, UI-independent contract.
4. Add architecture fitness tests that prohibit React, persistence and network imports from pure scientific packages.
5. Define backward-compatibility rules for `/api/v1`, D1 migrations, snapshot manifests and calculation/model/dataset versions.
6. Document the dependency graph around the operating snapshot and replace implicit cross-package knowledge with explicit ports.
7. Review lifecycle vocabulary so `implemented`, `experimental`, `simulated` and `planned` retain one meaning across code, APIs, documentation and UI.

## Definition of done

- The change has one accountable department and all affected interfaces are named.
- Shared types have compatibility tests and no provider-specific payload crosses into the science or UI layer.
- A breaking change is versioned rather than silently replacing an existing contract.
- Architectural decisions and rejected alternatives are recorded for consequential changes.
- Scientific meaning, units, provenance, uncertainty and lifecycle status survive every integration boundary.
- Relevant unit, contract, architecture and build checks pass.
- Documentation states current implementation and limitations without promising unbuilt capability.

## Measures

- Every registered workspace has exactly one primary department and valid contributors.
- Every shared interface has an owning artifact and compatibility test.
- Zero unversioned breaking changes to API, dataset, model or calculation contracts.
- Zero prohibited UI, database or network imports in pure scientific modules.
- ADR coverage for every accepted cross-department or irreversible architectural decision.
- Architecture-related regressions and exceptions are tracked to closure rather than waived informally.

## Risks and escalation

- **Monolithic workspace coupling:** escalate when a change to one workspace requires unrelated workspace edits or broad visual regressions.
- **Contract drift:** block release when API, UI, persistence and science disagree on units, status or provenance.
- **Premature platform complexity:** require evidence before introducing infrastructure that the current Worker runtime does not need.
- **Research/runtime collision:** move heavy training or bulk archive processing out of request-time code rather than weakening runtime limits.
- **Unowned decisions:** escalate to the product owner when two departments reject accountability or an interface has no clear steward.
- **Scientific or security conflict:** the relevant domain owner and SECOPS may block ARCH-approved work until evidence resolves the risk.
