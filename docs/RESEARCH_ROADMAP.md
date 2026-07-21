# Research roadmap

This roadmap keeps future capability visible without presenting unimplemented models as working science.

## Implemented in the interactive TypeScript runtime

- Explainable fixed-tilt solar physics and detailed loss accounting.
- Hourly full-year energy, battery, grid, tariff, carbon, and reliability simulation.
- 2022–2025 short-record representative composite and annual scenario ensemble.
- Seasonal-naive, moving-average, exponential, regression, hybrid, and ensemble forecasting.
- Rolling-origin metrics and empirical uncertainty calibration.
- Grid search, Pareto analysis, seeded Monte Carlo, sensitivity, and stress scenarios.
- Provider abstraction, sample fallback, provenance, quality, and versioned APIs.

## Experimental research tracks

- Horizon-profile beam shading validation against surveyed sites.
- Simplified tracking and bifacial gain validation.
- Regime-conditioned conformal intervals.
- Weather-normalised residual drift monitoring.
- Regional potential surfaces from a bounded location set.

## Planned external training pipeline

A separate Python workflow should use pinned environments and versioned datasets to support:

- SARIMA/ARIMA and state-space baselines;
- random forest and gradient boosting;
- temporal convolutional networks and LSTMs;
- time-series transformers;
- physics-informed residual and constraint-aware models;
- champion/challenger experiment tracking;
- distributed hyperparameter search;
- calibrated probabilistic ensembles;
- artifact export for bounded Worker inference.

Each run must record code commit/release, container/environment lock, data snapshot hashes, feature schema, split definition, seed, hyperparameters, metrics, calibration, compute footprint, and artifact hash.

## Planned physical/data expansion

- Perez/Hay–Davies transposition.
- Single-axis backtracking and row geometry.
- View-factor bifacial irradiance.
- Snow/soiling process models with measured calibration.
- String-level electrical topology, mismatch, clipping, and failure isolation.
- Terrain horizon extraction and GPU shadow mapping.
- EUMETSAT cloud/radiation ingestion.
- CDS/ERA5 bulk snapshot workflow and archived issue-time forecast replay.
- Climate-model bias correction and downscaled future scenarios.
- Formal Bayesian, Sobol, scenario-tree, and robust multi-objective optimisation.

## Evidence gates

A planned method becomes experimental only when it executes on a versioned dataset and has documented tests/limitations. It becomes implemented only when its production path, failure states, provenance, and validation acceptance criteria pass. It can become a champion only after evaluation on an untouched temporal holdout.

