**Arithmetic test fixture C05: Robust tie; one option sacrifices nominal yield. These are hand-defined verification values, not physics-generated research data. Production formatter wording below is test output, not fixture provenance. Equal monthly splits and zero seam values, where displayed, are test scaffolding outside the scored questions.**

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.

# Solar estimate and design stability report

Source: simulation. Target: physics-derived generation. Study: fixture_C05.
This is a retrospective computational study of the hypothetical ARITHMETIC FIXTURE C05; no physical simulation configuration. No measured plant output, fresh untouched holdout, financial optimum or calibrated future probability is claimed.

Source data are simulated proving inputs; this is not an ERA5 study.

## Annual estimate and its dependence on source years

The default representative-year estimate is **105 kWh**. The mean of the four individual-year simulations is **95 kWh**, and their median is **95 kWh**.
Removing one source year at a time changes the representative estimate across **100–107 kWh**. This is a sensitivity range, not a confidence interval.

| Selection case | Annual kWh | Change from default (%) | Mean boundary temperature jump (C) |
| --- | ---: | ---: | ---: |
| default | 105 | 0 | 0 |
| omit-2022 | 100 | -4.76 | 0 |
| omit-2023 | 103 | -1.9 | 0 |
| omit-2024 | 105 | 0 | 0 |
| omit-2025 | 107 | 1.9 | 0 |

Boundary jumps include the December-to-January wrap for diagnosis. The existing selection algorithm is greedy and does not optimise that wrap. A smaller jump does not by itself demonstrate better physical accuracy.

## Array decision within the 2 tested options

Nominal representative-year winner(s): **A**.
Minimax-regret winner(s) across the four source years: **A, B**.
The robust rule does not reduce worst-case regret for the nominal choice in this tested set. This is a zero-benefit result, not evidence of improvement.
There are **1** option pairs whose relative order reverses between source years. Winner counts below describe this finite set, not probabilities.

| Option | Tilt / azimuth (degrees) | Nominal annual kWh | Worst historical regret (kWh) | Historical winner count |
| --- | --- | ---: | ---: | ---: |
| A | 22 / 180 | 105 | 10 | 2 / 4 |
| B | 32 / 180 | 100 | 10 | 2 / 4 |

Every option has the same 1 kWp DC capacity, inverter and other settings. This bounded grid does not establish a global optimum or surveyed roof feasibility. The loss and technology assumptions remain those of the research scenario.

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
