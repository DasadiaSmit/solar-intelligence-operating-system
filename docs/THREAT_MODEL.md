# Threat model

**Status:** initial repository threat model, 2026-07-22; dependency-control refresh, 2026-10-25. This document separates present controls from planned controls and does not certify the platform for multi-tenant or financial use.

## Assets

- Source code, scientific formulas and calculation versions.
- Provider credentials and runtime configuration.
- Dataset snapshots, provenance manifests and licensed raw inputs.
- Site configurations, scenarios, annotations and saved workspaces.
- Model artifacts, experiment evidence and validation metrics.
- Deployment identity, D1 records, optional R2 objects and audit events.
- Mission Intelligence context, evidence references, specialist runs, findings, confirmations and scientific-memory events.

## Trust boundaries

1. Browser to versioned application APIs.
2. Hosting-injected identity headers to server-side ownership decisions.
3. Worker to D1 and optional R2 bindings.
4. Worker to external weather/solar providers.
5. Offline research environment to registered model artifacts.
6. Imported datasets, annotations and provider content to Mission Intelligence evidence resolution.
7. GitHub source/review automation to Sites production deployment.
8. Package registry and advisory service to the locked application and build toolchain.

## Current controls

- No private key is committed; optional secrets come from runtime environment variables.
- API inputs are bounded and structured errors avoid exposing credentials.
- Provider URLs are assembled from validated parameters rather than accepting arbitrary upstream URLs.
- D1 scenario operations are owner-scoped when trusted identity is present.
- Source, migrations and deterministic sample data are version controlled.
- Worker responses include baseline security headers.
- GitHub repository visibility is private and pull-request CI is defined in source.
- Exact dependency resolution, a high/critical whole-lockfile audit gate, parent-scoped compatibility overrides and machine-expiring GHSA exceptions are defined in source.

These controls do not imply complete authorization, rate limiting, tenant isolation or operational monitoring.

## Priority threats and required treatment

| Threat | Present state | Required treatment | Owner |
| --- | --- | --- | --- |
| Forged or misconfigured identity headers | Hosting trust assumption | Document exact trusted proxy boundary; reject direct untrusted identity headers; test ownership isolation | PLATFORM + SECOPS |
| Cross-tenant record access | Owner checks only; no role/tenant model | Add tenant membership, role assignment, server-side policy tests and deny-by-default behavior | PLATFORM |
| API resource exhaustion | No application rate limiter | Add bounded per-actor/IP limits, request budgets, timeouts, idempotency and observability | PLATFORM + SECOPS |
| Provider, annotation or imported-data injection | Structured provider adapters; Mission Intelligence boundary active | Treat external content as untrusted evidence or user assertion only; schema validation; no instruction execution; exact evidence paths and provenance retention | DATA + MI |
| Secret leakage | Environment configuration | Redaction tests, least-privilege tokens, secret scanning/push protection when available, no secrets in Mission Intelligence context or scientific memory | SECOPS |
| Scientific claim tampering | Versioned source and provenance | Signed/hashed artifacts, protected reviews, independent validation and release manifests | QA + RESEARCH |
| Snapshot/model substitution | Content hashes exist for provenance | Enforce hash verification on load and runtime schema compatibility | DATA + FORECAST + PLATFORM |
| Destructive action without audit | Scenario deletion is owner-scoped but not audit-appended | Transactional audit event or explicit failure behavior for destructive operations | PLATFORM |
| Cross-site scripting/content injection | React escaping and security headers | Introduce tested CSP in report-only mode, then enforce; sanitize any future rich content | EXPERIENCE + SECOPS |
| Dependency compromise | Frozen lockfile, exact direct pins, high/critical audit gate, scoped compatible patches and no active dependency exceptions | Keep owner packages current; review scoped overrides; remove exceptions by expiry; add dependency-delta review, SBOM and release provenance | SECOPS + QA + ARCH |
| Data loss | Recovery documentation; no recorded restore drill | Periodic encrypted repository/D1/R2 backup and evidenced restore test | SECOPS + DATA |
| Unsupported Mission Intelligence finding or unsafe action | Deterministic core and console under active implementation | Evidence-gated typed tools, machine-resolvable claim paths, conflict/stale refusal, explicit confirmation and immutable audit | MI + QA + SECOPS |
| Scientific-memory poisoning or cross-project leakage | Scientific-memory contract under active implementation | Treat annotations as user assertions, bind events to owner/project/result hashes, deny cross-tenant reads, validate revisions and expose recomputation obligations | MI + PLATFORM + SECOPS |

## Mission Intelligence boundary

Mission Intelligence is a deterministic operating-system subsystem, not a chat interface and not a language-model integration. It may read only approved, typed, provenance-carrying context; route work through allowlisted domain-specialist tools; and emit structured findings whose claims resolve to exact evidence paths. It cannot execute arbitrary code, browse arbitrary URLs, read secrets, silently alter state, delete records, change provider configuration, publish, deploy or make financial/electrical commitments. Missing evidence must produce `No supporting evidence currently exists.` Conflicting, stale or semantically incompatible evidence must remain explicit. Scientific memory stores versioned state changes, assumptions, investigations, findings and recomputation obligations—not dialogue. Every state-changing proposal requires a visible diff, explicit user confirmation and an audit event.

## Release gate

A security-sensitive change must update this model, identify affected assets and boundaries, add verification, and state residual risk. Critical unresolved authorization, secret-exposure, data-integrity or recovery risks block production release. Unexcepted high or critical dependency advisories also block release. The current residual dependency risks are advisory-database lag, registry availability, and three visible moderate findings in Drizzle Kit's deprecated esbuild loader, retained build-tool PostCSS and browser-target metadata. The expired ESLint exception was removed on 2026-10-25. That day's complete-lockfile audit reports zero high or critical findings with no ignored GHSAs. Detailed versions, advisory links and compatibility checks are recorded in `SECURITY.md`.
