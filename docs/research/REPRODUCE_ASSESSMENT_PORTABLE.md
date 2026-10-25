# Run and inspect the assessment artefact

The application source is based on private release version 20, commit `869cb1310894ba6d1827b2e6ff4a557f5c5a800f`. Packaging adds portable instructions and a report replay helper. It preserves the scientific source, frozen inputs and original results.

## Start the application

Use Node.js 22.13 or newer and pnpm 11.9.0. Install the locked dependencies from the application root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. The default sample system and the saved Sheffield evidence require no account, API key or external weather fetch. Installation itself requires access to the package registry. The live weather adapters are optional and are separate from replaying the saved evidence.

For a production build running locally:

```sh
pnpm build
pnpm start
```

The build retains the Cloudflare Worker setup. Logical `DB` and `SNAPSHOTS` bindings use local emulation; no hosted database credentials are supplied. The saved Sites project identity is release metadata, not an access credential. A separately hosted copy needs its own authorised deployment configuration.

## Demonstrate the assessed features

1. Open **All instruments → Annual energy → Open saved Sheffield analysis**.
2. Inspect the 49,248.56 kWh baseline and 47,150.23–51,936.45 kWh omitted-year range. This is a fixed 48 kWp, 32° tilt, 180° azimuth case.
3. Open **Compare tested arrays**. All nine options are compared across all four recorded years. The 42°/180° option is both nominal and minimax winner, giving zero regret reduction.
4. Select a subset to explore how the comparison set changes. The underlying years and simulations remain unchanged.
5. Open **Open decision report**, then download HTML, Markdown, JSON or CSV. The files retain the selected options, source identities and interpretation limits.

The main dashboard's sample/scenario controls do not alter this frozen study. Source-year sensitivity belongs to the baseline, not every selected candidate. Report and poster documents are accompanying submission files, outside the artefact ZIP.

## Check the application

```sh
pnpm test
pnpm exec tsc --noEmit
```

The retained v20 test count is 231 reported tests/subtests. The full command builds before its rendered smoke checks. Local browser verification and scientific evaluation remain different kinds of evidence.

## Re-evaluate saved reports without Git history

Use Python 3.10 or newer. The helper uses only the standard library; it needs no Python package installation, plotting setup, Git repository, previous commits or network access:

```sh
python3 tools/replay_saved_reports.py \
  --source . \
  --evidence research-evidence \
  --output outputs/report-replay
```

Choose a new output directory on every run. The helper verifies pinned hashes for the original report renderer, extraction rules, protocol and all four report manifests. It then verifies all manifest files, re-evaluates the displayed Markdown with the unchanged rules, and compares the resulting fact records with the retained evaluations.

Expected result: **216 primary fact records and 288 exploratory fact records reproduced exactly**, including all **216 unchanged control facts**. The six complete cases retain 42 explicit + 6 derivable answers for the original evidence report, 12 + 36 for tables, 18 explicit + 30 omitted for point summaries, and 48 explicit answers for the exploratory revision. The incomplete and stale-input cases remain outside those 48-fact denominators.

Outputs are `verification.json`, `evaluations.json`, `fact-scores.csv`, a readable `REPORT.md`, and an output manifest. This is portable re-evaluation of the same known cases. It does not regenerate reports, rerun the physical model or add independent/human validation.

The helper's portability and rejection checks can be run independently:

```sh
python3 tools/test_portable_report_replay.py \
  --source . --evidence research-evidence -v
```

## Inspect the preserved studies

All paths below are relative to `research-evidence/`:

| Location | Contents |
| --- | --- |
| `sheffield-2026-10-25` | Original weather archive, baseline configuration and study, protocol and hashes |
| `sheffield-2026-10-25-analysis` | Sensitivity/design results, frozen replay bundle, CSVs and figures |
| `pvlib-2026-10-25-inputs` | Matched original/controlled model inputs and protocol02 |
| `pvlib-2026-10-25-results` | 50 checks, controlled model differences, hourly CSV, figures and report |
| `report-evaluation-2026-10-25-primary-inputs` | Primary fixtures and three original report conditions |
| `report-evaluation-2026-10-25-primary-results` | Primary evaluations, stress findings and output manifests |
| `report-evaluation-2026-10-25-exploratory-inputs` | Preserved controls and revised report on the same cases |
| `report-evaluation-2026-10-25-exploratory-results` | Exploratory evaluations and preservation checks |

Open the self-contained HTML reports in the analysis `presentation/` folder and the three other results folders. Original manifests refer to their original source commits. Some original runtime records include the machine paths used for those runs; those bytes are preserved for integrity, and the portable helper does not depend on them.

## Optional full model reruns

The original experiment runners remain in `scripts/research/`. They intentionally require a clean committed Git checkout and new output directories. A GitHub clone satisfies the history requirement for recording the current source identity. An extracted ZIP must first be placed in a committed Git repository if these original runners are used. Use the recorded scientific source unchanged; commit any local source edits before issuing a new result.

From a clean checkout, Study 01 can be replayed with:

```sh
pnpm research:audit research-evidence/sheffield-2026-10-25 outputs/study01-replay
```

For the independent comparison, use Python 3.12 in a separate virtual environment with `scripts/research/requirements-reference.txt`. Then:

```sh
pnpm research:reference-export research-evidence/sheffield-2026-10-25-analysis outputs/pvlib-inputs
PYTHONDONTWRITEBYTECODE=1 python scripts/research/compare-pvlib.py outputs/pvlib-inputs outputs/pvlib-results
```

The original primary report **generator** additionally verifies the renderer against historical Git commit `0dde63d2643514127e4383bfd6da9e69f91a03b4`. That old commit may not be present in a packaged snapshot. Use the portable report replay above to verify the included outputs without that history. No guard has been weakened in the original generator. The helper instead verifies the same renderer bytes against their saved SHA-256 identity.

Replays write fresh metadata and source identities. Numeric/fact equality is the relevant comparison; do not claim that regenerated timestamps, local paths or every historical SVG byte must be identical. Preserve the originals and keep new outputs under the ignored `outputs/` directory.

## Data attribution and limits

Weather evidence is Open-Meteo / ECMWF ERA5 reanalysis. Provider documentation and attribution links are retained in the manifests and bundle provenance: https://open-meteo.com/en/docs/historical-weather-api and https://open-meteo.com/en/licence . Simulation outputs are computed generation, not meter records. The controlled pvlib comparison is separate from the original bifacial/lossy model. Four years and a nine-option hypothetical grid do not establish a climate normal or global optimum.
