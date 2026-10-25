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
- Battery dispatch reports an equivalent-cycle throughput proxy and configured efficiencies; it does not calculate degradation, state of health, warranty use or battery lifetime.
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

## Helios visual-computing limitations

- Milestone 4 Increment 06 source mounts the Solar Digital Twin at position 01,
  Atmospheric Observation at position 02 and Annual Energy Observatory at
  position 03, then Solar Array Engineering at position 04. Instrument 01 is a
  configured-orientation logical topology, not a surveyed physical replica,
  live telemetry twin or substitute for the existing analytical workspace.
  Instrument 02 is a static linked-hour transfer schematic, not a measured
  atmospheric volume, cloud simulation, nowcast or live weather service.
  Instrument 03 is an annual data formation, not a physical orbit, live plant
  display or issued production forecast. Instrument 04 is a normalized
  orientation rig, not a module, row, site model or engineering drawing.
  Instrument 05 is a normalized annual stress-summary comparison, not a
  weather simulator or physical chamber model. Instrument 06 is a static
  logical allocation schematic, not physical wiring or live power flow.
  Instruments 01–05 persist at subdued emphasis while it forms. There are six
  mounted instruments, one navigable placeholder at 07 and seven reserved
  positions at 08–14. Source integration is distinct from release acceptance;
  current build and deployment evidence is recorded in `PROJECT_STATUS.md`.
- `SceneFrameV1` visualises existing linked values; it does not calculate solar
  position or replace the scientific engine.
- The Helios Core is a system metaphor. Its six rings are not a measured
  mechanism. The solar plasma, corona and magnetic-field guides are procedural
  explanatory graphics, not resolved solar observations or magnetogram data.
- Direct, diffuse and reflected radiation, surveyed terrain/horizon and
  physical module geometry remain explicitly unavailable in compact
  `SceneFrameV1`. Canonical DNI and DHI are available only in the separate,
  bounded, server-built `AtmosphericObservationFrameV1` for the exact
  representative hour; that does not add them to the 8,760-row compact browser
  tuple or make reflected irradiance available. No renderer may synthesize a
  missing layer as measured reality.
- The atmospheric frame contains scalar cloud cover, relative humidity, wind
  speed, ambient temperature, GHI, DNI, DHI, effective POA and modelled AC
  energy for one coincident 3,600-second interval. It does not contain wind
  direction, cloud altitude, cloud type, measured cloud geometry, cloud
  motion, sub-hour response or measured/live plant output. Those seven layers
  remain explicitly unavailable. Weather channels fail closed outside the
  canonical provider bounds; effective POA has a conservative 4,200 W/m²
  model-output guard; and one-hour modelled AC energy cannot exceed configured
  DC capacity. The POA guard is not a display-scale or forecast-accuracy claim.
- Coincident weather, irradiance and AC energy do not prove that the displayed
  cloud state caused an instant output change. Instrument 02 makes no
  sub-hour, causal, live-synchronization or measured-plant claim. Current
  credential-free sample output remains labelled `SIMULATED`.
- `AnnualEnergyFrameV1` preserves exactly 8,760 unrounded canonical one-hour
  modelled-AC values and quality scores from one contiguous no-leap UTC year.
  It fails closed if record count, interval continuity, values, provenance or
  hourly/monthly/seasonal/annual reconciliation is inconsistent. Its hourly
  series carries only energy and quality; index and month are derived from the
  versioned calendar rather than redundantly serialized.
- Annual season colour follows northern/southern meteorological calendar
  categories. It does not encode temperature, a climate trend or causal
  attribution. Radial displacement is an annual display ratio; exact energy
  remains authoritative in HTML.
- Instrument 03 reports P10/P50/P90 as an empirical spread over four
  source-year annual totals (`n = 4`). This is not a calibrated probabilistic
  interval, an issued future forecast, a guarantee or measured-plant
  validation. Measured/live plant output, issued future forecast, intra-hour
  variation, spatial generation field and causal climate attribution remain
  explicitly unavailable.
- `ArrayEngineeringFrameV1` preserves canonical configured/resolved array
  orientation, authoritative linked-hour Sun and incidence geometry,
  irradiance, conversion, loss factors, annual base output, quality and
  provenance. It does not turn the Observatory into a second calculation
  engine.
- Array capacity, tilt, azimuth or loss changes cannot alter the astronomical
  Sun path for a fixed site and time. The existing `AE` controls are a
  `SIMULATED`, bounded screening branch and require authoritative server
  recalculation before engineering reliance.
- Module count/rating, physical module/row dimensions and placement, named
  inverter selection/curve, module efficiency, editable inverter efficiency,
  physical moving shadows, terrain, surveyed horizon, obstruction geometry,
  candidate hourly output and measured/live plant production remain
  unavailable. Generic WebGL shadows would not constitute evidence and are
  deliberately disabled.
- `ScenarioComparisonFrameV1` contains one configured baseline and four
  canonical deterministic annual stress summaries. They are presented in
  parallel but are not five observations, same-timestamp weather conditions,
  independently issued forecasts or probability-weighted futures. The
  `reliabilityDeltaPct` source value is exposed truthfully as a local-supply
  percentage-point change, not outage probability or guaranteed reliability.
- Parallel sunny/cloudy annual runs, dust/aerosol deposition chronology,
  serialized hourly stress paths, validated extreme-heat thresholds and
  attribution, observed storm classification/gusts/direction/lightning/cloud
  geometry, event probabilities, spatial microclimate, terrain/obstruction/
  shadow fields, structural risk, measured/live response and issued forecasts
  are unavailable. Instrument 05 must not synthesize any of them.
- `BatteryEnergyFlowFrameV1` preserves the linked canonical one-hour record,
  its 24-record UTC day and annual ledger after replaying all 8,760 demand and
  dispatch records. This proves consistency with the configured deterministic
  greedy self-consumption model; it is not measured dispatch validation or
  proof of optimal scheduling. The compact browser tuple alone cannot supply
  this frame because it omits PV-to-load, battery charge, battery discharge
  and curtailment.
- Its eleven unavailable layers cover instantaneous/intra-hour power,
  physical wiring/meter topology, measured plant/inverter telemetry, BMS
  voltage/current/temperature/alarms, state of health/degradation/lifetime,
  protection/balancing/controller dynamics, dynamic tariff/carbon/grid
  events, calibrated dispatch uncertainty, alternative optimisation
  trajectories, outage/islanding/backup/black-start behaviour and attributable
  interval-start/end boundaries. No spatial component may synthesize them.
- Battery interval energy is `kWh / 1h`; it must not be read as instantaneous
  power. The cycle-throughput proxy is not a warranty or life estimate.
  Generation retained on site includes charger input; local supply delivered
  to load counts PV direct plus battery discharge. These are different
  quantities. The timestamp is a canonical record anchor.
- The I06 schematic has one logical grid intertie, static directed routes
  scaled by accumulated linked-day energy and an operating-band SOC reservoir.
  The camera sweep explains those relationships from scroll progress; it
  does not replay a physical flow. Reduced motion omits the sweep. Exact
  quantities, residuals, quality and provenance remain semantic HTML.
- The future Moon is an analytical-reflection concept scheduled for Milestone 5.
  No lunar ephemeris exists and no current component may imply one.
- Adaptive quality tiers and production chunk ceilings are complexity budgets,
  not measured frame-rate guarantees. Reference-device FPS, memory and GPU-idle
  evidence remain open empirical work. WebGL 2 absence, forced colours,
  context loss and renderer failure retain the complete HTML experience.
- Positions 01–06 name mounted spatial instruments. Their linked facts,
  limitations and explicit `DT`/`WA`/`AF`/`AE`/`SR`/`BE` actions are semantic HTML.
  Instrument 01 and 02 preserve the exact linked index; Annual Energy opens the
  existing annual workspace; Array Engineering opens the existing accessible
  screening controls without replacing a restored branch; Scenario Comparison
  opens `SR` at the same index without replacing that branch. Battery opens
  `BE` at the same index, waits for acknowledgement and focuses the linked
  interval. The unchanged scenario uses the canonical base directly; a
  modified local branch remains a separate screening calculation. The
  24-hour selector has one roving tab stop, Arrow/Home/End controls and
  `aria-current="time"`. Position 07 retains placeholder disclosure and may
  proceed only after Instrument 06 is accepted.
- Automated browser accessibility and visual-regression coverage remain future
  hardening work. The current foundation covers semantic HTML fallback,
  reduced-motion policy, forced colours, bounded DPR, page suspension and
  renderer-local failure containment at contract/source level.

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
