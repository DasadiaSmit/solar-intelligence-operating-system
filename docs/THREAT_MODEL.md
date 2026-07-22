# Threat model

**Status:** initial repository threat model, 2026-07-22. This document separates present controls from planned controls and does not certify the platform for multi-tenant or financial use.

## Assets

- Source code, scientific formulas and calculation versions.
- Provider credentials and runtime configuration.
- Dataset snapshots, provenance manifests and licensed raw inputs.
- Site configurations, scenarios, annotations and saved workspaces.
- Model artifacts, experiment evidence and validation metrics.
- Deployment identity, D1 records, optional R2 objects and audit events.
- Future PET Assistant conversations, citations, confirmations and tool runs.

## Trust boundaries

1. Browser to versioned application APIs.
2. Hosting-injected identity headers to server-side ownership decisions.
3. Worker to D1 and optional R2 bindings.
4. Worker to external weather/solar providers.
5. Offline research environment to registered model artifacts.
6. Imported datasets, annotations and provider content to future PET context.
7. GitHub source/review automation to Sites production deployment.

## Current controls

- No private key is committed; optional secrets come from runtime environment variables.
- API inputs are bounded and structured errors avoid exposing credentials.
- Provider URLs are assembled from validated parameters rather than accepting arbitrary upstream URLs.
- D1 scenario operations are owner-scoped when trusted identity is present.
- Source, migrations and deterministic sample data are version controlled.
- Worker responses include baseline security headers.
- GitHub repository visibility is private and pull-request CI is defined in source.

These controls do not imply complete authorization, rate limiting, tenant isolation or operational monitoring.

## Priority threats and required treatment

| Threat | Present state | Required treatment | Owner |
| --- | --- | --- | --- |
| Forged or misconfigured identity headers | Hosting trust assumption | Document exact trusted proxy boundary; reject direct untrusted identity headers; test ownership isolation | PLATFORM + SECOPS |
| Cross-tenant record access | Owner checks only; no role/tenant model | Add tenant membership, role assignment, server-side policy tests and deny-by-default behavior | PLATFORM |
| API resource exhaustion | No application rate limiter | Add bounded per-actor/IP limits, request budgets, timeouts, idempotency and observability | PLATFORM + SECOPS |
| Provider or imported-data injection | Structured provider adapters; future PET not built | Treat all external text/data as evidence only; schema validation; no instruction execution; provenance retention | DATA + PET |
| Secret leakage | Environment configuration | Redaction tests, least-privilege tokens, secret scanning/push protection when available, no secrets in PET context | SECOPS |
| Scientific claim tampering | Versioned source and provenance | Signed/hashed artifacts, protected reviews, independent validation and release manifests | QA + RESEARCH |
| Snapshot/model substitution | Content hashes exist for provenance | Enforce hash verification on load and runtime schema compatibility | DATA + FORECAST + PLATFORM |
| Destructive action without audit | Scenario deletion is owner-scoped but not audit-appended | Transactional audit event or explicit failure behavior for destructive operations | PLATFORM |
| Cross-site scripting/content injection | React escaping and security headers | Introduce tested CSP in report-only mode, then enforce; sanitize any future rich content | EXPERIENCE + SECOPS |
| Dependency compromise | Lockfile present | Dependabot, reviewed lockfile changes, minimal Actions permissions, SBOM and provenance | SECOPS |
| Data loss | Recovery documentation; no recorded restore drill | Periodic encrypted repository/D1/R2 backup and evidenced restore test | SECOPS + DATA |
| PET unsafe action or hallucination | PET entirely planned | Read-only typed tools first, numeric citations, prompt-injection tests, explicit confirmation, immutable audit | PET + QA + SECOPS |

## PET-specific boundary

PET must remain useful offline through deterministic evidence tools. A language model may orchestrate only allowlisted typed tools. It cannot receive secrets, execute arbitrary code, browse arbitrary URLs, delete records, change provider configuration, publish, deploy or make financial/electrical commitments. Every state-changing proposal requires a visible diff and explicit user confirmation.

## Release gate

A security-sensitive change must update this model, identify affected assets and boundaries, add verification, and state residual risk. Critical unresolved authorization, secret-exposure, data-integrity or recovery risks block production release.

