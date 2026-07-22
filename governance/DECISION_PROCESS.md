# Decision process

Solar Intelligence OS uses two durable decision records so architectural and scientific reasoning survives personnel, tooling and subscription changes.

## Architecture Decision Record

Create an ADR in `docs/adr/` when a choice changes one or more of:

- runtime architecture or deployment topology;
- a shared interface contract;
- public API compatibility;
- persistence schema or migration strategy;
- authentication, authorization or trust boundaries;
- a cross-department dependency rule;
- a significant dependency or build system.

Filename: `NNNN-short-kebab-title.md`.

Required sections:

1. Status: proposed, accepted, superseded or rejected.
2. Date and accountable department.
3. Context and constraints.
4. Decision.
5. Alternatives considered.
6. Consequences and risks.
7. Migration and rollback.
8. Verification evidence.

## Scientific Decision Record

Create an SDR in `docs/scientific-decisions/` when a choice changes one or more of:

- formula, constant, unit convention or physical approximation;
- data source, data class, normalisation or missing-value policy;
- representative-year construction;
- feature schema, temporal split, metric or calibration method;
- uncertainty interpretation or lifecycle claim;
- financial, carbon or reliability assumption.

Filename: `SDR-NNNN-short-kebab-title.md`.

Required sections:

1. Status and maturity before/after.
2. Research question and evidence.
3. Mathematical or computational method.
4. Inputs, units, versions and lineage.
5. Validation and independent comparator.
6. Uncertainty and limitations.
7. Decision, rejected alternatives and promotion gate.
8. Code, test and documentation traceability.

## Approval and escalation

- The primary department authors the record.
- Every department named in the affected interfaces reviews it.
- `ARCH` decides architecture deadlocks.
- `QA` decides whether evidence satisfies the stated gate.
- `SECOPS` decides whether an unresolved security/recovery risk blocks release.
- `RESEARCH` can require a scientific claim to remain experimental or planned.
- A record is never rewritten to hide a changed decision; superseding work creates a new record and links both directions.

Emergency reliability fixes may land before a complete record only when they reduce immediate harm. The follow-up record and regression evidence are then mandatory in the next pull request.

