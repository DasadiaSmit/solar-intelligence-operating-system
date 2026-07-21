# Model validation report

## Validation objective

The validation layer answers two different questions and keeps them separate:

1. **Reference agreement:** how closely a model reproduces a deterministic physics/reference series when conditioned on realised reanalysis weather.
2. **Forecast skill:** how closely an issue-time forecast reproduces subsequently observed production/weather at a defined lead time.

The included offline sample mode can demonstrate reference agreement and the mechanics of time-series evaluation. It cannot claim field validation because no measured plant-production dataset was supplied. ERA5/reanalysis hindcasts are not relabelled as forecasts.

## Data partitions

Random train/test splitting is prohibited. The default rolling-origin sequence is:

| Fold | Training | Evaluation |
| --- | --- | --- |
| 1 | 2022 | 2023 |
| 2 | 2022–2023 | 2024 |
| 3 | 2022–2024 | 2025 |

Seasonal holdouts supplement the annual folds. Scaling parameters, regression coefficients, ensemble weights, and residual interval quantiles are fit only on training/calibration periods. The final test period is not used for model selection.

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

The platform also reports:

- monthly/seasonal absolute error;
- annual generation error;
- peak and 99th-percentile power error;
- prediction-interval coverage probability (PICP);
- absolute coverage calibration error;
- mean interval width and interval score;
- rolling residual bias and warning-level drift indicators.

## Calibration

Probabilistic intervals use held-out empirical/block residual quantiles. The nominal interval level, achieved coverage, width, and calibration error are displayed together. Non-negative and inverter-nameplate bounds are applied after interval construction and disclosed.

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

The lightweight runtime monitors rolling residual bias/CUSUM-style deviation and feature distribution shift. Drift is an alert, not proof of failure. A flagged model remains traceable while retraining is scheduled externally. Production retraining requires a new artifact and version; it never mutates an existing model record.

## Current validation status

| Capability | Status | Interpretation |
| --- | --- | --- |
| Solar/energy conservation tests | Implemented | Numerical invariants and known vectors |
| Time-series rolling-origin splitter | Implemented | Prevents random temporal leakage |
| Baseline/hybrid metrics | Simulated | Agreement against deterministic sample reference |
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

