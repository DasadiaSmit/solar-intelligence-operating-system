# Scientific methods

## Scope and status

The built-in calculation engine is an explainable first-order PV system model intended for research exploration and scenario comparison. It is not a bankable energy-yield assessment, certified plant controller, or guarantee of production.

The deterministic sample dataset is labelled **Simulated**. Fixed-tilt geometry, isotropic irradiance transposition, temperature derating, detailed scalar losses, DC/AC conversion, and battery energy balance are **Implemented**. Simplified tracker/bifacial/horizon treatments are **Experimental**. Detailed row-to-row backtracking, rear-side view-factor irradiance, physical snow/soiling, and string electrical networks are **Planned**.

## Units and temporal convention

- Internal timestamps are ISO 8601 UTC.
- Location timezone is retained for calendar grouping and display.
- Geometry is evaluated at the midpoint of each interval.
- Irradiance is power density in W/m².
- Irradiation is `W/m² × intervalSeconds / 3600`, giving Wh/m².
- Power is kW; energy is `kW × intervalSeconds / 3600`, giving kWh.
- Air/module temperature is °C and wind speed is m/s.
- Angles are degrees at the public boundary and radians internally.

## Solar position

The engine uses the compact NOAA fractional-year approximation. For day of year `n`, UTC hour `h`, latitude `φ`, and east-positive longitude `λ`:

```text
γ = 2π / 365 × (n - 1 + (h - 12) / 24)

EoT = 229.18 × (0.000075 + 0.001868 cos γ - 0.032077 sin γ
                 - 0.014615 cos 2γ - 0.040849 sin 2γ)

δ = 0.006918 - 0.399912 cos γ + 0.070257 sin γ
    - 0.006758 cos 2γ + 0.000907 sin 2γ
    - 0.002697 cos 3γ + 0.001480 sin 3γ

trueSolarMinutes = UTCminutes + EoT + 4λ
hourAngle = trueSolarMinutes / 4 - 180°

cos θz = sin φ sin δ + cos φ cos δ cos(hourAngle)
elevation = 90° - θz
```

Azimuth uses `atan2` and is normalized clockwise from north. Apparent sunrise/sunset uses a `-0.833°` threshold to approximate refraction and the solar disc. This is an approximation, especially at high latitude; it is not NREL SPA. See the [NOAA calculation details](https://gml.noaa.gov/grad/solcalc/calcdetails.html).

## Irradiance and plane of array

When GHI, DNI, and DHI are supplied, the engine checks closure:

```text
GHI ≈ DNI × cos(θz) + DHI
```

If only GHI exists, the Erbs diffuse-fraction correlation estimates DHI from clearness index. Derived components receive an explicit quality flag.

For surface tilt `β`, panel azimuth `αp`, and solar azimuth `αs`:

```text
cos(AOI) = cos θz cos β + sin θz sin β cos(αs - αp)
POAbeam   = DNI × max(cos(AOI), 0)
POAsky    = DHI × (1 + cos β) / 2
POAground = albedo × GHI × (1 - cos β) / 2
POA       = POAbeam + POAsky + POAground
```

The sky term is the isotropic model documented by [Sandia PVPMC](https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/plane-of-array-poa-irradiance/calculating-poa-irradiance/poa-sky-diffuse/isotropic-sky-diffuse-model/). It is intentionally transparent but less accurate under strongly anisotropic skies than Perez or Hay–Davies.

Beam angle-of-incidence loss follows the ASHRAE form:

```text
IAM = max(0, 1 - b0 × (1 / cos(AOI) - 1))
```

A configured horizon blocks direct beam when solar elevation is below the interpolated obstruction angle. Scalar shading affects the remaining irradiance and is disclosed as a simplification.

## Module temperature

The Faiman model is used:

```text
Tmodule = Tair + POA / (U0 + U1 × windSpeed)
```

Defaults are `U0 = 25 W/m²K` and `U1 = 6.84 W·s/m³K`, based on the combined fit described by [Sandia PVPMC](https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/module-temperature/faiman-module-temperature-model/). Mounting-specific calibrated values should replace these defaults for field validation.

## DC power and losses

For rated DC capacity `Pstc`, effective irradiance `Geff`, module coefficient `γP`, and module temperature:

```text
Pdc,raw = Pstc × Geff / 1000 × (1 + γP × (Tmodule - 25))
Pdc = max(0, Pdc,raw × ∏(1 - loss_i))
```

Losses are multiplicative, never summed. The calculation reports each stage separately: incidence, temperature, shading/horizon, soiling/dust, snow, mismatch, wiring/string, availability, degradation, and inverter conversion. A global performance ratio is not applied on top of detailed losses; performance ratio is derived from delivered energy and POA irradiation.

Degradation uses:

```text
Pstc(age) = Pstc(initial) × (1 - annualDegradationRate)^age
```

Simplified bifacial gain and tracking multipliers are experimental and are never presented as a detailed rear-side or backtracking model.

## Inverter

The part-load relationship follows the documented PVWatts v5 form, with nominal efficiency scaled against reference efficiency `0.9637`; AC output is clamped to the rated inverter power and clipping is reported separately. See the [PVWatts Version 5 manual](https://pvwatts.nrel.gov/downloads/pvwattsv5.pdf).

For every positive DC input, efficiency and AC output are constrained to physical ranges. Night output is exactly zero.

## Battery and grid balance

For each interval, on-site load is served by PV first. Surplus charges the battery subject to charge power, capacity, maximum state of charge, and charge efficiency. Deficit is served by the battery subject to discharge power, minimum state of charge, and discharge efficiency. Remaining surplus is exported or curtailed; remaining deficit is imported.

```text
chargeInput = min(surplus, chargeLimit × dt, (Emax - SOC) / ηcharge)
delivered   = min(deficit, dischargeLimit × dt, (SOC - Emin) × ηdischarge)
SOCnext     = SOC + ηcharge × chargeInput - delivered / ηdischarge
```

Tests assert SOC bounds, non-negative flows, no simultaneous charge/discharge, and interval energy conservation within numeric tolerance.

Revenue includes avoided import cost and export payment. Carbon reduction defaults to avoided grid imports; export-displacement credit is counted only when explicitly enabled because marginal displacement is system-dependent.

## Short-record representative composite

The 2022–2025 record is too short to be called a climate normal or standards-grade Typical Meteorological Year. The platform calls it a **2022–2025 short-record representative composite**.

For each calendar month and source year, daily distributions are compared with the pooled four-year month using a Finkelstein–Schafer-style CDF distance over irradiation, mean/min/max temperature, cloud, and wind. The selection score combines:

- weighted distribution distance, with irradiation dominant;
- mean/median anomaly penalty;
- persistence/run-length penalty;
- month-seam continuity penalty.

The best whole source month is selected deterministically. Hourly values are never averaged across years. Every output record retains its source year and month-seam flag. Leap day handling is explicit. A seeded weighted resampling ensemble provides scenario quantiles; the interface labels plain percentiles and does not misuse “P90 energy.”

A long-record PVGIS TMY can be compared as a separate benchmark but is never silently merged with the short record.

## Forecasting

The in-Worker model registry supports methods that can be reproduced and inspected without hidden training infrastructure:

- physics-only reference;
- seasonal naïve (same local calendar position in the previous year);
- trailing moving-average clear-sky index by local hour;
- exponential smoothing;
- ridge regression with train-only scaling;
- hybrid physics plus regression residual correction;
- validation-weighted probabilistic ensemble.

Example ridge features include POA, air temperature, POA×temperature, cloud, wind, and sine/cosine encodings for hour and day of year. Ensemble weights are derived from validation-only inverse MAE. Residual intervals use empirical/block-conformal quantiles and are clipped to non-negative/nameplate bounds.

ARIMA/SARIMA, random forest, gradient boosting, TCN, LSTM, transformer, and deep physics-informed models require an actual training pipeline, serialized artifact, run manifest, and validation record. Until those exist, their status is **Planned**, and the application displays no invented metrics.

## Optimisation

Implemented optimisation tools reuse the same full-year calculation for every candidate:

- bounded grid search with a combination guard;
- nondominated Pareto filtering;
- seeded Monte Carlo perturbation/resampling;
- one-at-a-time sensitivity and elasticity;
- named deterministic stress scenarios.

A candidate dominates another only if no objective is worse and at least one is better. The UI therefore presents trade-offs among annual energy, self-consumption, grid imports, revenue, carbon, reliability, and uncertainty instead of asserting one universally optimal design.

Bayesian optimisation, Sobol global sensitivity, formal scenario-tree optimisation, and robust mathematical programming remain **Planned** until genuine algorithms and validation are connected.

## Known numerical limitations

- Hourly midpoint geometry smooths fast cloud and edge-of-sunrise effects.
- The compact solar-position approximation loses accuracy at extreme latitude.
- Isotropic diffuse ignores circumsolar/horizon brightening.
- Scalar shading, soiling, dust, and snow do not replace physical submodels.
- Deterministic demand/tariff/carbon profiles are scenarios, not measurements.
- Four source years cannot characterize multi-decadal climate variability.
- Confidence intervals depend on the simulated/input regime and do not bound all structural error.

