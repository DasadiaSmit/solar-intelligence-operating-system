# Reproducing the first assessment study

This is the local analysis branch `codex/assessment-analysis`, based on accepted private UI version 19 (`e5e992ee5989916731aeda624bf8a8308a0cf366`). It adds no UI or deployment. The source version that produced each result is recorded in its `reproduction.json` and `manifest.json`.

## Question and protocol

How sensitive are representative annual PV estimates and equal-capacity array choices to source-year inclusion and representative-month scoring? The protocol `assessment-protocol-01.json` was committed at `5bbb7e389a5288b7d5a27f5cd23e3c55a81ff387` before the new analysis. It fixes the Sheffield scenario, four ERA5 years, nine array options, scoring ablations, omitted-year cases, decision rule and interpretation limits. The experiment is retrospective: 2025 results had already been inspected.

The original captured protocol bytes are authoritative. Do not tune cases or weights to make the robust decision rule appear beneficial. A zero-benefit result is a valid outcome. Further experiments require a separately dated protocol and output folder.

## Preserved inputs

The knowledge hub is two directories above this checkout:

`../../ULTIMATE_PROJECT_KNOWLEDGE/05_Working_Evidence/experiments/sheffield-2026-10-25/`

It contains the complete raw/canonical/adapted archive, system configuration, protocol, original annual study and SHA-256 manifest. The source counts are 8,760 / 8,760 / 8,784 / 8,760 for 2022–2025. The science calendar removes 29 February after stateful weather adaptation. Open-Meteo / ECMWF ERA5 attribution and provider transformations are retained. See https://open-meteo.com/en/docs/historical-weather-api for provider documentation and https://open-meteo.com/en/licence for data attribution terms; consult the retained provider provenance for the actual product and retrieval record.

Generation is computed by this project's physics model; it is not metered generation. Snow depth uses a proxy where the provider does not supply it. Historical reanalysis is not an issued forecast. Four years do not establish a climate normal or calibrated future probabilities.

## Replay without fetching data

Use Node >=22.13 and the project's pinned pnpm/dependencies. Commit source changes before running the analysis. The runner refuses a dirty source checkout, verifies all input hashes and the ERA5-only source policy, revalidates the frozen bundle and disables network access before calculation.

```sh
pnpm research:audit \
  ../../ULTIMATE_PROJECT_KNOWLEDGE/05_Working_Evidence/experiments/sheffield-2026-10-25 \
  /absolute/path/to/a-new-output-directory
```

The output directory must not exist. The runner requires exact equality with the entire saved default study, not only a rounded annual total. Prediction exports must use the same metric calculation path as that study, and the default representative-year audit must reconcile to its annual energy.

`pnpm research:capture` is for intentionally acquiring a **new** baseline (see its CLI usage). It requires network access and should not be used to reproduce the saved study. Sample-mode captures exist for software checks, but the assessment runner rejects them under protocol 01.

## Outputs and interpretation

- `REPORT.md` is generated from computed evidence fields.
- `audit.json` includes every variant, candidate-month score, selection margin, month-boundary jump, annual/monthly energy, array outcome and finite-scenario regret calculation.
- CSV files expose energy, month scores, all candidate yields, hourly predictions and model metrics for independent inspection.
- `frozen-bundle.json.gz` includes input data/configuration plus integrity and site bindings.
- `reproduction.json` identifies the baseline and analysis source versions and equality checks.
- `manifest.json` hashes all core output files. Changing any output invalidates its recorded hash.

Annual energy is the sole array-ranking objective. All nine candidates share capacity, inverter and other assumptions. The nominal rule chooses the best default-representative-year energy; the robust rule minimises maximum energy regret across the four historical years. Their comparison is descriptive within those same scenarios. Counts are not probabilities, and a winner at the boundary of this small grid is not a global optimum. Omitted-year ranges are sensitivity results, not confidence intervals.

## Figures and readable report

Use Python 3.12 with `matplotlib==3.10.7` and `Markdown==3.9` (a separate environment is sufficient):

```sh
python scripts/research/render-assessment.py /absolute/path/to/the-output-directory
```

The renderer creates a new `presentation/` directory with PNG/SVG figures, a self-contained HTML report and a separate presentation manifest. It preserves the core result files and their manifest. The renderer records its dependency versions and input hashes.

## Verification and remaining work

Run `pnpm test`, `pnpm lint` and the TypeScript check (`pnpm exec tsc --noEmit`). Tests cover input integrity/tampering, site binding, calendar completeness, the default method, omitted years, known decision cases, explicit ties, negative cases, metric reconciliation and reporting boundaries. Software tests do not establish physical accuracy.

Independent model comparison, a stronger targeted literature comparison and evaluation of report usefulness remain separate tasks. Measured production validation and operational forecast evaluation require suitable new data and protocols. The current experiment does not demonstrate a human decision-quality improvement or universal superiority of any method.
