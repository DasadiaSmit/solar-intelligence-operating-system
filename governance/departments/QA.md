# Quality Engineering & Verification (`QA`)

## Mission

Turn scientific, product and operational claims into repeatable evidence. QA owns the verification system that detects numerical, contractual, accessibility, performance, security and user-workflow regressions before they reach a release.

## Current truth

- The repository has separately runnable governance, scientific-core, dedicated research-spine and API/artifact smoke suites using Node's built-in test runner. Exact release counts and the last verified command evidence are recorded in `PROJECT_STATUS.md` so this charter does not become a stale counter.
- Existing tests cover core solar vectors, energy conservation, representative-year determinism, regression/rolling-origin behavior, optimisation determinism, provider semantics, exact 2022–2025 grids, adapter derivations, chronological research partitions, study identity, annual-study HTTP behavior, API bounds, workspace presence, documentation and production artifacts.
- Strict TypeScript, ESLint and a production build can be run locally, and the package test command builds before smoke testing.
- A four-gate pull-request CI workflow is defined in source for governance, type/lint, scientific and production-build/smoke checks. It is not treated as operational evidence until a GitHub run completes successfully.
- There are no browser-driven end-to-end, automated accessibility, visual-regression, load, penetration or D1/R2 integration suites yet.
- Current UI smoke checks inspect source and rendered artifacts; they do not prove interaction behavior in a browser.
- Coverage thresholds, flaky-test policy, fixture governance and measured performance budgets are not established yet.

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
