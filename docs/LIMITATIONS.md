# Limitations, assumptions, and scientific status

## What the platform is

Solar Intelligence Operating System is a working research and decision-support environment. It provides deterministic sample operation, explainable PV physics, representative-year construction, baseline/hybrid forecasting, uncertainty analysis, energy-flow simulation, optimisation, provenance, and linked visual workspaces.

It is not a certified yield assessment, a market settlement system, a protection controller, an autonomous battery controller, or a substitute for site measurement and professional engineering review.

## Data limitations

- Sample mode is generated and is always labelled **Simulated**.
- Open-Meteo archive data is reanalysis/model data, not a direct site observation.
- Default provider “best match” products can change model sources; research comparisons should pin an explicit model such as ERA5.
- PVGIS coverage depends on database/version and location. The adapter pins its API version and preserves provider metadata.
- ECMWF Open Data is a short rolling archive of recent runs, not a historical 2022–2025 replay source.
- Copernicus CDS/ERA5 extraction requires an async credentialled ingestion pipeline for production scale.
- Missing data may be imputed only under disclosed rules and carries flags; long irradiance gaps degrade quality.
- The annual research route fails on missing required hours/fields. ERA5 snow depth can be unavailable; a flagged temperature/precipitation balance proxy is then used and reduces quality.
- Spatial grid resolution cannot resolve site-specific obstructions, urban microclimates, or all complex terrain effects.

## Physics limitations

- Hourly interval simulation does not reproduce sub-hourly ramps or inverter transients.
- Solar position is approximate and degrades at extreme latitude.
- The isotropic-sky diffuse model is first-order.
- The model does not perform detailed ray-traced row/terrain shading.
- Simplified tracking/bifacial gains are experimental scalars/geometry approximations.
- Soiling, dust, snow, mismatch, and string losses are explicit scenario factors rather than field-calibrated physical submodels.
- Battery degradation is represented through throughput/efficiency scenarios, not an electrochemical aging model.
- Tariff and carbon profiles are scenario inputs unless a documented provider is connected.

## Statistical limitations

- Four years are insufficient for a climate normal or standards-grade TMY.
- A representative composite may contain discontinuities at source-month seams.
- Model-to-model agreement does not establish accuracy against a real plant.
- Current live model metrics use physics-derived generation as their target. They are reanalysis-conditioned hindcast/reference evidence, not measured-plant validation or issued year-ahead forecast skill.
- MAPE is invalid near zero and is therefore guarded.
- The empirical hourly interval assumes 2024 absolute-residual behavior is sufficiently representative of 2025; no block-bootstrap or structural-error interval is implemented.
- Extreme-event probabilities from short records are highly uncertain.
- A Pareto optimum depends on selected objectives, bounds, prices, demand, and risk preferences.

## Operational limitations

- Sample mode is read-only unless a D1 binding is available.
- In-memory/request-scoped rate controls are best-effort at the Worker isolate level; durable distributed quotas require platform services.
- Scheduled ingestion has a Worker-compatible handler and persistent job state, but production schedules must still be configured and verified in the hosting control plane.
- Content-addressed R2 snapshot storage is implemented and active when the optional `SNAPSHOTS` binding exists; it remains unavailable, by design, in credential-free sample deployments without that binding.
- Multi-monitor synchronization uses browser capabilities and may be constrained by popup policy.

## Mission Intelligence limitations

- Mission Intelligence v1 is deterministic and template-driven. It does not accept arbitrary natural-language research questions or generate free-form scientific prose.
- Its findings are only as complete as the registered evidence adapter. Missing evidence returns an explicit unsupported result rather than an inferred explanation.
- Device-local scientific memory is tied to one browser profile. Authenticated cross-device project persistence, retention, deletion and tenant-isolation controls remain future work.
- The initial operating snapshot and deliberately activated annual studies can be registered as artifacts. Not every legacy visual artifact or export yet carries a durable dependency fingerprint.
- Client scenario branches are screening calculations. Mission Intelligence flags their simulated status and staleness but does not silently promote them to authoritative STAR Engine results.
- Cloud movement, equipment failure, battery degradation, live grid events, full investment metrics and future climate risk remain unsupported without the corresponding spatial, telemetry, settlement, cost or climate-scenario evidence.
- The evidence-support index measures quality, completeness, provenance coverage and temporal alignment. It is not a probability of correctness, model confidence, bankability score or guarantee.

## Status rules

| Label | Meaning |
| --- | --- |
| Implemented | Executable code with tests or explicit validation |
| Experimental | Executable research method with unresolved validation limitations |
| Simulated | Deterministic/sample/scenario output rather than an observation |
| Planned | Schema/interface exists or is documented, but no result is fabricated |

The application never presents predicted production as guaranteed. All quantities should be read together with provider, model, timestamp, resolution, units, quality, version, assumptions, and uncertainty.

## Required next evidence for production deployment

1. Calibrated measured production, meter, and plant-availability data.
2. Site horizon/shading survey and electrical single-line validation.
3. Provider licence/rate-limit review for the intended commercial workload.
4. Independent backtest on archived issue-time forecasts.
5. Security/authorization review and tenant-isolation tests.
6. Load, failover, restore, and disaster-recovery exercises.
7. Accessibility audit with assistive-technology users.
8. Regulatory, tariff, and carbon-accounting review for the target jurisdiction.
