# Solar Physics & STAR Engine — Department Charter

## Mission

Own the explainable physical chain from sun position and weather inputs to hourly DC and AC photovoltaic energy. The department makes the STAR Engine scientifically inspectable, independently testable, versioned and safe to use for research and scenario comparison. It does not present an estimate as guaranteed or bankable production.

## Current truth

Maturity uses the common scale: **M0** planned only; **M1** executable prototype; **M2** deterministic and tested; **M3** independently validated against authoritative references or measured data; **M4** operationally monitored; **M5** certified or bankable for its declared use.

- **M2:** `lib/solar/solar-position.ts` implements NOAA-style fractional-year geometry, sunrise/sunset and a Haurwitz/Kasten–Young clear-sky envelope. `lib/solar/irradiance.ts` implements fixed-array isotropic transposition, ground reflection and an ASHRAE angle-of-incidence modifier. `lib/solar/power.ts` implements Faiman temperature, multiplicative losses, degradation, inverter conversion and clipping. `lib/solar/simulation.ts` integrates the chain over an hourly year and exposes its loss chain.
- **M1:** single- and dual-axis orientation, bifacial rear irradiance, low-sun shading, horizon, snow, dust, mismatch and string losses are executable approximations without site calibration or independent field validation.
- **M0:** Perez/Hay–Davies transposition, row-to-row backtracking, terrain and horizon ray tracing, rear-side view factors, physical snow/soiling processes, detailed module IV curves and string electrical networks.
- The ten broad science tests include solar-position, plane-of-array, Faiman and integrated annual checks. There is no independent ephemeris, `pvlib`, measured-plant or manufacturer-model comparison suite yet.
- The current methods document is not a perfect description of the code: it mentions Erbs decomposition and profile-based horizon blocking that are not implemented, and describes a PVWatts v5 inverter relationship while the runtime uses a bounded square-root part-load adjustment. These are open scientific-assurance issues, not implemented capabilities.

## Ownership boundary

- **Primary existing paths:** `lib/solar/**`.
- **Governed shared contracts:** the solar, irradiance, generation, array and loss types plus `CALCULATION_VERSION` in `lib/contracts/index.ts`. Changes require STAR Engine approval and review from every affected consumer.
- **Shared integration paths:** `lib/operating-snapshot.ts` and `app/api/v1/simulate/route.ts` are integration surfaces, not STAR-owned orchestration. STAR approves their physical input/output semantics.
- **Documentation and tests:** physics portions of `docs/SCIENTIFIC_METHODS.md`, `docs/LIMITATIONS.md`, `docs/MODEL_VALIDATION.md` and physics cases currently in `tests/science-core.test.mjs`.
- **Target paths, planned:** `lib/solar/contracts.ts`, `lib/solar/calibration/**`, `tests/solar/**` and `tests/fixtures/solar-reference/**`. Creation of these paths does not by itself raise maturity.
- The department does not own provider retrieval, representative-year selection, statistical forecasting, tariffs, user-interface presentation or deployment.

## Interfaces

- **Consumes:** `LocationConfig`, `ArrayConfig`, `LossConfig` and complete hourly `WeatherHour` records in canonical units. Irradiance inputs are GHI, DNI and DHI in W m⁻²; temperature is °C; wind is m s⁻¹; timestamps are UTC; energy output is kWh for the interval.
- **Publishes today:** `SolarPosition`, `PlaneOfArrayIrradiance`, `GenerationHour`, `SolarSimulationResult` and `LossChainItem[]` through pure TypeScript functions.
- **Required target contract:** a versioned `SolarSimulationRequest` and `SolarSimulationResult` containing interval duration, input snapshot IDs, formula/model versions, units, assumptions, quality propagation, warnings and uncertainty fields.
- Provider-specific payloads may never cross into `lib/solar`. DATA must first supply validated canonical weather and an explicit missing-data decision.
- STAR output feeds FORECAST as a physical reference and ENERGY as the generation boundary. Neither consumer may silently reinterpret kW as kWh or alter calculation status.

## Decision authority

- STAR decides physical formula selection, constants, unit conventions, numerical bounds, calculation-version changes and whether a physical capability is M0, M1 or M2.
- A move to M3 requires independent evidence approved jointly with DATA and FORECAST and recorded in the scientific validation report.
- No UI, feature or API team may change a formula, default coefficient or lifecycle label solely for a preferred display outcome.
- Site-specific defaults require traceable source evidence. Manufacturer data, survey inputs and calibrated coefficients must remain distinguishable from generic defaults.
- Safety-critical plant control, certified electrical design and bankable yield opinions remain outside this department and require qualified external engineering authority.

## First deep-work programme

1. **Freeze the executable v1 specification:** trace every current equation, constant, unit and approximation from source to a matching test; correct the method document or code where they diverge.
2. **Stabilise the engine port:** introduce the versioned request/result contract, explicit interval duration and structured calculation provenance without breaking the current sample path.
3. **Build independent references:** add curated solar-position, transposition, module-temperature, inverter and annual-yield vectors from authoritative tools or publications, with recorded source/version and predeclared tolerances.
4. **Improve irradiance physics:** implement and compare isotropic, Hay–Davies and Perez transposition; add irradiance closure and component-derivation policy rather than assuming every record is complete.
5. **Deepen array engineering:** implement horizon profiles, row geometry and backtracking before claiming tracking optimisation; add a defensible rear-side view-factor model before raising bifacial maturity.
6. **Calibrate and quantify:** define a measured-site calibration protocol that separates parameter uncertainty, weather uncertainty and structural-model error.

## Definition of done

- Every public result identifies calculation version, input snapshot, interval, units, assumptions, quality propagation, uncertainty method and lifecycle status.
- Night generation is exactly zero; all physical quantities are finite and within declared bounds; AC output respects inverter nameplate; losses remain individually inspectable.
- Unit, property, regression and full-year tests pass for fixed, tracker, bifacial, snow, extreme-temperature, polar-day/night and leap-year edge cases relevant to the supported domain.
- Independent comparison results, tolerances and failures are published; failed comparisons cannot be hidden by averaging.
- Documentation describes the executable implementation exactly, including limitations and generic coefficients.
- Performance is measured on an 8,760/8,784-hour run and remains within the agreed interactive runtime budget without weakening numerical checks.
- M3 is not claimed until an untouched independent reference or measured site validates the declared scope.

## Measures

- Solar elevation and azimuth error against the selected reference, reported by latitude, season and solar elevation.
- GHI/DNI/DHI closure residual and plane-of-array difference by transposition model.
- DC/AC energy residual, clipping error and annual energy difference against reference cases.
- Percentage of executable formulas and constants linked to a source, test and limitation.
- Regression-test stability by calculation version and supported runtime.
- Runtime and peak memory for hourly day, year and optimisation-batch execution.
- Count and age of uncalibrated generic parameters used in each result.

## Risks and escalation

- Escalate immediately when code and scientific documentation disagree, a unit is ambiguous, a result becomes non-finite, or a versioned change alters a golden result outside tolerance.
- Stop promotion when a model appears accurate only because it was tuned on its evaluation site or period.
- Treat tracker, bifacial, horizon, soiling, snow and string results as M1 until their dedicated validation gates pass.
- Escalate requests for autonomous control, protection settings, structural design or financial certification to qualified external professionals; STAR remains a decision-support engine.
- Structural uncertainty cannot be removed by narrowing statistical confidence bands. FORECAST must preserve that distinction.
