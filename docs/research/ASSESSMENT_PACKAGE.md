# Assessment source and evidence package

This guide is the portable entry point for the three preserved studies and their integration into Solar Intelligence Operating System. Start with [RUN_ME.md](../../RUN_ME.md) to run the application and demonstrate **Annual energy → Array comparison → Research Publication Studio**.

## Release and package identity

The application runtime comes from source `869cb1310894ba6d1827b2e6ff4a557f5c5a800f`, deployed privately as version 20. Its accepted interface and scientific calculations are unchanged in this publication package. Packaging additions are documentation, the portable saved-report replay helper, preserved evidence and an assessment test gate in CI.

The publication target is the existing **private** repository `DasadiaSmit/solar-intelligence-operating-system`, branch `codex/assessment-submission`. This branch has not been merged into `main`. The recorded study commits identify the original research provenance; they should not be mistaken for commits guaranteed to exist in this publication checkout's history.

The repository and source ZIP contain the application, protocols, research runners and technical evidence. The main academic report, poster, CV, personal academic records and course documents are excluded. Keep the main report outside the source ZIP when preparing the separate assessment uploads.

## Evidence inventory

The eight directories under [`research-evidence/`](../../research-evidence/) preserve the original names, inputs, results and manifests. Their original contents remain unchanged.

| Directory | Purpose and first useful file |
| --- | --- |
| `sheffield-2026-10-25` | Study 01 captured weather, configuration and original annual calculation; `manifest.json` and `baseline-study.json`. |
| `sheffield-2026-10-25-analysis` | Study 01 source-year sensitivity and nine-design comparison; `REPORT.md`, `audit.json` and `presentation/REPORT.html`. |
| `pvlib-2026-10-25-inputs` | Study 02 controlled inputs and comparison protocol; `manifest.json` and `protocol.json`. |
| `pvlib-2026-10-25-results` | Study 02 reference agreement results; `REPORT.md` and `comparison.json`. |
| `report-evaluation-2026-10-25-primary-inputs` | Study 03 original cases and stored reports; `protocol.json`, `cases.json` and `reports/`. |
| `report-evaluation-2026-10-25-primary-results` | Study 03 unchanged primary evaluation; `REPORT.md` and `evaluations.json`. |
| `report-evaluation-2026-10-25-exploratory-inputs` | Study 03 revised report on the same known cases, with preserved controls; `source-metadata.json` and `reports/`. |
| `report-evaluation-2026-10-25-exploratory-results` | Study 03 same-case exploratory results; `REPORT.md` and `evaluations.json`. |

`manifest.json` files retain hashes for integrity checking. Original runtime and source records describe the original research environment; this guide supplies the portable entry points. Historical guides such as [Study 01 reproduction](REPRODUCING_ASSESSMENT.md), [reference comparison](REFERENCE_COMPARISON.md) and [report evaluation](REPORT_EVALUATION.md) remain as protocol and method records. Their original local folder assumptions and progress statements are historical context.

## What the studies support

| Study | Supported result | Interpretation |
| --- | --- | --- |
| 01: source selection and array choice | The 32° south-facing 48 kWp baseline is **49,248.56 kWh**; the leave-one-year-out range is **47,150.23–51,936.45 kWh**. Among nine equal-capacity designs, 42° south wins all four historical years. | The range tests sensitivity to source-year inclusion for the baseline. Nominal and minimax-regret selection coincide, giving zero added regret reduction. The tested grid does not establish a global optimum. |
| 02: controlled reference comparison | **50 shared checks** across five cases and **43,800 hourly rows** pass. The final controlled pvlib annual energy is **1.703–1.789% above the native controlled pipeline**. | This is controlled agreement with a reference implementation. It does not establish accuracy against measured production. The controlled front-side case differs from the original bifacial/lossy Sheffield case. |
| 03: report information | Across six complete cases, the original evidence report has **42 explicit + 6 derivable** correct facts; tables have **12 + 36**; point summaries have **18 explicit + 30 omitted**. The revised report makes **48/48 explicit** on those same cases. | Both richer original formats make all 48 facts answerable. The revision improves explicit presentation in this deterministic benchmark. It is exploratory reuse of known cases, not independent validation or evidence of improved human decisions. |

The incomplete and deliberately corrupted report cases are reported separately from the 48 complete-case facts. Counts of historical wins are not probabilities. No study establishes financial return, operational forecast skill or field performance.

## Portable reevaluation of stored reports

From the repository root, use Python 3.10 or later:

```sh
python3 -B tools/replay_saved_reports.py --source . --evidence research-evidence --output outputs/report-replay
```

The output directory must be new. The helper uses only the Python standard library and requires no network connection, plotting packages or Git repository. It:

1. Checks exact hashes for the preserved evaluator, wrapper, baseline renderer and protocol before executing the rules.
2. Verifies the four report-evaluation manifests and their complete file inventories.
3. Reapplies the original extraction rules to the stored primary and exploratory Markdown reports.
4. Requires exact agreement with the retained evaluations and summaries, including all **216 original control fact records**.
5. Writes `REPORT.md`, `verification.json`, `evaluations.json`, `fact-scores.csv` and an output `manifest.json` in the new directory.

This operation reproduces the scoring of the saved report text. It does **not** generate fresh reports, run a photovoltaic model, add cases, revise the frozen study or establish human usefulness.

The five portable checks can be run separately:

```sh
python3 -B tools/test_portable_report_replay.py --source . --evidence research-evidence
```

They cover a successful run without Git, changed evaluator rejection, changed report rejection, extra evidence file rejection and protection of existing outputs.

## Original research runners

The complete original protocol and runner sources remain under `docs/research/` and `scripts/research/`. They support inspection of how the stored results were produced. Their original full-study paths are not the portable replay shortcut above.

The original runners use a clean committed Git checkout and record provenance. Some require the pinned research dependencies, including pvlib or plotting libraries. The primary report generator also executes `git show` against historical baseline commit `0dde63d2643514127e4383bfd6da9e69f91a03b4`, which is absent from this new publication history. Consequently, the two original report-generation commands are not a complete standalone reproduction recipe for this source ZIP. Use the portable helper for the supported saved-report reevaluation route; full regeneration requires the original history and documented environment.

Keep all eight frozen directories untouched. Any genuinely new study or regenerated output belongs in a new directory with its own source and protocol record. A rerun on the known cases remains a rerun on those cases.

## Application verification and current status

The retained version 20 application verification covers **231 tests**: 4 department, 11 science, 11 research, 86 assessment, 15 mission, 96 visual and 8 rendered smoke tests. Type checking, linting and the production build also passed for that source release. These are software checks, separate from the research findings above.

Fresh verification of the assembled publication checkout passed `pnpm install --frozen-lockfile`, all **231 application tests**, the production build, type checking and linting. The eight rendered smoke tests are included in that total. Portable replay reproduced **216 primary fact records** and **288 exploratory fact records**, with all **216 original control records** unchanged; all **five portable replay tests** passed.

The dependency audit passes the high/critical-severity gate with three moderate advisories remaining. A production bundle-size advisory remains; the retained release passed its asset budgets. Local production startup and `/api/v1/health` were operational after the optional fresh local database schema setup documented in [RUN_ME.md](../../RUN_ME.md). The sample and saved research routes do not require persistence; local health can be degraded before schema initialisation. No production or remote database was changed.

A source-only ZIP was extracted to a fresh folder: all 468 file hashes matched, and the portable replay plus five tests passed without bundled Git metadata. The publication branch is `codex/assessment-submission`; its pull request records the upload and hosted checks.

The commands in [RUN_ME.md](../../RUN_ME.md) allow application checks and portable replay to be repeated. CI includes the assessment tests alongside the existing release checks. Passing software checks does not constitute measured production validation, human assessment, submission or poster attendance.
