# Platform, API & Persistence (`PLATFORM`)

## Mission

Provide a bounded, versioned and observable control plane for Solar Intelligence OS. PLATFORM turns validated requests into traceable domain operations and stores compact user, model and provenance metadata without compromising sample-mode reproducibility or scientific meaning.

## Current truth

- `/api/v1` currently exposes health, weather, simulation, provenance and scenario routes with bounded JSON parsing, request identifiers and structured JSON responses.
- Scenario persistence scopes reads and mutations to an owner identifier derived from a trusted hosting-injected email header. Anonymous or unavailable-database flows are explicitly returned as ephemeral or optional-unavailable states.
- Drizzle defines 12 D1 tables for sites, configurations, scenarios, workspaces, annotations, provider runs, snapshots, model versions, experiments, metrics, audit events and job state; one initial migration exists.
- Immutable R2 snapshot helpers use content-addressed keys and verify content hashes when the optional binding is present.
- A scheduled ingestion handler exists, but the deployed package does not configure a recurring trigger. Scheduled ingestion therefore remains dormant until hosting configuration and verification are completed.
- Application-level request rate limiting is not implemented.
- Full tenant membership, role assignment and RBAC enforcement are not implemented; ownership checks are not equivalent to that capability.
- Scenario create/update paths write audit events, while scenario deletion currently does not. Audit delivery is not transactional with all mutations.
- No published OpenAPI document, generated client, D1/R2 integration suite or distributed tracing pipeline exists yet.

## Ownership boundary

PLATFORM is primary steward for:

- `app/api/**`, request validation and versioned API envelopes.
- `app/chatgpt-auth.ts` integration with the hosting identity boundary.
- `db/**`, `drizzle/**`, forward migrations and relational access patterns.
- `worker/**`, scheduled-job entry points and Worker runtime integration.
- D1 metadata persistence, optional R2 snapshot storage and persistence failure semantics.
- Request identifiers, structured operational events, health/capability reporting and API-level limits.

PLATFORM does not define provider science, solar formulae, forecast promotion, UI behavior or hosting access policy alone. It implements the contracts and authorization decisions agreed with DATA, scientific departments, FEATURES and SECOPS.

## Interfaces

- **ARCH:** versioned API, persistence and job contracts.
- **DATA:** canonical weather records, provider attempts, dataset manifests and ingestion schedules.
- **SOLAR, ENERGY and FORECAST:** bounded simulation/model inputs and scientific result envelopes.
- **FEATURES and PET:** stable API clients, user-owned workspace/scenario state and explicit capability errors.
- **RESEARCH:** model-version, experiment, metric and artifact metadata.
- **SECOPS:** identity trust, authorization, rate limits, logs, secrets and release controls.
- **QA:** deterministic API fixtures, local D1/R2 doubles and failure-mode coverage.

## Decision authority

PLATFORM controls API implementation, database access patterns, migration mechanics, persistence failure behavior and runtime resource budgets. ARCH co-approves public contract changes; SECOPS co-approves authentication, authorization, retention and externally reachable behavior; domain owners co-approve changes to scientific semantics. PLATFORM may block a release that cannot preserve data integrity, ownership isolation or backward compatibility.

## First deep-work programme

1. Publish an OpenAPI v1 contract plus JSON schemas for errors, weather, simulations, provenance and scenarios.
2. Define the hosting-header trust boundary and add tenant membership and role assignments before claiming RBAC.
3. Implement bounded per-actor/per-origin rate limiting ahead of provider access and annual simulation; return explicit `429` responses and retry metadata.
4. Complete mutation auditing, including deletes and failed write attempts, with a clear atomicity strategy.
5. Add D1 migration, cascade, ownership-isolation and audit tests using the supported local runtime.
6. Add R2 hash, de-duplication, partial-failure and retention tests; keep object storage optional and explicit.
7. Establish idempotency and leasing rules for scheduled ingestion and other costly background work, then configure a trigger only after operational verification.
8. Add structured logs and metrics for request latency, provider fallback, D1 errors, job failures and scientific result identifiers without emitting secrets or raw private data.
9. Define outage semantics so an authenticated persistence failure cannot be mistaken for a successful durable save.

## Definition of done

- Inputs are bounded and validated before network, database or expensive calculation work.
- Authentication and authorization are separate, server-enforced concerns; actor/tenant scope is never accepted from client input.
- Every durable mutation has an audit strategy and a tested failure response.
- Migrations are forward-only, reviewed and exercised against both empty and representative databases.
- API responses carry stable version, request ID, lifecycle, units, quality, calculation/model identity, assumptions and uncertainty where scientifically applicable.
- D1/R2 absence, provider failure and scheduled-job failure are observable and honestly labelled.
- Contract, integration, security, migration and regression tests pass before merge.

## Measures

- Zero cross-owner or cross-tenant record access in authorization tests.
- Zero durable mutation paths without tested audit behavior.
- All public routes represented in the OpenAPI contract and contract-test suite.
- Rate-limit behavior verified for every expensive or upstream-backed route before it is marked implemented.
- Migration checks cover clean creation and upgrade from every supported schema version.
- Provider, D1, R2 and scheduler failures produce stable error codes and request IDs.
- Operational latency and error budgets are established from measured production telemetry; no unmeasured target is reported as achieved.

## Risks and escalation

- **Spoofed identity headers:** stop hosted writes if the deployment cannot prove headers are injected and stripped at the trust boundary.
- **Ownership leakage:** treat any cross-user result as a release-blocking security incident.
- **Silent ephemeral writes:** escalate when the interface can imply persistence after a database failure.
- **Migration damage:** do not rewrite an applied migration; preserve evidence and ship a corrective forward migration.
- **Unbounded work:** reject request-time training, bulk GRIB/NetCDF processing or unconstrained annual batches from the Worker path.
- **Snapshot retention/licensing:** escalate to DATA, RESEARCH and SECOPS before retaining provider bytes beyond approved terms.
- **Audit failure:** preserve the original event context and block high-risk mutations when required audit evidence cannot be recorded.
