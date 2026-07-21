# Backup and recovery

## Recovery objectives

The platform separates reproducible scientific inputs/artifacts from user-owned metadata. Exact RPO/RTO values must be chosen for the deployment tier; sample mode itself is source-controlled and can be reconstructed from a release artifact.

## What must be backed up

- D1: sites, configurations, scenarios, saved workspaces, annotations, provider/model/experiment metadata, metrics, job state, and audit events.
- R2 when enabled: immutable raw payloads, canonical hourly snapshots, model artifacts, and generated reports.
- Release artifact: application bundle, `.openai/hosting.json`, migration set, calculation version, and environment-variable inventory (names only; secrets remain in the secret manager).

## Strategy

1. Schedule D1 exports at a cadence appropriate to record-change frequency.
2. Retain multiple dated generations in a separate administrative location.
3. Use immutable, content-addressed R2 keys; lifecycle rules must not delete artifacts referenced by active provenance records.
4. Keep checksums and object counts with every backup manifest.
5. Encrypt backups and restrict restore permission independently from application write permission.
6. Test restoration on an isolated environment, not only export creation.

## Restore order

1. Deploy the matching application release and migration set to an isolated environment.
2. Restore D1 to a new database and validate row counts, foreign-key relationships, schema version, and audit continuity.
3. Restore/attach R2 objects and verify manifest hashes.
4. Rebind environment variables and logical bindings.
5. Run health, sample simulation, snapshot-read, provenance-chain, and authenticated save smoke tests.
6. Compare a set of known result IDs/hashes with the pre-incident manifest.
7. Switch traffic only after scientific and authorization checks pass.

## Provider and model recovery

External provider payloads should be immutable once snapshotted. A result is reproduced from its input snapshot IDs, adapter/calculation versions, configuration hash, and seed—not by hoping a provider returns the same payload later. Model artifacts are never overwritten; a missing artifact is restored to the recorded content-addressed key.

## Incident documentation

Record discovery time, affected result IDs/time ranges, providers/models, data-loss window, recovery source, checksum verification, user impact, and corrective actions. If scientific results were wrong rather than merely unavailable, preserve the original lineage, mark affected outputs superseded, and issue a new calculation version.

