# Full-year 2022–2025 research spine

## Research objective

The authoritative research question is:

> What hourly photovoltaic electricity generation should be expected over a complete representative year using 2022–2025 weather and solar-radiation evidence?

The surrounding operating-system workspaces are presentation, engineering and future-product layers. They do not replace this research objective.

## Implemented end-to-end path

```text
Open-Meteo reanalysis (ERA5 default), one request per source year
  → canonical hourly weather, units, UTC, quality and content hash
  → strict science eligibility and no-leap alignment
  → solar position, irradiance, temperature, DC/AC and loss model
  → four historical-year generation simulations
  → experimental whole-month representative year
  → baseline, meteorological and hybrid hindcast evaluation
  → annual estimate, interannual uncertainty and provenance record
```

The same boundary is exercised by the deterministic provider in sample mode. There is no second hidden annual sample generator in the research route.

The compact API is:

- `GET /api/v1/studies/annual?mode=sample`
- `GET /api/v1/studies/annual?mode=live`

Optional query parameters are `latitude`, `longitude`, `elevationM`, `locationName`, `capacityKwDc`, `tiltDeg`, `azimuthDeg`, and `systemLossPct`. Live mode pins the Open-Meteo reanalysis adapter, defaults to ERA5, disables simulated fallback, and returns an error if any year is incomplete or semantically substituted. Non-default coordinates use a UTC research-location contract unless a future version accepts and validates explicit civil-time metadata; this prevents inherited Sheffield timezone metadata from being attached to another site.

`systemLossPct` controls the aggregate retained-energy loss across horizon, shading, soiling, dust, snow, mismatch, wiring, string and availability terms. The route preserves each default term's relative log-retention contribution: for current aggregate retention `Rcurrent` and requested retention `Rtarget = 1 - systemLossPct / 100`, each term retention is raised to `ln(Rtarget) / ln(Rcurrent)`. Curtailment remains separate. The returned configuration reports the resulting multiplicative aggregate, so the server-applied scenario can be audited.

## Calendar and data policy

Each source year is acquired separately because provider requests are bounded to 366 days:

| Source year | Expected provider hours | Research-aligned hours |
| --- | ---: | ---: |
| 2022 | 8,760 | 8,760 |
| 2023 | 8,760 | 8,760 |
| 2024 | 8,784 | 8,760 |
| 2025 | 8,760 | 8,760 |

The 24 leap-day hours remain counted in source evidence and are explicitly removed only for like-for-like no-leap modelling. The complete source grid—including every leap-day interval—is validated before removal. Every eligible research hour must exist. Required temperature, wind, pressure, humidity, cloud, precipitation and GHI values cannot remain null.

Radiation values are treated as preceding-hour means: the provider timestamp identifies the interval end and solar geometry is evaluated 30 minutes earlier. Missing beam/diffuse components are derived with the Erbs hourly diffuse-fraction correlation, bounded without breaking irradiance closure, and flagged. Missing snow depth uses the disclosed temperature/precipitation balance proxy in [Scientific methods](SCIENTIFIC_METHODS.md#weather-derived-snow-depth-and-albedo); it is marked imputed, lowers science quality, and remains a known limitation. Precipitation and snow are never linearly interpolated.

When all three irradiance components are supplied, closure is accepted only within `max(25 W/m², 5% of GHI)`. Outside that tolerance, the triplet is transparently reconciled to the midpoint geometry, flagged, counted, marked imputed, and penalised by `0.02` in science quality; the exact policy is documented in [Scientific methods](SCIENTIFIC_METHODS.md#irradiance-and-plane-of-array).

The executable Erbs fallback uses `Kt = clamp(GHI / max(1, I0n cos(θz)), 0, 1.2)`. Diffuse fraction is `1 - 0.09Kt` for `Kt <= 0.22`; `0.9511 - 0.1604Kt + 4.388Kt² - 16.638Kt³ + 12.336Kt⁴` for `0.22 < Kt <= 0.80`; and `0.165` above `0.80`. When `cos(θz) <= 0.065` or the sun is not above the daylight threshold, DNI is zero and GHI is retained as diffuse. Otherwise DNI is capped at `1,400 W/m²` and DHI is recomputed from the closure equation. The complete derivation and limitations are in [Scientific methods](SCIENTIFIC_METHODS.md#irradiance-and-plane-of-array).

## Representative-year method

The four-year record is too short for a standards-grade Typical Meteorological Year. The executable method is therefore labelled an **experimental short-record representative year**.

For each calendar month, the complete candidate month from 2022, 2023, 2024 or 2025 is scored using:

- 45% daily irradiation empirical-CDF distance;
- 25% mean-temperature empirical-CDF distance;
- 15% cloud-cover empirical-CDF distance;
- 10% wind-speed empirical-CDF distance;
- 5% precipitation empirical-CDF distance;
- an additional persistence/run-length term weighted `0.08`;
- an additional boundary-continuity term weighted `0.04`.

The final candidate score is `FSweighted + 0.08 × persistence + 0.04 × continuity`. Continuity itself weights the normalized source-month seam as 60% temperature difference and 40% cloud-cover difference. These are fixed method constants rather than fitted values.

The lowest-scoring complete source month is remapped to the representative calendar. Source timestamp and year are retained, while target month, day and day-of-year are recomputed consistently. No individual hourly values are averaged across years.

## Validation protocol

The primary evaluation protocol is strictly chronological:

- training: 2022–2023;
- ensemble calibration: 2024;
- untouched evaluation: 2025.

Separate expanding annual folds evaluate stability:

- train 2022, evaluate 2023;
- train 2022–2023, evaluate 2024;
- train 2022–2024, evaluate 2025.

The first evaluated models are deliberately limited to defensible baselines:

- previous-year seasonal naive;
- 2022–2023 hour-of-year climatology;
- meteorological ridge regression;
- a 2024-calibrated research ensemble.

The ridge uses ten standardized features: normalized GHI, DNI, DHI, temperature, wind and cloud plus sine/cosine encodings of hour and no-leap day of year. Its fixed regularization is `λ = 0.015`, applied as `λ × ntraining` on the coefficient diagonal; the intercept is not penalized. No hyperparameter search is claimed in this release.

The physical simulation defines the current generation target and is not scored against itself as a competitive forecast. No model is promoted as champion while the target is physics-derived.

## Meaning of “prediction” in the current release

The live path is a **weather-conditioned reanalysis hindcast**. The configured archive product (ERA5 by default) describes modelled historical atmospheric conditions after the event. It is not an archived issue-time forecast.

No site meter or inverter production dataset is currently attached. Consequently:

- validation metrics measure agreement with physics-derived generation;
- they do not establish field accuracy;
- they are not evidence that one model predicts a real plant better than another;
- true production validation remains the highest-priority data extension.

## Uncertainty

Annual `Q10`, `Q50` and `Q90` are empirical non-exceedance quantiles from the four historical weather-conditioned annual simulations. The sample size is always shown as `n=4`; nominal and achieved probabilistic coverage are intentionally null.

The research ensemble separately reports its nominal hourly interval level and achieved coverage on untouched 2025. These two uncertainty products are not conflated.

For each ensemble component, the 2024 inverse-MAE weight is normalized to sum to one. The calibration residual width is the 80th percentile of absolute 2024 residuals. At each 2025 hour the interval half-width is `max(calibration residual width, population standard deviation of component predictions)`, not the sum of those values. The lower bound is clipped at zero; the current upper bound is not inverter-nameplate clipped.

## Reproducibility

The study ID hashes:

- the four ordered dataset snapshot IDs;
- the four ordered canonical content hashes;
- the four ordered adapted-science content hashes and science-adapter version;
- system and location configuration;
- representative-year method identity;
- versioned model recipes, feature schemas, and executable hyperparameters;
- calculation and model versions.

Changing any source content or relevant system assumption changes the study ID. Raw provider payloads are not echoed through the public study response.

Each dataset evidence record distinguishes upstream provider quality from adapter-adjusted science quality. It also reports counts for Erbs irradiance decomposition, supplied-component closure correction, snow-depth proxy use, and snow-albedo hours so a derived or corrected field cannot disappear behind one aggregate score. The adapted-science hash is recalculated and verified immediately before simulation; a caller cannot mutate `archive.years` while retaining the old study identity.

## Live acceptance evidence

On 2026-07-22 the default Sheffield 48 kWp configuration completed a fresh no-key live ERA5 study after the interval-end, leap-geometry, irradiance-closure and adapted-content-identity corrections:

| Evidence | Result |
| --- | --- |
| Source hours | `8760 / 8760 / 8784 / 8760` for 2022–2025 |
| Aligned simulation hours | `8760` in every source year |
| Representative-year hours | `8760` |
| Untouched evaluation year | `2025` |
| Representative central estimate | `49,249 kWh` |
| Annual source-year Q10 / Q50 / Q90 | `46,831 / 50,866 / 52,928 kWh` |
| Provider / science quality | `0.900 / 0.875` |
| Adapted-weather hashes | four ordered SHA-256 hashes, verified before simulation |
| Representative-year ID | `representative-2026-972fefef` |
| Reproducible study ID | `study_22b6b34d1cf9f34dbfbc68ee` |

The quality reduction records snow-proxy use in every ERA5 source hour. The 2024 source proxy advanced through all 8,784 source intervals before leap-day removal, while 8,760 aligned hours entered simulation. No supplied-component closure correction was needed in this ERA5 response. This run proves provider-to-result execution and reproducibility for that input snapshot; it is not evidence of meter-level accuracy and is not a production guarantee.

## Current evidence and remaining work

Implemented and tested:

- deterministic and ERA5-backed 2022–2025 acquisition;
- exact year counts and leap handling;
- strict missing-hour/required-field rejection;
- Erbs radiation decomposition and closure;
- internally consistent representative-year chronology;
- disjoint train/calibration/evaluation windows;
- expanding annual stability folds;
- provenance-carrying compact study API;
- interactive sample/reanalysis study controls in the Annual Forecast workspace;
- a dedicated research-spine suite covering closure, full source/calendar integrity, representative-month provenance, study identity, chronological validation, the HTTP contract, missing required fields, and snow-proxy behavior.

Still required before claiming the original objective is fully validated against historical production:

1. A versioned `CanonicalProductionHour` dataset from a meter or inverter.
2. Availability, outage, curtailment, clock-drift and meter-quality treatment.
3. Independent solar-reference vectors and site parameter calibration.
4. Immutable four-year bundle replay from R2, not only live acquisition/cache.
5. Archived issue-time forecast runs for genuine forecasting rather than reanalysis hindcasting.

All generated electricity values remain estimates, not guaranteed production.
