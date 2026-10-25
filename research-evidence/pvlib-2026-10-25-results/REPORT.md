# Independent component and model-choice comparison

Protocol 02 · Sheffield · 2022–2025 and constructed 2026 representative weather · pvlib-python 0.13.1

This study checks selected calculations against an independent library and measures the effect of changing model choices. It uses historical ERA5 weather and computed PV generation. No measured production or fresh untouched forecast test is included.

## Findings under matched inputs

All predeclared numerical parity checks passed.
Parity covers isotropic front irradiance with the same geometry and beam IAM, Faiman with the same input irradiance/wind, pvlib DC with the project's explicit temperature-cap wrapper, and integration with a port of the project's inverter. The cap wrapper supplies an algebraically equivalent bounded temperature to pvlib; it does not change the predicted physical temperature. These checks verify implementation agreement within stated tolerances; they do not validate the shared physical assumptions or the copied inverter policy.

| Case | Daylight elevation MAE (°) | Daylight elevation max (°) | Daylight differences >0.5° (%) | Positive-irradiance temperature-cap hours |
| --- | ---: | ---: | ---: | ---: |
| 2022 | 0.2454 | 0.4388 | 0.00 | 34 |
| 2023 | 0.1900 | 0.3457 | 0.00 | 17 |
| 2024 | 0.1347 | 0.2559 | 0.00 | 9 |
| 2025 | 0.3080 | 0.5460 | 8.77 | 22 |
| representative-2026 | 0.2530 | 0.4530 | 0.00 | 16 |

Daylight here means SPA geometric elevation above 5°. The 0.5° value is a predeclared investigation flag, not an accuracy standard. Full all-hour, near-horizon and circular-azimuth errors are retained in comparison.json. Geometric elevation is compared with geometric elevation; apparent elevation is a separate diagnostic.

## Controlled annual-energy comparison

The controlled configuration is a diagnostic 48 kWp monofacial copy with no added losses, zero system age and zero snow depth. It differs deliberately from the original bifacial/lossy research scenario. Its energy must not be substituted for the original annual estimate.

| Case | Native project (kWh) | Matched primitives | SPA geometry | Linear temperature factor | PVWatts inverter | Final vs native (%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2022 | 54,663.59 | 54,663.59 | 54,669.43 | 54,669.67 | 55,628.09 | +1.764 |
| 2023 | 52,536.77 | 52,536.77 | 52,540.69 | 52,540.85 | 53,449.76 | +1.738 |
| 2024 | 47,889.39 | 47,889.39 | 47,885.41 | 47,885.48 | 48,746.32 | +1.789 |
| 2025 | 56,528.49 | 56,528.49 | 56,543.90 | 56,544.03 | 57,491.38 | +1.703 |
| representative-2026 | 52,169.50 | 52,169.50 | 52,168.11 | 52,168.26 | 53,102.01 | +1.787 |

Each column changes only the next declared modelling choice: (1) native controlled application; (2) pvlib common primitives with application geometry, temperature cap and ported inverter; (3) SPA geometry; (4) remove the temperature-factor cap; (5) replace the inverter curve with PVWatts. These sequential deltas depend on this ordering and are not independent causal effects.

Both inverters retain a 40 kW AC limit and 97.5% nominal efficiency. The PVWatts inverter DC input rating is 40,000/0.975 W; this differs from the modules' 48,000 W rating. A higher modelled output is not evidence that a model is more accurate.

## Controlled array-ranking comparison

| Historical year | Native controlled winner(s) | pvlib controlled winner(s) | Same winners? | Reversed option pairs |
| --- | --- | --- | --- | ---: |
| 2022 | tilt-42_azimuth-180 | tilt-42_azimuth-180 | Yes | 0 |
| 2023 | tilt-42_azimuth-180 | tilt-42_azimuth-180 | Yes | 2 |
| 2024 | tilt-42_azimuth-180 | tilt-42_azimuth-180 | Yes | 1 |
| 2025 | tilt-42_azimuth-180 | tilt-42_azimuth-180 | Yes | 0 |

The nine options use the predeclared 22°/32°/42° tilts and 162°/180°/198° azimuths at equal capacity. Ties are retained within 0.000001 kWh. A boundary winner is not a global optimum, and agreement in this controlled monofacial grid does not validate the original bifacial ranking.

## Limits and what remains

The original rear-irradiance proxy, loss assumptions, snow proxy, weather inputs and site/equipment configuration are not independently validated here. Generic Faiman coefficients use unadjusted 10 m wind, and thermal inputs use post-IAM effective irradiance; numerical agreement cannot establish the adequacy of those assumptions. Hourly radiation averages are evaluated at UTC interval midpoints, with all irradiance zeroed when geometric elevation is nonpositive. A representative year and four historical years cannot establish calibrated future probabilities.

The existing production model and first-study evidence are preserved. These results support an implementation check and critical discussion of modelling assumptions. Field data, parameter calibration and a separate measured-production evaluation remain necessary for plant-accuracy claims.

## Evidence and sources

- comparison.json: all components, geometry strata, cap/gate/clipping diagnostics, energy stages and option rankings.
- hourly-comparison.csv: all 43,800 hourly cases and stage outputs; annual-monthly.csv and array-comparison.csv: unrounded aggregate evidence.
- protocol.json, reproduction.json and manifest.json: fixed method, source identity, runtime and file checksums.
- Weather input: [Open-Meteo](https://open-meteo.com/) / ECMWF ERA5; [licence and attribution](https://open-meteo.com/en/licence). Adaptation and source hashes remain in the frozen input bundle.
- [SPA, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.solarposition.spa_python.html).
- [Isotropic transposition, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.get_total_irradiance.html).
- [ASHRAE IAM, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iam.ashrae.html).
- [Faiman, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.faiman.html).
- [PVWatts DC, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html).
- [PVWatts inverter, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html).
