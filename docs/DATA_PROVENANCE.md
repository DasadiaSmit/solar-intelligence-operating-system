# Data provenance and reproducibility

## Principle

Solar Intelligence OS treats lineage as part of every scientific result, not as a footer. A chart value should be traceable through provider retrieval, schema checks, unit conversion, quality treatment, dataset snapshot, system configuration, calculation version and model version.

The initial platform implements lineage for weather datasets and deterministic operating snapshots. Deep-learning artifacts and large research datasets have schema extension points but are not presented as trained or validated artifacts until real records exist.

## Identifier construction

Objects are serialised with recursively sorted keys and encoded as UTF-8 canonical JSON. SHA-256 produces:

- canonical weather content hash;
- optional raw response content hash;
- normalised query hash;
- configuration/inputs hashes;
- immutable R2 object keys;
- dataset snapshot IDs and reproducibility keys.

The dataset snapshot ID combines provider ID/version, actual data class, query hash, canonical content hash, schema version and calculation version. Therefore the same canonical dataset under the same scientific contract resolves to the same ID. Retrieval runs remain separate D1 records because issue/retrieval time, attempts and upstream status can differ.

Canonical JSON is an application contract, not an interchangeable implementation of RFC 8785. Cross-language pipelines must reproduce the documented sort/null/number behaviour or publish their own hash scheme version.

## Snapshot manifest

`sios-dataset-manifest-v1` records:

- snapshot, canonical, raw and query hashes;
- provider/product/version and requested/actual data class;
- retrieval/issue/valid timestamps and interval;
- record count, schema and calculation versions;
- units, quality, transformations, assumptions and warnings;
- semantic-substitution flag and parent snapshot IDs.

Raw provider payloads are never echoed from the public weather API. They are available only to the scheduled snapshot path when the optional `SNAPSHOTS` object binding exists.

## Immutable object layout

R2 keys are content addressed:

```text
sha256/<canonical-hash>/canonical.json
sha256/<raw-hash>/raw.json
manifests/<snapshot-id>/<manifest-hash>.json
```

An existing key is never overwritten with different bytes. The helper verifies body hashes before writing and rejects metadata hash collisions. Repeated identical content is de-duplicated. A manifest includes retrieval metadata and therefore has its own manifest hash beneath the stable dataset snapshot ID.

R2 is optional. Without it, the API still returns a complete manifest and D1/sample operation continues with `objectStore: unavailable`. This state is explicit and is not called a persisted raw snapshot.

## Relational lineage

The initial D1 migration contains:

- `provider_runs`: query, attempts, status, HTTP/rate-limit context, fallback, timing and quality;
- `dataset_snapshots`: hashes, object keys, valid range, units, transformations, assumptions and parent IDs;
- `system_configurations` and `scenarios`: versioned/hashable calculation inputs and branches;
- `model_versions`, `experiments` and `experiment_metrics`: artifact identity, data window, split method and metric slices;
- `saved_workspaces` and `annotations`: durable analytical context;
- `audit_events`: append-only actor/action/resource hash trail;
- `job_state`: bounded scheduler checkpoints, leases and failure state.

Large hourly arrays and model binaries do not belong in D1. D1 stores compact searchable metadata; content-addressed R2 stores immutable bytes.

## Result interpretation

Every weather result includes both `requestedDataClass` and `actualDataClass`. When these differ, `semanticSubstitution` is true. An issued forecast must include its issue time when the upstream response provides one; the Open-Meteo best-match adapter currently returns `null` and a warning instead of inventing a run time.

Quality contains:

- score and qualitative level;
- completeness fraction;
- whether any values were imputed;
- stable missing, outlier, interpolation, temporal and product-construction flags.

Quality is not uncertainty. The provider layer currently states that calibrated numeric bounds are unavailable. Physics/forecast modules add their own prediction intervals, and the UI must keep those separate from data-quality scores.

## Reproducing a result

1. Resolve the dataset snapshot manifest by ID.
2. Verify canonical/raw object SHA-256 hashes when objects are persisted.
3. Confirm provider product, requested/actual class, query, valid window and units.
4. Apply transformations in the recorded order using the declared schema/calculation versions.
5. Resolve the system-configuration hash and scenario branch.
6. Resolve model/code version, dataset parents, training/evaluation window and random seed.
7. Re-run and compare content/result hashes plus tolerance-aware numerical checks.

A matching dataset hash proves byte-level canonical equality, not correctness of the source product. Scientific reproduction still requires the same algorithms, floating-point/runtime assumptions and documented tolerances.

## Retention, backup and recovery

- D1 metadata and R2 snapshot objects require independent backup/restore tests.
- Content-addressed objects may be retained longer than provider licences permit; retention policy must be reviewed before live deployment.
- Provider attribution and licence metadata should accompany exports.
- Restored manifests must be hash-verified before they become eligible inputs.
- Orphan content-addressed objects are safe but should be inventoried; deletion requires a reachability/retention audit.

## Known limitations

- Canonical snapshots are JSON, not columnar research files; bulk multi-year archives should use a versioned Parquet/NetCDF research pipeline.
- The warm-instance cache does not provide global cache lineage.
- R2 existence checks are not a multi-object transaction. Content addressing prevents different bytes from sharing a legitimate key, while D1 records completion state.
- No cryptographic signature or external timestamp authority is applied yet.
- Actor identity relies on trusted hosting-injected headers; deployment must prevent clients from spoofing them.
- Dataset snapshots alone do not capture container images or all third-party runtime dependencies.

## Future research and engineering

- signed manifests and software-bill-of-materials references;
- schema registry with compatibility tests;
- licence/retention policy fields and automated expiry review;
- provenance graph traversal API and export bundles;
- reproducible offline training environments with locked containers;
- measured-site calibration lineage and forecast-run-level ensemble ancestry;
- W3C PROV-compatible export after the internal contract stabilises.

