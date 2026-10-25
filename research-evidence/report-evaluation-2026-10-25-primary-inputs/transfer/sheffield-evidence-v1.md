# Solar estimate and design stability report

Source: reanalysis. Target: physics-derived generation. Study: study_22b6b34d1cf9f34dbfbc68ee.
This is a retrospective computational study of the hypothetical Sheffield Solar Research Array configuration. No measured plant output, fresh untouched holdout, financial optimum or calibrated future probability is claimed.

Weather data: [Open-Meteo](https://open-meteo.com/) / ECMWF ERA5 reanalysis, 2022–2025. [Data attribution terms](https://open-meteo.com/en/licence). The project adapts the hourly inputs, removes leap day for like-for-like simulation, derives missing snow depth with a proxy and computes PV generation. Retrieval times, complete transformations and raw inputs are retained in the frozen bundle.

## Annual estimate and its dependence on source years

The default representative-year estimate is **49,248.56 kWh**. The mean of the four individual-year simulations is **50,161.48 kWh**, and their median is **50,866.42 kWh**.
Removing one source year at a time changes the representative estimate across **47,150.23–51,936.45 kWh**. This is a sensitivity range, not a confidence interval.

| Selection case | Annual kWh | Change from default (%) | Mean boundary temperature jump (C) |
| --- | ---: | ---: | ---: |
| default | 49,248.56 | 0 | 0.63 |
| no-persistence | 50,991.28 | 3.54 | 0.6 |
| no-continuity | 49,972.65 | 1.47 | 1.9 |
| distribution-only | 50,934.89 | 3.42 | 1.08 |
| omit-2022 | 48,604.32 | -1.31 | 1.68 |
| omit-2023 | 49,986.31 | 1.5 | 1.01 |
| omit-2024 | 51,936.45 | 5.46 | 1.5 |
| omit-2025 | 47,150.23 | -4.26 | 0.92 |

Boundary jumps include the December-to-January wrap for diagnosis. The existing selection algorithm is greedy and does not optimise that wrap. A smaller jump does not by itself demonstrate better physical accuracy.

## Array decision within the 9 tested options

Nominal representative-year winner(s): **tilt-42_azimuth-180**.
Minimax-regret winner(s) across the four source years: **tilt-42_azimuth-180**.
The robust rule does not reduce worst-case regret for the nominal choice in this tested set. This is a zero-benefit result, not evidence of improvement.
There are **3** option pairs whose relative order reverses between source years. Winner counts below describe this finite set, not probabilities.

| Option | Tilt / azimuth (degrees) | Nominal annual kWh | Worst historical regret (kWh) | Historical winner count |
| --- | --- | ---: | ---: | ---: |
| tilt-22_azimuth-162 | 22 / 162 | 47,813.49 | 2,310.28 | 0 / 4 |
| tilt-22_azimuth-180 | 22 / 180 | 47,976.6 | 2,153.76 | 0 / 4 |
| tilt-22_azimuth-198 | 22 / 198 | 47,547.08 | 2,678.23 | 0 / 4 |
| tilt-32_azimuth-162 | 32 / 162 | 49,062.89 | 759.38 | 0 / 4 |
| tilt-32_azimuth-180 | 32 / 180 | 49,248.56 | 581.29 | 0 / 4 |
| tilt-32_azimuth-198 | 32 / 198 | 48,686.05 | 1,284.44 | 0 / 4 |
| tilt-42_azimuth-162 | 42 / 162 | 49,383.3 | 465.7 | 0 / 4 |
| tilt-42_azimuth-180 | 42 / 180 | 49,614.21 | 0 | 4 / 4 |
| tilt-42_azimuth-198 | 42 / 198 | 48,956.09 | 830.97 | 0 / 4 |

Every option has the same 48 kWp DC capacity, inverter and other settings. This bounded grid does not establish a global optimum or surveyed roof feasibility. The loss and technology assumptions remain those of the research scenario.

## What the analysis adds

The report exposes source-year sensitivity, competing month-selection scores, seasonal outputs and ranking changes that a single point estimate hides. Its benefit is the ability to inspect stability and qualify a recommendation. A forecast-accuracy or human decision-quality benefit has not been established.

## Evidence and reproduction

- `audit.json`: complete computed diagnostics and choice comparison.
- `annual-monthly.csv`: source-year and selection-case energy.
- `month-candidate-scores.csv`: all available candidate scores, chosen months and margins.
- `array-comparison.csv`: candidate yields for historical and constructed-weather cases.
- `predictions-2025.csv` and `model-metrics.csv`: historical reference-agreement comparison; weather-conditioned models use different information from seasonal baselines.
- `frozen-bundle.json.gz`: locally frozen canonical/raw/adapted inputs and configuration, integrity-checked before replay.
- `reproduction.json` and `manifest.json`: baseline equality, source version, protocol identity and output file hashes.

The four-year weather record is short. Model-to-model reference agreement and sensitivity diagnostics do not establish measured plant accuracy. Independent model/reference validation remains future work.
