# Forecasting, Machine Learning & Representative-Year Research — Department Charter

## Mission

Estimate complete-year photovoltaic production with transparent baselines, physical references, statistical and machine-learning models, calibrated uncertainty and correct chronological validation. The department also owns representative-year construction because it defines the annual weather target against which forecasting and long-horizon comparisons are made.

## Current truth

Maturity uses the common scale: **M0** planned only; **M1** executable prototype; **M2** deterministic and tested; **M3** independently validated on untouched real data; **M4** operationally monitored; **M5** certified for its declared use.

- **M2 numerical utilities:** `lib/forecasting/**` contains executable seasonal-naive, moving-average, exponential-smoothing, ridge-regression, inverse-MAE ensemble, interval and metric functions plus an expanding-window rolling-origin evaluator. Deterministic tests cover exact metrics, ridge fit and one rolling-origin case.
- **M1 forecasting evidence:** model comparisons in `lib/operating-snapshot.ts` use deterministic simulated weather and a constructed `measuredPattern`; they demonstrate mechanics, not field forecast skill. Ensemble calibration uses the first 120 days of the 2025 proving series, while reported whole-year metrics are not yet a separately untouched promotion evaluation.
- **M1 representative year:** `lib/representative-year/index.ts` constructs 8,760 hours by selecting whole historical days against irradiance, temperature and cloud quantiles with source-balance and continuity penalties. Its input is hard-coded to simulated 2022–2025 non-leap years.
- **M0:** trained SARIMA, random forest, gradient boosting, TCN, LSTM, Transformer and deep physics-informed artifacts; archived issue-time forecast replay; production drift monitoring; formal experiment execution and artifact promotion.
- Registry entries for untrained models are correctly marked `planned` with no fabricated metrics.
- Documentation currently overstates parts of the implementation: it describes FS-style source-month selection, clear-sky-index moving averages, physics residual correction, block-conformal intervals and CUSUM/feature drift monitoring that the runtime does not yet implement.

## Ownership boundary

- **Primary existing paths:** `lib/forecasting/**`, `lib/representative-year/**` and `research/**`.
- **Primary records:** `model_versions`, `experiments` and `experiment_metrics` in `db/schema.ts` and `drizzle/**`. A forecast-run table and immutable model-artifact storage are target capabilities, not current tables.
- **Governed shared paths:** forecast, model, interval, validation and representative-year contracts plus `MODEL_VERSION` and `DATASET_VERSION` in `lib/contracts/index.ts`.
- **Shared integration path:** model construction inside `lib/operating-snapshot.ts` is platform orchestration; FORECAST owns its methodological validity, split definitions and model status.
- **Documentation and tests:** `docs/MODEL_VALIDATION.md`, forecasting and representative-year sections of `docs/SCIENTIFIC_METHODS.md`, `docs/RESEARCH_ROADMAP.md`, `research/README.md` and relevant cases in `tests/science-core.test.mjs`.
- **Target paths, planned:** `research/pipelines/**`, `research/configs/**`, `research/manifests/**`, `tests/forecasting/**`, `tests/representative-year/**` and `tests/fixtures/model-runs/**`.
- FORECAST does not own provider truth, solar equations, battery dispatch, financial policy or visual ranking of models.

## Interfaces

- **Consumes from DATA:** immutable weather and production snapshot IDs, quality, exact data class, issue/valid times, lead time, units and transformation history.
- **Consumes from STAR:** versioned hourly physical estimates and structural assumptions; these remain a reference or feature, not measured truth.
- **Publishes today:** `ModelRecord[]`, `ValidationMetrics`, point/interval arrays and `RepresentativeYearRecord` within the operating snapshot.
- **Required target forecast contract:** forecast-run ID, model/artifact hash, input snapshot IDs, issue time, valid range, lead-time grid, feature schema, training/calibration/evaluation windows, point/quantile output, units, quality, assumptions and warnings.
- **Required target representative-year contract:** method/version, selected source interval and snapshot for every output hour, construction scores, seam flags, source weights, distribution diagnostics and uncertainty ensemble.
- ENERGY may consume forecast distributions for optimisation only after issue-time and scenario semantics are explicit. It may not treat P10/P90 bounds as guarantees.

## Decision authority

- FORECAST decides temporal split methodology, feature availability rules, model families, hyperparameter search policy, metric definitions, calibration methods, drift tests, champion/challenger rules and representative-year method labels.
- Evaluation data must remain untouched by model, feature, threshold and ensemble-weight selection. Any leakage finding invalidates the run.
- A model name without an immutable trained artifact and run manifest remains M0/planned.
- Champion promotion requires more than the best single metric; annual error, seasonal stability, bias, interval calibration, failure behavior, cost and provenance all apply.
- Only DATA can define an input as observed, reanalysis or issued forecast; only STAR can define the physical reference version.

## First deep-work programme

1. **Correct the evidence boundary:** align documentation with current code, separate calibration from untouched evaluation and make every simulated score visibly non-field evidence.
2. **Generalise representative years:** accept versioned multi-year datasets, preserve source snapshot lineage, support leap policy and compare multi-year averaging, weather normalisation, FS/TMY selection, regime clustering and weighted resampling.
3. **Create the offline run contract:** pin Python dependencies and record code release, dataset hashes, feature schema, split, seed, hyperparameters, compute, metrics, calibration and artifact hash.
4. **Establish serious baselines:** implement seasonal/state-space and SARIMA, random forest and gradient boosting before deep architectures; compare all models under identical rolling origins.
5. **Add probabilistic research:** implement calibration-only empirical and block-conformal intervals, interval width/score and regime-conditioned calibration with untouched coverage evaluation.
6. **Operationalise model governance:** add immutable forecast runs, artifact compatibility checks, champion/challenger promotion, residual/feature drift and archived issue-time replay.

## Definition of done

- Every fold is chronological; all training, calibration and evaluation windows are recorded and non-overlapping where required by the chosen method.
- Every model result is reproducible from immutable data, code/environment lock, seed, feature schema, hyperparameters and artifact hash.
- Seasonal naive and other agreed baselines run beside every candidate; missing or invalid metrics fail the run rather than becoming zeros.
- Metrics include MAE, RMSE, guarded MAPE, nMAE, bias, R², seasonal error, annual-generation error, peak error, interval coverage and calibration quality with units and sample counts.
- Representative-year output is exactly auditable to its source intervals and is labelled a short-record composite unless the source and method justify TMY terminology.
- Prediction intervals state nominal level, achieved coverage, width, calibration source and physical clipping.
- Planned models show no score or champion role. M3 requires untouched measured-production or genuine archived issue-time evidence.

## Measures

- Forecast metrics by model, horizon, season, weather regime, site and data-quality stratum.
- Annual-generation and peak-output error on untouched evaluation periods.
- Interval coverage, mean width, interval score and absolute calibration error.
- Fold count, leakage violations, reproducibility failures and artifact/schema incompatibilities.
- Representative-year percentile, mean, persistence, regime and seam deviations from source distributions.
- Champion stability and challenger promotion/rejection reasons over time.
- Residual bias and feature-distribution drift once operational data exists.
- Training/inference duration, memory and energy/compute footprint per artifact.

## Risks and escalation

- Halt a run when future information enters features, scaling, calibration, hyperparameter selection or representative-year targets.
- Escalate any attempt to label simulated agreement as measured validation or reanalysis hindcast as an issued forecast.
- Four years cannot establish a climate normal or robust extreme-event probability; representative-year outputs must preserve that limitation.
- MAPE near zero, R² with zero observed variance and aggregate metrics hiding seasonal failure require explicit handling, not convenient numeric defaults.
- Narrow intervals with poor coverage are a failure. Structural STAR and DATA uncertainty must not disappear inside residual calibration.
- Deep learning is not a maturity milestone by itself; no architecture advances without outperforming strong baselines on untouched evidence and meeting the same provenance gates.
