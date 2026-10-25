# Programme governance

Solar Intelligence OS is developed as one integrated scientific product through 13 accountable departments. Department boundaries reduce merge conflict and clarify evidence; they do not create separate truths, deployments or incompatible data models.

The authoritative registry is [`governance/departments.json`](governance/departments.json). Human-readable charters and working rules begin at [`governance/README.md`](governance/README.md).

## Governing principles

1. **One product, explicit owners.** Every workspace and primary path has one accountable department.
2. **Contracts before coupling.** Shared data crosses departments through versioned, tested interfaces.
3. **Evidence before status.** Visual completeness does not promote planned work to implemented.
4. **Truth survives transport.** Units, lifecycle, provenance, quality, assumptions, uncertainty and warnings remain attached through APIs, UI, exports and Mission Intelligence findings.
5. **No silent substitution.** Providers, data classes, models and scenario results are never swapped or relabelled without visible lineage.
6. **Forward-only history.** Git, migrations, ADRs and SDRs preserve what changed and why.
7. **Safe review.** `main` is the recoverable source of record; normal work arrives through checked pull requests.

## Authority

- Department charters define local decision rights.
- `ARCH` owns cross-department contracts and resolves integration conflicts.
- `QA` independently verifies release and scientific evidence.
- `SECOPS` owns security/recovery gates.
- `RESEARCH` governs scientific claims, experimental records and publication limits.
- The repository owner remains the bootstrap approver until additional accountable maintainers are assigned.

## Change classes

| Change | Required record |
| --- | --- |
| Local compatible implementation | Department issue and pull request |
| Shared contract or runtime architecture | ADR |
| Formula, dataset, model, metric or uncertainty change | SDR |
| Public API break | New API version plus ADR |
| Applied schema change | New forward migration |
| Lifecycle promotion | Executable evidence, QA review and updated documentation |
| Security-sensitive behavior | SECOPS review and threat-model update |

## Continuity

GitHub is the private source of record, not the only recovery mechanism. Deployment artifacts, D1 metadata, R2 snapshots and provider/model assets follow the separate backup and recovery plan. `PROJECT_STATUS.md` remains the crystal-clear restart ledger after each major phase.
