# ADR 0001: Dependency security release gate

## Status

Accepted.

## Date and accountable department

2026-07-29. Accountable: SECOPS. Review boundaries: QA and ARCH.

## Context and constraints

The repository must remain reproducible offline while releases also respond to a changing public advisory database. A 2026-07-29 audit identified vulnerable framework, rendering, build and lint dependencies. Compatible owner-package updates existed for Next.js, React Server Components, Vite and the Cloudflare toolchain. Stable Next.js still pinned vulnerable PostCSS and Sharp versions, while the ESLint ecosystem did not yet provide a peer-compatible graph containing the patched brace-expansion major.

Scientific kernels, APIs, model versions and browser transport were outside the dependency change and had to remain byte-for-byte behaviorally compatible.

## Decision

1. Keep deterministic tests independent of the network-backed advisory service.
2. Add a separate CI gate that installs the frozen lockfile and runs `pnpm audit --audit-level high` across production, development and build dependencies.
3. Block every unexcepted high or critical advisory.
4. Permit only exact-GHSA exceptions recorded in `governance/security-exceptions.json` with a SECOPS owner, reachability analysis, compensating controls, remediation gate and expiry enforced by tests.
5. Use parent-scoped pnpm overrides only when the owning stable package has not yet adopted a patched transitive release and the resolved package can be verified against the complete application build.
6. Preserve exact version pins and record any supply-chain minimum-age exclusion as an exact package version, never a wildcard.

## Alternatives considered

- Dependabot alone was rejected because it does not make the repository's release condition executable locally.
- A production-only audit was rejected because build and deployment tooling can compromise source or artifacts.
- A zero-finding gate was rejected because one moderate, development-only esbuild path has no safe owner-package remediation and does not justify a breaking override.
- Blanket overrides and `pnpm audit fix --force` were rejected because they can silently violate peer and runtime contracts.
- Folding the audit into `pnpm test` was rejected because it would destroy the deterministic offline test promise.

## Consequences and risks

The release gate now responds to new high/critical advisories without coupling scientific tests to registry availability. CI requires advisory-service access. The exact ESLint advisory exception expires on 2026-08-29. A moderate esbuild advisory remains in the deprecated Drizzle Kit loader path and must be removed when the owner package provides a compatible graph. Parent-scoped Next.js overrides create temporary maintenance obligations.

## Migration and rollback

The migration updates exact dependency versions, refreshes the lockfile, adds two Next-only overrides, registers the temporary exception and adds the fifth CI job. Rollback restores the previous manifest, workspace configuration and lockfile together; partial rollback is invalid. If an override causes a regression, remove that override and mark the corresponding release gate failed until an owner-package patch or approved time-bounded exception exists.

## Original verification evidence — 2026-07-29

- Peer-dependency check: no issues.
- Next-scoped Sharp `0.35.3` native load: passed with libvips `8.18.3`.
- Next-scoped PostCSS `8.5.20` transformation: passed.
- `pnpm run security:audit`: passed the high/critical threshold; one moderate and one exact ignored high advisory were reported.
- `pnpm audit --prod`: passed with no known production vulnerabilities.
- Peer dependencies: passed with no issues.
- Strict TypeScript and lint: passed with zero diagnostics.
- Governance, scientific, research, Mission Intelligence and release-smoke suites: passed, 45/45.
- Exact Vinext/Cloudflare production build: passed; the built client contains no Sharp, libvips or PostCSS code.

## Instrument 06 release refresh — 2026-10-25

The gate remains unchanged. The July exception expired and is now removed;
compatible brace-expansion backports preserve the CommonJS and ESM consumer
interfaces. A fresh audit also required Next.js and eslint-config-next
`16.4.1`, Vite `8.1.6` and parent-scoped transitive remediation. The frozen
lockfile resolves with no peer issues and no ignored advisories. The audit
reports zero high/critical findings and three moderate residual findings.
See `docs/SECURITY.md` for the exact dependency boundaries, advisory references,
compatibility evidence and residual risk. All application and bundle gates
remain mandatory for this release.
