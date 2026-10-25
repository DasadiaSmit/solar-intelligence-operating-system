# Model validation report

## Validation objective

The validation layer answers two different questions and keeps them separate:

1. **Reference agreement:** how closely a model reproduces a deterministic physics/reference series when conditioned on realised reanalysis weather.
2. **Forecast skill:** how closely an issue-time forecast reproduces subsequently observed production/weather at a defined lead time.

The included offline sample mode can demonstrate reference agreement and the mechanics of time-series evaluation. It cannot claim field validation because no measured plant-production dataset was supplied. ERA5/reanalysis hindcasts are not relabelled as forecasts.

## Data partitions

Random train/test splitting is prohibited. The annual research route trains on 2022–2023, calibrates/model-selects on 2024, and evaluates once on untouched 2025. It additionally reports this expanding-origin stability sequence:

| Fold | Training | Evaluation |
| --- | --- | --- |
| 1 | 2022 | 2023 |
| 2 | 2022–2023 | 2024 |
| 3 | 2022–2024 | 2025 |

Monthly/seasonal error slices supplement the annual folds; they are diagnostics within each evaluation year, not separately withheld seasonal blocks. Regression coefficients are fit on training data, while ensemble weights and the residual half-width are fit on 2024 calibration data. The final 2025 period is not used for model selection, ensemble weighting, or interval-width calibration.

## Metrics

For observed/reference power `y`, prediction `ŷ`, number of valid intervals `n`, and AC nameplate `Pnameplate`:

```text
MAE   = Σ |ŷ - y| / n
RMSE  = sqrt(Σ (ŷ - y)² / n)
Bias  = Σ (ŷ - y) / n
nMAE  = MAE / Pnameplate
R²    = 1 - Σ(y - ŷ)² / Σ(y - mean(y))²
```

MAPE is reported only for intervals above a configured production floor, defaulting to the greater of 1% nameplate or a documented absolute threshold. It is not computed at night or near zero.

The current executable metric set reports:

- monthly/seasonal absolute error;
- annual generation error;
- peak-output error;
- prediction-interval coverage probability (PICP);
- absolute coverage calibration error;

99th-percentile error, mean interval width, interval score, and rolling drift indicators remain planned and must not be inferred from the existing fields.

## Calibration

The annual research ensemble uses the empirical quantile of absolute 2024 calibration residuals as a constant half-width, then takes the larger of that value and the three-component spread at each 2025 hour. The lower bound is clamped to zero; the current upper bound is not inverter-nameplate clipped. The response exposes nominal coverage, achieved coverage, and absolute calibration error. Mean interval width and block-residual methods remain planned and are not implied by the current fields.

Four years provide limited independent extremes, so the intervals are scenario uncertainty bands rather than guarantees. Calibration should be repeated when measured production becomes available or when the input/model regime changes.

## Champion/challenger policy

A model is eligible for champion status only if it has:

- a versioned implementation or immutable artifact;
- training/calibration/evaluation windows;
- feature and unit schema;
- reproducible seed/configuration;
- all required evaluation metrics;
- provenance links to input snapshots;
- known-limitations record;
- no unresolved leakage or data-quality failure.

The lowest single metric is not enough. Selection considers annual error, seasonal stability, calibration, bias, computational cost, and failure behavior. A challenger replaces the champion only after the promotion rule is met on untouched evaluation data.

## Drift

Drift monitoring is not yet implemented in the runtime. Production drift work must add a versioned residual/feature-shift calculation, thresholds, tests, alert storage, and retraining policy before this section can be promoted from planned research.

## Current validation status

| Capability | Status | Interpretation |
| --- | --- | --- |
| Solar/energy conservation tests | Implemented | Numerical invariants and known vectors |
| Time-series rolling-origin splitter | Implemented | Prevents random temporal leakage |
| Baseline/hybrid metrics | Simulated | Agreement against deterministic sample reference |
| ERA5-backed 2022–2025 annual study | Experimental | Reanalysis-conditioned physics target; not measured production |
| Empirical interval coverage | Experimental | Short-record scenario calibration |
| Measured-plant validation | Planned | Requires supplied production/telemetry |
| True issue-time 2022–2025 replay | Planned | Requires archived model-run forecasts, not ERA5 |
| Deep-model comparison | Planned | Requires real trained artifacts and run manifests |

## Acceptance tests

- Training time is strictly earlier than evaluation time in every fold.
- Zero/night intervals are excluded from MAPE.
- R² is undefined rather than misleading when observed variance is zero.
- Ensemble weights are non-negative and sum to one.
- Interval quantiles are learned from calibration data only.
- Annual energy metrics integrate power using interval duration.
- Changing system capacity materially changes annual yield and power-normalised metrics.
- Results always disclose whether the target is measured, reanalysis-derived, or simulated.
