# Meteorology, Earth Observation & Data Operations — Department Charter

## Mission

Supply trustworthy, reproducible weather, solar-radiation and production inputs to every scientific department. DATA owns the meaning of a dataset: provider, product, issue and valid times, spatial and temporal resolution, units, quality, transformations, lineage, licence assumptions and uncertainty availability.

## Current truth

Maturity uses the common scale: **M0** planned only; **M1** executable prototype; **M2** deterministic and tested; **M3** independently validated against authoritative references or measured data; **M4** operationally monitored; **M5** certified for its declared use.

- **M2 adapter foundation:** `lib/providers/**` provides typed queries, environment configuration, UTC and unit normalisation, broad physical bounds, short-gap interpolation, quality scoring, retry/backoff, rate-limit handling, a bounded memory cache and explicit fallback attempts.
- **M2 sample path:** the deterministic sample provider is reproducible and explicitly labelled `simulation`; it never claims to be an observation, reanalysis or issued forecast.
- **M2 code / M1 operational evidence:** Open-Meteo forecast/reanalysis and PVGIS TMY adapters execute, but upstream availability is external and there are no checked-in captured-response fixture suites proving schema stability.
- **M2 lineage foundation:** `lib/provenance/**`, scheduled ingestion, D1 metadata and optional content-addressed R2 storage provide hashes, manifests and immutable object keys when bindings exist.
- **M1 end-to-end integration:** `app/api/v1/weather/route.ts` exposes provider data, but `app/page.tsx` and `app/api/v1/simulate/route.ts` still build annual results from generated sample weather. No adapter currently converts nullable `CanonicalWeatherHour` records into the complete `WeatherHour` contract consumed by the scientific engine.
- **M0:** operational CDS/ERA5 bulk acquisition, native ECMWF archived run/ensemble ingestion, EUMETSAT cloud/radiation, measured station and inverter/meter telemetry, and a second class-preserving live fallback.

## Ownership boundary

- **Primary existing paths:** `lib/providers/**` and dataset-level functionality in `lib/provenance/**`.
- **Primary API paths:** `app/api/v1/weather/route.ts` and dataset-manifest behavior in `app/api/v1/provenance/route.ts`.
- **Primary data records:** `provider_runs`, `dataset_snapshots` and provider-refresh entries in `job_state`, defined in `db/schema.ts` and `drizzle/**`. DATA does not own unrelated user or workspace tables.
- **Shared runtime path:** the scheduled hook in `worker/index.ts` is platform-owned; DATA owns `lib/providers/scheduled-ingestion.ts` and the job's scientific and operational semantics.
- **Governed contracts:** `CanonicalWeatherHour`, `WeatherDataset`, provider descriptors, query/data-class enums, quality fields and snapshot manifests.
- **Target paths, planned:** `lib/providers/adapters/**`, `lib/providers/fixtures/**`, `lib/providers/to-science-weather.ts`, `tests/providers/**`, `tests/fixtures/providers/**` and `research/ingestion/**` for bounded offline archives.
- DATA does not own solar formulas, forecast models, optimisation objectives, UI visual encodings or hosting access policy.

## Interfaces

- **Consumes:** bounded `WeatherQuery`, environment-only provider configuration, upstream payloads and optional D1/R2 bindings. API callers may select declared products but may not supply arbitrary upstream URLs.
- **Publishes today:** `WeatherDataset` containing nullable `CanonicalWeatherHour[]`, full provider provenance, attempts and cache metadata; immutable `DatasetSnapshotManifest`; scheduled-ingestion result.
- **Required STAR handoff:** a versioned conversion policy that either produces complete, physically checked `WeatherHour` records or rejects the dataset. It must record every derived, imputed or defaulted field and never silently fabricate albedo or missing radiation components.
- **Required FORECAST handoff:** immutable snapshot IDs, exact issue time when available, valid time, data class, lead time, model/product identity and revision policy. Reanalysis is not an issued forecast.
- **Required ENERGY handoff:** time-aligned tariff, carbon, demand and telemetry series must use the same interval and timezone contract as weather.
- Raw provider payloads remain out of public API responses. Provider-specific field names remain outside scientific modules.

## Decision authority

- DATA decides canonical field definitions, data-class semantics, provider capability declarations, unit/time normalisation, missing-data policy, quality flags, retry/fallback order, snapshot identity and ingestion lifecycle.
- DATA may reject an upstream response even when HTTP transport succeeds if its schema, chronology, units or semantics are unsafe.
- A fallback may change data class only when policy explicitly allows simulation substitution and the response exposes `requestedDataClass`, `actualDataClass` and `semanticSubstitution`.
- Provider licences, attribution, rate limits and retention constraints can veto ingestion or export.
- Other departments may propose fields but cannot bypass DATA validation or relabel reanalysis, simulation or TMY data.

## First deep-work programme

1. **Close the annual-data seam:** implement `CanonicalWeatherHour` to `WeatherHour` conversion, an explicit albedo/component policy and a snapshot-backed annual simulation request.
2. **Build contract fixtures:** capture licence-compatible Open-Meteo and PVGIS payloads, test every supported unit/schema variant and make upstream drift fail visibly.
3. **Harden chronology and quality:** support leap years, daylight-saving display boundaries, duplicate/gap audits, irradiance closure, cross-field checks and quality propagation into downstream results.
4. **Operationalise snapshots:** make scheduled jobs idempotent, observable and replayable; verify D1/R2 restore and hash integrity; add durable cache lookup by snapshot/query identity.
5. **Add European research sources:** implement a credential-safe CDS/ERA5 offline workflow first, then exact-run ECMWF ensembles and satellite-derived cloud/radiation with their native provenance.
6. **Connect measured truth:** define meter, inverter, plant-availability and station schemas with clock-drift, curtailment, outage and sensor-quality treatment.

## Definition of done

- A live or immutable provider snapshot can drive the same annual calculation path as sample data without provider-specific fields entering science code.
- Every record has a valid UTC timestamp, declared interval and canonical unit; gaps, duplicates, outliers, imputations and derivations are preserved as flags.
- Every result identifies provider/product/version, requested and actual data class, retrieval time, issue time when supplied, valid range, resolution, units, quality, transformations, assumptions, warnings, snapshot ID and hashes.
- Provider adapters pass captured-fixture, error, timeout, 429/529/5xx, schema-drift, boundary and fallback tests.
- Repeated ingestion of identical canonical bytes produces the same content identity and never overwrites different bytes at an immutable key.
- Retention, attribution and export behavior are approved for every live source.
- M3 is not claimed until canonical outputs are independently compared with source documentation and suitable reference records.

## Measures

- Completeness and imputation rate by provider, field, location and valid period.
- Outlier, closure, irregular-interval and semantic-substitution counts.
- Retrieval success, latency, retry, rate-limit and freshness distributions by product.
- Percentage of issued forecasts with authoritative issue/run time rather than `null`.
- Canonical hash reproducibility and ingestion idempotence failures.
- Snapshot-to-scientific-result lineage coverage.
- Provider schema-drift detection time and recovery time.
- Licence, attribution and retention reviews completed versus datasets enabled.

## Risks and escalation

- Fail closed and escalate if requested and actual data classes are confused, timestamps cannot be made unambiguous, units are unknown, or radiation arrays are misaligned.
- Escalate before enabling a provider when licence, attribution, retention, quota or commercial-use terms are unresolved.
- Do not hide prolonged missingness behind interpolation; gaps beyond the approved rule remain missing or make the dataset ineligible.
- Grid resolution cannot resolve a site horizon or plant outage. STAR and FORECAST must retain this limitation.
- Warm-instance cache success is not durable ingestion. Operational claims require persisted snapshots, monitoring and restore evidence.
- Credentials may only enter through secure runtime configuration; suspected exposure triggers immediate rotation and audit.
