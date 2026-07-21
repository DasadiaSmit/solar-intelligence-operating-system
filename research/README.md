# Offline research pipeline boundary

The interactive Cloudflare Worker deliberately performs only bounded deterministic simulation and lightweight inference. Large weather archives and model training belong here as a separate reproducible pipeline.

## Required run contract

Every future training run must record:

- immutable input snapshot IDs and licences;
- canonical feature/unit schema;
- training, calibration, and untouched evaluation windows;
- rolling-origin/seasonal split definition;
- code release and locked environment;
- random seed and hyperparameters;
- MAE, RMSE, guarded MAPE, nMAE, bias, R², seasonal/annual/peak error;
- interval coverage, width, and calibration error;
- compute duration/resources;
- serialized artifact hash and compatible runtime schema;
- limitations, warnings, and promotion decision.

## Recommended tools

A production research pipeline can use Python with xarray/pandas for canonical meteorological series, pvlib as an independent physics comparator, statsmodels for SARIMA, scikit-learn for tree/boosting baselines, PyTorch for TCN/LSTM/transformer experiments, and MLflow or an equivalent immutable run registry. Exact versions must be locked.

## Artifact promotion

An artifact is eligible for the interactive model registry only when it has a real run manifest, schema compatibility check, untouched evaluation, calibrated uncertainty, and hash. Names without artifacts remain `planned`; no placeholder score may enter the interface.

