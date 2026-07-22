# Scientific methods

## Scope and status

The built-in calculation engine is an explainable first-order PV system model intended for research exploration and scenario comparison. It is not a bankable energy-yield assessment, certified plant controller, or guarantee of production.

The deterministic sample dataset is labelled **Simulated**. Fixed-tilt geometry, isotropic irradiance transposition, temperature derating, detailed scalar losses, DC/AC conversion, and battery energy balance are **Implemented**. Simplified tracker/bifacial/horizon treatments are **Experimental**. Detailed row-to-row backtracking, rear-side view-factor irradiance, physical snow/soiling, and string electrical networks are **Planned**.

## Units and temporal convention

- Internal timestamps are ISO 8601 UTC.
- Location timezone is retained as display metadata. The executable annual research calendar is grouped in UTC with an explicit no-leap alignment; local civil-time/DST grouping is not yet implemented.
- Provider radiation timestamps label the end of the preceding hourly mean. Geometry is evaluated 30 minutes earlier, at that interval's midpoint.
- Irradiance is power density in W/m².
- The executable annual engine currently requires hourly intervals. Irradiation is therefore `W/m² × 1 h`, giving Wh/m², and hourly mean kW is numerically equal to interval kWh.
- General interval-duration integration is planned; non-hourly inputs are rejected rather than silently treated as one hour.
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

The supplied triplet is accepted when the absolute closure residual is at most
`max(25 W/m², 0.05 × GHI)`. If it exceeds that declared tolerance, DNI is
bounded by both `1,400 W/m²` and `GHI / cos(θz)` when `cos(θz) > 0.065`
(otherwise DNI is zero), and DHI is recomputed from the closure equation. The
hour is flagged `corrected:supplied-irradiance-closure`, marked imputed, counted
in dataset evidence, and receives a `0.02` science-quality penalty. GHI remains
the provider anchor; this correction is transparent reconciliation, not proof
that the provider component product is physically exact.

If either beam or diffuse irradiance is unavailable, the adapter re-derives both components from GHI with the hourly Erbs diffuse-fraction correlation. For `μ = cos(θz)`, extraterrestrial normal irradiance `I0n`, and non-negative `G = GHI`:

```text
if not daylight, μ <= 0.065, or G <= 0:
    DNI = 0
    DHI = G
    Kt  = 0
otherwise:
    I0h = max(1, I0n × μ)
    Kt  = clamp(G / I0h, 0, 1.2)

    fd = 1 - 0.09 Kt                                           if Kt <= 0.22
    fd = 0.9511 - 0.1604 Kt + 4.388 Kt² - 16.638 Kt³
         + 12.336 Kt⁴                                          if 0.22 < Kt <= 0.80
    fd = 0.165                                                  if Kt > 0.80

    fd       = clamp(fd, 0, 1)
    DHIerbs  = clamp(G × fd, 0, G)
    DNI      = clamp((G - DHIerbs) / μ, 0, 1400) W/m²
    DHI      = clamp(G - DNI × μ, 0, G)
```

The `μ <= 0.065` guard avoids unstable division near the horizon. Recomputing final DHI after the 1,400 W/m² DNI cap preserves `GHI = DNI cos(θz) + DHI`; at night, any non-zero provider GHI is retained as diffuse rather than silently discarded. Derived components receive `derived:erbs-irradiance-components`. This empirical correlation is a fallback, not a substitute for a validated component product.

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

The current horizon input is a scalar retained-energy loss applied in the DC loss chain; it is not an interpolated obstruction profile and does not geometrically block the beam. Scalar shading is increased at high incidence angle. Both are disclosed first-order approximations pending a site horizon profile and row/terrain model.

## Weather-derived snow depth and albedo

When the source exposes snow depth, that non-negative value is used. When it is unavailable, the annual adapter starts each source year at `S₀ = 0 cm` and advances a simplified balance proxy for temperature `T` in °C and hourly precipitation `P` in mm:

```text
if T < 1°C and P > 0:
    Snext = clamp(Sprior + 0.65 × P, 0, 100) cm
otherwise:
    Snext = clamp(Sprior - 0.016 × max(T, 0), 0, 100) cm
```

The `0.65 cm/mm` accumulation and `0.016 cm/(°C·h)` melt constants are generic screening assumptions, not a calibrated snowpack model. Every proxy hour is flagged `derived:snow-depth-balance-proxy`, marked imputed, and receives a 0.025 quality-score penalty.

Surface albedo is then derived as:

```text
albedo = 0.58                                      if snow depth > 0.5 cm
albedo = clamp(0.19 + min(0.09, 0.01 × P), 0.16, 0.28) otherwise
```

These constants do not model snow ageing, vegetation, roof material, meltwater, wind redistribution, or sub-hourly accumulation. Site measurements or a validated land-surface/snow model must replace them for field-grade analysis.

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

The executable inverter is a bounded generic part-load approximation:

```text
loadFraction = Pdc / Pac,rated
partLoadAdjustment = 0.92 + 0.08 × sqrt(clamp(loadFraction, 0, 1))
Pac,preclip = Pdc × nominalEfficiency × partLoadAdjustment
Pac = min(Pac,rated, Pac,preclip)
```

This is not the PVWatts v5 inverter equation and must not be described as such. AC output is clamped to rated inverter power and clipping is reported separately. A named manufacturer curve or independently validated PVWatts implementation remains future work.

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

For each calendar month and source year, daily distributions are compared with the pooled four-year month using a Finkelstein–Schafer-inspired empirical-CDF distance `FS`. The executable score is:

```text
FSweighted = 0.45 FSGHI
           + 0.25 FStemperature
           + 0.10 FSwind
           + 0.15 FScloud
           + 0.05 FSprecipitation

continuity = 0.60 × |Tprevious,last - Tcandidate,first| / 30
           + 0.40 × |cloudprevious,last - cloudcandidate,first| / 100

score = FSweighted + 0.08 × persistence + 0.04 × continuity
```

`FSGHI` uses daily irradiation, while the other terms use daily mean temperature, daily mean wind, daily mean cloud and daily precipitation total. Each `FS` value is the mean absolute separation between the candidate-month CDF and the pooled four-year CDF evaluated on the pooled values. `persistence` is the mean normalized difference in longest clear, overcast and wet run length relative to the four candidate years; each denominator is bounded below by one day. The coefficients are method constants, not fitted parameters.

The best whole source month is selected deterministically. Hourly values are never averaged across years. Every output record retains its source timestamp and source year; target month, day, and day-of-year are recomputed together. Leap-day removal is explicit. Annual Q10/Q50/Q90 values are empirical non-exceedance quantiles of only the four historical-year simulations (`n=4`), not calibrated probabilistic P-values.

A long-record PVGIS TMY can be compared as a separate benchmark but is never silently merged with the short record.

## Forecasting and hindcasting

The annual research route uses one explicit chronological protocol:

- train regression and climatology on 2022–2023;
- calibrate ensemble weights and residual width on 2024;
- evaluate once on untouched 2025;
- report separate expanding annual folds for 2023, 2024, and 2025 stability.

The evaluated methods are prior-year seasonal naive, 2022–2023 hour-of-year climatology, meteorological ridge regression, and a validation-weighted ensemble. The ten ridge features are GHI, DNI and DHI divided by 1,000; temperature divided by 25; wind divided by 10; cloud divided by 100; and sine/cosine encodings for hour and no-leap day of year. Features are standardized from training data. The intercept is not penalized; the executable ridge system uses fixed `λ = 0.015` and is equivalent to minimizing:

```text
Σ(y - β0 - Xβ)² + λ × ntraining × ||β||²
```

No hyperparameter search is claimed. For the 2024 calibration year, ensemble weights and the 80% absolute-residual width are:

```text
wi       = (1 / max(10⁻⁶, MAEi)) / Σj(1 / max(10⁻⁶, MAEj))
point(t) = Σi wi × max(0, componenti(t))
r80      = Q0.80(|y2024(t) - point2024(t)|)
σcomp(t) = population standard deviation of the three component values at t
half(t)  = max(r80, σcomp(t))
lower(t) = max(0, point(t) - half(t))
upper(t) = point(t) + half(t)
```

The calibrated weights and `r80` are applied unchanged to 2025. Component spread is not added to the residual width: the larger of the two widths is used. The current upper bound is not clipped to inverter nameplate, and that limitation is retained in the validation report.

Because 2025 meteorology is realised reanalysis, the ridge and ensemble tasks are weather-conditioned hindcasts, not issued year-ahead forecasts. The physics calculation defines the current target and is not scored against itself. The initial offline operating snapshot also retains moving-average and exponential-smoothing proving baselines, but those one-step tasks are not ranked as equivalent to the full-year holdout.

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
- The executable calendar is UTC; civil-time grouping and DST transitions are not represented.
- The compact solar-position approximation loses accuracy at extreme latitude.
- Isotropic diffuse ignores circumsolar/horizon brightening.
- Scalar shading, soiling, dust, and the documented snow/albedo proxy do not replace physical submodels.
- Deterministic demand/tariff/carbon profiles are scenarios, not measurements.
- Four source years cannot characterize multi-decadal climate variability.
- Confidence intervals depend on the simulated/input regime and do not bound all structural error.
