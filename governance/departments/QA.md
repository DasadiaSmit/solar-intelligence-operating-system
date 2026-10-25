# Quality Engineering & Verification (`QA`)

## Mission

Turn scientific, product and operational claims into repeatable evidence. QA owns the verification system that detects numerical, contractual, accessibility, performance, security and user-workflow regressions before they reach a release.

## Current truth

- The repository has separately runnable governance, scientific-core, dedicated research-spine and API/artifact smoke suites using Node's built-in test runner. Exact release counts and the last verified command evidence are recorded in `PROJECT_STATUS.md` so this charter does not become a stale counter.
- Existing tests cover core solar vectors, energy conservation, representative-year determinism, regression/rolling-origin behavior, optimisation determinism, provider semantics, exact 2022–2025 grids, adapter derivations, chronological research partitions, study identity, annual-study HTTP behavior, API bounds, workspace presence, documentation and production artifacts.
- Deterministic source/model contracts exist for the Observatory, Solar Digital
  Twin, bounded Atmospheric Observation frame/view and exact 8,760-hour Annual
  Energy frame/view plus the canonically reconciled Array Engineering
  frame/view and configured-baseline-versus-four-stress Scenario Comparison
  frame/view, and the canonical Battery Energy-Flow frame/view with dispatch
  replay, exact linked-hour/day and annual ledger reconciliation. These cover
  exact semantic HTML facts and provenance, explicit
  unavailable layers, no-causality,
  no-forecast-promotion, no-Sun-mutation semantics, mounted-instrument
  activation, typed same-index `SR` and acknowledged exact-index `BE` handoffs,
  and single-frame/canvas ownership across six mounted instruments.
- Fresh Instrument 06 automated evidence passes 135/135: 4 governance,
  11 scientific-core, 11 research-spine, 15 mission-intelligence, 88 visual/model
  and 6 production smoke checks. Strict TypeScript, ESLint and all five
  production build environments pass. The former Instrument 05 result of
  103/103 overall and 58/58 visual tests is historical evidence.
- The current I06 initial spatial closure is 1,263,187 bytes raw / 381,161
  bytes gzip; the complete initial closure is 1,453,688 bytes raw / 440,465
  bytes gzip. The unchanged raw gates are 1,265,000 and 1,465,000 bytes.
  Instrument 06 stays outside that initial closure and measures 15,823 bytes
  raw / 4,967 bytes gzip, below its separate 20,000-byte raw gate. Instrument
  05's unique closure in this build is 9,596 bytes raw / 3,790 bytes gzip,
  below its 15,000-byte gate. The former I05 measurements of 1,262,543 /
  382,126 bytes incremental, 1,453,044 / 441,466 bytes complete, and 9,596 /
  3,799 bytes for its unique module are historical raw/gzip pairs.
- Browser checks confirm Begin Observation settles into the observatory
  after the scroll-threshold correction. Keyboard activation opens `BE` at
  the exact linked canonical interval and focuses its selected control;
  ArrowRight, Home and End keep one roving tab stop. Pointer activation from
  Instrument 06 opens the same interval and focuses it at desktop 1280×902
  and compact 390×844 viewports. The compact page has no horizontal overflow;
  browser error logs are empty. Manual screen-reader validation and
  reference-device FPS are not measured.
- Strict TypeScript, ESLint and a production build can be run locally, and the package test command builds before smoke testing.
- A five-gate pull-request CI workflow is defined in source for governance, dependency security, type/lint, scientific and production-build/smoke checks. It is not treated as operational evidence until a GitHub run completes successfully.
- There are no browser-driven end-to-end, automated accessibility, visual-regression, load, penetration or D1/R2 integration suites yet.
- Current UI smoke checks inspect source and rendered artifacts; the bounded browser observations above are separate evidence and do not constitute an automated end-to-end suite.
- Coverage thresholds, flaky-test policy and fixture governance are not established yet. Raw client-asset gates are enforced; runtime/FPS budgets still require reference-device measurements.

## Ownership boundary

QA is primary steward for:

- `tests/**`, test helpers, deterministic fixtures and golden references.
- Test-runner, browser-test, accessibility and visual-regression configuration.
- CI verification gates and release evidence, jointly with SECOPS.
- Cross-domain regression strategy, defect reproduction standards and failure triage.
- Test-data classification so simulated fixtures are never presented as measured evidence.

Domain departments remain responsible for writing and maintaining tests alongside their implementations. QA defines evidence quality and may reject inadequate verification, but it does not approve scientific validity without the relevant scientific owner.

## Interfaces

- **ARCH:** dependency-boundary, registry and compatibility tests.
- **All scientific departments:** numerical invariants, known vectors, temporal leakage controls and uncertainty/calibration evidence.
- **DATA and PLATFORM:** provider fixtures, retries, cache/fallback semantics, D1/R2 and API contract tests.
- **EXPERIENCE and FEATURES:** keyboard, responsive, linked-view, empty/error/offline and reduced-motion behavior.
- **TWIN:** deterministic rendering hooks and GPU/canvas fallback behavior.
- **MI:** evidence-reference resolution, specialist routing, unsupported/conflict/stale findings, confidence-policy, evidence-injection and confirmed-action tests.
- **SECOPS:** security checks, release gates, incident regressions and supply-chain verification.

## Decision authority

QA defines required test evidence, fixture controls, regression severity and release-check status. A failing required check blocks merge or release unless the accountable department records a time-bounded exception approved by QA and SECOPS. QA cannot reclassify a scientific capability or waive a domain-validation requirement without the accountable scientific owner.

## First deep-work programme

1. Create mandatory CI gates for dependency installation from the lockfile, type checking, linting, scientific tests, production build and smoke tests.
2. Continue splitting the governance, scientific-core, research-spine and smoke suites into unit, contract, integration, end-to-end, accessibility, visual, performance and security layers while preserving equivalent evidence.
3. Establish deterministic, versioned fixtures for weather providers, D1, R2, issued forecasts, reanalysis, missing data and extreme conditions.
4. Add API route matrices for valid, invalid, oversized, unauthorized, rate-limited, unavailable and partial-failure states.
5. Add browser coverage for all 14 workspaces, linked time, replay, scenario changes, saved views, keyboard navigation, mobile, daylight, night, reduced motion, offline and low-confidence states.
6. Add automated accessibility checks plus manual keyboard/screen-reader release evidence for critical paths.
7. Establish numerical/property invariants, reproducibility checks and tolerance policy for the scientific core.
8. Measure annual-simulation latency, bundle size, canvas redraw cost and memory before setting enforceable performance budgets.
9. Define flaky-test quarantine rules that retain visibility and ownership rather than silently rerunning failures until green.

## Definition of done

- Acceptance criteria have executable evidence at the lowest practical test layer.
- Scientific tests state units, tolerances, data class and expected invariant.
- Failures, empty states and degraded dependencies are tested alongside success paths.
- Tests are deterministic or explicitly document controlled nondeterminism and seeds.
- A regression test accompanies each fixed defect where practical.
- Accessibility and responsive behavior are verified for user-facing changes.
- Required checks pass from a clean lockfile installation and fresh production build.
- The evidence does not imply browser, field, security or measured-data validation that was not actually performed.

## Measures

- Governance, scientific-core, research-spine and release-smoke suites remain required until replaced by stronger equivalent coverage; a count change alone is never evidence loss or gain.
- Required-check pass rate and flaky-test rate are tracked separately.
- Escaped defects are classified by department, severity and missing test layer.
- Coverage is reported by risk area; initial target floors are 90% for solar/energy/contracts, 85% for forecasting/providers and 75% repository-wide after meaningful branch coverage is measurable.
- Every critical user workflow has success, error and degraded-state evidence.
- Scientific golden outputs retain reproducibility identifiers and tolerance-aware comparisons.
- Performance thresholds are based on recorded baseline measurements, not invented targets.

## Risks and escalation

- **Green but unvalidated:** block claims based only on source-string or snapshot presence when runtime behavior matters.
- **Synthetic/observed confusion:** stop release if sample fixtures are labelled as measured validation.
- **Temporal leakage:** escalate any random split or evaluation contamination to FORECAST and RESEARCH.
- **Flaky evidence:** assign an owner and deadline; do not normalize intermittent failures as acceptable.
- **Visual brittleness:** use semantic assertions for behavior and reserve image diffs for stable, intentional surfaces.
- **Environment-only failures:** preserve logs and exact runtime versions, then reproduce from the lockfile before waiver.
- **Coverage gaming:** prioritize meaningful invariants and failure paths over line-count targets.
