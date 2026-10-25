# Research & Scientific Communication (`RESEARCH`)

## Mission

Ensure every research question, experiment, comparison and publication is reproducible, appropriately qualified and useful. RESEARCH protects the boundary between executable evidence and aspiration while coordinating methods across solar physics, weather, forecasting, optimisation and long-horizon analysis.

## Current truth

- The repository documents scientific formulae, representative-year construction, model validation, provider/provenance methods, limitations and a staged research roadmap.
- Sample mode executes a deterministic 8,760-hour physics and energy-flow path, a 2022–2025 short-record representative composite and lightweight forecasting/optimisation methods.
- Current forecast metrics in sample mode demonstrate reference agreement and evaluation mechanics; they are not measured-plant forecast validation.
- Measured production data, archived issue-time forecasts and a true 2022–2025 operational replay have not been supplied.
- SARIMA, random forest, gradient boosting, TCN, LSTM, transformer and full physics-informed training pipelines remain planned. No trained artifacts or performance claims exist for them.
- `research/` currently describes a boundary for future offline pipelines; it does not contain a pinned Python training environment, experiment runner or versioned run manifests.
- The Publication Studio surface exposes current evidence and method notes, but an automated publication-quality export/reproduction pipeline is not established yet.

## Ownership boundary

RESEARCH is primary steward for:

- `research/**` and reproducible offline experiment conventions.
- `docs/RESEARCH_ROADMAP.md`, `docs/MODEL_VALIDATION.md` and cross-domain scientific limitations.
- Experiment manifests, model cards, dataset cards and publication evidence standards.
- The distinction among implemented, experimental, simulated and planned research capability.
- Climate/long-horizon research framing and Research Publication Studio methodology.

RESEARCH does not unilaterally change solar formulae, provider transformations, forecast code or product claims. The implementing scientific department owns the method; RESEARCH governs evidence quality, comparison design, reproducibility and communication.

## Interfaces

- **SOLAR and ENERGY:** formula evidence, known limitations, calibration inputs and engineering validity.
- **DATA:** dataset snapshots, licences, quality, transformations, temporal meaning and retention.
- **FORECAST:** temporal splits, metrics, calibration, drift and champion/challenger promotion.
- **TWIN and FEATURES:** research visualisation, annotations, export context and honest lifecycle labels.
- **MI:** evidence eligibility, provenance, uncertainty language, research-method specialist boundaries and safeguards against fabricated findings.
- **PLATFORM:** experiment/model metadata, immutable artifacts and bounded inference interfaces.
- **QA:** reproducibility, numerical tolerances, leakage checks and publication regression evidence.
- **SECOPS:** sensitive data, licences, artifact integrity and scientific-output incident handling.

## Decision authority

RESEARCH approves experiment design, evidence classification, publication readiness and model-comparison protocol. The relevant scientific department co-approves method validity; DATA co-approves dataset fitness and meaning; SECOPS co-approves sensitive-data and licence handling. RESEARCH may block a claim, model promotion or publication that lacks reproducible inputs, correct temporal evaluation, uncertainty or stated limitations.

## First deep-work programme

1. Define a versioned experiment-manifest schema requiring research question, hypothesis, lifecycle, code commit, environment lock hash, dataset snapshot IDs, model versions, temporal split, seed, hyperparameters, metrics with units, calibration, limitations and decision.
2. Add dataset-card and model-card templates tied to immutable hashes and provenance records.
3. Specify the measured-production ingestion and consent/licence requirements before accepting field-validation claims.
4. Build the offline research environment with pinned dependencies, deterministic seeds and artifact export separate from the Worker runtime.
5. Reproduce the existing baselines through the offline pipeline before adding deep models.
6. Implement rolling-origin and seasonal-holdout experiment records for 2022–2025 without random temporal leakage.
7. Add candidate models only when executable runs, artifacts and honest comparison tables exist; keep absent models planned.
8. Establish promotion gates for experimental, implemented and champion status using untouched temporal holdouts, calibration, failure behavior and computational cost.
9. Define publication bundles containing data/model cards, manifests, plots, tables, source/version references and limitations.
10. Record future research opportunities without placing fabricated results in the UI or documentation.

## Definition of done

- The research question, hypothesis and decision criterion are stated before final evaluation.
- Code, environment, seed, configuration, dataset snapshots and artifacts are versioned or hash-addressed.
- Training, calibration and evaluation windows are temporally valid and independently recorded.
- Metrics include units, sample counts, applicable thresholds and uncertainty/calibration context.
- Simulated, reanalysis-derived, forecast and measured targets are never conflated.
- Limitations, null/negative results and failed runs remain part of the record.
- A publication bundle can be regenerated from documented inputs within declared numerical tolerances.
- Lifecycle or champion promotion follows recorded evidence rather than visual plausibility or a single favorable metric.

## Measures

- Every reported experiment has a complete, schema-valid manifest.
- Every dataset and model used for a claim has a resolvable card and immutable identifier.
- Zero random temporal train/test splits in time-series evaluation.
- Zero measured-validation or deep-model performance claims before corresponding data and artifacts exist.
- Reproduction success and numerical deviation are recorded for publication bundles.
- Promotion decisions record all required metrics, calibration, seasonal behavior, cost and failure modes.
- Research gaps remain visible in the roadmap with explicit planned status and accountable owner.

## Risks and escalation

- **Synthetic evidence presented as field validation:** block publication/release and correct the lifecycle label everywhere.
- **Temporal leakage:** invalidate the affected run, preserve it as failed evidence and rerun with a valid split.
- **Short-record overconfidence:** require scenario/interval language and prevent four years from being described as a climatological guarantee.
- **Dataset licence or consent uncertainty:** stop ingestion/export until DATA and SECOPS approve use and retention.
- **Irreproducible artifact:** keep the model in planned/experimental status and prevent champion promotion.
- **Metric selection bias:** require the predefined metric set and retain unfavorable results.
- **Scientific disagreement:** record competing methods and evidence in a scientific decision record; do not erase the superseded lineage.
