# Assessment evidence in the application

This integration makes the saved Sheffield analysis inspectable in the Annual Energy Forecast, Solar Array Engineering and Research Publication workspaces. It preserves the Sunlit interface and adds bounded decision arithmetic, source-omission sensitivity and downloadable reports. It does not run a new weather acquisition or photovoltaic simulation when someone opens the evidence or changes the selected designs.

This document describes the implementation and its verification boundaries. A successful local load or test run does not establish that a private hosted release has completed; deployment and hosted checks belong in the release record.

## Fixed research case

The only served evidence is `evidence/sheffield-2026-10-25.json`. It is a curated projection of the verified study 01 output, with nine array designs, their nominal yields, four historical yield rows, four source-omission results, engineering configuration and source identities.

| Property | Recorded scope |
| --- | --- |
| Site | Sheffield Solar Research Array, 53.3811° latitude, −1.4701° longitude |
| Weather | Open-Meteo / ECMWF ERA5 reanalysis, 2022–2025 |
| Energy target | Physics-derived generation; no measured plant output |
| Shared capacity | 48 kWp DC |
| Omission reference | Recorded 32° tilt / 180° azimuth baseline |
| Array grid | Nine recorded tilt/azimuth options sharing the equipment and loss assumptions |
| Evaluation status | Retrospective, previously inspected computational evidence |

The source study removes leap day after weather adaptation and uses the documented temperature/precipitation proxy where snow depth is unavailable. Four years are a short record. These results do not establish a global array optimum, measured production accuracy, future probability, financial return or human decision improvement.

The compact bundle is approximately 5.9 kB as JSON before pretty printing. It contains no raw weather archive, academic documents, marking material, personal knowledge-hub content or local filesystem paths. The full private knowledge hub must remain outside application deployment bundles.

## Route and application flow

`GET /api/v1/studies/assessment` imports the curated JSON on the server, validates it and returns the existing API envelope. Query parameters such as `capacityKwDc` do not change this fixed case. The response uses `Cache-Control: private, max-age=3600`; this controls caching, while the hosting access policy controls access to the private deployment.

`AssessmentEvidenceProvider` wraps the workspace stage. Evidence loads only after **Open saved Sheffield analysis** is activated. The browser verifies the returned bundle before exposing results. Duplicate concurrent loads are prevented, failed loads offer a retry, and an in-flight request is aborted when the provider unmounts.

The provider holds the selected candidate identifiers while the user moves between workspaces. Selection is session-local; a page reload returns to the unloaded/default state. The fixed JSON is not imported into the initial client entry. Client computation imports only the lightweight numerical comparison, report and integrity helpers; it does not import the weather/provider orchestration.

| Workspace | Added capability |
| --- | --- |
| Annual Energy Forecast | Recorded baseline estimate, four omission results, relative changes and sensitivity range |
| Solar Array Engineering | Selected-design checkboxes, nominal and minimax winners, worst regrets, finite-year winner counts, rank reversals and nominal sacrifice |
| Research Publication | Shared selected comparison, readable report preview and HTML/Markdown/JSON/CSV downloads |

The existing dashboard scenario controls, cursor, orientation screening, hourly CSV and live/sample annual-study controls retain their separate behavior. Their settings do not enter the saved-evidence calculation. The panel states this distinction alongside its fixed capacity and source scope.

The added controls use native buttons and labelled checkboxes grouped by a fieldset/legend. Loading, selection and download states expose status text; errors use an alert. Tables have headings and horizontally scrollable focus targets, including tables in the readable report. The layout wraps controls and stacks metrics on narrow screens, and hover scaling is suppressed when reduced motion is requested. These source-level provisions still require the browser checks listed below; contrast, focus behavior and print pagination are not established by static review alone.

## Selection semantics

All nine options are included initially. Selecting a subset filters candidates only: every included option retains all four historical years. The UI disables removal of the final selected option and provides **Restore all nine designs**. The model rejects empty, duplicate or unknown identifiers and normalises selection order to the bundle’s candidate order.

For each historical year, an option’s regret is the highest energy among the **selected** options minus that option’s energy. Its worst regret is the largest of its four annual regrets. The minimax rule selects every option within 0.000001 kWh of the smallest worst regret. The nominal rule likewise retains all ties within that tolerance.

Regret reduction compares the worst regrets of all nominal winners with the minimax minimum; a range is retained when nominal choices tie. Nominal sacrifice is separately calculated for every robust winner as the highest nominal yield minus that winner’s nominal yield. Neither quantity is a financial value.

Changing the subset changes the alternatives against which regret is measured. It does not alter the original study, create new weather scenarios or validate a new physical design. With one included option, regret and sacrifice are necessarily zero and its winner count is four; that is a consequence of having no competing alternative.

The omission range always uses the four recorded omissions for the original 48 kWp, 32°/180° baseline. It does not change with candidate selection and must not be described as a confidence interval or as uncertainty for the selected winner.

The full nine-option case selects 42° tilt / 180° azimuth under both rules, has three reversing design pairs, and reports zero regret benefit and zero nominal sacrifice. A post-hoc enumeration of all 511 nonempty subsets also finds agreement between the nominal and minimax winner sets. This is a property of this saved case, not a general claim about the rules. The interface must preserve the zero-benefit result.

For an optional demonstration of ordering changes, selecting 32°/162° and 42°/198° produces two historical wins each: the first leads in 2022/2024 and the second in 2023/2025. Their worst regrets are approximately 280.54 and 338.92 kWh. The first remains both nominal and minimax winner. This deliberately selected, post-hoc example illustrates the displayed arithmetic; it is not a new scientific finding or an independent validation.

## Integrity and calculation boundary

Before curation, the original `audit.json`, `baseline-study-replay.json` and `protocol.json` bytes were checked against the frozen study 01 manifest. The public projection retains their SHA-256 digests, the source manifest digest, source commit, study identifier, calculation/model/adapter versions and four canonical/adapted dataset identities.

The projection’s pinned payload digest is:

```text
b65dd7925d2e1168ba50c8f6d1c1aed961dfd8c04580adbc00d1b80831aa2c5c
```

`validateAssessmentEvidenceBundle` checks schema, identity, the nine-option/four-year dimensions, ordered scenario identities, complete finite nonnegative energies, baseline consistency and provenance fields. It hashes the canonical payload excluding the `integrity` field, compares it with the pinned digest and returns a recursively frozen clone. Both the route and browser invoke this validation. Unknown additional payload fields also change the digest and fail verification.

`computeAssessmentSelection` is synchronous, deterministic arithmetic over an already validated bundle. It repeats structural checks and rejects invalid subsets. JSON ingress must pass through the asynchronous hash validator first; the synchronous computation is not a substitute for content verification.

The hash binds this deployment to the reviewed projection. It does not authenticate physical truth or replace the original source archive. A deliberate replacement study requires a new reviewed bundle and corresponding identity change; it must not silently reuse this case’s identifier.

`energy-choice.ts` contains the existing `compareEnergyChoices` implementation, moved without changing its numerical body. `representative-audit.ts` re-exports it for existing callers. The guarded report imports this lightweight module. No original weather-selection, simulation or forecasting calculation was changed by the extraction.

A fresh full representative audit is intentionally absent from this route. The existing nine-option audit performs 129 full-year simulations and retains multiple representative-weather arrays. Its request-time memory/CPU suitability would need separate measurement before deployment in the constrained Worker runtime. Serving the small verified projection and recalculating a four-by-nine comparison avoids that workload.

## Exports

Exports are produced from the current selection and identify the source study, fixed 48 kWp baseline, selected options, selection identity and bundle hash. Markdown/JSON/CSV filenames include the selected option positions; the readable HTML download uses the same selection-specific filename stem.

| Format | Contents |
| --- | --- |
| HTML | Escaped, self-contained readable report with semantic tables and print styling; the browser can print it to PDF |
| Markdown | Guarded v2 decision report with raw historical and omission tables, selected-set interpretation and provenance |
| JSON | Selected raw input matrix, candidate geometry, full recorded engineering assumptions, source identities, computed comparison and limitations |
| CSV | Scope record, nominal/choice rows, four historical rows per selected option and four explicitly labelled baseline-omission rows |

The HTML formatter supports the generated report template rather than arbitrary Markdown. It escapes active content, and standalone HTML includes a restrictive content-security policy. Downloads are local browser files; no report is uploaded or published by the export buttons. The status message reports that a download was requested, not that a file was successfully saved by the user’s browser.

The original v1 report renderer and frozen evaluation outputs remain separate. The application uses the guarded v2 path; this integration does not revise the primary benchmark or convert its development cases into new independent evaluation evidence. See [REPORT_EVALUATION.md](REPORT_EVALUATION.md).

## Verification

`tests/assessment-evidence.test.mjs` contains six model tests covering the pinned projection, tampering and completeness failures, unchanged full-set conclusions, all 511 nonempty subsets checked against independent scalar arithmetic, selection validation, and export content/CSV structure. The exhaustive subset test also verifies that all four years remain present and baseline sensitivity never changes.

`tests/decision-evidence-report.test.mjs` contains nine development tests for ties, nominal sacrifice, zero benefit, conflicting/invalid caches, missing rows/cells, missing nominal and omission evidence, undefined zero-denominator percentages and malformed input. Its synthetic fixtures use values outside the frozen report-evaluation cases.

`tests/assessment-integration.test.mjs` covers the served bundle under disabled external fetching, ignored dashboard query inputs, private caching and safe readable HTML output. Existing report-benchmark tests still exercise the point/table controls and original adapter. The assessment test command includes the new suites.

Focused model/report tests, TypeScript checking and ESLint passed during implementation. The rendered smoke suite passed all eight tests after its explicit stylesheet loader was extended for `assessment-evidence.css`; this was a Node test-harness adjustment rather than an application behavior change. Full release verification remains the responsibility of the release run; do not infer browser behavior, screen-reader usability or hosted availability from these tests.

Relevant commands from the project root are:

```sh
pnpm run test:assessment
pnpm exec tsc --noEmit --incremental false
pnpm run build
pnpm run test:smoke
```

The browser release journey should open the saved evidence, confirm the baseline sensitivity, switch to array comparison, select a subset and navigate to publication without losing it, download each format, restore all nine options, and verify that changing a dashboard control does not change the saved study. Check the final-option guard, retry/error presentation, narrow-screen table scrolling, keyboard focus, reduced motion and report print layout. Useful selectors are `assessment-annual`, `assessment-array`, `assessment-publication`, `assessment-benefit` and the existing `workspace-nav-AF`, `workspace-nav-AE`, `workspace-nav-RP` test identifiers.

## Main implementation files

- `evidence/sheffield-2026-10-25.json`: curated frozen projection.
- `lib/research/assessment-evidence.ts`: integrity, selection and export boundary.
- `lib/research/energy-choice.ts`: lightweight finite-scenario comparison.
- `lib/research/decision-evidence-report.ts`: guarded report v2.
- `lib/research/report-html.ts`: readable/printable report formatter.
- `app/api/v1/studies/assessment/route.ts`: fixed-case endpoint.
- `components/solar-os/AssessmentEvidence.tsx`: shared state and three evidence views.
- `components/solar-os/assessment-evidence.css`: existing-theme presentation and responsive behavior.
