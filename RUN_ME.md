# Run and demonstrate Solar Intelligence Operating System

This package contains the application used in private release **version 20**, with the saved assessment evidence. Application runtime source is preserved from `869cb1310894ba6d1827b2e6ff4a557f5c5a800f`; the publication package adds documentation, portable evidence replay and an assessment test gate in CI. The accepted interface is unchanged.

## Start the application

Use **Node.js 22.13 or later** and **pnpm 11**. `package.json` pins pnpm 11.9.0. From the package root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://localhost:3000**. Leave the development process running while using the application; stop it with Ctrl+C.

No API keys or environment file are needed for the sample application and saved Sheffield assessment demonstration. These routes do not require database persistence. Dependency installation needs an internet connection. The optional live weather route also needs internet access; it is separate from the saved evidence demonstration.

For a local production preview:

```sh
pnpm build
pnpm start
```

Use the same localhost address. Close the development process first so that port 3000 is available.

For persistence on a **fresh local database**, initialise its schema once between the build and start steps:

```sh
pnpm build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0000_wealthy_johnny_storm.sql
pnpm start
```

Do not rerun the schema command after it has been installed. This command targets only the local database. The health endpoint at `http://localhost:3000/api/v1/health` may report degraded status before schema initialisation; the sample and saved research routes can still be used. The local production health check was operational after this setup.

## Three-minute demonstration: Annual → Array → Publication

Use **Open saved Sheffield analysis** for this route. It loads the preserved study; it does not rerun the photovoltaic model or fetch new weather.

| Time | Action | Point to explain |
| --- | --- | --- |
| 0:00–0:20 | Open **All instruments → Annual energy**, then **Open saved Sheffield analysis**. | A saved 48 kWp Sheffield case connects the result to inspectable evidence. |
| 0:20–0:55 | Show the baseline and source-year omission table. | The 32° south-facing baseline is **49,248.56 kWh**. Leaving out one source year gives **47,150.23–51,936.45 kWh**. This is a sensitivity range for that baseline configuration. |
| 0:55–1:25 | Select **Compare tested arrays**, with all nine designs included. | **42° tilt, 180° azimuth** wins all four historical years. The nominal and minimax-regret rules choose the same design: the robust rule adds **zero regret reduction** in this study. |
| 1:25–2:10 | Retain only **32° / 162°** and **42° / 198°** using the design checkboxes. | Each design wins two of four years. Worst regrets are **280.54 kWh** and **338.92 kWh**, respectively. Both rules still choose 32° / 162°; the selection exposes a trade-off without manufacturing a benefit. |
| 2:10–2:45 | Select **Open decision report → Download readable report**. | The export records the chosen two-of-nine set, all four historical years, source identities, decision reasoning and limitations. Markdown, JSON and CSV exports support further inspection. |
| 2:45–3:00 | Return through **Compare tested arrays → Restore all nine designs**. | The original frozen study remains intact. The explored subset is a transparent selection within the same evidence. |

The omission range belongs to the original 32° baseline, not the 42° winner or every selectable design. The four years are historical scenarios, not future probabilities. Ordinary scenario and timeline controls do not change the saved assessment evidence.

## Replay the saved report evaluation

Python 3.10 or later is sufficient for this standard-library helper. No Python packages, Git history, API keys or network access are needed:

```sh
python3 -B tools/replay_saved_reports.py --source . --evidence research-evidence --output outputs/report-replay
```

`outputs/report-replay` must **not already exist**. For a second run, choose another new output directory. The helper verifies the pinned sources and frozen manifests, reevaluates the saved Markdown reports using the unchanged rules and compares every retained fact record. Open `outputs/report-replay/REPORT.md` and `verification.json` afterwards.

This reevaluates stored reports. It does not regenerate the reports, rerun the energy model or provide new scientific or human validation. See [the assessment package guide](docs/research/ASSESSMENT_PACKAGE.md) for the evidence inventory and full-study reproduction boundaries.

## Technical checks

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm test
python3 -B tools/test_portable_report_replay.py --source . --evidence research-evidence
pnpm run security:audit
```

Fresh checkout verification passed dependency installation with the frozen lockfile, all **231 application tests** (including the production build and eight rendered smoke tests), type checking and linting. The portable replay reproduced **216 primary** and **288 exploratory fact records**, including **216 unchanged control records**; its **five tests** also passed. The dependency audit passes the high/critical-severity gate with three moderate advisories remaining.

A source-only ZIP was extracted to a fresh folder: all 468 file hashes matched, and the portable replay and five tests passed without bundled Git metadata. No production or remote database was changed by the local checks. Publication status is available on the repository’s `codex/assessment-submission` branch and its pull request.

The source package is prepared on `codex/assessment-submission` in the private repository `DasadiaSmit/solar-intelligence-operating-system`; it has not been merged into `main`. The main academic report, poster, CV and course materials are supplied separately and are excluded from this repository and source ZIP.
